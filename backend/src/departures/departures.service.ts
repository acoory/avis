import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DepartureStatus,
  Prisma,
  Role,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  formatLicensePlate,
  normalizeLicensePlate,
} from '../common/utils/license-plate';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddCommentDto,
  ChangeProviderDto,
  ChangeStatusDto,
  CreateDepartureDto,
  DateActionDto,
  DepartureHistoryQueryDto,
  UpdateDepartureDto,
} from './dto/departure.dto';

const CLOSED_STATUSES: DepartureStatus[] = [
  DepartureStatus.RETURNED,
  DepartureStatus.CANCELLED,
];
const detailInclude = {
  vehicle: true,
  provider: true,
  assignedUser: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  comments: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  histories: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
};

@Injectable()
export class DeparturesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartureDto, user: CurrentUserPayload) {
    await this.ensureAgencyAccess(dto.agencyId, user);
    const normalized = normalizeLicensePlate(dto.registration);
    if (normalized.length < 2)
      throw new BadRequestException('Immatriculation invalide.');

    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.upsert({
        where: { registration: normalized },
        create: {
          registration: normalized,
          brand: clean(dto.brand),
          model: clean(dto.model),
        },
        update: {
          ...(dto.brand ? { brand: dto.brand.trim() } : {}),
          ...(dto.model ? { model: dto.model.trim() } : {}),
        },
      });
      const active = await tx.vehicleDeparture.findFirst({
        where: { vehicleId: vehicle.id, status: { notIn: CLOSED_STATUSES } },
        include: { provider: true },
      });
      if (active) {
        throw new ConflictException({
          message: `Ce véhicule possède déjà un départ actif chez ${active.provider.name}.`,
          departureId: active.id,
        });
      }
      const departure = await tx.vehicleDeparture.create({
        data: {
          vehicleId: vehicle.id,
          agencyId: dto.agencyId,
          providerId: dto.providerId,
          interventionType: dto.interventionType,
          status: DepartureStatus.AT_PROVIDER,
          departedAt: new Date(),
          description: clean(dto.description),
          priority: dto.priority,
          appointmentAt: date(dto.appointmentAt),
          plannedDepartureAt: date(dto.plannedDepartureAt),
          estimatedReturnAt: date(dto.estimatedReturnAt),
          assignedUserId: dto.assignedUserId,
          histories: {
            create: [
              {
                userId: user.sub,
                action: 'CREATED',
                newValue: { status: DepartureStatus.AT_PROVIDER },
              },
              {
                userId: user.sub,
                action: 'DEPARTED',
                newValue: { status: DepartureStatus.AT_PROVIDER },
              },
            ],
          },
        },
        include: detailInclude,
      });
      return {
        ...departure,
        displayRegistration: formatLicensePlate(vehicle.registration),
      };
    });
  }

  async findActive(agencyId: string, user: CurrentUserPayload) {
    await this.ensureAgencyAccess(agencyId, user);
    return this.prisma.vehicleDeparture.findMany({
      where: { agencyId, status: { notIn: CLOSED_STATUSES } },
      include: {
        vehicle: true,
        provider: true,
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ provider: { displayOrder: 'asc' } }, { createdAt: 'asc' }],
    });
  }

  async findHistory(query: DepartureHistoryQueryDto, user: CurrentUserPayload) {
    await this.ensureAgencyAccess(query.agencyId, user);
    const page = Math.max(1, query.page ?? 1);
    const where: Prisma.VehicleDepartureWhereInput = {
      agencyId: query.agencyId,
      ...(query.registration
        ? {
            vehicle: {
              registration: {
                contains: normalizeLicensePlate(query.registration),
              },
            },
          }
        : {}),
      ...(query.providerId ? { providerId: query.providerId } : {}),
      ...(query.status
        ? { status: query.status }
        : { status: { in: CLOSED_STATUSES } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicleDeparture.findMany({
        where,
        include: { vehicle: true, provider: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 50,
        take: 50,
      }),
      this.prisma.vehicleDeparture.count({ where }),
    ]);
    return { items, total, page };
  }

  async findOne(id: string, user?: CurrentUserPayload) {
    const departure = await this.prisma.vehicleDeparture.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!departure)
      throw new NotFoundException('Dossier de départ introuvable.');
    if (user && departure.agencyId) {
      await this.ensureAgencyAccess(departure.agencyId, user);
    }
    return departure;
  }

  async update(id: string, dto: UpdateDepartureDto, userId: string) {
    const current = await this.findOne(id);
    const data = {
      ...dto,
      appointmentAt:
        dto.appointmentAt === undefined ? undefined : date(dto.appointmentAt),
      plannedDepartureAt:
        dto.plannedDepartureAt === undefined
          ? undefined
          : date(dto.plannedDepartureAt),
      estimatedReturnAt:
        dto.estimatedReturnAt === undefined
          ? undefined
          : date(dto.estimatedReturnAt),
    };
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleDeparture.update({ where: { id }, data });
      await tx.departureHistory.create({
        data: {
          departureId: id,
          userId,
          action: 'UPDATED',
          oldValue: snapshot(current),
          newValue: snapshot(updated),
        },
      });
      return tx.vehicleDeparture.findUniqueOrThrow({
        where: { id },
        include: detailInclude,
      });
    });
  }

  async changeStatus(id: string, dto: ChangeStatusDto, userId: string) {
    const current = await this.findOne(id);
    if (current.status === DepartureStatus.RETURNED)
      throw new BadRequestException('Ce dossier est déjà clôturé.');
    if (
      (dto.status === DepartureStatus.DEPARTED ||
        dto.status === DepartureStatus.AT_PROVIDER) &&
      !current.departedAt
    ) {
      return this.depart(id, {}, userId);
    }
    if (dto.status === DepartureStatus.READY_FOR_PICKUP) {
      return this.ready(id, userId);
    }
    if (dto.status === DepartureStatus.RETURNED) {
      return this.returnVehicle(id, {}, userId);
    }
    return this.setStatus(id, current.status, dto.status, userId);
  }

  async changeProvider(id: string, dto: ChangeProviderDto, userId: string) {
    const current = await this.findOne(id);
    if (CLOSED_STATUSES.includes(current.status))
      throw new BadRequestException(
        'Un dossier clôturé ne peut plus être déplacé.',
      );
    if (current.providerId === dto.providerId) return current;
    const provider = await this.prisma.provider.findUnique({
      where: { id: dto.providerId },
    });
    if (
      !provider?.isActive ||
      !current.agencyId ||
      provider.agencyId !== current.agencyId
    )
      throw new NotFoundException('Prestataire introuvable ou inactif.');
    return this.prisma.$transaction(async (tx) => {
      await tx.vehicleDeparture.update({
        where: { id },
        data: { providerId: dto.providerId },
      });
      await tx.departureHistory.create({
        data: {
          departureId: id,
          userId,
          action: 'PROVIDER_CHANGED',
          oldValue: { id: current.provider.id, name: current.provider.name },
          newValue: { id: provider.id, name: provider.name },
        },
      });
      return tx.vehicleDeparture.findUniqueOrThrow({
        where: { id },
        include: detailInclude,
      });
    });
  }

  async depart(id: string, dto: DateActionDto, userId: string) {
    const current = await this.findOne(id);
    if (CLOSED_STATUSES.includes(current.status) || current.departedAt)
      throw new BadRequestException(
        'Ce véhicule est déjà parti ou le dossier est clôturé.',
      );
    const at = date(dto.at) ?? new Date();
    return this.setStatus(
      id,
      current.status,
      DepartureStatus.AT_PROVIDER,
      userId,
      { departedAt: at },
      'DEPARTED',
    );
  }

  async ready(id: string, userId: string) {
    const current = await this.findOne(id);
    if (!current.departedAt || CLOSED_STATUSES.includes(current.status))
      throw new BadRequestException(
        "Le véhicule n'est pas chez le prestataire.",
      );
    return this.setStatus(
      id,
      current.status,
      DepartureStatus.READY_FOR_PICKUP,
      userId,
      { readyAt: new Date() },
      'READY_FOR_PICKUP',
    );
  }

  async returnVehicle(id: string, dto: DateActionDto, userId: string) {
    const current = await this.findOne(id);
    if (!current.departedAt || CLOSED_STATUSES.includes(current.status))
      throw new BadRequestException('Ce dossier ne peut pas être clôturé.');
    return this.setStatus(
      id,
      current.status,
      DepartureStatus.RETURNED,
      userId,
      { returnedAt: date(dto.at) ?? new Date() },
      'RETURNED',
    );
  }

  async addComment(id: string, dto: AddCommentDto, userId: string) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.departureComment.create({
        data: { departureId: id, userId, message: dto.message.trim() },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      await tx.departureHistory.create({
        data: {
          departureId: id,
          userId,
          action: 'COMMENT_ADDED',
          metadata: { commentId: comment.id },
        },
      });
      return comment;
    });
  }

  private async setStatus(
    id: string,
    from: DepartureStatus,
    to: DepartureStatus,
    userId: string,
    extra: Prisma.VehicleDepartureUpdateInput = {},
    action = 'STATUS_CHANGED',
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.vehicleDeparture.update({
        where: { id },
        data: { ...extra, status: to },
      });
      await tx.departureHistory.create({
        data: {
          departureId: id,
          userId,
          action,
          oldValue: { status: from },
          newValue: { status: to },
        },
      });
      return tx.vehicleDeparture.findUniqueOrThrow({
        where: { id },
        include: detailInclude,
      });
    });
  }

  private async ensureAgencyAccess(agencyId: string, user: CurrentUserPayload) {
    if (user.role === Role.ADMIN) return;
    const access = await this.prisma.userAgency.findUnique({
      where: { userId_agencyId: { userId: user.sub, agencyId } },
      select: { userId: true },
    });
    if (!access) throw new NotFoundException('Agence inaccessible.');
  }
}

function date(value?: string) {
  return value ? new Date(value) : undefined;
}
function clean(value?: string) {
  return value?.trim() || undefined;
}
function snapshot(value: {
  interventionType: string;
  status: string;
  description: string | null;
  priority: string;
  appointmentAt: Date | null;
  plannedDepartureAt: Date | null;
  estimatedReturnAt: Date | null;
  assignedUserId: string | null;
}): Prisma.InputJsonObject {
  return {
    interventionType: String(value.interventionType),
    status: String(value.status),
    description: value.description,
    priority: String(value.priority),
    appointmentAt: value.appointmentAt?.toISOString() ?? null,
    plannedDepartureAt: value.plannedDepartureAt?.toISOString() ?? null,
    estimatedReturnAt: value.estimatedReturnAt?.toISOString() ?? null,
    assignedUserId: value.assignedUserId,
  };
}
