import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { RepairDecisionStatus, VehicleCheckStatus } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      vehicleChecksCount,
      completedVehicleChecksCount,
      draftVehicleChecksCount,
      totals,
      alertItemsCount,
      recentVehicleChecks,
    ] = await Promise.all([
      this.prisma.vehicleCheck.count(),
      this.prisma.vehicleCheck.count({ where: { status: VehicleCheckStatus.COMPLETED } }),
      this.prisma.vehicleCheck.count({ where: { status: VehicleCheckStatus.DRAFT } }),
      this.prisma.vehicleCheck.aggregate({
        _sum: {
          totalInternalSavingAmount: true,
          totalInternalCost: true,
          totalExternalCost: true,
          totalDifferenceAmount: true,
        },
      }),
      this.prisma.vehicleCheckItem.count({
        where: {
          decisionStatus: {
            in: [
              RepairDecisionStatus.FORBIDDEN,
              RepairDecisionStatus.TO_CHECK,
              RepairDecisionStatus.WARNING,
              RepairDecisionStatus.NOT_PROFITABLE,
            ],
          },
        },
      }),
      this.prisma.vehicleCheck.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          collaborator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          agency: true,
          manufacturer: true,
          vehicleModel: true,
        },
      }),
    ]);

    return {
      vehicleChecksCount,
      completedVehicleChecksCount,
      draftVehicleChecksCount,
      totalInternalSavingAmount: this.money(totals._sum.totalInternalSavingAmount),
      totalInternalCost: this.money(totals._sum.totalInternalCost),
      totalExternalCost: this.money(totals._sum.totalExternalCost),
      totalDifferenceAmount: this.money(totals._sum.totalDifferenceAmount),
      alertItemsCount,
      recentVehicleChecks: recentVehicleChecks.map((check) => ({
        id: check.id,
        checkNumber: check.checkNumber,
        licensePlate: check.licensePlate,
        status: check.status,
        checkDate: check.checkDate,
        city: check.city,
        totalInternalSavingAmount: this.money(check.totalInternalSavingAmount),
        totalInternalCost: this.money(check.totalInternalCost),
        allowanceDifferenceAmount: this.money(check.allowanceDifferenceAmount),
        manufacturer: check.manufacturer,
        vehicleModel: check.vehicleModel,
        agency: check.agency,
        collaborator: check.collaborator,
      })),
    };
  }

  async savingsByManufacturer() {
    const grouped = await this.prisma.vehicleCheck.groupBy({
      by: ['manufacturerId'],
      _count: { _all: true },
      _sum: {
        totalInternalSavingAmount: true,
        totalInternalCost: true,
        allowanceDifferenceAmount: true,
      },
      orderBy: {
        _sum: {
          totalInternalSavingAmount: 'desc',
        },
      },
    });

    const manufacturers = await this.prisma.manufacturer.findMany({
      where: { id: { in: grouped.map((row) => row.manufacturerId) } },
      select: { id: true, name: true },
    });
    const manufacturersById = new Map(manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]));

    return grouped.map((row) => ({
      manufacturerId: row.manufacturerId,
      manufacturerName: manufacturersById.get(row.manufacturerId)?.name ?? 'Inconnu',
      vehicleChecksCount: row._count._all,
      totalInternalSavingAmount: this.money(row._sum.totalInternalSavingAmount),
      totalInternalCost: this.money(row._sum.totalInternalCost),
      allowanceDifferenceAmount: this.money(row._sum.allowanceDifferenceAmount),
    }));
  }

  async savingsByCollaborator() {
    const grouped = await this.prisma.vehicleCheck.groupBy({
      by: ['collaboratorId'],
      _count: { _all: true },
      _sum: {
        totalInternalSavingAmount: true,
        totalInternalCost: true,
      },
      orderBy: {
        _sum: {
          totalInternalSavingAmount: 'desc',
        },
      },
    });

    const collaborators = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((row) => row.collaboratorId) } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const collaboratorsById = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]));

    return grouped.map((row) => {
      const collaborator = collaboratorsById.get(row.collaboratorId);

      return {
        collaboratorId: row.collaboratorId,
        collaboratorName: collaborator
          ? `${collaborator.firstName} ${collaborator.lastName}`
          : 'Inconnu',
        collaboratorEmail: collaborator?.email ?? null,
        vehicleChecksCount: row._count._all,
        totalInternalSavingAmount: this.money(row._sum.totalInternalSavingAmount),
        totalInternalCost: this.money(row._sum.totalInternalCost),
      };
    });
  }

  async repairTypeFrequency() {
    const grouped = await this.prisma.vehicleCheckItem.groupBy({
      by: ['repairTypeId', 'decisionStatus'],
      _count: { _all: true },
      _sum: {
        quantity: true,
        totalInternalSavingAmount: true,
        totalInternalCost: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
    });

    const repairTypes = await this.prisma.repairType.findMany({
      where: { id: { in: grouped.map((row) => row.repairTypeId) } },
      select: { id: true, code: true, name: true },
    });
    const repairTypesById = new Map(repairTypes.map((repairType) => [repairType.id, repairType]));

    return grouped.map((row) => {
      const repairType = repairTypesById.get(row.repairTypeId);

      return {
        repairTypeId: row.repairTypeId,
        repairTypeCode: repairType?.code ?? null,
        repairTypeName: repairType?.name ?? 'Inconnu',
        decisionStatus: row.decisionStatus,
        linesCount: row._count._all,
        quantity: row._sum.quantity ?? 0,
        totalInternalSavingAmount: this.money(row._sum.totalInternalSavingAmount),
        totalInternalCost: this.money(row._sum.totalInternalCost),
      };
    });
  }

  private money(value?: Decimal | null): string {
    return (value ?? new Decimal(0)).toFixed(2);
  }
}
