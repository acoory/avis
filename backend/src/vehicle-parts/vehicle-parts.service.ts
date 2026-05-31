import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiclePartsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.vehiclePart.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }
}
