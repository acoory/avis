import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  managerId: true,
  manager: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      collaborators: true,
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
      throw new ForbiddenException('You can only access your own collaborators');
    }

    return this.prisma.user.findMany({
      where: {
        managerId,
        role: Role.COLLABORATOR,
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
    const managerId = requester.role === Role.MANAGER ? requester.sub : dto.managerId;

    if (requester.role === Role.MANAGER && dto.role !== Role.COLLABORATOR) {
      throw new ForbiddenException('Managers can only create collaborators');
    }

    await this.validateManagerAssignment(role, managerId);
    const password = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role,
        isActive: dto.isActive ?? true,
        managerId: role === Role.COLLABORATOR ? managerId : null,
      },
      select: userSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto, requester: CurrentUserPayload) {
    const existingUser = await this.findOne(id, requester);
    const nextRole = requester.role === Role.ADMIN ? dto.role ?? existingUser.role : existingUser.role;
    const nextManagerId = requester.role === Role.MANAGER ? requester.sub : dto.managerId;

    if (requester.role === Role.MANAGER) {
      if (existingUser.role !== Role.COLLABORATOR || existingUser.managerId !== requester.sub) {
        throw new ForbiddenException('Managers can only update their own collaborators');
      }

      if (dto.role && dto.role !== Role.COLLABORATOR) {
        throw new ForbiddenException('Managers cannot change collaborator roles');
      }
    }

    await this.validateManagerAssignment(nextRole, nextManagerId, id);

    const data: Prisma.UserUpdateInput = {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: requester.role === Role.ADMIN ? dto.role : undefined,
      isActive: dto.isActive,
    };

    if (requester.role === Role.MANAGER || dto.managerId !== undefined || dto.role !== undefined) {
      data.manager =
        nextRole === Role.COLLABORATOR && nextManagerId
          ? { connect: { id: nextManagerId } }
          : { disconnect: true };
    }

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 12);
      data.refreshTokenHash = null;
    }

    if (existingUser.role === Role.MANAGER && nextRole !== Role.MANAGER) {
      await this.prisma.user.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      });
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: userSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  async remove(id: string, requester: CurrentUserPayload) {
    const user = await this.findOne(id, requester);

    if (requester.role === Role.MANAGER && (user.role !== Role.COLLABORATOR || user.managerId !== requester.sub)) {
      throw new ForbiddenException('Managers can only delete their own collaborators');
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  private userScope(requester: CurrentUserPayload): Prisma.UserWhereInput {
    if (requester.role === Role.ADMIN) {
      return {};
    }

    return {
      OR: [{ id: requester.sub }, { managerId: requester.sub }],
    };
  }

  private async validateManagerAssignment(role: Role, managerId?: string | null, userId?: string) {
    if (!managerId) {
      return;
    }

    if (role !== Role.COLLABORATOR) {
      throw new BadRequestException('Only collaborators can be attached to a manager');
    }

    if (managerId === userId) {
      throw new BadRequestException('A user cannot be their own manager');
    }

    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true, role: true, isActive: true },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    if (manager.role !== Role.MANAGER || !manager.isActive) {
      throw new BadRequestException('The selected manager must be an active manager');
    }
  }
}
