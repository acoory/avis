import { BadRequestException, Injectable } from '@nestjs/common';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { FindOrCreateExternalRepairContactDto } from './dto/find-or-create-external-repair-contact.dto';

@Injectable()
export class ExternalRepairContactsService {
  constructor(private readonly prisma: PrismaService) {}

  findCompanies() {
    return this.prisma.externalRepairCompany.findMany({
      where: { isActive: true },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ name: 'asc' }, { email: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  findAll() {
    return this.prisma.externalRepairContact.findMany({
      where: { isActive: true },
      include: { company: true },
      orderBy: [{ companyName: 'asc' }, { name: 'asc' }, { email: 'asc' }],
    });
  }

  async findOrCreate(dto: FindOrCreateExternalRepairContactDto, user: CurrentUserPayload) {
    const data = this.normalizeDto(dto);
    const company = await this.findOrCreateCompany(data.companyId, data.companyName, user);
    const existingContact = await this.prisma.externalRepairContact.findUnique({
      where: { email: data.email },
    });

    if (existingContact) {
      return this.prisma.externalRepairContact.update({
        where: { id: existingContact.id },
        data: {
          companyId: company?.id ?? existingContact.companyId,
          companyName: company?.name ?? data.companyName ?? existingContact.companyName,
          isActive: true,
          name: data.name || existingContact.name,
          notes: data.notes ?? existingContact.notes,
          phone: data.phone ?? existingContact.phone,
        },
        include: { company: true },
      });
    }

    return this.prisma.externalRepairContact.create({
      data: {
        ...data,
        companyId: company?.id,
        companyName: company?.name ?? data.companyName,
        createdById: user.sub,
      },
      include: { company: true },
    });
  }

  async findOrCreateCompany(companyId: string | undefined, companyName: string | undefined, user: CurrentUserPayload) {
    if (companyId) {
      const company = await this.prisma.externalRepairCompany.findFirst({
        where: { id: companyId, isActive: true },
      });

      if (!company) {
        throw new BadRequestException('External repair company not found');
      }

      return company;
    }

    const name = this.optionalTrim(companyName);

    if (!name) {
      return undefined;
    }

    const existingCompany = await this.prisma.externalRepairCompany.findUnique({
      where: { name },
    });

    if (existingCompany) {
      return existingCompany.isActive
        ? existingCompany
        : this.prisma.externalRepairCompany.update({
            where: { id: existingCompany.id },
            data: { isActive: true },
          });
    }

    return this.prisma.externalRepairCompany.create({
      data: {
        createdById: user.sub,
        name,
      },
    });
  }

  private normalizeDto(dto: FindOrCreateExternalRepairContactDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    if (!email) {
      throw new BadRequestException('Contact email is required');
    }

    if (!name) {
      throw new BadRequestException('Contact name is required');
    }

    return {
      companyId: this.optionalTrim(dto.companyId),
      companyName: this.optionalTrim(dto.companyName),
      email,
      name,
      notes: this.optionalTrim(dto.notes),
      phone: this.optionalTrim(dto.phone),
    };
  }

  private optionalTrim(value?: string) {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }
}
