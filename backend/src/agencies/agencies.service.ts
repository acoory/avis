import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

@Injectable()
export class AgenciesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.agency.findMany({ orderBy: [{ city: 'asc' }, { name: 'asc' }] });
  }

  async create(dto: CreateAgencyDto) {
    try {
      return await this.prisma.agency.create({ data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Agency already exists for this city');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateAgencyDto) {
    await this.ensureExists(id);

    try {
      return await this.prisma.agency.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Agency already exists for this city');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.agency.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id }, select: { id: true } });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }
  }
}
