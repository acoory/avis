import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ManufacturerRepairRuleStatus, Prisma } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManufacturerRepairRuleDto } from './dto/create-manufacturer-repair-rule.dto';
import { UpdateManufacturerRepairRuleDto } from './dto/update-manufacturer-repair-rule.dto';

@Injectable()
export class ManufacturerRepairRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByManufacturer(manufacturerId: string) {
    await this.ensureManufacturerExists(manufacturerId);

    return this.prisma.manufacturerRepairRule.findMany({
      where: { manufacturerId },
      include: { repairType: true, vehiclePart: true, manufacturer: true },
      orderBy: [{ repairType: { name: 'asc' } }, { vehiclePart: { displayOrder: 'asc' } }],
    });
  }

  async create(manufacturerId: string, dto: CreateManufacturerRepairRuleDto) {
    await this.ensureManufacturerExists(manufacturerId);
    await this.ensureRepairTypeExists(dto.repairTypeId);
    if (dto.vehiclePartId) await this.ensureVehiclePartExists(dto.vehiclePartId);

    const allowed = dto.allowed ?? dto.status !== ManufacturerRepairRuleStatus.FORBIDDEN;
    const mandatory = dto.mandatory ?? dto.status === ManufacturerRepairRuleStatus.MANDATORY;
    const existingRule = await this.prisma.manufacturerRepairRule.findFirst({
      where: {
        manufacturerId,
        repairTypeId: dto.repairTypeId,
        vehiclePartId: dto.vehiclePartId ?? null,
      },
    });

    if (existingRule) {
      throw new ConflictException('Repair rule already exists for this manufacturer, repair type and vehicle part');
    }

    try {
      return await this.prisma.manufacturerRepairRule.create({
        data: {
          ...dto,
          manufacturerId,
          vehiclePartId: dto.vehiclePartId ?? null,
          allowed,
          mandatory,
        },
        include: { repairType: true, vehiclePart: true, manufacturer: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Repair rule already exists for this manufacturer and repair type');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateManufacturerRepairRuleDto) {
    const existing = await this.ensureExists(id);
    if (dto.vehiclePartId) await this.ensureVehiclePartExists(dto.vehiclePartId);

    const repairTypeId = existing.repairTypeId;
    const vehiclePartId = dto.vehiclePartId ?? existing.vehiclePartId;
    const duplicateRule = await this.prisma.manufacturerRepairRule.findFirst({
      where: {
        id: { not: id },
        manufacturerId: existing.manufacturerId,
        repairTypeId,
        vehiclePartId: vehiclePartId ?? null,
      },
    });

    if (duplicateRule) {
      throw new ConflictException('Repair rule already exists for this manufacturer, repair type and vehicle part');
    }

    const data = {
      ...dto,
      allowed: dto.allowed ?? (dto.status ? dto.status !== ManufacturerRepairRuleStatus.FORBIDDEN : undefined),
      mandatory: dto.mandatory ?? (dto.status ? dto.status === ManufacturerRepairRuleStatus.MANDATORY : undefined),
    };

    return this.prisma.manufacturerRepairRule.update({
      where: { id },
      data,
      include: { repairType: true, vehiclePart: true, manufacturer: true },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.manufacturerRepairRule.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const rule = await this.prisma.manufacturerRepairRule.findUnique({
      where: { id },
      select: { id: true, manufacturerId: true, repairTypeId: true, vehiclePartId: true },
    });
    if (!rule) {
      throw new NotFoundException('Manufacturer repair rule not found');
    }
    return rule;
  }

  private async ensureManufacturerExists(id: string) {
    const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id }, select: { id: true } });
    if (!manufacturer) {
      throw new NotFoundException('Manufacturer not found');
    }
  }

  private async ensureRepairTypeExists(id: string) {
    const repairType = await this.prisma.repairType.findUnique({ where: { id }, select: { id: true } });
    if (!repairType) {
      throw new NotFoundException('Repair type not found');
    }
  }

  private async ensureVehiclePartExists(id: string) {
    const vehiclePart = await this.prisma.vehiclePart.findUnique({ where: { id }, select: { id: true } });
    if (!vehiclePart) {
      throw new NotFoundException('Vehicle part not found');
    }
  }
}
