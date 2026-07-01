import { BadRequestException, Injectable } from '@nestjs/common';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { FindOrCreateExternalRepairContactDto } from './dto/find-or-create-external-repair-contact.dto';

@Injectable()
export class ExternalRepairContactsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.externalRepairContact.findMany({
      where: { isActive: true },
      orderBy: [{ companyName: 'asc' }, { name: 'asc' }, { email: 'asc' }],
    });
  }

  async findOrCreate(dto: FindOrCreateExternalRepairContactDto, user: CurrentUserPayload) {
    const data = this.normalizeDto(dto);
    const existingContact = await this.prisma.externalRepairContact.findUnique({
      where: { email: data.email },
    });

    if (existingContact) {
      return this.prisma.externalRepairContact.update({
        where: { id: existingContact.id },
        data: {
          companyName: data.companyName ?? existingContact.companyName,
          isActive: true,
          name: data.name || existingContact.name,
          notes: data.notes ?? existingContact.notes,
          phone: data.phone ?? existingContact.phone,
        },
      });
    }

    return this.prisma.externalRepairContact.create({
      data: {
        ...data,
        createdById: user.sub,
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
