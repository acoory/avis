import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto';

@Injectable()
export class VehicleModelsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(manufacturerId?: string) {
    return this.prisma.vehicleModel.findMany({
      where: manufacturerId ? { manufacturerId } : undefined,
      include: { manufacturer: true },
      orderBy: [{ manufacturer: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async create(dto: CreateVehicleModelDto) {
    await this.ensureManufacturerExists(dto.manufacturerId);

    try {
      return await this.prisma.vehicleModel.create({ data: dto, include: { manufacturer: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Vehicle model already exists for this manufacturer');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateVehicleModelDto) {
    await this.ensureExists(id);
    if (dto.manufacturerId) {
      await this.ensureManufacturerExists(dto.manufacturerId);
    }

    try {
      return await this.prisma.vehicleModel.update({
        where: { id },
        data: dto,
        include: { manufacturer: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Vehicle model already exists for this manufacturer');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.vehicleModel.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const model = await this.prisma.vehicleModel.findUnique({ where: { id }, select: { id: true } });
    if (!model) {
      throw new NotFoundException('Vehicle model not found');
    }
  }

  private async ensureManufacturerExists(id: string) {
    const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id }, select: { id: true } });
    if (!manufacturer) {
      throw new NotFoundException('Manufacturer not found');
    }
  }
}
