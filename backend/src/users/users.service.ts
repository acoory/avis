import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  Prisma,
  Role,
  VehicleCheckConversationParticipantRole,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const managerSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} satisfies Prisma.UserSelect;

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  managerAssignments: {
    where: { isActive: true },
    select: {
      assignedAt: true,
      isPrimary: true,
      managerId: true,
      manager: { select: managerSelect },
    },
    orderBy: [{ isPrimary: 'desc' as const }, { assignedAt: 'asc' as const }],
  },
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      managedCollaboratorAssignments: { where: { isActive: true } },
      vehicleChecks: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(requester: CurrentUserPayload) {
    return this.prisma.user.findMany({
      where: this.userScope(requester),
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  findManagers(requester: CurrentUserPayload) {
    return this.prisma.user.findMany({
      where: {
        role: Role.MANAGER,
        isActive: true,
        ...(requester.role === Role.MANAGER ? { id: requester.sub } : {}),
      },
      select: userSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  findCollaborators(managerId: string, requester: CurrentUserPayload) {
    if (requester.role === Role.MANAGER && requester.sub !== managerId) {
      throw new ForbiddenException(
        'You can only access your own collaborators',
      );
    }

    return this.prisma.user.findMany({
      where: {
        role: Role.COLLABORATOR,
        managerAssignments: {
          some: { managerId, isActive: true },
        },
      },
      select: userSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findOne(id: string, requester?: CurrentUserPayload) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        ...(requester ? this.userScope(requester) : {}),
      },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto, requester: CurrentUserPayload) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const role = requester.role === Role.MANAGER ? Role.COLLABORATOR : dto.role;
    const managerIds =
      requester.role === Role.MANAGER
        ? [requester.sub]
        : (dto.managerIds ?? []);

    if (requester.role === Role.MANAGER && dto.role !== Role.COLLABORATOR) {
      throw new ForbiddenException('Managers can only create collaborators');
    }

    await this.validateManagerAssignments(role, managerIds);
    const password = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          password,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role,
          isActive: dto.isActive ?? true,
        },
        select: { id: true },
      });

      if (role === Role.COLLABORATOR && managerIds.length) {
        await tx.userManagerAssignment.createMany({
          data: managerIds.map((managerId, index) => ({
            collaboratorId: created.id,
            createdById: requester.sub,
            isPrimary: index === 0,
            managerId,
          })),
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        select: userSelect,
      });
    });
  }

  async update(id: string, dto: UpdateUserDto, requester: CurrentUserPayload) {
    const existingUser = await this.findOne(id, requester);
    const nextRole =
      requester.role === Role.ADMIN
        ? (dto.role ?? existingUser.role)
        : existingUser.role;
    const currentManagerIds = existingUser.managerAssignments.map(
      (assignment) => assignment.managerId,
    );
    const nextManagerIds =
      nextRole === Role.COLLABORATOR
        ? requester.role === Role.MANAGER
          ? currentManagerIds
          : (dto.managerIds ?? currentManagerIds)
        : [];

    if (requester.role === Role.MANAGER) {
      const managesUser = currentManagerIds.includes(requester.sub);
      if (existingUser.role !== Role.COLLABORATOR || !managesUser) {
        throw new ForbiddenException(
          'Managers can only update their own collaborators',
        );
      }

      if (dto.role && dto.role !== Role.COLLABORATOR) {
        throw new ForbiddenException(
          'Managers cannot change collaborator roles',
        );
      }

      if (dto.managerIds !== undefined) {
        throw new ForbiddenException(
          'Only administrators can change manager assignments',
        );
      }
    }

    await this.validateManagerAssignments(nextRole, nextManagerIds, id);

    const data: Prisma.UserUpdateInput = {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: requester.role === Role.ADMIN ? dto.role : undefined,
      isActive: dto.isActive,
    };

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 12);
      data.refreshTokenHash = null;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data, select: { id: true } });

        if (
          existingUser.role === Role.MANAGER &&
          (nextRole !== Role.MANAGER || dto.isActive === false)
        ) {
          const managedCollaborators = await tx.userManagerAssignment.findMany({
            where: { managerId: id, isActive: true },
            select: { collaboratorId: true },
          });
          await tx.userManagerAssignment.updateMany({
            where: { managerId: id, isActive: true },
            data: {
              isActive: false,
              isPrimary: false,
              unassignedAt: new Date(),
            },
          });
          await this.revokeManagerConversationAccess(
            tx,
            id,
            managedCollaborators.map((assignment) => assignment.collaboratorId),
          );
          await tx.publicAccessSession.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }

        const shouldSyncManagers =
          requester.role === Role.ADMIN &&
          (dto.managerIds !== undefined || dto.role !== undefined);
        if (shouldSyncManagers) {
          await this.syncManagerAssignments(
            tx,
            id,
            nextManagerIds,
            requester.sub,
          );
        }

        return tx.user.findUniqueOrThrow({ where: { id }, select: userSelect });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  async remove(id: string, requester: CurrentUserPayload) {
    const user = await this.findOne(id, requester);

    if (
      requester.role === Role.MANAGER &&
      (user.role !== Role.COLLABORATOR ||
        !user.managerAssignments.some(
          (assignment) => assignment.managerId === requester.sub,
        ))
    ) {
      throw new ForbiddenException(
        'Managers can only delete their own collaborators',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  private userScope(requester: CurrentUserPayload): Prisma.UserWhereInput {
    if (requester.role === Role.ADMIN) {
      return {};
    }

    return {
      OR: [
        { id: requester.sub },
        {
          managerAssignments: {
            some: { managerId: requester.sub, isActive: true },
          },
        },
      ],
    };
  }

  private async validateManagerAssignments(
    role: Role,
    managerIds: string[],
    userId?: string,
  ) {
    const uniqueManagerIds = [...new Set(managerIds)];
    if (uniqueManagerIds.length !== managerIds.length) {
      throw new BadRequestException('A manager can only be assigned once');
    }

    if (!managerIds.length) {
      return;
    }

    if (role !== Role.COLLABORATOR) {
      throw new BadRequestException(
        'Only collaborators can be attached to managers',
      );
    }

    if (userId && managerIds.includes(userId)) {
      throw new BadRequestException('A user cannot be their own manager');
    }

    const managers = await this.prisma.user.findMany({
      where: { id: { in: managerIds }, role: Role.MANAGER, isActive: true },
      select: { id: true },
    });
    if (managers.length !== managerIds.length) {
      throw new BadRequestException('Every selected manager must be active');
    }
  }

  private async syncManagerAssignments(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    managerIds: string[],
    createdById: string,
  ) {
    const existingAssignments = await tx.userManagerAssignment.findMany({
      where: { collaboratorId, isActive: true },
      select: { managerId: true },
    });
    const removedManagerIds = existingAssignments
      .map((assignment) => assignment.managerId)
      .filter((managerId) => !managerIds.includes(managerId));

    await tx.userManagerAssignment.updateMany({
      where: { collaboratorId, isActive: true },
      data: { isActive: false, isPrimary: false, unassignedAt: new Date() },
    });

    for (const [index, managerId] of managerIds.entries()) {
      await tx.userManagerAssignment.upsert({
        where: { collaboratorId_managerId: { collaboratorId, managerId } },
        create: {
          collaboratorId,
          createdById,
          isPrimary: index === 0,
          managerId,
        },
        update: {
          assignedAt: new Date(),
          createdById,
          isActive: true,
          isPrimary: index === 0,
          unassignedAt: null,
        },
      });
    }
    for (const managerId of removedManagerIds) {
      await this.revokeManagerConversationAccess(tx, managerId, [
        collaboratorId,
      ]);
    }
  }

  private async revokeManagerConversationAccess(
    tx: Prisma.TransactionClient,
    managerId: string,
    collaboratorIds: string[],
  ) {
    if (!collaboratorIds.length) return;
    await tx.vehicleCheckConversationParticipant.deleteMany({
      where: {
        role: VehicleCheckConversationParticipantRole.DECISION_MAKER,
        userId: managerId,
        conversation: {
          vehicleCheck: { collaboratorId: { in: collaboratorIds } },
        },
      },
    });
    await tx.vehicleCheckDecisionShare.updateMany({
      where: {
        managerId,
        vehicleCheck: { collaboratorId: { in: collaboratorIds } },
      },
      data: { isEnabled: false },
    });
  }
}
