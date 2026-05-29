import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';

@Injectable()
export class ManufacturersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.manufacturer.findMany({
      include: {
        _count: { select: { models: true, repairRules: true, checks: true } },
        rule: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const manufacturer = await this.prisma.manufacturer.findUnique({
      where: { id },
      include: {
        models: { orderBy: { name: 'asc' } },
        rule: true,
        repairRules: {
          include: { repairType: true },
          orderBy: { repairType: { name: 'asc' } },
        },
      },
    });

    if (!manufacturer) {
      throw new NotFoundException('Manufacturer not found');
    }

    return manufacturer;
  }

  async create(dto: CreateManufacturerDto) {
    try {
      return await this.prisma.manufacturer.create({ data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Manufacturer already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateManufacturerDto) {
    await this.findOne(id);

    try {
      return await this.prisma.manufacturer.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Manufacturer already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.manufacturer.delete({ where: { id } });
    return { success: true };
  }
}
