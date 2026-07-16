import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import {
  PartOrderStatus,
  Prisma,
  RepairDecisionStatus,
  Role,
  VehicleCheckItemOperationalStatus,
  VehicleCheckStatus,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: CurrentUserPayload, query: DashboardQueryDto = {}) {
    const vehicleCheckScope = this.vehicleCheckScope(user, query);
    const vehicleCheckItemScope = this.vehicleCheckItemScope(user, query);
    const [
      vehicleChecksCount,
      completedVehicleChecksCount,
      vehicleChecksToAnalyzeCount,
      draftVehicleChecksCount,
      totals,
      alertItemsCount,
      partOrdersToPlaceCount,
      recentVehicleChecks,
      repairRequestNotifications,
    ] = await Promise.all([
      this.prisma.vehicleCheck.count({ where: vehicleCheckScope }),
      this.prisma.vehicleCheck.count({
        where: {
          ...vehicleCheckScope,
          status: VehicleCheckStatus.SUMMARY_READY,
        },
      }),
      this.prisma.vehicleCheck.count({
        where: { ...vehicleCheckScope, status: VehicleCheckStatus.TO_ANALYZE },
      }),
      this.prisma.vehicleCheck.count({
        where: { ...vehicleCheckScope, status: VehicleCheckStatus.DRAFT },
      }),
      this.prisma.vehicleCheck.aggregate({
        where: vehicleCheckScope,
        _sum: {
          totalInternalSavingAmount: true,
          totalInternalCost: true,
          totalExternalCost: true,
          totalDifferenceAmount: true,
        },
      }),
      this.prisma.vehicleCheckItem.count({
        where: {
          ...vehicleCheckItemScope,
          decisionStatus: {
            in: [
              RepairDecisionStatus.FORBIDDEN,
              RepairDecisionStatus.TO_CHECK,
              RepairDecisionStatus.WARNING,
            ],
          },
        },
      }),
      this.prisma.vehicleCheckItem.count({
        where: {
          ...vehicleCheckItemScope,
          partOrderStatus: PartOrderStatus.TO_ORDER,
        },
      }),
      this.prisma.vehicleCheck.findMany({
        where: vehicleCheckScope,
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
          items: {
            include: { repairType: true, vehiclePart: true },
          },
        },
      }),
      this.prisma.vehicleCheckPublicShare.findMany({
        where: {
          OR: [
            { takenInChargeAt: { not: null } },
            { vehicleRecoveredAt: { not: null } },
          ],
          vehicleCheck: vehicleCheckScope,
        },
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: {
          externalRepairContact: true,
          vehicleCheck: {
            include: {
              agency: true,
              manufacturer: true,
              vehicleModel: true,
            },
          },
        },
      }),
    ]);

    return {
      vehicleChecksCount,
      completedVehicleChecksCount,
      vehicleChecksToAnalyzeCount,
      draftVehicleChecksCount,
      totalInternalSavingAmount: this.money(
        totals._sum.totalInternalSavingAmount,
      ),
      totalInternalCost: this.money(totals._sum.totalInternalCost),
      totalExternalCost: this.money(totals._sum.totalExternalCost),
      totalDifferenceAmount: this.money(totals._sum.totalDifferenceAmount),
      alertItemsCount,
      partOrdersToPlaceCount,
      repairRequestNotifications: repairRequestNotifications
        .flatMap((share) => {
          const vehicleCheck = {
            id: share.vehicleCheck.id,
            checkNumber: share.vehicleCheck.checkNumber,
            licensePlate: share.vehicleCheck.licensePlate,
            licensePlateRaw: share.vehicleCheck.licensePlateRaw,
            licensePlateCountry: share.vehicleCheck.licensePlateCountry,
            checkDate: share.vehicleCheck.checkDate,
            city: share.vehicleCheck.city,
            manufacturer: share.vehicleCheck.manufacturer,
            vehicleModel: share.vehicleCheck.vehicleModel,
            agency: share.vehicleCheck.agency,
          };

          return [
            share.vehicleRecoveredAt
              ? {
                  eventAt: share.vehicleRecoveredAt,
                  externalRepairContact: share.externalRepairContact,
                  id: `${share.id}-recovered`,
                  type: 'VEHICLE_RECOVERED',
                  vehicleCheck,
                }
              : null,
            share.takenInChargeAt
              ? {
                  eventAt: share.takenInChargeAt,
                  externalRepairContact: share.externalRepairContact,
                  id: `${share.id}-taken-in-charge`,
                  type: 'TAKEN_IN_CHARGE',
                  vehicleCheck,
                }
              : null,
          ].filter(Boolean);
        })
        .sort((a, b) => b!.eventAt.getTime() - a!.eventAt.getTime())
        .slice(0, 6),
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
        items: check.items,
      })),
    };
  }

  async savingsByManufacturer(
    user: CurrentUserPayload,
    query: DashboardQueryDto = {},
  ) {
    const where = this.vehicleCheckScope(user, query);
    const grouped = await this.prisma.vehicleCheck.groupBy({
      by: ['manufacturerId'],
      where,
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
    const manufacturersById = new Map(
      manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]),
    );

    return grouped.map((row) => ({
      manufacturerId: row.manufacturerId,
      manufacturerName:
        manufacturersById.get(row.manufacturerId)?.name ?? 'Inconnu',
      vehicleChecksCount: row._count._all,
      totalInternalSavingAmount: this.money(row._sum.totalInternalSavingAmount),
      totalInternalCost: this.money(row._sum.totalInternalCost),
      allowanceDifferenceAmount: this.money(row._sum.allowanceDifferenceAmount),
    }));
  }

  async savingsByCollaborator(
    user: CurrentUserPayload,
    query: DashboardQueryDto = {},
  ) {
    const where = this.vehicleCheckScope(user, query);
    const grouped = await this.prisma.vehicleCheck.groupBy({
      by: ['collaboratorId'],
      where,
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
    const collaboratorsById = new Map(
      collaborators.map((collaborator) => [collaborator.id, collaborator]),
    );

    return grouped.map((row) => {
      const collaborator = collaboratorsById.get(row.collaboratorId);

      return {
        collaboratorId: row.collaboratorId,
        collaboratorName: collaborator
          ? `${collaborator.firstName} ${collaborator.lastName}`
          : 'Inconnu',
        collaboratorEmail: collaborator?.email ?? null,
        vehicleChecksCount: row._count._all,
        totalInternalSavingAmount: this.money(
          row._sum.totalInternalSavingAmount,
        ),
        totalInternalCost: this.money(row._sum.totalInternalCost),
      };
    });
  }

  async repairTypeFrequency(
    user: CurrentUserPayload,
    query: DashboardQueryDto = {},
  ) {
    const where = this.vehicleCheckItemScope(user, query);
    const grouped = await this.prisma.vehicleCheckItem.groupBy({
      by: ['repairTypeId', 'decisionStatus'],
      where,
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
    const repairTypesById = new Map(
      repairTypes.map((repairType) => [repairType.id, repairType]),
    );

    return grouped.map((row) => {
      const repairType = repairTypesById.get(row.repairTypeId);

      return {
        repairTypeId: row.repairTypeId,
        repairTypeCode: repairType?.code ?? null,
        repairTypeName: repairType?.name ?? 'Inconnu',
        decisionStatus: row.decisionStatus,
        linesCount: row._count._all,
        quantity: row._sum.quantity ?? 0,
        totalInternalSavingAmount: this.money(
          row._sum.totalInternalSavingAmount,
        ),
        totalInternalCost: this.money(row._sum.totalInternalCost),
      };
    });
  }

  async timeline(user: CurrentUserPayload, query: DashboardQueryDto = {}) {
    const period = this.timelinePeriod(query);
    const where = this.vehicleCheckScope(user, {
      ...query,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
    });
    const buckets = new Map<string, DashboardTimelineBucket>();

    for (const date of this.eachDate(period.from, period.to)) {
      const key = this.dateKey(date);
      buckets.set(key, {
        alertItemsCount: 0,
        completedVehicleChecksCount: 0,
        date: key,
        draftVehicleChecksCount: 0,
        partOrdersToPlaceCount: 0,
        totalDifferenceAmount: '0.00',
        totalInternalCost: '0.00',
        totalInternalSavingAmount: '0.00',
        vehicleChecksCount: 0,
        vehicleChecksToAnalyzeCount: 0,
      });
    }

    const checks = await this.prisma.vehicleCheck.findMany({
      where,
      select: {
        checkDate: true,
        status: true,
        totalDifferenceAmount: true,
        totalInternalCost: true,
        totalInternalSavingAmount: true,
        items: {
          where: {
            operationalStatus: VehicleCheckItemOperationalStatus.ACTIVE,
          },
          select: {
            decisionStatus: true,
            partOrderStatus: true,
          },
        },
      },
      orderBy: { checkDate: 'asc' },
    });

    const numericBuckets = new Map<
      string,
      {
        totalDifferenceAmount: Decimal;
        totalInternalCost: Decimal;
        totalInternalSavingAmount: Decimal;
      }
    >();

    checks.forEach((check) => {
      const key = this.dateKey(check.checkDate);
      const bucket = buckets.get(key);

      if (!bucket) {
        return;
      }

      const totals = numericBuckets.get(key) ?? {
        totalDifferenceAmount: new Decimal(0),
        totalInternalCost: new Decimal(0),
        totalInternalSavingAmount: new Decimal(0),
      };

      bucket.vehicleChecksCount += 1;
      if (check.status === VehicleCheckStatus.SUMMARY_READY)
        bucket.completedVehicleChecksCount += 1;
      if (check.status === VehicleCheckStatus.TO_ANALYZE)
        bucket.vehicleChecksToAnalyzeCount += 1;
      if (check.status === VehicleCheckStatus.DRAFT)
        bucket.draftVehicleChecksCount += 1;

      const alertStatuses: RepairDecisionStatus[] = [
        RepairDecisionStatus.FORBIDDEN,
        RepairDecisionStatus.TO_CHECK,
        RepairDecisionStatus.WARNING,
      ];

      check.items.forEach((item) => {
        if (alertStatuses.includes(item.decisionStatus)) {
          bucket.alertItemsCount += 1;
        }

        if (item.partOrderStatus === PartOrderStatus.TO_ORDER) {
          bucket.partOrdersToPlaceCount += 1;
        }
      });

      totals.totalDifferenceAmount = totals.totalDifferenceAmount.add(
        check.totalDifferenceAmount,
      );
      totals.totalInternalCost = totals.totalInternalCost.add(
        check.totalInternalCost,
      );
      totals.totalInternalSavingAmount = totals.totalInternalSavingAmount.add(
        check.totalInternalSavingAmount,
      );
      numericBuckets.set(key, totals);
    });

    numericBuckets.forEach((totals, key) => {
      const bucket = buckets.get(key);

      if (!bucket) {
        return;
      }

      bucket.totalDifferenceAmount = this.money(totals.totalDifferenceAmount);
      bucket.totalInternalCost = this.money(totals.totalInternalCost);
      bucket.totalInternalSavingAmount = this.money(
        totals.totalInternalSavingAmount,
      );
    });

    return Array.from(buckets.values());
  }

  private money(value?: Decimal | null): string {
    return (value ?? new Decimal(0)).toFixed(2);
  }

  private vehicleCheckScope(
    user: CurrentUserPayload,
    query: DashboardQueryDto = {},
  ): Prisma.VehicleCheckWhereInput {
    const periodWhere = this.periodWhere(query);
    const collaboratorWhere = query.collaboratorId
      ? { collaboratorId: query.collaboratorId }
      : {};

    if (user.role === Role.ADMIN) {
      return {
        ...periodWhere,
        ...collaboratorWhere,
      };
    }

    if (user.role === Role.MANAGER) {
      return {
        ...periodWhere,
        ...collaboratorWhere,
        OR: [
          { collaboratorId: user.sub },
          {
            collaborator: {
              managerAssignments: {
                some: { managerId: user.sub, isActive: true },
              },
            },
          },
        ],
      };
    }

    return {
      ...periodWhere,
      collaboratorId: user.sub,
    };
  }

  private vehicleCheckItemScope(
    user: CurrentUserPayload,
    query: DashboardQueryDto = {},
  ): Prisma.VehicleCheckItemWhereInput {
    const vehicleCheckScope = this.vehicleCheckScope(user, query);
    const baseWhere: Prisma.VehicleCheckItemWhereInput = {
      operationalStatus: VehicleCheckItemOperationalStatus.ACTIVE,
    };

    if (!Object.keys(vehicleCheckScope).length) {
      return baseWhere;
    }

    return {
      ...baseWhere,
      vehicleCheck: vehicleCheckScope,
    };
  }

  private periodWhere(query: DashboardQueryDto): Prisma.VehicleCheckWhereInput {
    if (!query.dateFrom && !query.dateTo) {
      return {};
    }

    return {
      checkDate: {
        ...(query.dateFrom ? { gte: this.startOfDay(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: this.endOfDay(query.dateTo) } : {}),
      },
    };
  }

  private startOfDay(value: string) {
    const date = this.inputDate(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private endOfDay(value: string) {
    const date = this.inputDate(value);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  private inputDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);

    if (year && month && day) {
      return new Date(year, month - 1, day);
    }

    return new Date(value);
  }

  private timelinePeriod(query: DashboardQueryDto) {
    const todayKey = this.dateKey(new Date());
    const to = query.dateTo
      ? this.endOfDay(query.dateTo)
      : this.endOfDay(todayKey);
    const from = query.dateFrom
      ? this.startOfDay(query.dateFrom)
      : this.startOfDay(this.dateKey(this.addDays(to, -30)));

    if (from <= to) {
      return {
        dateFrom: this.dateKey(from),
        dateTo: this.dateKey(to),
        from,
        to,
      };
    }

    return {
      dateFrom: this.dateKey(to),
      dateTo: this.dateKey(from),
      from: this.startOfDay(this.dateKey(to)),
      to: this.endOfDay(this.dateKey(from)),
    };
  }

  private eachDate(from: Date, to: Date) {
    const dates: Date[] = [];
    const current = this.startOfDay(this.dateKey(from));
    const end = this.startOfDay(this.dateKey(to));

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private dateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}

type DashboardTimelineBucket = {
  alertItemsCount: number;
  completedVehicleChecksCount: number;
  date: string;
  draftVehicleChecksCount: number;
  partOrdersToPlaceCount: number;
  totalDifferenceAmount: string;
  totalInternalCost: string;
  totalInternalSavingAmount: string;
  vehicleChecksCount: number;
  vehicleChecksToAnalyzeCount: number;
};
