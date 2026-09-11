import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { VehiclesService } from './vehicles.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}
  @Get('search') search(
    @Query('registration') registration: string,
    @Query('agencyId') agencyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vehicles.search(registration, agencyId, user);
  }
  @Get(':id/departures') departures(
    @Param('id') id: string,
    @Query('agencyId') agencyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vehicles.departures(id, agencyId, user);
  }
}
