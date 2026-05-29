import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRepairTypeDto } from './dto/create-repair-type.dto';
import { UpdateRepairTypeDto } from './dto/update-repair-type.dto';

@Injectable()
export class RepairTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.repairType.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateRepairTypeDto) {
    try {
      return await this.prisma.repairType.create({
        data: { ...dto, isActive: dto.isActive ?? true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Repair type code already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateRepairTypeDto) {
    await this.ensureExists(id);

    try {
      return await this.prisma.repairType.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Repair type code already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.repairType.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const repairType = await this.prisma.repairType.findUnique({ where: { id }, select: { id: true } });
    if (!repairType) {
      throw new NotFoundException('Repair type not found');
    }
  }
}
