import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  NotificationType,
  PartOrderStatus,
  Prisma,
  RepairDecisionStatus,
  Role,
  VehicleCheckConversationParticipantRole,
  VehicleCheckConversationStatus,
  VehicleCheckItemOperationalStatus,
  VehicleCheckStatus,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  formatLicensePlate,
  normalizeLicensePlate,
  normalizeLicensePlateCountry,
  sanitizeLicensePlateRaw,
} from '../common/utils/license-plate';
import { ExternalRepairContactsService } from '../external-repair-contacts/external-repair-contacts.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RepairDecisionService } from '../repair-decisions/repair-decision.service';
import { CloudinaryService } from '../damage-photos/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PublicAccessCodeService } from '../public-access/public-access-code.service';
import { CheckVehicleCheckDuplicateDto } from './dto/check-vehicle-check-duplicate.dto';
import { CreatePublicShareDto } from './dto/create-public-share.dto';
import { CreateVehicleCheckDto } from './dto/create-vehicle-check.dto';
import { FinalizeVehicleCheckSummaryDto } from './dto/finalize-vehicle-check-summary.dto';
import { ListVehicleChecksQueryDto } from './dto/list-vehicle-checks-query.dto';
import { SendDecisionRequestEmailDto } from './dto/send-decision-request-email.dto';
import { SendRepairRequestEmailDto } from './dto/send-repair-request-email.dto';
import { UpdateVehicleCheckDto } from './dto/update-vehicle-check.dto';

const CHECK_NUMBER_CREATE_ATTEMPTS = 5;

const vehicleCheckInclude = {
  collaborator: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
  agency: true,
  manufacturer: true,
  vehicleModel: true,
  items: {
    include: {
      repairType: true,
      vehiclePart: true,
      statusHistories: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      photos: {
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  externalQuotes: {
    include: {
      items: { include: { repairType: true } },
    },
  },
  publicShare: {
    select: {
      createdAt: true,
      externalRepairContact: true,
      externalRepairContactId: true,
      takenInChargeAt: true,
      vehicleRecoveredAt: true,
      vehicleRecoveredBy: {
        select: {
          email: true,
          firstName: true,
          id: true,
          lastName: true,
        },
      },
      vehicleRecoveredById: true,
      token: true,
    },
  },
  decisionShares: {
    where: { isEnabled: true },
    orderBy: { createdAt: 'desc' as const },
    select: {
      createdAt: true,
      emailSentAt: true,
      manager: {
        select: {
          email: true,
          firstName: true,
          id: true,
          lastName: true,
        },
      },
      managerId: true,
      requestComment: true,
      token: true,
    },
  },
};

const publicVehicleCheckInclude = {
  agency: true,
  manufacturer: true,
  vehicleModel: true,
  items: {
    where: {
      selectedForSummary: true,
      operationalStatus: VehicleCheckItemOperationalStatus.ACTIVE,
    },
    include: {
      repairType: true,
      vehiclePart: true,
      photos: {
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

const publicDecisionVehicleCheckInclude = {
  agency: true,
  collaborator: {
    select: {
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  manufacturer: true,
  vehicleModel: true,
  items: {
    include: {
      repairType: true,
      vehiclePart: true,
      photos: {
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class VehicleChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repairDecisionService: RepairDecisionService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly contactsService: ExternalRepairContactsService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly publicAccessCodeService: PublicAccessCodeService,
  ) {}

  findAll(query: ListVehicleChecksQueryDto = {}, user: CurrentUserPayload) {
    const where: Prisma.VehicleCheckWhereInput = {
      ...this.scopeWhere(user),
    };

    if (query.dateFrom || query.dateTo) {
      where.checkDate = {
        ...(query.dateFrom ? { gte: this.startOfDay(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: this.endOfDay(query.dateTo) } : {}),
      };
    }

    return this.prisma.vehicleCheck.findMany({
      where,
      include: vehicleCheckInclude,
      orderBy: [{ checkDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findDecisionManagers(
    user: CurrentUserPayload,
    vehicleCheckId?: string,
  ) {
    const select = {
      email: true,
      firstName: true,
      id: true,
      lastName: true,
    };
    const vehicleCheck = vehicleCheckId
      ? await this.findOne(vehicleCheckId, user)
      : null;

    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: Role.MANAGER,
        ...(vehicleCheck
          ? {
              managedCollaboratorAssignments: {
                some: {
                  collaboratorId: vehicleCheck.collaborator.id,
                  isActive: true,
                },
              },
            }
          : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select,
    });
  }

  async checkDuplicate(
    dto: CheckVehicleCheckDuplicateDto,
    user: CurrentUserPayload,
  ) {
    const licensePlate = this.normalizedRequiredLicensePlate(dto.licensePlate);
    const licensePlateCountry = normalizeLicensePlateCountry(
      dto.licensePlateCountry ?? 'FR',
    );
    const excludedVehicleCheck = dto.excludedVehicleCheckId
      ? await this.prisma.vehicleCheck.findFirst({
          where: {
            id: dto.excludedVehicleCheckId,
            ...this.scopeWhere(user),
          },
          select: { id: true },
        })
      : null;
    const duplicate = await this.findDuplicateVehicleCheck(
      licensePlate,
      licensePlateCountry,
      excludedVehicleCheck?.id,
    );

    if (!duplicate) {
      return { exists: false };
    }

    const accessibleDuplicate = await this.prisma.vehicleCheck.findFirst({
      where: {
        licensePlate,
        licensePlateCountry,
        ...(excludedVehicleCheck
          ? { id: { not: excludedVehicleCheck.id } }
          : {}),
        ...this.scopeWhere(user),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        checkDate: true,
        checkNumber: true,
        id: true,
        status: true,
      },
    });

    return {
      exists: true,
      existingVehicleCheck: accessibleDuplicate ?? undefined,
    };
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const vehicleCheck = await this.prisma.vehicleCheck.findFirst({
      where: {
        id,
        ...this.scopeWhere(user),
      },
      include: vehicleCheckInclude,
    });

    if (!vehicleCheck) {
      throw new NotFoundException('Vehicle check not found');
    }

    return vehicleCheck;
  }

  async createPublicShare(
    id: string,
    user: CurrentUserPayload,
    dto: CreatePublicShareDto = {},
  ) {
    const vehicleCheck = await this.findOne(id, user);
    const externalRepairContactId = await this.ensureExternalRepairContact(
      dto.externalRepairContactId,
    );

    if (vehicleCheck.status !== VehicleCheckStatus.SUMMARY_READY) {
      throw new BadRequestException(
        'The vehicle check summary must be ready before sharing',
      );
    }

    const existingShare = await this.prisma.vehicleCheckPublicShare.findUnique({
      where: { vehicleCheckId: id },
    });

    if (existingShare) {
      const share = existingShare.isEnabled
        ? existingShare
        : await this.prisma.vehicleCheckPublicShare.update({
            where: { id: existingShare.id },
            data: { isEnabled: true },
          });

      const updatedShare = externalRepairContactId
        ? await this.prisma.vehicleCheckPublicShare.update({
            where: { id: share.id },
            data: { externalRepairContactId },
            include: { externalRepairContact: true },
          })
        : await this.prisma.vehicleCheckPublicShare.findUniqueOrThrow({
            where: { id: share.id },
            include: { externalRepairContact: true },
          });

      return this.publicShareResponse(updatedShare);
    }

    const share = await this.prisma.vehicleCheckPublicShare.create({
      data: {
        createdById: user.sub,
        externalRepairContactId,
        token: await this.generatePublicShareToken(),
        vehicleCheckId: id,
      },
      include: { externalRepairContact: true },
    });

    return this.publicShareResponse(share);
  }

  async sendRepairRequestEmail(
    id: string,
    user: CurrentUserPayload,
    dto: SendRepairRequestEmailDto,
  ) {
    const recipients = await this.resolveRepairRequestRecipients(dto, user);
    const primaryContact = recipients[0];
    const share = await this.createPublicShare(id, user, {
      externalRepairContactId: primaryContact.id,
    });
    const vehicleCheck = await this.findOne(id, user);
    const selectedItemsCount = (vehicleCheck.items ?? []).filter(
      (item) => item.selectedForSummary,
    ).length;
    const publicUrl = this.publicRepairRequestUrl(share.token);
    const subject = this.repairRequestSubject(vehicleCheck);
    const text = this.repairRequestText(
      vehicleCheck,
      publicUrl,
      selectedItemsCount,
    );

    await this.mailService.sendMail({
      html: this.repairRequestHtml(vehicleCheck, publicUrl, selectedItemsCount),
      replyTo: vehicleCheck.collaborator?.email,
      subject,
      text,
      to: recipients.map((recipient) => recipient.email),
    });

    const takenInChargeShare = share.takenInChargeAt
      ? share
      : this.publicShareResponse(
          await this.prisma.vehicleCheckPublicShare.update({
            where: { vehicleCheckId: id },
            data: { takenInChargeAt: new Date() },
            include: { externalRepairContact: true },
          }),
        );

    return {
      ...takenInChargeShare,
      emailSentAt: new Date(),
      recipientEmail: primaryContact.email,
      recipientEmails: recipients.map((recipient) => recipient.email),
    };
  }

  async sendDecisionRequestEmail(
    id: string,
    user: CurrentUserPayload,
    dto: SendDecisionRequestEmailDto,
  ) {
    const vehicleCheck = await this.findOne(id, user);

    if (vehicleCheck.status === VehicleCheckStatus.DRAFT) {
      throw new BadRequestException(
        'The vehicle check must be completed before requesting a manager decision',
      );
    }

    const manager = await this.prisma.user.findFirst({
      where: {
        id: dto.managerId,
        isActive: true,
        role: Role.MANAGER,
        managedCollaboratorAssignments: {
          some: {
            collaboratorId: vehicleCheck.collaborator.id,
            isActive: true,
          },
        },
      },
      select: {
        email: true,
        firstName: true,
        id: true,
        lastName: true,
      },
    });

    if (!manager) {
      throw new BadRequestException('The selected manager is not available');
    }

    const requestComment = dto.requestComment?.trim() || null;
    const existingShare =
      await this.prisma.vehicleCheckDecisionShare.findUnique({
        where: {
          vehicleCheckId_managerId: {
            managerId: manager.id,
            vehicleCheckId: id,
          },
        },
      });

    const share = existingShare
      ? await this.prisma.vehicleCheckDecisionShare.update({
          where: { id: existingShare.id },
          data: {
            emailSentAt: new Date(),
            isEnabled: true,
            requestComment,
          },
          include: { manager: true },
        })
      : await this.prisma.vehicleCheckDecisionShare.create({
          data: {
            createdById: user.sub,
            emailSentAt: new Date(),
            managerId: manager.id,
            requestComment,
            token: await this.generateDecisionShareToken(),
            vehicleCheckId: id,
          },
          include: { manager: true },
        });

    const publicUrl = this.publicDecisionRequestUrl(share.token);
    await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.vehicleCheckConversation.upsert({
        where: { vehicleCheckId: id },
        create: {
          createdById: user.sub,
          status: VehicleCheckConversationStatus.OPEN,
          vehicleCheckId: id,
        },
        update: {
          closedAt: null,
          resolvedAt: null,
          status: VehicleCheckConversationStatus.OPEN,
        },
      });
      await tx.vehicleCheckConversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: vehicleCheck.collaborator.id,
          },
        },
        create: {
          conversationId: conversation.id,
          role: VehicleCheckConversationParticipantRole.REQUESTER,
          userId: vehicleCheck.collaborator.id,
        },
        update: {
          emailNotificationsEnabled: true,
          role: VehicleCheckConversationParticipantRole.REQUESTER,
        },
      });
      await tx.vehicleCheckConversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: manager.id,
          },
        },
        create: {
          conversationId: conversation.id,
          role: VehicleCheckConversationParticipantRole.DECISION_MAKER,
          userId: manager.id,
        },
        update: {
          emailNotificationsEnabled: true,
          role: VehicleCheckConversationParticipantRole.DECISION_MAKER,
        },
      });
      if (
        user.sub !== vehicleCheck.collaborator.id &&
        user.sub !== manager.id
      ) {
        await tx.vehicleCheckConversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId: user.sub,
            },
          },
          create: {
            conversationId: conversation.id,
            role: VehicleCheckConversationParticipantRole.OBSERVER,
            userId: user.sub,
          },
          update: {},
        });
      }
      const message = await tx.vehicleCheckMessage.create({
        data: {
          authorId: user.sub,
          body:
            requestComment ??
            "Demande d'avis manager envoyee pour ce vehicule.",
          conversationId: conversation.id,
        },
      });
      await tx.notification.create({
        data: {
          actorId: user.sub,
          conversationId: conversation.id,
          excerpt: requestComment,
          messageId: message.id,
          recipientId: manager.id,
          route: `/public/decision/${share.token}#avis`,
          title: "Nouvelle demande d'avis manager",
          type: NotificationType.CONVERSATION_MESSAGE,
          vehicleCheckId: id,
        },
      });
    });
    const personalAccessCode =
      await this.publicAccessCodeService.getOrCreatePersonalCode(manager.id);

    await this.mailService.sendMail({
      html: this.decisionRequestHtml(
        vehicleCheck,
        manager,
        publicUrl,
        requestComment,
        personalAccessCode,
      ),
      replyTo: vehicleCheck.collaborator?.email,
      subject: this.decisionRequestSubject(vehicleCheck),
      text: this.decisionRequestText(
        vehicleCheck,
        manager,
        publicUrl,
        requestComment,
        personalAccessCode,
      ),
      to: manager.email,
    });

    return this.decisionShareResponse(share);
  }

  async findPublicShare(token: string) {
    const share = await this.prisma.vehicleCheckPublicShare.findUnique({
      where: { token },
      include: {
        externalRepairContact: true,
        vehicleCheck: {
          include: publicVehicleCheckInclude,
        },
      },
    });

    if (
      !share?.isEnabled ||
      share.vehicleCheck.status !== VehicleCheckStatus.SUMMARY_READY
    ) {
      throw new NotFoundException('Public repair request not found');
    }

    return {
      createdAt: share.createdAt,
      externalRepairContact: share.externalRepairContact,
      externalRepairContactId: share.externalRepairContactId,
      takenInChargeAt: share.takenInChargeAt,
      vehicleRecoveredAt: share.vehicleRecoveredAt,
      token: share.token,
      vehicleCheck: share.vehicleCheck,
    };
  }

  async takeChargePublicShare(token: string) {
    const share = await this.prisma.vehicleCheckPublicShare.findUnique({
      where: { token },
      include: {
        vehicleCheck: {
          select: {
            status: true,
          },
        },
      },
    });

    if (
      !share?.isEnabled ||
      share.vehicleCheck.status !== VehicleCheckStatus.SUMMARY_READY
    ) {
      throw new NotFoundException('Public repair request not found');
    }

    if (!share.takenInChargeAt) {
      await this.prisma.vehicleCheckPublicShare.update({
        where: { id: share.id },
        data: { takenInChargeAt: new Date() },
      });
      await this.notificationsService.notifyVehicleEvent(
        share.vehicleCheckId,
        NotificationType.TAKEN_IN_CHARGE,
      );
    }

    return this.findPublicShare(token);
  }

  async findPublicDecisionShare(token: string) {
    const share = await this.prisma.vehicleCheckDecisionShare.findUnique({
      where: { token },
      include: {
        manager: {
          select: {
            email: true,
            firstName: true,
            id: true,
            lastName: true,
          },
        },
        vehicleCheck: {
          include: publicDecisionVehicleCheckInclude,
        },
      },
    });

    if (
      !share?.isEnabled ||
      share.vehicleCheck.status === VehicleCheckStatus.DRAFT
    ) {
      throw new NotFoundException('Public decision request not found');
    }

    return {
      createdAt: share.createdAt,
      emailSentAt: share.emailSentAt,
      manager: share.manager,
      managerId: share.managerId,
      requestComment: share.requestComment,
      token: share.token,
      vehicleCheck: share.vehicleCheck,
    };
  }

  async markVehicleRecovered(id: string, user: CurrentUserPayload) {
    const vehicleCheck = await this.findOne(id, user);

    if (!vehicleCheck.publicShare) {
      throw new BadRequestException(
        'The repair request must be shared before marking the vehicle as recovered',
      );
    }

    if (!vehicleCheck.publicShare.vehicleRecoveredAt) {
      await this.prisma.vehicleCheckPublicShare.update({
        where: { vehicleCheckId: id },
        data: {
          takenInChargeAt:
            vehicleCheck.publicShare.takenInChargeAt ?? new Date(),
          vehicleRecoveredAt: new Date(),
          vehicleRecoveredById: user.sub,
        },
      });
      await this.notificationsService.notifyVehicleEvent(
        id,
        NotificationType.VEHICLE_RECOVERED,
        user.sub,
      );
    }

    return this.findOne(id, user);
  }

  async create(user: CurrentUserPayload, dto: CreateVehicleCheckDto) {
    const licensePlate = this.normalizedRequiredLicensePlate(dto.licensePlate);
    const licensePlateCountry = normalizeLicensePlateCountry(
      dto.licensePlateCountry ?? 'FR',
    );
    await this.ensureNoDuplicateVehicleCheck(
      licensePlate,
      licensePlateCountry,
      user,
    );
    await this.ensureReferences(
      dto.agencyId,
      dto.manufacturerId,
      dto.vehicleModelId,
    );
    await this.ensureVehicleParts(dto.items.map((item) => item.vehiclePartId));
    const decision = dto.items.length
      ? await this.repairDecisionService.preview(dto.manufacturerId, dto.items)
      : await this.emptyDecisionForManufacturer(dto.manufacturerId);

    for (
      let attempt = 0;
      attempt < CHECK_NUMBER_CREATE_ATTEMPTS;
      attempt += 1
    ) {
      const checkNumber = await this.generateCheckNumber();

      try {
        return await this.prisma.vehicleCheck.create({
          data: {
            checkNumber,
            collaboratorId: user.sub,
            agencyId: dto.agencyId,
            manufacturerId: dto.manufacturerId,
            vehicleModelId: dto.vehicleModelId,
            licensePlate,
            licensePlateRaw: sanitizeLicensePlateRaw(dto.licensePlate),
            licensePlateCountry,
            licensePlateRecognitionConfidence:
              dto.licensePlateRecognitionConfidence,
            mileage: dto.mileage,
            checkDate: dto.checkDate ? new Date(dto.checkDate) : new Date(),
            city: dto.city,
            status: VehicleCheckStatus.DRAFT,
            totalInternalSavingAmount: decision.totalInternalSavingAmount,
            totalInternalCost: decision.totalInternalCost,
            constructorAllowanceAmount: decision.constructorAllowanceAmount,
            allowanceDifferenceAmount: decision.allowanceDifferenceAmount,
            decisionSummary: decision.decisionSummary,
            notes: dto.notes,
            items: {
              create: decision.items.map((item, index) => ({
                repairTypeId: item.repairTypeId,
                vehiclePartId: item.vehiclePartId,
                quantity: item.quantity,
                unitInternalSavingAmount: item.unitInternalSavingAmount,
                totalInternalSavingAmount: item.totalInternalSavingAmount,
                unitInternalCost: item.unitInternalCost,
                totalInternalCost: item.totalInternalCost,
                decisionStatus: item.decisionStatus,
                decisionMessage: item.decisionMessage,
                comment: item.comment,
                partOrderRequired: item.partOrderRequired,
                partOrderStatus: item.partOrderRequired
                  ? PartOrderStatus.TO_ORDER
                  : PartOrderStatus.NOT_REQUIRED,
                photos: {
                  create: (dto.items[index]?.photos ?? []).map((photo) => ({
                    publicId: photo.publicId,
                    assetId: photo.assetId,
                    secureUrl: photo.secureUrl,
                    width: photo.width,
                    height: photo.height,
                    bytes: photo.bytes,
                    format: photo.format,
                  })),
                },
              })),
            },
          },
          include: vehicleCheckInclude,
        });
      } catch (error) {
        if (this.isVehicleIdentityUniqueConstraintError(error)) {
          await this.throwDuplicateVehicleCheckConflict(
            licensePlate,
            licensePlateCountry,
            user,
          );
        }

        if (!this.isUniqueConstraintError(error, 'checkNumber')) {
          throw error;
        }
      }
    }

    throw new BadRequestException(
      'Impossible de generer un numero de controle unique. Veuillez reessayer.',
    );
  }

  async update(
    id: string,
    dto: UpdateVehicleCheckDto,
    user: CurrentUserPayload,
  ) {
    const existing = await this.findOne(id, user);

    const agencyId = dto.agencyId ?? existing.agencyId;
    const manufacturerId = dto.manufacturerId ?? existing.manufacturerId;
    const vehicleModelId =
      dto.vehicleModelId ?? existing.vehicleModelId ?? undefined;
    const licensePlate = dto.licensePlate
      ? this.normalizedRequiredLicensePlate(dto.licensePlate)
      : existing.licensePlate;
    const licensePlateCountry = dto.licensePlateCountry
      ? normalizeLicensePlateCountry(dto.licensePlateCountry)
      : existing.licensePlateCountry;
    if (dto.licensePlate || dto.licensePlateCountry) {
      await this.ensureNoDuplicateVehicleCheck(
        licensePlate,
        licensePlateCountry,
        user,
        id,
      );
    }
    await this.ensureReferences(agencyId, manufacturerId, vehicleModelId);
    if (dto.items) {
      await this.ensureVehicleParts(
        dto.items.map((item) => item.vehiclePartId),
      );
    }

    if (!dto.items) {
      try {
        return await this.prisma.vehicleCheck.update({
          where: { id },
          data: {
            agencyId: dto.agencyId,
            manufacturerId: dto.manufacturerId,
            vehicleModelId: dto.vehicleModelId,
            licensePlate: dto.licensePlate ? licensePlate : undefined,
            licensePlateRaw: dto.licensePlate
              ? sanitizeLicensePlateRaw(dto.licensePlate)
              : undefined,
            licensePlateCountry: dto.licensePlateCountry
              ? licensePlateCountry
              : undefined,
            licensePlateRecognitionConfidence:
              dto.licensePlateRecognitionConfidence,
            mileage: dto.mileage,
            checkDate: dto.checkDate ? new Date(dto.checkDate) : undefined,
            city: dto.city,
            notes: dto.notes,
          },
          include: vehicleCheckInclude,
        });
      } catch (error) {
        if (this.isVehicleIdentityUniqueConstraintError(error)) {
          await this.throwDuplicateVehicleCheckConflict(
            licensePlate,
            licensePlateCountry,
            user,
            id,
          );
        }
        throw error;
      }
    }

    const decision = dto.items.length
      ? await this.repairDecisionService.preview(manufacturerId, dto.items)
      : await this.emptyDecisionForManufacturer(manufacturerId);

    const existingPhotoPublicIds = existing.items.flatMap((item) =>
      item.photos.map((photo) => photo.publicId),
    );
    const retainedPhotoPublicIds = new Set(
      dto.items.flatMap((item) =>
        (item.photos ?? []).map((photo) => photo.publicId),
      ),
    );
    const removedPhotoPublicIds = existingPhotoPublicIds.filter(
      (publicId) => !retainedPhotoPublicIds.has(publicId),
    );

    const updated = await this.prisma
      .$transaction(async (tx) => {
        await tx.vehicleCheckItem.deleteMany({ where: { vehicleCheckId: id } });

        return tx.vehicleCheck.update({
          where: { id },
          data: {
            agencyId: dto.agencyId,
            manufacturerId: dto.manufacturerId,
            vehicleModelId: dto.vehicleModelId,
            licensePlate: dto.licensePlate ? licensePlate : undefined,
            licensePlateRaw: dto.licensePlate
              ? sanitizeLicensePlateRaw(dto.licensePlate)
              : undefined,
            licensePlateCountry: dto.licensePlateCountry
              ? licensePlateCountry
              : undefined,
            licensePlateRecognitionConfidence:
              dto.licensePlateRecognitionConfidence,
            mileage: dto.mileage,
            checkDate: dto.checkDate ? new Date(dto.checkDate) : undefined,
            city: dto.city,
            notes: dto.notes,
            totalInternalSavingAmount: decision.totalInternalSavingAmount,
            totalInternalCost: decision.totalInternalCost,
            constructorAllowanceAmount: decision.constructorAllowanceAmount,
            allowanceDifferenceAmount: decision.allowanceDifferenceAmount,
            decisionSummary: decision.decisionSummary,
            status:
              existing.status === VehicleCheckStatus.DRAFT
                ? undefined
                : VehicleCheckStatus.TO_ANALYZE,
            summaryFinalizedAt:
              existing.status === VehicleCheckStatus.DRAFT ? undefined : null,
            items: {
              create: decision.items.map((item, index) => ({
                repairTypeId: item.repairTypeId,
                vehiclePartId: item.vehiclePartId,
                quantity: item.quantity,
                unitInternalSavingAmount: item.unitInternalSavingAmount,
                totalInternalSavingAmount: item.totalInternalSavingAmount,
                unitInternalCost: item.unitInternalCost,
                totalInternalCost: item.totalInternalCost,
                decisionStatus: item.decisionStatus,
                decisionMessage: item.decisionMessage,
                comment: item.comment,
                partOrderRequired: item.partOrderRequired,
                partOrderStatus: item.partOrderRequired
                  ? PartOrderStatus.TO_ORDER
                  : PartOrderStatus.NOT_REQUIRED,
                photos: {
                  create: (dto.items?.[index]?.photos ?? []).map((photo) => ({
                    publicId: photo.publicId,
                    assetId: photo.assetId,
                    secureUrl: photo.secureUrl,
                    width: photo.width,
                    height: photo.height,
                    bytes: photo.bytes,
                    format: photo.format,
                  })),
                },
              })),
            },
          },
          include: vehicleCheckInclude,
        });
      })
      .catch(async (error: unknown) => {
        if (this.isVehicleIdentityUniqueConstraintError(error)) {
          await this.throwDuplicateVehicleCheckConflict(
            licensePlate,
            licensePlateCountry,
            user,
            id,
          );
        }
        throw error;
      });

    await Promise.allSettled(
      removedPhotoPublicIds.map((publicId) =>
        this.cloudinaryService.destroy(publicId),
      ),
    );

    return updated;
  }

  async complete(id: string, user: CurrentUserPayload) {
    const vehicleCheck = await this.findOne(id, user);

    if (vehicleCheck.status !== VehicleCheckStatus.DRAFT) {
      throw new BadRequestException(
        'Only a draft vehicle check can be completed in the field',
      );
    }

    return this.prisma.vehicleCheck.update({
      where: { id },
      data: {
        status: VehicleCheckStatus.TO_ANALYZE,
        fieldCompletedAt: new Date(),
        summaryFinalizedAt: null,
      },
      include: vehicleCheckInclude,
    });
  }

  async finalizeSummary(
    id: string,
    dto: FinalizeVehicleCheckSummaryDto,
    user: CurrentUserPayload,
  ) {
    const vehicleCheck = await this.findOne(id, user);

    if (
      vehicleCheck.status !== VehicleCheckStatus.TO_ANALYZE &&
      vehicleCheck.status !== VehicleCheckStatus.SUMMARY_READY
    ) {
      throw new BadRequestException(
        'The field check must be completed before finalizing its summary',
      );
    }

    const itemIds = new Set(vehicleCheck.items.map((item) => item.id));
    const unknownItemId = dto.selectedItemIds.find(
      (itemId) => !itemIds.has(itemId),
    );
    if (unknownItemId) {
      throw new BadRequestException(
        'One or more selected repairs do not belong to this check',
      );
    }

    const selectedItemIds = new Set(dto.selectedItemIds);
    const selectedItems = vehicleCheck.items.filter((item) =>
      selectedItemIds.has(item.id),
    );
    const forbiddenItem = selectedItems.find(
      (item) =>
        item.operationalStatus === VehicleCheckItemOperationalStatus.ACTIVE &&
        item.decisionStatus === RepairDecisionStatus.FORBIDDEN,
    );

    if (forbiddenItem) {
      throw new BadRequestException(
        'A forbidden repair cannot be included in the final summary',
      );
    }

    const activeSelectedItems = selectedItems.filter(
      (item) =>
        item.operationalStatus === VehicleCheckItemOperationalStatus.ACTIVE,
    );
    const totalInternalSavingAmount = activeSelectedItems.reduce(
      (total, item) => total.plus(item.totalInternalSavingAmount),
      new Prisma.Decimal(0),
    );
    const totalInternalCost = activeSelectedItems.reduce(
      (total, item) => total.plus(item.totalInternalCost),
      new Prisma.Decimal(0),
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.vehicleCheckItem.updateMany({
        where: { vehicleCheckId: id },
        data: { selectedForSummary: false },
      });

      if (dto.selectedItemIds.length) {
        await tx.vehicleCheckItem.updateMany({
          where: {
            vehicleCheckId: id,
            id: { in: dto.selectedItemIds },
          },
          data: { selectedForSummary: true },
        });
      }

      return tx.vehicleCheck.update({
        where: { id },
        data: {
          status: VehicleCheckStatus.SUMMARY_READY,
          summaryFinalizedAt: new Date(),
          totalInternalSavingAmount,
          totalInternalCost,
        },
        include: vehicleCheckInclude,
      });
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const vehicleCheck = await this.findOne(id, user);

    const photoPublicIds = vehicleCheck.items.flatMap((item) =>
      item.photos.map((photo) => photo.publicId),
    );
    await this.prisma.vehicleCheck.delete({ where: { id } });
    await Promise.allSettled(
      photoPublicIds.map((publicId) =>
        this.cloudinaryService.destroy(publicId),
      ),
    );
    return { success: true };
  }

  private scopeWhere(user: CurrentUserPayload): Prisma.VehicleCheckWhereInput {
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

    return {
      collaboratorId: user.sub,
    };
  }

  private async ensureReferences(
    agencyId: string,
    manufacturerId: string,
    vehicleModelId?: string,
  ) {
    const [agency, manufacturer, vehicleModel] = await Promise.all([
      this.prisma.agency.findUnique({
        where: { id: agencyId },
        select: { id: true },
      }),
      this.prisma.manufacturer.findUnique({
        where: { id: manufacturerId },
        select: { id: true },
      }),
      vehicleModelId
        ? this.prisma.vehicleModel.findUnique({
            where: { id: vehicleModelId },
            select: { id: true, manufacturerId: true },
          })
        : null,
    ]);

    if (!agency) throw new NotFoundException('Agency not found');
    if (!manufacturer) throw new NotFoundException('Manufacturer not found');
    if (vehicleModelId && !vehicleModel)
      throw new NotFoundException('Vehicle model not found');
    if (vehicleModel && vehicleModel.manufacturerId !== manufacturerId) {
      throw new BadRequestException(
        'Vehicle model does not belong to selected manufacturer',
      );
    }
  }

  private async ensureVehicleParts(vehiclePartIds: Array<string | undefined>) {
    const uniqueVehiclePartIds = [
      ...new Set(
        vehiclePartIds.filter((vehiclePartId): vehiclePartId is string =>
          Boolean(vehiclePartId),
        ),
      ),
    ];

    if (!uniqueVehiclePartIds.length) {
      return;
    }

    const vehicleParts = await this.prisma.vehiclePart.findMany({
      where: { id: { in: uniqueVehiclePartIds }, isActive: true },
      select: { id: true },
    });

    if (vehicleParts.length !== uniqueVehiclePartIds.length) {
      throw new NotFoundException('One or more vehicle parts were not found');
    }
  }

  private normalizedRequiredLicensePlate(value: string) {
    const licensePlate = normalizeLicensePlate(value);
    if (!licensePlate) {
      throw new BadRequestException('License plate is required');
    }
    return licensePlate;
  }

  private async ensureNoDuplicateVehicleCheck(
    licensePlate: string,
    licensePlateCountry: string,
    user: CurrentUserPayload,
    excludedId?: string,
  ) {
    const duplicate = await this.findDuplicateVehicleCheck(
      licensePlate,
      licensePlateCountry,
      excludedId,
    );
    if (duplicate) {
      await this.throwDuplicateVehicleCheckConflict(
        licensePlate,
        licensePlateCountry,
        user,
        excludedId,
      );
    }
  }

  private findDuplicateVehicleCheck(
    licensePlate: string,
    licensePlateCountry: string,
    excludedId?: string,
  ) {
    return this.prisma.vehicleCheck.findFirst({
      where: {
        licensePlate,
        licensePlateCountry,
        ...(excludedId ? { id: { not: excludedId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        checkDate: true,
        checkNumber: true,
        id: true,
        status: true,
      },
    });
  }

  private async throwDuplicateVehicleCheckConflict(
    licensePlate: string,
    licensePlateCountry: string,
    user: CurrentUserPayload,
    excludedId?: string,
  ): Promise<never> {
    const duplicate = await this.findDuplicateVehicleCheck(
      licensePlate,
      licensePlateCountry,
      excludedId,
    );
    const accessibleDuplicate = duplicate
      ? await this.prisma.vehicleCheck.findFirst({
          where: {
            id: duplicate.id,
            ...this.scopeWhere(user),
          },
          select: { id: true },
        })
      : null;

    throw new ConflictException({
      code: 'VEHICLE_CHECK_DUPLICATE',
      message: 'Un controle existe deja pour ce vehicule.',
      existingVehicleCheck:
        duplicate && accessibleDuplicate ? duplicate : undefined,
    });
  }

  private isVehicleIdentityUniqueConstraintError(error: unknown) {
    return (
      this.isUniqueConstraintError(error, 'licensePlate') ||
      this.isUniqueConstraintError(error, 'licensePlateCountry') ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        JSON.stringify(error.meta).includes(
          'VehicleCheck_licensePlateCountry_licensePlate_key',
        ))
    );
  }

  private async emptyDecisionForManufacturer(
    manufacturerId: string,
  ): Promise<Awaited<ReturnType<RepairDecisionService['preview']>>> {
    const manufacturer = await this.prisma.manufacturer.findUnique({
      where: { id: manufacturerId },
      include: { rule: true },
    });

    if (!manufacturer) {
      throw new NotFoundException('Manufacturer not found');
    }

    const constructorAllowanceAmount =
      manufacturer.rule?.constructorAllowanceAmount ?? '0';

    return {
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.name,
      totalInternalSavingAmount: '0.00',
      totalInternalCost: '0.00',
      constructorAllowanceAmount: this.money(constructorAllowanceAmount),
      allowanceDifferenceAmount: this.money(constructorAllowanceAmount),
      decisionSummary: 'Aucun degat constate.',
      alerts: [],
      items: [],
      missingMandatoryRepairTypes: [],
      recommendedRepairTypes: [],
    };
  }

  private money(value: Prisma.Decimal | string) {
    return new Prisma.Decimal(value).toFixed(2);
  }

  private startOfDay(value: string) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private endOfDay(value: string) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  private async generateCheckNumber() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `VC-${yyyy}${mm}${dd}`;
    const existingChecks = await this.prisma.vehicleCheck.findMany({
      where: {
        checkNumber: {
          startsWith: prefix,
        },
      },
      select: {
        checkNumber: true,
      },
    });

    const lastSequence = existingChecks.reduce(
      (max, check) =>
        Math.max(max, Number(check.checkNumber.match(/-(\d+)$/)?.[1] ?? 0)),
      0,
    );

    return `${prefix}-${String(lastSequence + 1).padStart(4, '0')}`;
  }

  private isUniqueConstraintError(error: unknown, fieldName: string) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const meta = error.meta as
      | {
          target?: unknown;
          fields?: unknown;
          driverAdapterError?: {
            cause?: {
              constraint?: {
                fields?: unknown;
              };
            };
          };
        }
      | undefined;

    const fields = [
      ...this.normalizeConstraintFields(meta?.target),
      ...this.normalizeConstraintFields(meta?.fields),
      ...this.normalizeConstraintFields(
        meta?.driverAdapterError?.cause?.constraint?.fields,
      ),
    ];

    return fields.some((field) => field === fieldName);
  }

  private normalizeConstraintFields(value: unknown) {
    const values = Array.isArray(value) ? value : [value];

    return values
      .filter((field): field is string => typeof field === 'string')
      .map((field) => field.replace(/"/g, ''));
  }

  private async generatePublicShareToken() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(24).toString('base64url');
      const existingShare =
        await this.prisma.vehicleCheckPublicShare.findUnique({
          where: { token },
          select: { id: true },
        });

      if (!existingShare) {
        return token;
      }
    }

    throw new BadRequestException('Unable to generate public share token');
  }

  private async generateDecisionShareToken() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(24).toString('base64url');
      const existingShare =
        await this.prisma.vehicleCheckDecisionShare.findUnique({
          where: { token },
          select: { id: true },
        });

      if (!existingShare) {
        return token;
      }
    }

    throw new BadRequestException('Unable to generate decision share token');
  }

  private async ensureExternalRepairContact(externalRepairContactId?: string) {
    if (!externalRepairContactId) {
      return undefined;
    }

    const contact = await this.prisma.externalRepairContact.findFirst({
      where: {
        id: externalRepairContactId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!contact) {
      throw new BadRequestException('External repair contact not found');
    }

    return contact.id;
  }

  private async resolveRepairRequestRecipients(
    dto: SendRepairRequestEmailDto,
    user: CurrentUserPayload,
  ) {
    const company = await this.contactsService.findOrCreateCompany(
      dto.companyId,
      dto.companyName,
      user,
    );
    const recipients: Array<{ email: string; id: string }> = [];
    const seenEmails = new Set<string>();

    for (const recipient of dto.recipients) {
      const contact = recipient.id
        ? await this.prisma.externalRepairContact.findFirst({
            where: {
              id: recipient.id,
              isActive: true,
              ...(company ? { companyId: company.id } : {}),
            },
            include: { company: true },
          })
        : await this.contactsService.findOrCreate(
            {
              companyId: company?.id,
              companyName: company?.name ?? dto.companyName,
              email: recipient.email ?? '',
              name: recipient.name ?? '',
            },
            user,
          );

      if (!contact) {
        throw new BadRequestException('External repair contact not found');
      }

      const email = contact.email.trim().toLowerCase();
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        recipients.push(contact);
      }
    }

    if (!recipients.length) {
      throw new BadRequestException('At least one recipient is required');
    }

    return recipients;
  }

  private publicShareResponse(share: {
    token: string;
    createdAt: Date;
    externalRepairContact?: {
      companyName: string | null;
      email: string;
      id: string;
      name: string;
      phone: string | null;
    } | null;
    externalRepairContactId?: string | null;
    takenInChargeAt?: Date | null;
    vehicleRecoveredAt?: Date | null;
  }) {
    return {
      createdAt: share.createdAt,
      externalRepairContact: share.externalRepairContact ?? null,
      externalRepairContactId:
        share.externalRepairContactId ??
        share.externalRepairContact?.id ??
        null,
      takenInChargeAt: share.takenInChargeAt ?? null,
      vehicleRecoveredAt: share.vehicleRecoveredAt ?? null,
      token: share.token,
    };
  }

  private decisionShareResponse(share: {
    createdAt: Date;
    emailSentAt?: Date | null;
    manager: {
      email: string;
      firstName: string;
      id: string;
      lastName: string;
    };
    managerId: string;
    requestComment?: string | null;
    token: string;
  }) {
    return {
      createdAt: share.createdAt,
      emailSentAt: share.emailSentAt ?? null,
      manager: share.manager,
      managerId: share.managerId,
      requestComment: share.requestComment ?? null,
      token: share.token,
    };
  }

  private publicRepairRequestUrl(token: string) {
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_PUBLIC_URL') ??
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:3000'
    )
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean)[0];

    return new URL(`/public/repairs/${token}`, frontendUrl).toString();
  }

  private publicDecisionRequestUrl(token: string) {
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_PUBLIC_URL') ??
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:3000'
    )
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean)[0];

    return new URL(`/public/decision/${token}`, frontendUrl).toString();
  }

  private decisionRequestSubject(vehicleCheck: {
    licensePlate: string;
    manufacturer?: { name: string } | null;
  }) {
    return `Avis manager demandé - ${vehicleCheck.licensePlate} - ${vehicleCheck.manufacturer?.name ?? 'Véhicule'}`;
  }

  private decisionRequestText(
    vehicleCheck: {
      checkDate: Date;
      collaborator?: {
        email: string;
        firstName: string;
        lastName: string;
      } | null;
      items?: unknown[];
      licensePlate: string;
      licensePlateCountry: string;
      licensePlateRaw?: string | null;
      manufacturer?: { name: string } | null;
      vehicleModel?: { name: string } | null;
    },
    manager: { firstName: string; lastName: string },
    publicUrl: string,
    requestComment: string | null,
    personalAccessCode: string,
  ) {
    const licensePlate = formatLicensePlate(
      vehicleCheck.licensePlate,
      vehicleCheck.licensePlateCountry,
      vehicleCheck.licensePlateRaw,
    );
    const checkDate = new Intl.DateTimeFormat('fr-FR').format(
      vehicleCheck.checkDate,
    );
    const managerName = `${manager.firstName} ${manager.lastName}`.trim();
    const contactName = this.repairRequestContactName(vehicleCheck);

    return [
      `Bonjour ${managerName},`,
      '',
      `${contactName} souhaite obtenir votre avis sur un contrôle véhicule.`,
      '',
      'Informations du véhicule',
      `Véhicule : ${this.repairRequestVehicleLabel(vehicleCheck)}`,
      `Immatriculation : ${licensePlate}`,
      `Date du contrôle : ${checkDate}`,
      `Réparations contrôlées : ${vehicleCheck.items?.length ?? 0}`,
      requestComment ? '' : null,
      requestComment ? `Commentaire : ${requestComment}` : null,
      '',
      'Dossier à consulter :',
      publicUrl,
      '',
      'VOTRE CODE PERSONNEL PERMANENT',
      personalAccessCode,
      'Ce code reste identique pour toutes vos demandes.',
    ]
      .filter((line): line is string => line !== null)
      .join('\n');
  }

  private decisionRequestHtml(
    vehicleCheck: {
      checkDate: Date;
      collaborator?: {
        email: string;
        firstName: string;
        lastName: string;
      } | null;
      items?: unknown[];
      licensePlate: string;
      licensePlateCountry: string;
      licensePlateRaw?: string | null;
      manufacturer?: { name: string } | null;
      vehicleModel?: { name: string } | null;
    },
    manager: { firstName: string; lastName: string },
    publicUrl: string,
    requestComment: string | null,
    personalAccessCode: string,
  ) {
    const licensePlate = formatLicensePlate(
      vehicleCheck.licensePlate,
      vehicleCheck.licensePlateCountry,
      vehicleCheck.licensePlateRaw,
    );
    const checkDate = new Intl.DateTimeFormat('fr-FR').format(
      vehicleCheck.checkDate,
    );
    const managerName = this.escapeHtml(
      `${manager.firstName} ${manager.lastName}`.trim(),
    );
    const contactName = this.escapeHtml(
      this.repairRequestContactName(vehicleCheck),
    );
    const vehicleLabel = this.escapeHtml(
      this.repairRequestVehicleLabel(vehicleCheck),
    );
    const safePublicUrl = this.escapeHtml(publicUrl);

    return [
      '<div style="margin:0;padding:0;background:#f8fafc">',
      '<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:620px;margin:0 auto;padding:24px 16px">',
      '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:22px">',
      `<p style="margin:0 0 14px;font-size:14px;color:#475569">Bonjour ${managerName},</p>`,
      '<h1 style="margin:0 0 10px;font-size:20px;line-height:1.25;color:#0f172a">Avis manager demandé</h1>',
      `<p style="margin:0 0 18px;font-size:15px;color:#334155">${contactName} souhaite obtenir votre avis sur ce contrôle véhicule.</p>`,
      '<table style="border-collapse:separate;border-spacing:0;width:100%;margin:0 0 20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">',
      this.repairRequestInfoRow('Véhicule', vehicleLabel),
      this.repairRequestInfoRow(
        'Immatriculation',
        this.escapeHtml(licensePlate),
      ),
      this.repairRequestInfoRow('Date du contrôle', this.escapeHtml(checkDate)),
      this.repairRequestInfoRow(
        'Réparations contrôlées',
        String(vehicleCheck.items?.length ?? 0),
      ),
      '</table>',
      requestComment
        ? `<div style="margin:0 0 18px;padding:12px 14px;border-left:4px solid #0f766e;background:#f0fdfa;border-radius:8px"><p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#0f766e;text-transform:uppercase">Commentaire</p><p style="margin:0;font-size:14px;color:#134e4a">${this.escapeHtml(requestComment)}</p></div>`
        : '',
      '<p style="margin:0 0 16px;font-size:15px;color:#334155">Le dossier contient toutes les réparations contrôlées, les commentaires et les photos associées.</p>',
      `<p style="margin:0 0 16px"><a href="${safePublicUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:7px;font-weight:700">Consulter le dossier</a></p>`,
      '<div style="margin:18px 0;padding:16px;text-align:center;background:#f0fdfa;border:2px solid #0f766e;border-radius:10px">',
      '<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#0f766e">Votre code personnel permanent</p>',
      `<p style="margin:0;font-family:Arial,sans-serif;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:4px;color:#0f172a">${this.escapeHtml(personalAccessCode)}</p>`,
      '<p style="margin:8px 0 0;font-size:11px;color:#64748b">Ce code reste identique pour toutes vos demandes.</p>',
      '</div>',
      `<p style="margin:0;font-size:12px;color:#64748b">Si le bouton ne fonctionne pas, copiez ce lien :<br><a href="${safePublicUrl}" style="color:#0f766e;word-break:break-all">${safePublicUrl}</a></p>`,
      '</div>',
      '</div>',
      '</div>',
    ].join('');
  }

  private repairRequestSubject(vehicleCheck: {
    licensePlate: string;
    manufacturer?: { name: string } | null;
  }) {
    return `Demande de devis réparations - ${vehicleCheck.licensePlate} - ${vehicleCheck.manufacturer?.name ?? 'Véhicule'}`;
  }

  private repairRequestText(
    vehicleCheck: {
      checkDate: Date;
      collaborator?: {
        email: string;
        firstName: string;
        lastName: string;
      } | null;
      licensePlate: string;
      licensePlateCountry: string;
      licensePlateRaw?: string | null;
      manufacturer?: { name: string } | null;
      vehicleModel?: { name: string } | null;
    },
    publicUrl: string,
    selectedItemsCount: number,
  ) {
    const licensePlate = formatLicensePlate(
      vehicleCheck.licensePlate,
      vehicleCheck.licensePlateCountry,
      vehicleCheck.licensePlateRaw,
    );
    const checkDate = new Intl.DateTimeFormat('fr-FR').format(
      vehicleCheck.checkDate,
    );
    const contactName = this.repairRequestContactName(vehicleCheck);
    const contactEmail = this.repairRequestContactEmail(vehicleCheck);
    const contactEmailLabel = contactEmail ? ` (${contactEmail})` : '';

    return [
      'Bonjour,',
      '',
      `${contactName} souhaite obtenir un devis pour les réparations sélectionnées ci-dessous.`,
      '',
      'Informations du véhicule',
      `Véhicule : ${this.repairRequestVehicleLabel(vehicleCheck)}`,
      `Immatriculation : ${licensePlate}`,
      `Date du contrôle : ${checkDate}`,
      `Réparations sélectionnées : ${selectedItemsCount}`,
      '',
      'Dossier à consulter :',
      publicUrl,
      '',
      `Merci de transmettre votre devis en réponse à l'email de la personne qui gère le véhicule${contactEmailLabel} ou selon les modalités de l'établissement.`,
    ].join('\n');
  }

  private repairRequestHtml(
    vehicleCheck: {
      checkDate: Date;
      collaborator?: {
        email: string;
        firstName: string;
        lastName: string;
      } | null;
      licensePlate: string;
      licensePlateCountry: string;
      licensePlateRaw?: string | null;
      manufacturer?: { name: string } | null;
      vehicleModel?: { name: string } | null;
    },
    publicUrl: string,
    selectedItemsCount: number,
  ) {
    const licensePlate = formatLicensePlate(
      vehicleCheck.licensePlate,
      vehicleCheck.licensePlateCountry,
      vehicleCheck.licensePlateRaw,
    );
    const checkDate = new Intl.DateTimeFormat('fr-FR').format(
      vehicleCheck.checkDate,
    );
    const contactName = this.escapeHtml(
      this.repairRequestContactName(vehicleCheck),
    );
    const contactEmail = this.escapeHtml(
      this.repairRequestContactEmail(vehicleCheck) ?? '',
    );
    const contactEmailLabel = contactEmail
      ? ` <span style="display:inline-block;margin:0 2px;padding:2px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-weight:700;white-space:nowrap">${contactEmail}</span>`
      : '';
    const vehicleLabel = this.escapeHtml(
      this.repairRequestVehicleLabel(vehicleCheck),
    );
    const safePublicUrl = this.escapeHtml(publicUrl);

    return [
      '<div style="margin:0;padding:0;background:#f8fafc">',
      '<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:620px;margin:0 auto;padding:24px 16px">',
      '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:22px">',
      '<p style="margin:0 0 14px;font-size:14px;color:#475569">Bonjour,</p>',
      `<h1 style="margin:0 0 10px;font-size:20px;line-height:1.25;color:#0f172a">Demande de devis réparations</h1>`,
      `<p style="margin:0 0 18px;font-size:15px;color:#334155">${contactName} souhaite obtenir un devis pour les réparations sélectionnées.</p>`,
      '<table style="border-collapse:separate;border-spacing:0;width:100%;margin:0 0 20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">',
      this.repairRequestInfoRow('Véhicule', vehicleLabel),
      this.repairRequestInfoRow(
        'Immatriculation',
        this.escapeHtml(licensePlate),
      ),
      this.repairRequestInfoRow('Date du contrôle', this.escapeHtml(checkDate)),
      this.repairRequestInfoRow(
        'Réparations sélectionnées',
        String(selectedItemsCount),
      ),
      '</table>',
      '<p style="margin:0 0 16px;font-size:15px;color:#334155">Le dossier contient le détail à chiffrer, les commentaires et les photos des dommages.</p>',
      `<p style="margin:0 0 16px"><a href="${safePublicUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:7px;font-weight:700">Consulter le dossier</a></p>`,
      `<p style="margin:0 0 18px;font-size:12px;color:#64748b">Si le bouton ne fonctionne pas, copiez ce lien :<br><a href="${safePublicUrl}" style="color:#0f766e;word-break:break-all">${safePublicUrl}</a></p>`,
      `<p style="margin:0;font-size:15px;color:#334155">Merci de transmettre votre devis en réponse à l'email de la personne qui gère le véhicule${contactEmailLabel} ou selon les modalités de l'établissement.</p>`,
      '</div>',
      '</div>',
      '</div>',
    ].join('');
  }

  private repairRequestInfoRow(label: string, value: string) {
    return [
      '<tr>',
      `<td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;background:#f8fafc;font-size:13px;color:#475569;font-weight:700;width:190px">${this.escapeHtml(label)}</td>`,
      `<td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a">${value}</td>`,
      '</tr>',
    ].join('');
  }

  private repairRequestContactName(vehicleCheck: {
    collaborator?: {
      email: string;
      firstName: string;
      lastName: string;
    } | null;
  }) {
    const collaboratorName = [
      vehicleCheck.collaborator?.firstName,
      vehicleCheck.collaborator?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return (
      collaboratorName || vehicleCheck.collaborator?.email || 'Notre équipe'
    );
  }

  private repairRequestContactEmail(vehicleCheck: {
    collaborator?: {
      email: string;
      firstName: string;
      lastName: string;
    } | null;
  }) {
    return vehicleCheck.collaborator?.email?.trim() || null;
  }

  private repairRequestVehicleLabel(vehicleCheck: {
    manufacturer?: { name: string } | null;
    vehicleModel?: { name: string } | null;
  }) {
    return (
      [vehicleCheck.manufacturer?.name, vehicleCheck.vehicleModel?.name]
        .filter(Boolean)
        .join(' ') || '-'
    );
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
