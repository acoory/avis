import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: CurrentUserPayload, @Query() query: DashboardQueryDto) {
    return this.dashboardService.summary(user, query);
  }

  @Get('savings-by-manufacturer')
  savingsByManufacturer(@CurrentUser() user: CurrentUserPayload, @Query() query: DashboardQueryDto) {
    return this.dashboardService.savingsByManufacturer(user, query);
  }

  @Get('savings-by-collaborator')
  savingsByCollaborator(@CurrentUser() user: CurrentUserPayload, @Query() query: DashboardQueryDto) {
    return this.dashboardService.savingsByCollaborator(user, query);
  }

  @Get('repair-type-frequency')
  repairTypeFrequency(@CurrentUser() user: CurrentUserPayload, @Query() query: DashboardQueryDto) {
    return this.dashboardService.repairTypeFrequency(user, query);
  }
}
