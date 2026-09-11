import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    agencyId: string,
    user: CurrentUserPayload,
    includeInactive = false,
  ) {
    await this.ensureAgencyAccess(agencyId, user);
    return this.prisma.provider.findMany({
      where: { agencyId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateProviderDto, user: CurrentUserPayload) {
    await this.ensureAgencyAccess(dto.agencyId, user);
    try {
      return await this.prisma.provider.create({
        data: { ...dto, name: dto.name.trim() },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Un prestataire avec ce nom existe déjà.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProviderDto, user: CurrentUserPayload) {
    const provider = await this.ensureExists(id);
    if (provider.agencyId)
      await this.ensureAgencyAccess(provider.agencyId, user);
    return this.prisma.provider.update({
      where: { id },
      data: { ...dto, name: dto.name?.trim() },
    });
  }

  private async ensureExists(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      select: { id: true, agencyId: true },
    });
    if (!provider) {
      throw new NotFoundException('Prestataire introuvable.');
    }
    return provider;
  }

  private async ensureAgencyAccess(agencyId: string, user: CurrentUserPayload) {
    if (user.role === Role.ADMIN) return;
    const access = await this.prisma.userAgency.findUnique({
      where: { userId_agencyId: { userId: user.sub, agencyId } },
    });
    if (!access) throw new NotFoundException('Agence inaccessible.');
  }
}
