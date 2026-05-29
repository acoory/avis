import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertManufacturerRuleDto } from './dto/upsert-manufacturer-rule.dto';

@Injectable()
export class ManufacturerRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(manufacturerId: string) {
    await this.ensureManufacturerExists(manufacturerId);

    const rule = await this.prisma.manufacturerRule.findUnique({
      where: { manufacturerId },
      include: { manufacturer: true },
    });

    if (!rule) {
      throw new NotFoundException('Manufacturer rule not found');
    }

    return rule;
  }

  async upsert(manufacturerId: string, dto: UpsertManufacturerRuleDto) {
    await this.ensureManufacturerExists(manufacturerId);

    return this.prisma.manufacturerRule.upsert({
      where: { manufacturerId },
      update: dto,
      create: {
        manufacturerId,
        ...dto,
        revisionRequired: dto.revisionRequired ?? false,
      },
      include: { manufacturer: true },
    });
  }

  private async ensureManufacturerExists(id: string) {
    const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id }, select: { id: true } });
    if (!manufacturer) {
      throw new NotFoundException('Manufacturer not found');
    }
  }
}
