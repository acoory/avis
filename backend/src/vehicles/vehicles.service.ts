import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartureStatus, Role } from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { normalizeLicensePlate } from '../common/utils/license-plate';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}
  async search(
    registration: string,
    agencyId: string,
    user: CurrentUserPayload,
  ) {
    await this.ensureAgencyAccess(agencyId, user);
    const normalized = normalizeLicensePlate(registration);
    if (normalized.length < 2) return [];
    return this.prisma.vehicle.findMany({
      where: { registration: { contains: normalized } },
      take: 10,
      include: {
        departures: {
          where: {
            agencyId,
            status: {
              notIn: [DepartureStatus.RETURNED, DepartureStatus.CANCELLED],
            },
          },
          take: 1,
          include: { provider: true },
        },
      },
      orderBy: { registration: 'asc' },
    });
  }
  async departures(id: string, agencyId: string, user: CurrentUserPayload) {
    await this.ensureAgencyAccess(agencyId, user);
    return this.prisma.vehicleDeparture.findMany({
      where: { vehicleId: id, agencyId },
      include: { provider: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async ensureAgencyAccess(agencyId: string, user: CurrentUserPayload) {
    if (user.role === Role.ADMIN) return;
    const access = await this.prisma.userAgency.findUnique({
      where: { userId_agencyId: { userId: user.sub, agencyId } },
    });
    if (!access) throw new NotFoundException('Agence inaccessible.');
  }
}
