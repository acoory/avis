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
      include: { repairType: true, manufacturer: true },
      orderBy: { repairType: { name: 'asc' } },
    });
  }

  async create(manufacturerId: string, dto: CreateManufacturerRepairRuleDto) {
    await this.ensureManufacturerExists(manufacturerId);
    await this.ensureRepairTypeExists(dto.repairTypeId);

    const allowed = dto.allowed ?? dto.status !== ManufacturerRepairRuleStatus.FORBIDDEN;
    const mandatory = dto.mandatory ?? dto.status === ManufacturerRepairRuleStatus.MANDATORY;

    try {
      return await this.prisma.manufacturerRepairRule.create({
        data: {
          ...dto,
          manufacturerId,
          allowed,
          mandatory,
        },
        include: { repairType: true, manufacturer: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Repair rule already exists for this manufacturer and repair type');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateManufacturerRepairRuleDto) {
    await this.ensureExists(id);

    return this.prisma.manufacturerRepairRule.update({
      where: { id },
      data: dto,
      include: { repairType: true, manufacturer: true },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.manufacturerRepairRule.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const rule = await this.prisma.manufacturerRepairRule.findUnique({ where: { id }, select: { id: true } });
    if (!rule) {
      throw new NotFoundException('Manufacturer repair rule not found');
    }
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
}
