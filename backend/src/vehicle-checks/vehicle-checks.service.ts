import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PartOrderStatus,
  Prisma,
  RepairDecisionStatus,
  Role,
  VehicleCheckStatus,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { normalizeLicensePlate } from '../common/utils/license-plate';
import { PrismaService } from '../prisma/prisma.service';
import { RepairDecisionService } from '../repair-decisions/repair-decision.service';
import { CreateVehicleCheckDto } from './dto/create-vehicle-check.dto';
import { ListVehicleChecksQueryDto } from './dto/list-vehicle-checks-query.dto';
import { UpdateVehicleCheckDto } from './dto/update-vehicle-check.dto';

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
    include: { repairType: true },
    orderBy: { createdAt: 'asc' as const },
  },
  externalQuotes: {
    include: {
      items: { include: { repairType: true } },
    },
  },
};

@Injectable()
export class VehicleChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repairDecisionService: RepairDecisionService,
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
      orderBy: { createdAt: 'desc' },
    });
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

  async create(collaboratorId: string, dto: CreateVehicleCheckDto) {
    await this.ensureReferences(dto.agencyId, dto.manufacturerId, dto.vehicleModelId);
    const decision = await this.repairDecisionService.preview(dto.manufacturerId, dto.items);
    const checkNumber = await this.generateCheckNumber();

    return this.prisma.vehicleCheck.create({
      data: {
        checkNumber,
        collaboratorId,
        agencyId: dto.agencyId,
        manufacturerId: dto.manufacturerId,
        vehicleModelId: dto.vehicleModelId,
        licensePlate: normalizeLicensePlate(dto.licensePlate),
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
          create: decision.items.map((item) => ({
            repairTypeId: item.repairTypeId,
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
          })),
        },
      },
      include: vehicleCheckInclude,
    });
  }

  async update(id: string, dto: UpdateVehicleCheckDto, user: CurrentUserPayload) {
    const existing = await this.findOne(id, user);

    if (existing.status === VehicleCheckStatus.COMPLETED) {
      throw new BadRequestException('Completed vehicle checks cannot be edited');
    }

    const agencyId = dto.agencyId ?? existing.agencyId;
    const manufacturerId = dto.manufacturerId ?? existing.manufacturerId;
    const vehicleModelId = dto.vehicleModelId ?? existing.vehicleModelId ?? undefined;
    await this.ensureReferences(agencyId, manufacturerId, vehicleModelId);

    if (!dto.items) {
      return this.prisma.vehicleCheck.update({
        where: { id },
        data: {
          agencyId: dto.agencyId,
          manufacturerId: dto.manufacturerId,
          vehicleModelId: dto.vehicleModelId,
          licensePlate: dto.licensePlate ? normalizeLicensePlate(dto.licensePlate) : undefined,
          mileage: dto.mileage,
          checkDate: dto.checkDate ? new Date(dto.checkDate) : undefined,
          city: dto.city,
          notes: dto.notes,
        },
        include: vehicleCheckInclude,
      });
    }

    const decision = await this.repairDecisionService.preview(manufacturerId, dto.items);

    return this.prisma.$transaction(async (tx) => {
      await tx.vehicleCheckItem.deleteMany({ where: { vehicleCheckId: id } });

      return tx.vehicleCheck.update({
        where: { id },
        data: {
          agencyId: dto.agencyId,
          manufacturerId: dto.manufacturerId,
          vehicleModelId: dto.vehicleModelId,
          licensePlate: dto.licensePlate ? normalizeLicensePlate(dto.licensePlate) : undefined,
          mileage: dto.mileage,
          checkDate: dto.checkDate ? new Date(dto.checkDate) : undefined,
          city: dto.city,
          notes: dto.notes,
          totalInternalSavingAmount: decision.totalInternalSavingAmount,
          totalInternalCost: decision.totalInternalCost,
          constructorAllowanceAmount: decision.constructorAllowanceAmount,
          allowanceDifferenceAmount: decision.allowanceDifferenceAmount,
          decisionSummary: decision.decisionSummary,
          items: {
            create: decision.items.map((item) => ({
              repairTypeId: item.repairTypeId,
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
            })),
          },
        },
        include: vehicleCheckInclude,
      });
    });
  }

  async complete(id: string, user: CurrentUserPayload) {
    const vehicleCheck = await this.findOne(id, user);

    if (!vehicleCheck.items.length) {
      throw new BadRequestException('A vehicle check must contain at least one repair item');
    }

    const hasForbiddenItem = vehicleCheck.items.some(
      (item) => item.decisionStatus === RepairDecisionStatus.FORBIDDEN,
    );

    if (hasForbiddenItem) {
      throw new BadRequestException('A vehicle check with forbidden repair items cannot be completed');
    }

    return this.prisma.vehicleCheck.update({
      where: { id },
      data: { status: VehicleCheckStatus.COMPLETED },
      include: vehicleCheckInclude,
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    await this.findOne(id, user);
    await this.prisma.vehicleCheck.delete({ where: { id } });
    return { success: true };
  }

  private scopeWhere(user: CurrentUserPayload): Prisma.VehicleCheckWhereInput {
    if (user.role === Role.ADMIN) {
      return {};
    }

    if (user.role === Role.MANAGER) {
      return {
        OR: [{ collaboratorId: user.sub }, { collaborator: { managerId: user.sub } }],
      };
    }

    return {
      collaboratorId: user.sub,
    };
  }

  private async ensureReferences(agencyId: string, manufacturerId: string, vehicleModelId?: string) {
    const [agency, manufacturer, vehicleModel] = await Promise.all([
      this.prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true } }),
      this.prisma.manufacturer.findUnique({ where: { id: manufacturerId }, select: { id: true } }),
      vehicleModelId
        ? this.prisma.vehicleModel.findUnique({
            where: { id: vehicleModelId },
            select: { id: true, manufacturerId: true },
          })
        : null,
    ]);

    if (!agency) throw new NotFoundException('Agency not found');
    if (!manufacturer) throw new NotFoundException('Manufacturer not found');
    if (vehicleModelId && !vehicleModel) throw new NotFoundException('Vehicle model not found');
    if (vehicleModel && vehicleModel.manufacturerId !== manufacturerId) {
      throw new BadRequestException('Vehicle model does not belong to selected manufacturer');
    }
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
    const count = await this.prisma.vehicleCheck.count({
      where: {
        checkNumber: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
}
