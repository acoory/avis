import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  Prisma,
  RiskAssignmentRole,
  RiskPhotoCategory,
  RiskVehicleStatus,
  Role,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  formatLicensePlate,
  normalizeLicensePlate,
  normalizeLicensePlateCountry,
  sanitizeLicensePlateRaw,
} from '../common/utils/license-plate';
import { CloudinaryService } from '../damage-photos/cloudinary.service';
import { NotificationEmailWorkerService } from '../notifications/notification-email-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationAttachmentDto } from '../vehicle-check-conversations/dto/conversation-attachment.dto';
import { CreateRiskMessageDto } from './dto/create-risk-message.dto';
import { CreateRiskPhotoDto } from './dto/create-risk-photo.dto';
import { CreateRiskVehicleDto } from './dto/create-risk-vehicle.dto';
import { SearchRiskVehiclesQueryDto } from './dto/search-risk-vehicles-query.dto';
import { UpdateRiskVehicleDto } from './dto/update-risk-vehicle.dto';

const REQUIRED_PHOTO_CATEGORIES = new Set<RiskPhotoCategory>([
  RiskPhotoCategory.EXTERIOR_FRONT_THREE_QUARTER,
  RiskPhotoCategory.EXTERIOR_REAR_THREE_QUARTER,
  RiskPhotoCategory.DASHBOARD,
  RiskPhotoCategory.INTERIOR_FRONT,
  RiskPhotoCategory.INTERIOR_REAR,
  RiskPhotoCategory.WHEEL_FRONT_LEFT,
  RiskPhotoCategory.WHEEL_FRONT_RIGHT,
  RiskPhotoCategory.WHEEL_REAR_LEFT,
  RiskPhotoCategory.WHEEL_REAR_RIGHT,
]);

const DAMAGE_CATEGORIES = new Set<RiskPhotoCategory>([
  RiskPhotoCategory.DAMAGE_WIDE,
  RiskPhotoCategory.DAMAGE_CLOSE_UP,
]);

const TIRE_WEAR_SLOT_PATTERN =
  /^tire:(front-left|front-right|rear-left|rear-right):wear$/;
const TIRE_DAMAGE_SLOT_PATTERN =
  /^tire:(front-left|front-right|rear-left|rear-right):damage:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const riskVehicleInclude = {
  agency: true,
  manufacturer: true,
  creator: {
    select: {
      email: true,
      firstName: true,
      id: true,
      isActive: true,
      lastName: true,
      role: true,
    },
  },
  closedBy: {
    select: {
      email: true,
      firstName: true,
      id: true,
      lastName: true,
      role: true,
    },
  },
  assignments: {
    orderBy: [{ role: 'asc' as const }, { assignedAt: 'asc' as const }],
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
  photos: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  conversation: {
    include: {
      messages: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          attachments: { orderBy: { createdAt: 'asc' as const } },
          author: {
            select: { firstName: true, id: true, lastName: true, role: true },
          },
        },
      },
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      actor: { select: { firstName: true, id: true, lastName: true } },
    },
  },
} satisfies Prisma.RiskVehicleInclude;

type RiskVehicleRecord = Prisma.RiskVehicleGetPayload<{
  include: typeof riskVehicleInclude;
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
export class RiskVehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
    private readonly notificationEmailWorker: NotificationEmailWorkerService,
  ) {}

  findAll(user: CurrentUserPayload) {
    return this.prisma.riskVehicle.findMany({
      where: this.scopeWhere(user),
      include: riskVehicleInclude,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  search(query: SearchRiskVehiclesQueryDto, user: CurrentUserPayload) {
    const insensitive = 'insensitive' as const;
    const terms = query.q.trim().split(/\s+/).filter(Boolean);

    return this.prisma.riskVehicle.findMany({
      where: {
        ...this.scopeWhere(user),
        AND: terms.map((term) => {
          const normalizedTerm = normalizeLicensePlate(term);
          return {
            OR: [
              ...(normalizedTerm
                ? [
                    {
                      licensePlate: {
                        contains: normalizedTerm,
                        mode: insensitive,
                      },
                    },
                  ]
                : []),
              { licensePlateRaw: { contains: term, mode: insensitive } },
              { riskNumber: { contains: term, mode: insensitive } },
              {
                manufacturer: {
                  name: { contains: term, mode: insensitive },
                },
              },
              {
                agency: {
                  OR: [
                    { name: { contains: term, mode: insensitive } },
                    { city: { contains: term, mode: insensitive } },
                  ],
                },
              },
            ],
          };
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: query.limit,
      select: {
        agency: { select: { city: true, id: true, name: true } },
        createdAt: true,
        creatorId: true,
        id: true,
        licensePlate: true,
        licensePlateCountry: true,
        licensePlateRaw: true,
        manufacturer: { select: { id: true, name: true } },
        riskNumber: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async findAssignees(user: CurrentUserPayload) {
    if (user.role === Role.ADMIN) {
      return this.prisma.user.findMany({
        where: { isActive: true, role: Role.MANAGER },
        select: {
          email: true,
          firstName: true,
          id: true,
          lastName: true,
          role: true,
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      });
    }

    if (user.role === Role.MANAGER) {
      return this.prisma.user.findMany({
        where: { id: user.sub, isActive: true },
        select: {
          email: true,
          firstName: true,
          id: true,
          lastName: true,
          role: true,
        },
      });
    }

    const assignments = await this.prisma.userManagerAssignment.findMany({
      where: {
        collaboratorId: user.sub,
        isActive: true,
        manager: { isActive: true },
      },
      orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
      select: {
        manager: {
          select: {
            email: true,
            firstName: true,
            id: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
    return assignments.map((assignment) => assignment.manager);
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const riskVehicle = await this.prisma.riskVehicle.findFirst({
      where: { id, ...this.scopeWhere(user) },
      include: riskVehicleInclude,
    });
    if (!riskVehicle) throw new NotFoundException('Risk vehicle not found');
    return riskVehicle;
  }

  async create(user: CurrentUserPayload, dto: CreateRiskVehicleDto) {
    const licensePlate = this.normalizedRequiredLicensePlate(dto.licensePlate);
    const licensePlateCountry = normalizeLicensePlateCountry(
      dto.licensePlateCountry,
    );
    await this.ensureReferences(dto.agencyId, dto.manufacturerId);
    const assigneeIds = await this.validateAssignees(
      user,
      dto.assigneeIds,
      dto.primaryAssigneeId,
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.riskVehicle.create({
          data: {
            agencyId: dto.agencyId,
            assignments: {
              create: assigneeIds.map((userId) => ({
                assignedById: user.sub,
                role:
                  userId === dto.primaryAssigneeId
                    ? RiskAssignmentRole.PRIMARY
                    : RiskAssignmentRole.PARTICIPANT,
                userId,
              })),
            },
            creatorId: user.sub,
            licensePlate,
            licensePlateCountry,
            licensePlateRaw: sanitizeLicensePlateRaw(dto.licensePlate),
            licensePlateRecognitionConfidence:
              dto.licensePlateRecognitionConfidence,
            manufacturerId: dto.manufacturerId,
            riskNumber: await this.generateRiskNumber(),
          },
          include: riskVehicleInclude,
        });
      } catch (error) {
        if (this.isUniqueConstraintError(error, 'licensePlate')) {
          throw new ConflictException({
            code: 'RISK_VEHICLE_DUPLICATE',
            message: 'Un dossier Risk existe deja pour ce vehicule.',
          });
        }
        if (!this.isUniqueConstraintError(error, 'riskNumber')) throw error;
      }
    }
    throw new BadRequestException(
      'Impossible de generer un numero Risk unique',
    );
  }

  async update(
    id: string,
    dto: UpdateRiskVehicleDto,
    user: CurrentUserPayload,
  ) {
    const existing = await this.findOne(id, user);
    this.ensureCreator(existing, user);
    if (existing.status !== RiskVehicleStatus.DRAFT) {
      throw new BadRequestException('Only a draft Risk dossier can be edited');
    }

    const agencyId = dto.agencyId ?? existing.agencyId;
    const manufacturerId = dto.manufacturerId ?? existing.manufacturerId;
    await this.ensureReferences(agencyId, manufacturerId);

    const nextAssigneeIds =
      dto.assigneeIds ?? existing.assignments.map((item) => item.userId);
    const nextPrimaryId =
      dto.primaryAssigneeId ??
      existing.assignments.find(
        (item) => item.role === RiskAssignmentRole.PRIMARY,
      )?.userId;
    if (!nextPrimaryId)
      throw new BadRequestException('A primary assignee is required');
    const shouldUpdateAssignments =
      dto.assigneeIds !== undefined || dto.primaryAssigneeId !== undefined;
    const assigneeIds = shouldUpdateAssignments
      ? await this.validateAssignees(user, nextAssigneeIds, nextPrimaryId)
      : nextAssigneeIds;

    return this.prisma.$transaction(async (tx) => {
      if (shouldUpdateAssignments) {
        await tx.riskVehicleAssignment.deleteMany({
          where: { riskVehicleId: id },
        });
        await tx.riskVehicleAssignment.createMany({
          data: assigneeIds.map((userId) => ({
            assignedById: user.sub,
            riskVehicleId: id,
            role:
              userId === nextPrimaryId
                ? RiskAssignmentRole.PRIMARY
                : RiskAssignmentRole.PARTICIPANT,
            userId,
          })),
        });
      }
      return tx.riskVehicle.update({
        where: { id },
        data: {
          agencyId: dto.agencyId,
          licensePlate: dto.licensePlate
            ? this.normalizedRequiredLicensePlate(dto.licensePlate)
            : undefined,
          licensePlateCountry: dto.licensePlateCountry
            ? normalizeLicensePlateCountry(dto.licensePlateCountry)
            : undefined,
          licensePlateRaw: dto.licensePlate
            ? sanitizeLicensePlateRaw(dto.licensePlate)
            : undefined,
          licensePlateRecognitionConfidence:
            dto.licensePlateRecognitionConfidence,
          manufacturerId: dto.manufacturerId,
        },
        include: riskVehicleInclude,
      });
    });
  }

  async photoUploadSignature(id: string, user: CurrentUserPayload) {
    const vehicle = await this.findOne(id, user);
    this.ensureCreator(vehicle, user);
    if (vehicle.status !== RiskVehicleStatus.DRAFT) {
      throw new BadRequestException('Only a draft Risk dossier can be edited');
    }
    return this.cloudinaryService.createRiskPhotoUploadSignature(id, user.sub);
  }

  async addPhoto(
    id: string,
    dto: CreateRiskPhotoDto,
    user: CurrentUserPayload,
  ) {
    const vehicle = await this.findOne(id, user);
    this.ensureCreator(vehicle, user);
    if (vehicle.status !== RiskVehicleStatus.DRAFT) {
      throw new BadRequestException('Only a draft Risk dossier can be edited');
    }
    this.validateRiskPhoto(dto, id, user.sub);
    const existing = await this.prisma.riskPhoto.findUnique({
      where: {
        riskVehicleId_slotKey: { riskVehicleId: id, slotKey: dto.slotKey },
      },
    });
    const saved = await this.prisma.riskPhoto.upsert({
      where: {
        riskVehicleId_slotKey: { riskVehicleId: id, slotKey: dto.slotKey },
      },
      create: {
        ...dto,
        riskVehicleId: id,
        sortOrder: dto.sortOrder ?? 0,
      },
      update: {
        assetId: dto.assetId,
        bytes: dto.bytes,
        category: dto.category,
        damageGroupId: dto.damageGroupId,
        format: dto.format,
        height: dto.height,
        publicId: dto.publicId,
        secureUrl: dto.secureUrl,
        sortOrder: dto.sortOrder,
        width: dto.width,
      },
    });
    if (existing && existing.publicId !== dto.publicId) {
      await this.cloudinaryService
        .destroy(existing.publicId)
        .catch(() => undefined);
    }
    return saved;
  }

  async removePhoto(id: string, photoId: string, user: CurrentUserPayload) {
    const vehicle = await this.findOne(id, user);
    this.ensureCreator(vehicle, user);
    if (vehicle.status !== RiskVehicleStatus.DRAFT) {
      throw new BadRequestException('Only a draft Risk dossier can be edited');
    }
    const photo = await this.prisma.riskPhoto.findFirst({
      where: { id: photoId, riskVehicleId: id },
    });
    if (!photo) throw new NotFoundException('Risk photo not found');
    await this.cloudinaryService.destroy(photo.publicId);
    await this.prisma.riskPhoto.delete({ where: { id: photo.id } });
    return { success: true };
  }

  async submit(id: string, user: CurrentUserPayload) {
    const vehicle = await this.findOne(id, user);
    this.ensureCreator(vehicle, user);
    if (vehicle.status !== RiskVehicleStatus.DRAFT) {
      throw new BadRequestException(
        'Only a draft Risk dossier can be submitted',
      );
    }
    this.validatePhotoCompleteness(vehicle);
    const actor = await this.findActor(user.sub);
    const recipients = vehicle.assignments
      .filter((assignment) => assignment.user.isActive)
      .map((assignment) => assignment.user);
    if (!recipients.length)
      throw new BadRequestException('At least one assignee is required');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.riskVehicle.update({
        where: { id },
        data: {
          status: RiskVehicleStatus.SUBMITTED,
          submittedAt: new Date(),
          conversation: { create: {} },
          statusHistory: {
            create: {
              actorId: user.sub,
              fromStatus: RiskVehicleStatus.DRAFT,
              toStatus: RiskVehicleStatus.SUBMITTED,
            },
          },
        },
        include: riskVehicleInclude,
      });
      await this.createNotifications(tx, recipients, actor, result, {
        excerpt: `${this.actorName(actor)} a termine et transmis le dossier photographique.`,
        title: 'Dossier Risk a analyser',
        type: NotificationType.RISK_SUBMITTED,
      });
      return result;
    });
    this.notificationEmailWorker.kick();
    return updated;
  }

  async attachmentSignature(id: string, user: CurrentUserPayload) {
    const vehicle = await this.findOne(id, user);
    if (vehicle.status !== RiskVehicleStatus.SUBMITTED) {
      throw new BadRequestException(
        'The Risk dossier is not open for comments',
      );
    }
    return this.cloudinaryService.createRiskConversationUploadSignature(
      id,
      user.sub,
    );
  }

  async createMessage(
    id: string,
    dto: CreateRiskMessageDto,
    user: CurrentUserPayload,
  ) {
    const vehicle = await this.findOne(id, user);
    if (vehicle.status !== RiskVehicleStatus.SUBMITTED) {
      throw new BadRequestException(
        'The Risk dossier is not open for comments',
      );
    }
    const body = dto.body?.trim() || null;
    const attachments = dto.attachments ?? [];
    if (!body && !attachments.length) {
      throw new BadRequestException('A message or an attachment is required');
    }
    this.validateAttachments(attachments, id, user.sub);
    if (!vehicle.conversation)
      throw new NotFoundException('Risk conversation not found');
    const actor = await this.findActor(user.sub);
    const stakeholders = [
      vehicle.creator,
      ...vehicle.assignments.map((item) => item.user),
    ];
    const recipients = stakeholders.filter(
      (recipient, index, values) =>
        recipient.id !== user.sub &&
        recipient.isActive !== false &&
        values.findIndex((item) => item.id === recipient.id) === index,
    );

    await this.prisma.$transaction(async (tx) => {
      const message = await tx.riskMessage.create({
        data: {
          authorId: user.sub,
          body,
          conversationId: vehicle.conversation!.id,
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
        },
      });
      await tx.riskConversation.update({
        where: { id: vehicle.conversation!.id },
        data: { updatedAt: new Date() },
      });
      await this.createNotifications(tx, recipients, actor, vehicle, {
        emailResponse: { attachments, body },
        excerpt: this.messageExcerpt(body, attachments.length),
        messageId: message.id,
        title: `Nouvelle réponse de ${this.actorName(actor)}`,
        type: NotificationType.RISK_MESSAGE,
      });
      return message;
    });
    this.notificationEmailWorker.kick();
    return this.findOne(id, user);
  }

  async close(id: string, user: CurrentUserPayload) {
    const vehicle = await this.findOne(id, user);
    if (vehicle.status !== RiskVehicleStatus.SUBMITTED) {
      throw new BadRequestException(
        'Only a submitted Risk dossier can be closed',
      );
    }
    const isPrimary = vehicle.assignments.some(
      (assignment) =>
        assignment.userId === user.sub &&
        assignment.role === RiskAssignmentRole.PRIMARY,
    );
    if (!isPrimary && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only the primary assignee can close this dossier',
      );
    }
    const actor = await this.findActor(user.sub);
    const stakeholders = [
      vehicle.creator,
      ...vehicle.assignments.map((item) => item.user),
    ];
    const recipients = stakeholders.filter(
      (recipient, index, values) =>
        recipient.id !== user.sub &&
        recipient.isActive !== false &&
        values.findIndex((item) => item.id === recipient.id) === index,
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.riskVehicle.update({
        where: { id },
        data: {
          closedAt: new Date(),
          closedById: user.sub,
          status: RiskVehicleStatus.CLOSED,
          statusHistory: {
            create: {
              actorId: user.sub,
              fromStatus: RiskVehicleStatus.SUBMITTED,
              toStatus: RiskVehicleStatus.CLOSED,
            },
          },
        },
        include: riskVehicleInclude,
      });
      await this.createNotifications(tx, recipients, actor, result, {
        excerpt: `${this.actorName(actor)} a clos le dossier Risk.`,
        title: 'Dossier Risk clos',
        type: NotificationType.RISK_CLOSED,
      });
      return result;
    });
    this.notificationEmailWorker.kick();
    return updated;
  }

  private scopeWhere(user: CurrentUserPayload): Prisma.RiskVehicleWhereInput {
    if (user.role === Role.ADMIN) return {};
    return {
      OR: [
        { creatorId: user.sub },
        {
          status: { not: RiskVehicleStatus.DRAFT },
          assignments: { some: { userId: user.sub } },
        },
      ],
    };
  }

  private ensureCreator(vehicle: RiskVehicleRecord, user: CurrentUserPayload) {
    if (vehicle.creatorId !== user.sub && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only the creator can edit this Risk dossier',
      );
    }
  }

  private async validateAssignees(
    user: CurrentUserPayload,
    assigneeIds: string[],
    primaryAssigneeId: string,
  ) {
    const uniqueIds = [...new Set(assigneeIds)];
    if (uniqueIds.length !== assigneeIds.length) {
      throw new BadRequestException('An assignee can only be selected once');
    }
    if (!uniqueIds.includes(primaryAssigneeId)) {
      throw new BadRequestException('The primary assignee must be selected');
    }
    const allowed = await this.findAssignees(user);
    const allowedIds = new Set(allowed.map((item) => item.id));
    if (uniqueIds.some((id) => !allowedIds.has(id))) {
      throw new BadRequestException('One or more assignees are not available');
    }
    return uniqueIds;
  }

  private async ensureReferences(agencyId: string, manufacturerId: string) {
    const [agency, manufacturer] = await Promise.all([
      this.prisma.agency.findFirst({
        where: { id: agencyId, isActive: true },
        select: { id: true },
      }),
      this.prisma.manufacturer.findUnique({
        where: { id: manufacturerId },
        select: { id: true },
      }),
    ]);
    if (!agency) throw new BadRequestException('Unknown or inactive agency');
    if (!manufacturer) throw new BadRequestException('Unknown manufacturer');
  }

  private validateRiskPhoto(
    dto: CreateRiskPhotoDto,
    riskVehicleId: string,
    userId: string,
  ) {
    if (
      !this.cloudinaryService.isRiskPhotoAsset(
        dto.publicId,
        riskVehicleId,
        userId,
      )
    ) {
      throw new BadRequestException('Invalid Risk photo folder');
    }
    const url = new URL(dto.secureUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
      throw new BadRequestException('Invalid Cloudinary photo URL');
    }
    const isDamage = DAMAGE_CATEGORIES.has(dto.category);
    if (isDamage && !dto.damageGroupId) {
      throw new BadRequestException('A damage group is required');
    }
    if (!isDamage && dto.damageGroupId) {
      throw new BadRequestException(
        'A fixed photo cannot belong to a damage group',
      );
    }
    if (dto.category === RiskPhotoCategory.TIRE_WEAR) {
      if (!TIRE_WEAR_SLOT_PATTERN.test(dto.slotKey)) {
        throw new BadRequestException('Invalid tire wear photo slot');
      }
      return;
    }
    if (dto.category === RiskPhotoCategory.TIRE_DAMAGE) {
      if (!TIRE_DAMAGE_SLOT_PATTERN.test(dto.slotKey)) {
        throw new BadRequestException('Invalid tire damage photo slot');
      }
      return;
    }
    const expectedSlotKey = isDamage
      ? `${dto.damageGroupId}:${dto.category}`
      : dto.category;
    if (dto.slotKey !== expectedSlotKey) {
      throw new BadRequestException('Invalid Risk photo slot');
    }
  }

  private validatePhotoCompleteness(vehicle: RiskVehicleRecord) {
    const categories = new Set(vehicle.photos.map((photo) => photo.category));
    const missing = [...REQUIRED_PHOTO_CATEGORIES].filter(
      (category) => !categories.has(category),
    );
    if (missing.length) {
      throw new BadRequestException({
        code: 'RISK_PHOTOS_INCOMPLETE',
        missingCategories: missing,
        message: 'Certaines photos obligatoires sont manquantes.',
      });
    }
    const damageGroups = new Map<string, Set<RiskPhotoCategory>>();
    for (const photo of vehicle.photos.filter((item) => item.damageGroupId)) {
      const group =
        damageGroups.get(photo.damageGroupId!) ?? new Set<RiskPhotoCategory>();
      group.add(photo.category);
      damageGroups.set(photo.damageGroupId!, group);
    }
    const incompleteGroup = [...damageGroups.values()].find(
      (group) =>
        !group.has(RiskPhotoCategory.DAMAGE_WIDE) ||
        !group.has(RiskPhotoCategory.DAMAGE_CLOSE_UP),
    );
    if (incompleteGroup) {
      throw new BadRequestException(
        'Chaque dommage doit avoir une vue large et rapprochee',
      );
    }
  }

  private validateAttachments(
    attachments: ConversationAttachmentDto[],
    riskVehicleId: string,
    userId: string,
  ) {
    for (const attachment of attachments) {
      if (!['image', 'raw'].includes(attachment.resourceType)) {
        throw new BadRequestException('Unsupported attachment resource type');
      }
      if (!allowedAttachmentMimeTypes.has(attachment.mimeType.toLowerCase())) {
        throw new BadRequestException('Unsupported attachment type');
      }
      if (
        !this.cloudinaryService.isRiskConversationAsset(
          attachment.publicId,
          riskVehicleId,
          userId,
        )
      ) {
        throw new BadRequestException('Invalid Risk attachment folder');
      }
      const url = new URL(attachment.secureUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
        throw new BadRequestException('Invalid Cloudinary attachment URL');
      }
    }
  }

  private async createNotifications(
    tx: Prisma.TransactionClient,
    recipients: NotificationRecipient[],
    actor: Actor,
    vehicle: RiskVehicleRecord,
    input: {
      emailResponse?: {
        attachments: ConversationAttachmentDto[];
        body: string | null;
      };
      excerpt: string;
      messageId?: string;
      title: string;
      type: NotificationType;
    },
  ) {
    if (!recipients.length) return;
    const route = `/dashboard/risk/${vehicle.id}`;
    const notifications = await tx.notification.createManyAndReturn({
      data: recipients.map((recipient) => ({
        actorId: actor.id,
        excerpt: input.excerpt,
        recipientId: recipient.id,
        riskMessageId: input.messageId,
        riskVehicleId: vehicle.id,
        route,
        title: input.title,
        type: input.type,
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
      data: recipients.map((recipient) => {
        const email = this.riskEmail(
          recipient,
          actor,
          vehicle,
          input,
          new URL(route, this.frontendUrl()).toString(),
        );
        return {
          html: email.html,
          notificationId: notificationIdByRecipientId.get(recipient.id)!,
          recipientEmail: recipient.email,
          subject: email.subject,
          text: email.text,
        };
      }),
    });
  }

  private riskEmail(
    recipient: NotificationRecipient,
    actor: Actor,
    vehicle: RiskVehicleRecord,
    input: {
      emailResponse?: {
        attachments: ConversationAttachmentDto[];
        body: string | null;
      };
      excerpt: string;
      type: NotificationType;
    },
    url: string,
  ) {
    const plate = formatLicensePlate(
      vehicle.licensePlate,
      vehicle.licensePlateCountry,
      vehicle.licensePlateRaw,
    );
    const recipientName = `${recipient.firstName} ${recipient.lastName}`.trim();
    const vehicleLabel = vehicle.manufacturer.name;
    const actorName = this.actorName(actor);
    const response = input.emailResponse;
    const isResponse =
      input.type === NotificationType.RISK_MESSAGE && response !== undefined;
    const subject = isResponse
      ? `Nouvelle réponse de ${actorName} - Risk ${vehicle.riskNumber} - ${plate}`
      : `Risk ${vehicle.riskNumber} - ${plate}`;
    const attachmentCount = response?.attachments.length ?? 0;
    const attachmentLabel = `${attachmentCount} fichier${attachmentCount > 1 ? 's' : ''} ajouté${attachmentCount > 1 ? 's' : ''}`;
    const responseText = isResponse
      ? [
          `${actorName} a répondu dans le dossier Risk.`,
          ...(response.body
            ? ['', `Commentaire de ${actorName} :`, response.body]
            : []),
          ...(attachmentCount
            ? [
                '',
                `${attachmentLabel} :`,
                ...response.attachments.map(
                  (attachment) =>
                    `- ${attachment.originalName} : ${attachment.secureUrl}`,
                ),
              ]
            : []),
        ]
      : [input.excerpt];
    const text = [
      `Bonjour ${recipientName},`,
      '',
      ...responseText,
      '',
      `Vehicule : ${plate}${vehicleLabel ? ` - ${vehicleLabel}` : ''}`,
      `Dossier : ${vehicle.riskNumber}`,
      '',
      `Ouvrir le dossier : ${url}`,
    ].join('\n');
    const responseHtml = isResponse
      ? [
          `<p><strong>${this.escapeHtml(actorName)}</strong> a répondu dans le dossier Risk.</p>`,
          response.body
            ? [
                '<div style="margin:16px 0;padding:14px;border-left:4px solid #0f766e;border-radius:6px;background:#f8fafc">',
                `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#475569">Commentaire de ${this.escapeHtml(actorName)}</p>`,
                `<p style="margin:0;white-space:pre-wrap">${this.escapeHtml(response.body)}</p>`,
                '</div>',
              ].join('')
            : '',
          attachmentCount
            ? [
                '<div style="margin:16px 0;padding:14px;border:1px solid #cbd5e1;border-radius:8px;background:#ffffff">',
                `<p style="margin:0 0 8px;font-weight:700">${this.escapeHtml(attachmentLabel)}</p>`,
                '<ul style="margin:0;padding-left:20px">',
                ...response.attachments.map(
                  (attachment) =>
                    `<li style="margin:4px 0"><a href="${this.escapeHtml(attachment.secureUrl)}" style="color:#0f766e">${this.escapeHtml(attachment.originalName)}</a></li>`,
                ),
                '</ul>',
                '</div>',
              ].join('')
            : '',
        ].join('')
      : `<p>${this.escapeHtml(input.excerpt)}</p>`;
    const html = [
      '<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;max-width:600px;margin:auto;padding:24px">',
      `<p>Bonjour ${this.escapeHtml(recipientName)},</p>`,
      responseHtml,
      '<div style="margin:16px 0;padding:14px;border:1px solid #99f6e4;border-radius:8px;background:#f0fdfa">',
      `<p style="margin:0;font-size:18px;font-weight:700">${this.escapeHtml(plate)}${vehicleLabel ? ` · ${this.escapeHtml(vehicleLabel)}` : ''}</p>`,
      `<p style="margin:4px 0 0;color:#64748b">Dossier ${this.escapeHtml(vehicle.riskNumber)}</p>`,
      '</div>',
      `<p><a href="${this.escapeHtml(url)}" style="display:inline-block;background:#0f766e;color:white;text-decoration:none;padding:10px 14px;border-radius:6px">Ouvrir le dossier</a></p>`,
      '</div>',
    ].join('');
    return { html, subject, text };
  }

  private async findActor(userId: string): Promise<Actor> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, id: true, lastName: true },
    });
  }

  private normalizedRequiredLicensePlate(value: string) {
    const normalized = normalizeLicensePlate(value);
    if (!normalized) throw new BadRequestException('License plate is required');
    return normalized;
  }

  private async generateRiskNumber() {
    const now = new Date();
    const prefix = `RISK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const existing = await this.prisma.riskVehicle.findMany({
      where: { riskNumber: { startsWith: prefix } },
      select: { riskNumber: true },
    });
    const sequence = existing.reduce(
      (max, item) =>
        Math.max(max, Number(item.riskNumber.match(/-(\d+)$/)?.[1] ?? 0)),
      0,
    );
    return `${prefix}-${String(sequence + 1).padStart(4, '0')}`;
  }

  private isUniqueConstraintError(error: unknown, field: string) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      JSON.stringify(error.meta).includes(field)
    );
  }

  private messageExcerpt(body: string | null, attachmentCount: number) {
    const normalized = body?.replace(/\s+/g, ' ').trim();
    if (normalized)
      return normalized.length > 220
        ? `${normalized.slice(0, 217)}...`
        : normalized;
    return `${attachmentCount} document${attachmentCount > 1 ? 's' : ''} ajoute${attachmentCount > 1 ? 's' : ''}.`;
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
