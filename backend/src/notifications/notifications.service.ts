import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(recipientId: string, take = 12) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId },
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              firstName: true,
              id: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.notification.count({
        where: { recipientId, readAt: null },
      }),
    ]);

    return { items, unreadCount };
  }

  async markRead(id: string, recipientId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId },
      select: { id: true, readAt: true },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.readAt) {
      await this.prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }

    return { success: true };
  }

  async markAllRead(recipientId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async notifyVehicleEvent(
    vehicleCheckId: string,
    type: NotificationType,
    actorId?: string,
  ) {
    const vehicleCheck = await this.prisma.vehicleCheck.findUnique({
      where: { id: vehicleCheckId },
      select: {
        collaboratorId: true,
        collaborator: {
          select: {
            managerAssignments: {
              where: { isActive: true, manager: { isActive: true } },
              select: { managerId: true },
            },
          },
        },
      },
    });
    if (!vehicleCheck) {
      return;
    }

    const recipientIds = [
      vehicleCheck.collaboratorId,
      ...vehicleCheck.collaborator.managerAssignments.map(
        (assignment) => assignment.managerId,
      ),
    ].filter(
      (id, index, values) => id !== actorId && values.indexOf(id) === index,
    );
    if (!recipientIds.length) {
      return;
    }

    const existing = await this.prisma.notification.findMany({
      where: { recipientId: { in: recipientIds }, type, vehicleCheckId },
      select: { recipientId: true },
    });
    const existingRecipientIds = new Set(
      existing.map((item) => item.recipientId),
    );
    const title =
      type === NotificationType.VEHICLE_RECOVERED
        ? 'Vehicule recupere'
        : 'Demande prise en charge';

    const newRecipientIds = recipientIds.filter(
      (recipientId) => !existingRecipientIds.has(recipientId),
    );
    if (newRecipientIds.length) {
      await this.prisma.notification.createMany({
        data: newRecipientIds.map((recipientId) => ({
          actorId,
          recipientId,
          route: `/dashboard/vehicle-checks/${vehicleCheckId}`,
          title,
          type,
          vehicleCheckId,
        })),
      });
    }
  }
}
