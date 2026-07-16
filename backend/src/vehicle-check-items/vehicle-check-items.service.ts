import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PartOrderStatus,
  Prisma,
  VehicleCheckItemOperationalStatus,
  VehicleCheckStatus,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOperationalStatusDto } from './dto/update-operational-status.dto';
import { UpdatePartOrderDto } from './dto/update-part-order.dto';

@Injectable()
export class VehicleCheckItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePartOrder(id: string, dto: UpdatePartOrderDto) {
    const item = await this.prisma.vehicleCheckItem.findUnique({
      where: { id },
      select: {
        id: true,
        operationalStatus: true,
        vehicleCheck: { select: { status: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Vehicle check item not found');
    }

    if (item.operationalStatus !== VehicleCheckItemOperationalStatus.ACTIVE) {
      throw new BadRequestException(
        'Part orders cannot be updated on an inactive repair item',
      );
    }

    if (item.vehicleCheck.status === VehicleCheckStatus.COMPLETED) {
      throw new BadRequestException(
        'Part orders cannot be updated on a completed vehicle check',
      );
    }

    const status = dto.partOrderStatus;

    return this.prisma.vehicleCheckItem.update({
      where: { id },
      data: {
        partOrderRequired:
          dto.partOrderRequired ??
          (status ? status !== PartOrderStatus.NOT_REQUIRED : undefined),
        partOrderStatus: status,
        partOrderPrice: status ? null : undefined,
        partOrderReference: status ? null : undefined,
        partOrderedAt:
          status === PartOrderStatus.ORDERED
            ? new Date()
            : status
              ? null
              : undefined,
      },
      include: { repairType: true, vehiclePart: true },
    });
  }

  async updateOperationalStatus(
    id: string,
    dto: UpdateOperationalStatusDto,
    user: CurrentUserPayload,
  ) {
    const existing = await this.prisma.vehicleCheckItem.findUnique({
      where: { id },
      select: {
        id: true,
        vehicleCheckId: true,
        operationalStatus: true,
        operationalComment: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Vehicle check item not found');
    }

    const operationalComment = dto.operationalComment?.trim() || null;

    if (
      dto.operationalStatus !== VehicleCheckItemOperationalStatus.ACTIVE &&
      !operationalComment
    ) {
      throw new BadRequestException(
        'A comment is required for this repair status',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleCheckItem.update({
        where: { id },
        data: {
          operationalStatus: dto.operationalStatus,
          operationalComment,
          ...(dto.operationalStatus !== VehicleCheckItemOperationalStatus.ACTIVE
            ? {
                partOrderRequired: false,
                partOrderStatus: PartOrderStatus.NOT_REQUIRED,
                partOrderPrice: null,
                partOrderReference: null,
                partOrderedAt: null,
              }
            : {}),
        },
        include: { repairType: true, vehiclePart: true },
      });

      if (
        existing.operationalStatus !== dto.operationalStatus ||
        (existing.operationalComment ?? null) !== operationalComment
      ) {
        await tx.vehicleCheckItemStatusHistory.create({
          data: {
            vehicleCheckItemId: id,
            userId: user.sub,
            fromStatus: existing.operationalStatus,
            toStatus: dto.operationalStatus,
            comment: operationalComment,
          },
        });
      }

      await this.refreshVehicleCheckTotals(tx, existing.vehicleCheckId);
      return tx.vehicleCheckItem.findUniqueOrThrow({
        where: { id: updated.id },
        include: this.vehicleCheckItemInclude(),
      });
    });
  }

  private vehicleCheckItemInclude() {
    return {
      repairType: true,
      vehiclePart: true,
      statusHistories: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      photos: {
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private async refreshVehicleCheckTotals(
    tx: Prisma.TransactionClient,
    vehicleCheckId: string,
  ) {
    const [vehicleCheck, totals] = await Promise.all([
      tx.vehicleCheck.findUnique({
        where: { id: vehicleCheckId },
        select: { constructorAllowanceAmount: true },
      }),
      tx.vehicleCheckItem.aggregate({
        where: {
          vehicleCheckId,
          operationalStatus: VehicleCheckItemOperationalStatus.ACTIVE,
          selectedForSummary: true,
        },
        _sum: {
          totalInternalSavingAmount: true,
          totalInternalCost: true,
        },
      }),
    ]);

    if (!vehicleCheck) {
      throw new NotFoundException('Vehicle check not found');
    }

    await tx.vehicleCheck.update({
      where: { id: vehicleCheckId },
      data: {
        totalInternalSavingAmount: totals._sum.totalInternalSavingAmount ?? 0,
        totalInternalCost: totals._sum.totalInternalCost ?? 0,
        allowanceDifferenceAmount: vehicleCheck.constructorAllowanceAmount,
      },
    });
  }
}
