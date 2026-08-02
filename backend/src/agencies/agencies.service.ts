import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma, VehicleCheckStatus } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { PublicVehicleStatusQueryDto } from './dto/public-vehicle-status-query.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

const inProgressStatuses: VehicleCheckStatus[] = [
  VehicleCheckStatus.DRAFT,
  VehicleCheckStatus.TO_ANALYZE,
  VehicleCheckStatus.SUMMARY_READY,
];

const completedStatuses: VehicleCheckStatus[] = [
  VehicleCheckStatus.CLOSED_NO_DAMAGE,
  VehicleCheckStatus.COMPLETED,
];

@Injectable()
export class AgenciesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.agency.findMany({
      where: { isActive: true },
      orderBy: [{ region: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });
  }

  findVehicleStatusShares() {
    return this.prisma.agencyVehicleStatusShare.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        agencyId: true,
        createdAt: true,
        isEnabled: true,
        token: true,
        updatedAt: true,
      },
    });
  }

  async renewVehicleStatusShare(agencyId: string) {
    await this.ensureExists(agencyId);

    return this.prisma.agencyVehicleStatusShare.upsert({
      where: { agencyId },
      create: {
        agencyId,
        token: randomBytes(32).toString('base64url'),
      },
      update: {
        isEnabled: true,
        token: randomBytes(32).toString('base64url'),
      },
      select: {
        agencyId: true,
        createdAt: true,
        isEnabled: true,
        token: true,
        updatedAt: true,
      },
    });
  }

  async disableVehicleStatusShare(agencyId: string) {
    const share = await this.prisma.agencyVehicleStatusShare.findUnique({
      where: { agencyId },
      select: { id: true },
    });
    if (!share) {
      throw new NotFoundException('Agency vehicle status share not found');
    }

    await this.prisma.agencyVehicleStatusShare.update({
      where: { agencyId },
      data: { isEnabled: false },
    });
    return { success: true };
  }

  async findPublicVehicleStatuses(token: string, query: PublicVehicleStatusQueryDto) {
    const share = await this.prisma.agencyVehicleStatusShare.findUnique({
      where: { token },
      select: {
        isEnabled: true,
        agency: {
          select: { code: true, city: true, id: true, isActive: true, name: true },
        },
      },
    });
    if (!share?.isEnabled || !share.agency.isActive) {
      throw new NotFoundException('Public vehicle status page not found');
    }

    const visibleStatuses = [...inProgressStatuses, ...completedStatuses];
    const filteredStatuses =
      query.status === 'IN_PROGRESS'
        ? inProgressStatuses
        : query.status === 'COMPLETED'
          ? completedStatuses
          : visibleStatuses;
    const normalizedSearch = query.search
      ?.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const where: Prisma.VehicleCheckWhereInput = {
      agencyId: share.agency.id,
      status: { in: filteredStatuses },
      ...(normalizedSearch
        ? {
            OR: [
              { licensePlate: { contains: normalizedSearch, mode: 'insensitive' } },
              { licensePlateRaw: { contains: query.search?.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total, inProgressCount, completedCount] = await this.prisma.$transaction([
      this.prisma.vehicleCheck.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { licensePlate: 'asc' }],
        skip,
        take: query.pageSize,
        select: {
          id: true,
          licensePlate: true,
          licensePlateCountry: true,
          licensePlateRaw: true,
          manufacturer: { select: { name: true } },
          publicShare: {
            select: {
              takenInChargeAt: true,
              vehicleRecoveredAt: true,
            },
          },
          status: true,
          updatedAt: true,
          vehicleModel: { select: { name: true } },
        },
      }),
      this.prisma.vehicleCheck.count({ where }),
      this.prisma.vehicleCheck.count({
        where: { agencyId: share.agency.id, status: { in: inProgressStatuses } },
      }),
      this.prisma.vehicleCheck.count({
        where: { agencyId: share.agency.id, status: { in: completedStatuses } },
      }),
    ]);

    return {
      agency: {
        code: share.agency.code,
        city: share.agency.city,
        id: share.agency.id,
        name: share.agency.name,
      },
      items: items.map((item) => ({
        id: item.id,
        licensePlate: item.licensePlate,
        licensePlateCountry: item.licensePlateCountry,
        licensePlateRaw: item.licensePlateRaw,
        manufacturer: item.manufacturer,
        location:
          item.publicShare?.takenInChargeAt && !item.publicShare.vehicleRecoveredAt
            ? 'AT_PROVIDER'
            : 'ON_SITE',
        publicStatus: inProgressStatuses.includes(item.status) ? 'IN_PROGRESS' : 'COMPLETED',
        updatedAt: item.updatedAt,
        vehicleModel: item.vehicleModel,
      })),
      page: query.page,
      pageSize: query.pageSize,
      stats: { completedCount, inProgressCount },
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async create(dto: CreateAgencyDto) {
    const data = this.normalizeCreateDto(dto);
    const existingAgency = await this.prisma.agency.findFirst({
      where: {
        OR: [
          { code: data.code },
          { AND: [{ name: data.name }, { city: data.city }] },
        ],
      },
    });

    if (existingAgency?.isActive) {
      throw new ConflictException('Agency code or city/name already exists');
    }

    if (existingAgency) {
      return this.prisma.agency.update({
        where: { id: existingAgency.id },
        data: { ...data, isActive: true },
      });
    }

    try {
      return await this.prisma.agency.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Agency code or city/name already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateAgencyDto) {
    await this.ensureExists(id);

    try {
      return await this.prisma.agency.update({ where: { id }, data: this.normalizeUpdateDto(dto) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Agency code or city/name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.agency.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id }, select: { id: true } });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }
  }

  private normalizeCreateDto(dto: CreateAgencyDto) {
    return {
      code: this.normalizeCode(dto.code),
      name: dto.name.trim(),
      city: dto.city.trim(),
      region: dto.region.trim(),
    };
  }

  private normalizeUpdateDto(dto: UpdateAgencyDto) {
    return {
      code: dto.code === undefined ? undefined : this.normalizeCode(dto.code),
      name: dto.name === undefined ? undefined : dto.name.trim(),
      city: dto.city === undefined ? undefined : dto.city.trim(),
      region: dto.region === undefined ? undefined : dto.region.trim(),
    };
  }

  private normalizeCode(code: string) {
    const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!normalizedCode) {
      throw new BadRequestException('Agency code is required');
    }

    return normalizedCode;
  }
}
