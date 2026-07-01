import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FindOrCreateExternalRepairContactDto } from './dto/find-or-create-external-repair-contact.dto';
import { ExternalRepairContactsService } from './external-repair-contacts.service';

@UseGuards(JwtAuthGuard)
@Controller('external-repair-contacts')
export class ExternalRepairContactsController {
  constructor(private readonly contactsService: ExternalRepairContactsService) {}

  @Get()
  findAll() {
    return this.contactsService.findAll();
  }

  @Post('find-or-create')
  findOrCreate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: FindOrCreateExternalRepairContactDto,
  ) {
    return this.contactsService.findOrCreate(dto, user);
  }
}
