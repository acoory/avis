import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import {
  NotificationType,
  Prisma,
  Role,
  VehicleCheckConversationParticipantRole,
  VehicleCheckConversationStatus,
  VehicleCheckStatus,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { formatLicensePlate } from '../common/utils/license-plate';
import { CloudinaryService } from '../damage-photos/cloudinary.service';
import { NotificationEmailWorkerService } from '../notifications/notification-email-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationAttachmentDto } from './dto/conversation-attachment.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateConversationParticipantsDto } from './dto/update-conversation-participants.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';

const conversationInclude = {
  participants: {
    orderBy: { joinedAt: 'asc' as const },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          id: true,
          isActive: true,
          lastName: true,
          role: true,
        },
      },
    },
  },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      attachments: { orderBy: { createdAt: 'asc' as const } },
      author: {
        select: {
          firstName: true,
          id: true,
          lastName: true,
          role: true,
        },
      },
      mentions: {
        include: {
          vehicleCheckItem: {
            select: {
              id: true,
              repairType: { select: { name: true } },
              vehiclePart: { select: { name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.VehicleCheckConversationInclude;

const conversationParticipantsInclude = {
  participants: {
    orderBy: { joinedAt: 'asc' as const },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          id: true,
          isActive: true,
          lastName: true,
          role: true,
        },
      },
    },
  },
} satisfies Prisma.VehicleCheckConversationInclude;

const allowedAttachmentMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

type ConversationRecord = Prisma.VehicleCheckConversationGetPayload<{
  include: typeof conversationParticipantsInclude;
}>;

type NotificationRecipient = {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
};

type Actor = {
  firstName: string;
  id: string;
  lastName: string;
};

@Injectable()
export class VehicleCheckConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
    private readonly notificationEmailWorker: NotificationEmailWorkerService,
  ) {}

  async findOne(vehicleCheckId: string, user: CurrentUserPayload) {
    const vehicleCheck = await this.findVehicleCheckContext(
      vehicleCheckId,
      user,
    );
    return this.buildContextResponse(vehicleCheck, user);
  }

  private async buildContextResponse(
    vehicleCheck: Awaited<
      ReturnType<VehicleCheckConversationsService['findVehicleCheckContext']>
    >,
    user: CurrentUserPayload,
  ) {
    const conversation = await this.prisma.vehicleCheckConversation.findUnique({
      where: { vehicleCheckId: vehicleCheck.id },
      include: conversationInclude,
    });
    const availableManagers = vehicleCheck.collaborator.managerAssignments.map(
      (assignment) => assignment.manager,
    );
    const canManageParticipants =
      user.role === Role.ADMIN || vehicleCheck.collaboratorId === user.sub;

    if (!conversation) {
      return {
        availableManagers,
        canManageParticipants,
        canPost: false,
        conversation: null,
        restricted: false,
        unreadCount: 0,
      };
    }

    const participant = conversation.participants.find(
      (item) => item.userId === user.sub,
    );
    const canJoinConversation =
      user.role === Role.ADMIN || vehicleCheck.collaboratorId === user.sub;
    if (!participant && !canJoinConversation) {
      return {
        availableManagers: [],
        canManageParticipants: false,
        canPost: false,
        conversation: null,
        restricted: true,
        unreadCount: 0,
      };
    }

    const unreadCount = participant
      ? conversation.messages.filter(
          (message) =>
            message.authorId !== user.sub &&
            (!participant.lastReadAt ||
              message.createdAt > participant.lastReadAt),
        ).length
      : 0;

    return {
      availableManagers,
      canManageParticipants,
      canPost:
        (Boolean(participant) || canJoinConversation) &&
        conversation.status === VehicleCheckConversationStatus.OPEN,
      conversation,
      restricted: false,
      unreadCount,
    };
  }

  async create(
    vehicleCheckId: string,
    dto: CreateConversationDto,
    user: CurrentUserPayload,
  ) {
    const vehicleCheck = await this.findVehicleCheckContext(
      vehicleCheckId,
      user,
    );
    this.ensureCanManageConversation(vehicleCheck.collaboratorId, user);
    if (vehicleCheck.status === VehicleCheckStatus.DRAFT) {
      throw new BadRequestException(
        'The vehicle check must be completed before starting a conversation',
      );
    }

    const managerIds = this.validateManagerIds(vehicleCheck, dto.managerIds);
    const existing = await this.prisma.vehicleCheckConversation.findUnique({
      where: { vehicleCheckId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'A conversation already exists for this vehicle check',
      );
    }

    const actor = await this.findActor(user.sub);
    const body = dto.body.trim();
    const mentions = await this.resolveMentions(
      this.prisma,
      vehicleCheckId,
      body,
      dto.mentionedItemIds ?? [],
    );
    await this.prisma.$transaction(async (tx) => {
      const participantData: Array<{
        role: VehicleCheckConversationParticipantRole;
        userId: string;
      }> = [
        {
          role: VehicleCheckConversationParticipantRole.REQUESTER,
          userId: vehicleCheck.collaboratorId,
        },
        ...managerIds.map((managerId) => ({
          role: VehicleCheckConversationParticipantRole.DECISION_MAKER,
          userId: managerId,
        })),
      ];
      if (
        !participantData.some((participant) => participant.userId === user.sub)
      ) {
        participantData.push({
          role: VehicleCheckConversationParticipantRole.OBSERVER,
          userId: user.sub,
        });
      }

      const conversation = await tx.vehicleCheckConversation.create({
        data: {
          createdById: user.sub,
          vehicleCheckId,
          participants: { create: participantData },
        },
      });
      for (const managerId of managerIds) {
        await tx.vehicleCheckDecisionShare.upsert({
          where: { vehicleCheckId_managerId: { managerId, vehicleCheckId } },
          create: {
            createdById: user.sub,
            managerId,
            token: this.publicToken(),
            vehicleCheckId,
          },
          update: { isEnabled: true },
        });
      }
      const message = await tx.vehicleCheckMessage.create({
        data: {
          authorId: user.sub,
          body,
          conversationId: conversation.id,
          mentions: {
            create: mentions.map((mention) => ({
              label: mention.label,
              vehicleCheckItemId: mention.id,
            })),
          },
        },
      });
      const recipients = vehicleCheck.collaborator.managerAssignments
        .filter((assignment) => managerIds.includes(assignment.managerId))
        .map((assignment) => assignment.manager);

      return this.createNotifications(tx, recipients, actor, {
        attachmentNames: [],
        conversationId: conversation.id,
        excerpt: this.messageExcerpt(body, 0),
        messageId: message.id,
        title: `${this.actorName(actor)} demande votre avis`,
        type: NotificationType.CONVERSATION_MESSAGE,
        vehicleCheck,
      });
    });

    this.notificationEmailWorker.kick();
    return this.buildContextResponse(vehicleCheck, user);
  }

  async createMessage(
    vehicleCheckId: string,
    dto: CreateMessageDto,
    user: CurrentUserPayload,
  ) {
    const [vehicleCheck, conversation, actor] = await Promise.all([
      this.findVehicleCheckContext(vehicleCheckId, user),
      this.requireConversation(vehicleCheckId),
      this.findActor(user.sub),
    ]);
    await this.ensureParticipantOrJoin(
      conversation,
      vehicleCheck.collaboratorId,
      user,
    );
    if (conversation.status !== VehicleCheckConversationStatus.OPEN) {
      throw new BadRequestException('Reopen the conversation before replying');
    }

    const body = dto.body?.trim() || null;
    const attachments = dto.attachments ?? [];
    if (!body && !attachments.length) {
      throw new BadRequestException('A message or an attachment is required');
    }
    this.validateAttachments(attachments, vehicleCheckId, user.sub);
    const mentions = await this.resolveMentions(
      this.prisma,
      vehicleCheckId,
      body ?? '',
      dto.mentionedItemIds ?? [],
    );

    await this.prisma.$transaction(async (tx) => {
      const message = await tx.vehicleCheckMessage.create({
        data: {
          authorId: user.sub,
          body,
          conversationId: conversation.id,
          attachments: {
            create: attachments.map((attachment) => ({
              bytes: attachment.bytes,
              format: attachment.format,
              mimeType: attachment.mimeType,
              originalName: attachment.originalName,
              publicId: attachment.publicId,
              resourceType: attachment.resourceType,
              secureUrl: attachment.secureUrl,
              uploadedById: user.sub,
            })),
          },
          mentions: {
            create: mentions.map((mention) => ({
              label: mention.label,
              vehicleCheckItemId: mention.id,
            })),
          },
        },
      });
      await tx.vehicleCheckConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
      const recipients = conversation.participants
        .filter(
          (participant) =>
            participant.userId !== user.sub &&
            participant.emailNotificationsEnabled &&
            participant.user.isActive,
        )
        .map((participant) => participant.user);

      return this.createNotifications(tx, recipients, actor, {
        attachmentNames: attachments.map(
          (attachment) => attachment.originalName,
        ),
        conversationId: conversation.id,
        excerpt: this.messageExcerpt(body, attachments.length),
        messageId: message.id,
        title: `Nouvelle reponse de ${this.actorName(actor)}`,
        type: NotificationType.CONVERSATION_MESSAGE,
        vehicleCheck,
      });
    });

    this.notificationEmailWorker.kick();
    return this.buildContextResponse(vehicleCheck, user);
  }

  async updateParticipants(
    vehicleCheckId: string,
    dto: UpdateConversationParticipantsDto,
    user: CurrentUserPayload,
  ) {
    const [vehicleCheck, conversation, actor] = await Promise.all([
      this.findVehicleCheckContext(vehicleCheckId, user),
      this.requireConversation(vehicleCheckId),
      this.findActor(user.sub),
    ]);
    this.ensureCanManageConversation(vehicleCheck.collaboratorId, user);
    const managerIds = this.validateManagerIds(vehicleCheck, dto.managerIds);
    const existingManagerIds = conversation.participants
      .filter(
        (participant) =>
          participant.role ===
          VehicleCheckConversationParticipantRole.DECISION_MAKER,
      )
      .map((participant) => participant.userId);
    const addedManagerIds = managerIds.filter(
      (managerId) => !existingManagerIds.includes(managerId),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.vehicleCheckDecisionShare.updateMany({
        where: {
          vehicleCheckId,
          managerId: { notIn: managerIds },
        },
        data: { isEnabled: false },
      });
      await tx.vehicleCheckConversationParticipant.deleteMany({
        where: {
          conversationId: conversation.id,
          role: VehicleCheckConversationParticipantRole.DECISION_MAKER,
          userId: { notIn: managerIds },
        },
      });
      for (const managerId of managerIds) {
        await tx.vehicleCheckDecisionShare.upsert({
          where: { vehicleCheckId_managerId: { managerId, vehicleCheckId } },
          create: {
            createdById: user.sub,
            managerId,
            token: this.publicToken(),
            vehicleCheckId,
          },
          update: { isEnabled: true },
        });
        await tx.vehicleCheckConversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId: managerId,
            },
          },
          create: {
            conversationId: conversation.id,
            role: VehicleCheckConversationParticipantRole.DECISION_MAKER,
            userId: managerId,
          },
          update: {
            emailNotificationsEnabled: true,
            role: VehicleCheckConversationParticipantRole.DECISION_MAKER,
          },
        });
      }

      const recipients = vehicleCheck.collaborator.managerAssignments
        .filter((assignment) => addedManagerIds.includes(assignment.managerId))
        .map((assignment) => assignment.manager);
      return this.createNotifications(tx, recipients, actor, {
        attachmentNames: [],
        conversationId: conversation.id,
        excerpt: `${this.actorName(actor)} vous a ajoute a la conversation.`,
        title: 'Vous participez a une demande avis',
        type: NotificationType.CONVERSATION_PARTICIPANT_ADDED,
        vehicleCheck,
      });
    });

    this.notificationEmailWorker.kick();
    return this.buildContextResponse(vehicleCheck, user);
  }

  async updateStatus(
    vehicleCheckId: string,
    dto: UpdateConversationStatusDto,
    user: CurrentUserPayload,
  ) {
    const [vehicleCheck, conversation, actor] = await Promise.all([
      this.findVehicleCheckContext(vehicleCheckId, user),
      this.requireConversation(vehicleCheckId),
      this.findActor(user.sub),
    ]);
    this.ensureParticipant(conversation, user.sub);
    if (
      dto.status === VehicleCheckConversationStatus.CLOSED &&
      user.role !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Only administrators can close a conversation',
      );
    }
    if (dto.status === conversation.status) {
      return this.buildContextResponse(vehicleCheck, user);
    }

    const statusLabel =
      dto.status === VehicleCheckConversationStatus.OPEN
        ? 'rouverte'
        : dto.status === VehicleCheckConversationStatus.RESOLVED
          ? 'resolue'
          : 'fermee';
    await this.prisma.$transaction(async (tx) => {
      await tx.vehicleCheckConversation.update({
        where: { id: conversation.id },
        data: {
          closedAt:
            dto.status === VehicleCheckConversationStatus.CLOSED
              ? new Date()
              : null,
          resolvedAt:
            dto.status === VehicleCheckConversationStatus.RESOLVED
              ? new Date()
              : null,
          status: dto.status,
        },
      });
      const recipients = conversation.participants
        .filter(
          (participant) =>
            participant.userId !== user.sub && participant.user.isActive,
        )
        .map((participant) => participant.user);
      return this.createNotifications(tx, recipients, actor, {
        attachmentNames: [],
        conversationId: conversation.id,
        excerpt: `La conversation a ete ${statusLabel} par ${this.actorName(actor)}.`,
        title: `Conversation ${statusLabel}`,
        type: NotificationType.CONVERSATION_STATUS_CHANGED,
        vehicleCheck,
      });
    });

    this.notificationEmailWorker.kick();
    return this.buildContextResponse(vehicleCheck, user);
  }

  async markRead(vehicleCheckId: string, user: CurrentUserPayload) {
    const conversation = await this.prisma.vehicleCheckConversation.findUnique({
      where: { vehicleCheckId },
      select: { id: true },
    });
    if (!conversation) {
      return { success: true };
    }

    await this.prisma.vehicleCheckConversationParticipant.updateMany({
      where: { conversationId: conversation.id, userId: user.sub },
      data: { lastReadAt: new Date() },
    });
    return { success: true };
  }

  async attachmentSignature(vehicleCheckId: string, user: CurrentUserPayload) {
    const [vehicleCheck, conversation] = await Promise.all([
      this.findVehicleCheckContext(vehicleCheckId, user),
      this.requireConversation(vehicleCheckId),
    ]);
    await this.ensureParticipantOrJoin(
      conversation,
      vehicleCheck.collaboratorId,
      user,
    );
    if (conversation.status !== VehicleCheckConversationStatus.OPEN) {
      throw new BadRequestException(
        'Reopen the conversation before adding a file',
      );
    }

    return this.cloudinaryService.createConversationUploadSignature(
      vehicleCheckId,
      user.sub,
    );
  }

  private async findVehicleCheckContext(
    vehicleCheckId: string,
    user: CurrentUserPayload,
  ) {
    const vehicleCheck = await this.prisma.vehicleCheck.findFirst({
      where: { id: vehicleCheckId, ...this.vehicleCheckScope(user) },
      select: {
        checkNumber: true,
        collaboratorId: true,
        id: true,
        licensePlate: true,
        licensePlateCountry: true,
        licensePlateRaw: true,
        manufacturer: { select: { name: true } },
        status: true,
        vehicleModel: { select: { name: true } },
        collaborator: {
          select: {
            firstName: true,
            lastName: true,
            managerAssignments: {
              where: { isActive: true, manager: { isActive: true } },
              orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
              select: {
                managerId: true,
                manager: {
                  select: {
                    email: true,
                    firstName: true,
                    id: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!vehicleCheck) {
      throw new NotFoundException('Vehicle check not found');
    }
    return vehicleCheck;
  }

  private async requireConversation(vehicleCheckId: string) {
    const conversation = await this.prisma.vehicleCheckConversation.findUnique({
      where: { vehicleCheckId },
      include: conversationParticipantsInclude,
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private ensureCanManageConversation(
    collaboratorId: string,
    user: CurrentUserPayload,
  ) {
    if (user.role !== Role.ADMIN && collaboratorId !== user.sub) {
      throw new ForbiddenException(
        'Only the collaborator or an administrator can manage participants',
      );
    }
  }

  private ensureParticipant(conversation: ConversationRecord, userId: string) {
    if (
      !conversation.participants.some(
        (participant) => participant.userId === userId,
      )
    ) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }
  }

  private async ensureParticipantOrJoin(
    conversation: ConversationRecord,
    collaboratorId: string,
    user: CurrentUserPayload,
  ) {
    if (
      conversation.participants.some(
        (participant) => participant.userId === user.sub,
      )
    ) {
      return;
    }

    const participantRole =
      user.sub === collaboratorId
        ? VehicleCheckConversationParticipantRole.REQUESTER
        : user.role === Role.ADMIN
          ? VehicleCheckConversationParticipantRole.OBSERVER
          : null;
    if (!participantRole) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    await this.prisma.vehicleCheckConversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: user.sub,
        },
      },
      create: {
        conversationId: conversation.id,
        role: participantRole,
        userId: user.sub,
      },
      update: {
        emailNotificationsEnabled: true,
        role: participantRole,
      },
    });
  }

  private validateManagerIds(
    vehicleCheck: Awaited<
      ReturnType<VehicleCheckConversationsService['findVehicleCheckContext']>
    >,
    managerIds: string[],
  ) {
    const uniqueIds = [...new Set(managerIds)];
    if (uniqueIds.length !== managerIds.length) {
      throw new BadRequestException('A manager can only be selected once');
    }
    const assignedIds = new Set(
      vehicleCheck.collaborator.managerAssignments.map(
        (assignment) => assignment.managerId,
      ),
    );
    if (managerIds.some((managerId) => !assignedIds.has(managerId))) {
      throw new BadRequestException(
        'Every participant must be assigned to this collaborator',
      );
    }
    return uniqueIds;
  }

  private validateAttachments(
    attachments: ConversationAttachmentDto[],
    vehicleCheckId: string,
    userId: string,
  ) {
    for (const attachment of attachments) {
      if (!['image', 'raw'].includes(attachment.resourceType)) {
        throw new BadRequestException('Unsupported Cloudinary resource type');
      }
      if (!allowedAttachmentMimeTypes.has(attachment.mimeType.toLowerCase())) {
        throw new BadRequestException('Unsupported attachment type');
      }
      if (
        !this.cloudinaryService.isConversationAsset(
          attachment.publicId,
          vehicleCheckId,
          userId,
        )
      ) {
        throw new BadRequestException('Invalid conversation attachment folder');
      }
      const url = new URL(attachment.secureUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
        throw new BadRequestException('Invalid Cloudinary attachment URL');
      }
    }
  }

  private async resolveMentions(
    tx: Prisma.TransactionClient,
    vehicleCheckId: string,
    body: string,
    mentionedItemIds: string[],
  ) {
    const items = await tx.vehicleCheckItem.findMany({
      where: { vehicleCheckId },
      select: {
        id: true,
        vehiclePart: { select: { name: true } },
      },
    });
    const requestedIds = new Set(mentionedItemIds);
    const normalizedBody = body.toLocaleLowerCase('fr-FR');
    const explicitlyMentionedNames = new Set(
      items
        .filter((item) => requestedIds.has(item.id))
        .map((item) => item.vehiclePart.name.toLocaleLowerCase('fr-FR')),
    );
    return items
      .filter((item) => {
        if (requestedIds.has(item.id)) {
          return true;
        }
        const normalizedName = item.vehiclePart.name.toLocaleLowerCase('fr-FR');
        return (
          !explicitlyMentionedNames.has(normalizedName) &&
          normalizedBody.includes(`@${normalizedName}`)
        );
      })
      .map((item) => ({ id: item.id, label: item.vehiclePart.name }));
  }

  private async findActor(userId: string): Promise<Actor> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, id: true, lastName: true },
    });
  }

  private async createNotifications(
    tx: Prisma.TransactionClient,
    recipients: NotificationRecipient[],
    actor: Actor,
    input: {
      attachmentNames: string[];
      conversationId: string;
      excerpt: string;
      messageId?: string;
      title: string;
      type: NotificationType;
      vehicleCheck: {
        checkNumber: string;
        id: string;
        licensePlate: string;
        licensePlateCountry: string;
        licensePlateRaw: string | null;
        manufacturer: { name: string };
        vehicleModel: { name: string } | null;
      };
    },
  ) {
    if (!recipients.length) {
      return [];
    }

    const vehicleCheckId = input.vehicleCheck.id;
    const shares = await tx.vehicleCheckDecisionShare.findMany({
      where: { isEnabled: true, vehicleCheckId },
      orderBy: { createdAt: 'desc' },
      select: { managerId: true, token: true },
    });
    const fallbackToken = shares[0]?.token ?? null;
    const tokenByManagerId = new Map(
      shares.map((share) => [share.managerId, share.token]),
    );
    const recipientRoutes = recipients.map((recipient) => {
      const token = tokenByManagerId.get(recipient.id) ?? fallbackToken;
      return {
        recipient,
        route: token
          ? `/public/decision/${token}#avis`
          : `/dashboard/vehicle-checks/${vehicleCheckId}`,
      };
    });

    const notifications = await tx.notification.createManyAndReturn({
      data: recipientRoutes.map(({ recipient, route }) => ({
        actorId: actor.id,
        conversationId: input.conversationId,
        excerpt: input.excerpt,
        messageId: input.messageId,
        recipientId: recipient.id,
        route,
        title: input.title,
        type: input.type,
        vehicleCheckId,
      })),
      select: { id: true, recipientId: true },
    });
    const notificationIdByRecipientId = new Map(
      notifications.map((notification) => [
        notification.recipientId,
        notification.id,
      ]),
    );
    await tx.notificationEmail.createMany({
      data: recipientRoutes.map(({ recipient, route }) => {
        const conversationUrl = new URL(route, this.frontendUrl()).toString();
        const email = this.conversationEmail(
          recipient,
          actor,
          input.vehicleCheck,
          input.excerpt,
          input.attachmentNames,
          conversationUrl,
        );
        return {
          html: email.html,
          notificationId: notificationIdByRecipientId.get(recipient.id) ?? '',
          recipientEmail: recipient.email,
          subject: email.subject,
          text: email.text,
        };
      }),
    });
    return notifications.map((notification) => notification.id);
  }

  private conversationEmail(
    recipient: NotificationRecipient,
    actor: Actor,
    vehicleCheck: {
      checkNumber: string;
      licensePlate: string;
      licensePlateCountry: string;
      licensePlateRaw: string | null;
      manufacturer: { name: string };
      vehicleModel: { name: string } | null;
    },
    excerpt: string,
    attachmentNames: string[],
    conversationUrl: string,
  ) {
    const actorName = this.actorName(actor);
    const recipientName = `${recipient.firstName} ${recipient.lastName}`.trim();
    const attachmentText = attachmentNames.length
      ? `\nDocuments : ${attachmentNames.join(', ')}`
      : '';
    const licensePlate = formatLicensePlate(
      vehicleCheck.licensePlate,
      vehicleCheck.licensePlateCountry,
      vehicleCheck.licensePlateRaw,
    );
    const vehicleLabel = [
      vehicleCheck.manufacturer.name,
      vehicleCheck.vehicleModel?.name,
    ]
      .filter(Boolean)
      .join(' ');
    const subject = `Nouvel echange - ${licensePlate} - ${vehicleCheck.checkNumber}`;
    const text = [
      `Bonjour ${recipientName},`,
      '',
      `${actorName} a publie une reponse concernant ce vehicule.`,
      '',
      `Vehicule : ${licensePlate}${vehicleLabel ? ` - ${vehicleLabel}` : ''}`,
      `Controle : ${vehicleCheck.checkNumber}`,
      '',
      excerpt,
      attachmentText,
      '',
      `Ouvrir la conversation : ${conversationUrl}`,
    ].join('\n');
    const html = [
      '<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;max-width:600px;margin:auto;padding:24px">',
      `<p>Bonjour ${this.escapeHtml(recipientName)},</p>`,
      `<p><strong>${this.escapeHtml(actorName)}</strong> a publie une reponse concernant ce vehicule.</p>`,
      '<div style="margin:16px 0;padding:13px 15px;border:1px solid #99f6e4;border-radius:8px;background:#f0fdfa">',
      '<p style="margin:0 0 3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#0f766e">Vehicule concerne</p>',
      `<p style="margin:0;font-size:17px;font-weight:700;color:#0f172a">${this.escapeHtml(licensePlate)}${vehicleLabel ? ` · ${this.escapeHtml(vehicleLabel)}` : ''}</p>`,
      `<p style="margin:3px 0 0;font-size:12px;color:#64748b">Controle ${this.escapeHtml(vehicleCheck.checkNumber)}</p>`,
      '</div>',
      `<div style="border-left:3px solid #0f766e;background:#f8fafc;padding:12px 14px;margin:18px 0">${this.escapeHtml(excerpt)}</div>`,
      attachmentNames.length
        ? `<p style="font-size:13px;color:#475569">Documents : ${this.escapeHtml(attachmentNames.join(', '))}</p>`
        : '',
      `<p><a href="${this.escapeHtml(conversationUrl)}" style="display:inline-block;background:#0f766e;color:white;text-decoration:none;padding:10px 14px;border-radius:6px">Ouvrir la conversation</a></p>`,
      '</div>',
    ].join('');
    return { html, subject, text };
  }

  private vehicleCheckScope(
    user: CurrentUserPayload,
  ): Prisma.VehicleCheckWhereInput {
    if (user.role === Role.ADMIN) {
      return {};
    }
    if (user.role === Role.MANAGER) {
      return {
        OR: [
          { collaboratorId: user.sub },
          {
            collaborator: {
              managerAssignments: {
                some: { managerId: user.sub, isActive: true },
              },
            },
          },
        ],
      };
    }
    return { collaboratorId: user.sub };
  }

  private messageExcerpt(body: string | null, attachmentCount: number) {
    const normalized = body?.replace(/\s+/g, ' ').trim();
    if (normalized) {
      return normalized.length > 220
        ? `${normalized.slice(0, 217)}...`
        : normalized;
    }
    return `${attachmentCount} document${attachmentCount > 1 ? 's' : ''} ajoute${attachmentCount > 1 ? 's' : ''}.`;
  }

  private publicToken() {
    return randomBytes(32).toString('base64url');
  }

  private frontendUrl() {
    return (
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    )
      .split(',')[0]
      .trim();
  }

  private actorName(actor: Actor) {
    return `${actor.firstName} ${actor.lastName}`.trim();
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
