import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PartOrderStatus } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePartOrderDto } from './dto/update-part-order.dto';

@Injectable()
export class VehicleCheckItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePartOrder(id: string, dto: UpdatePartOrderDto) {
    const item = await this.prisma.vehicleCheckItem.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Vehicle check item not found');
    }

    const status = dto.partOrderStatus;

    if (status === PartOrderStatus.ORDERED && dto.partOrderPrice === undefined) {
      throw new BadRequestException('Part order price is required when confirming an order');
    }

    return this.prisma.vehicleCheckItem.update({
      where: { id },
      data: {
        partOrderRequired:
          dto.partOrderRequired ?? (status ? status !== PartOrderStatus.NOT_REQUIRED : undefined),
        partOrderStatus: status,
        partOrderPrice: status === PartOrderStatus.NOT_REQUIRED ? null : dto.partOrderPrice,
        partOrderReference: status === PartOrderStatus.NOT_REQUIRED ? null : dto.partOrderReference,
        partOrderedAt: status === PartOrderStatus.ORDERED ? new Date() : undefined,
      },
      include: { repairType: true },
    });
  }
}
