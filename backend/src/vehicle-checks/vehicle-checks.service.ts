import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PartOrderStatus,
  Prisma,
  RepairDecisionStatus,
  Role,
  VehicleCheckItemOperationalStatus,
  VehicleCheckStatus,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  normalizeLicensePlate,
  normalizeLicensePlateCountry,
  sanitizeLicensePlateRaw,
} from '../common/utils/license-plate';
import { PrismaService } from '../prisma/prisma.service';
import { RepairDecisionService } from '../repair-decisions/repair-decision.service';
import { CloudinaryService } from '../damage-photos/cloudinary.service';
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
};

@Injectable()
export class VehicleChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repairDecisionService: RepairDecisionService,
    private readonly cloudinaryService: CloudinaryService,
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
    await this.ensureVehicleParts(dto.items.map((item) => item.vehiclePartId));
    const decision = dto.items.length
      ? await this.repairDecisionService.preview(dto.manufacturerId, dto.items)
      : await this.emptyDecisionForManufacturer(dto.manufacturerId);
    const checkNumber = await this.generateCheckNumber();

    return this.prisma.vehicleCheck.create({
      data: {
        checkNumber,
        collaboratorId,
        agencyId: dto.agencyId,
        manufacturerId: dto.manufacturerId,
        vehicleModelId: dto.vehicleModelId,
        licensePlate: normalizeLicensePlate(dto.licensePlate),
        licensePlateRaw: sanitizeLicensePlateRaw(dto.licensePlate),
        licensePlateCountry: normalizeLicensePlateCountry(dto.licensePlateCountry ?? 'FR'),
        licensePlateRecognitionConfidence: dto.licensePlateRecognitionConfidence,
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
  }

  async update(id: string, dto: UpdateVehicleCheckDto, user: CurrentUserPayload) {
    const existing = await this.findOne(id, user);

    const agencyId = dto.agencyId ?? existing.agencyId;
    const manufacturerId = dto.manufacturerId ?? existing.manufacturerId;
    const vehicleModelId = dto.vehicleModelId ?? existing.vehicleModelId ?? undefined;
    await this.ensureReferences(agencyId, manufacturerId, vehicleModelId);
    if (dto.items) {
      await this.ensureVehicleParts(dto.items.map((item) => item.vehiclePartId));
    }

    if (!dto.items) {
      const updated = await this.prisma.vehicleCheck.update({
        where: { id },
        data: {
          agencyId: dto.agencyId,
          manufacturerId: dto.manufacturerId,
          vehicleModelId: dto.vehicleModelId,
          licensePlate: dto.licensePlate ? normalizeLicensePlate(dto.licensePlate) : undefined,
          licensePlateRaw: dto.licensePlate ? sanitizeLicensePlateRaw(dto.licensePlate) : undefined,
          licensePlateCountry: dto.licensePlateCountry
            ? normalizeLicensePlateCountry(dto.licensePlateCountry)
            : undefined,
          licensePlateRecognitionConfidence: dto.licensePlateRecognitionConfidence,
          mileage: dto.mileage,
          checkDate: dto.checkDate ? new Date(dto.checkDate) : undefined,
          city: dto.city,
          notes: dto.notes,
        },
        include: vehicleCheckInclude,
      });

      return updated;
    }

    const decision = dto.items.length
      ? await this.repairDecisionService.preview(manufacturerId, dto.items)
      : await this.emptyDecisionForManufacturer(manufacturerId);

    if (
      existing.status === VehicleCheckStatus.COMPLETED &&
      decision.items.some((item) => item.decisionStatus === RepairDecisionStatus.FORBIDDEN)
    ) {
      throw new BadRequestException(
        'A completed vehicle check cannot contain forbidden repair items',
      );
    }

    const existingPhotoPublicIds = existing.items.flatMap((item) =>
      item.photos.map((photo) => photo.publicId),
    );
    const retainedPhotoPublicIds = new Set(
      dto.items.flatMap((item) => (item.photos ?? []).map((photo) => photo.publicId)),
    );
    const removedPhotoPublicIds = existingPhotoPublicIds.filter(
      (publicId) => !retainedPhotoPublicIds.has(publicId),
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.vehicleCheckItem.deleteMany({ where: { vehicleCheckId: id } });

      return tx.vehicleCheck.update({
        where: { id },
        data: {
          agencyId: dto.agencyId,
          manufacturerId: dto.manufacturerId,
          vehicleModelId: dto.vehicleModelId,
          licensePlate: dto.licensePlate ? normalizeLicensePlate(dto.licensePlate) : undefined,
          licensePlateRaw: dto.licensePlate ? sanitizeLicensePlateRaw(dto.licensePlate) : undefined,
          licensePlateCountry: dto.licensePlateCountry
            ? normalizeLicensePlateCountry(dto.licensePlateCountry)
            : undefined,
          licensePlateRecognitionConfidence: dto.licensePlateRecognitionConfidence,
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

    });

    await Promise.allSettled(
      removedPhotoPublicIds.map((publicId) => this.cloudinaryService.destroy(publicId)),
    );

    return updated;
  }

  async complete(id: string, user: CurrentUserPayload) {
    const vehicleCheck = await this.findOne(id, user);

    const hasForbiddenItem = vehicleCheck.items.some(
      (item) =>
        item.operationalStatus === VehicleCheckItemOperationalStatus.ACTIVE &&
        item.decisionStatus === RepairDecisionStatus.FORBIDDEN,
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
    const vehicleCheck = await this.findOne(id, user);

    if (vehicleCheck.status !== VehicleCheckStatus.DRAFT) {
      throw new BadRequestException('Only draft vehicle checks can be deleted');
    }

    const photoPublicIds = vehicleCheck.items.flatMap((item) =>
      item.photos.map((photo) => photo.publicId),
    );
    await this.prisma.vehicleCheck.delete({ where: { id } });
    await Promise.allSettled(
      photoPublicIds.map((publicId) => this.cloudinaryService.destroy(publicId)),
    );
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

  private async ensureVehicleParts(vehiclePartIds: Array<string | undefined>) {
    const uniqueVehiclePartIds = [
      ...new Set(vehiclePartIds.filter((vehiclePartId): vehiclePartId is string => Boolean(vehiclePartId))),
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

    const constructorAllowanceAmount = manufacturer.rule?.constructorAllowanceAmount ?? '0';

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
