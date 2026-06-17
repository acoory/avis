import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

@Injectable()
export class AgenciesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.agency.findMany({
      where: { isActive: true },
      orderBy: [{ region: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });
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
