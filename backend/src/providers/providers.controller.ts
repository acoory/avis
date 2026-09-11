import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { ProvidersService } from './providers.service';

@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  findAll(
    @Query('agencyId') agencyId: string,
    @Query('includeInactive') includeInactive: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providers.findAll(agencyId, user, includeInactive === 'true');
  }

  @Post()
  create(
    @Body() dto: CreateProviderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providers.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providers.update(id, dto, user);
  }
}
