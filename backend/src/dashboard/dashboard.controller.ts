import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboardService.summary();
  }

  @Get('savings-by-manufacturer')
  savingsByManufacturer() {
    return this.dashboardService.savingsByManufacturer();
  }

  @Get('savings-by-collaborator')
  savingsByCollaborator() {
    return this.dashboardService.savingsByCollaborator();
  }

  @Get('repair-type-frequency')
  repairTypeFrequency() {
    return this.dashboardService.repairTypeFrequency();
  }
}
