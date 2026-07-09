import { Controller, Get, Param, Post } from '@nestjs/common';
import { VehicleChecksService } from './vehicle-checks.service';

@Controller('public/vehicle-checks')
export class VehicleChecksPublicController {
  constructor(private readonly vehicleChecksService: VehicleChecksService) {}

  @Get('decision/:token')
  findPublicDecisionShare(@Param('token') token: string) {
    return this.vehicleChecksService.findPublicDecisionShare(token);
  }

  @Get(':token')
  findPublicShare(@Param('token') token: string) {
    return this.vehicleChecksService.findPublicShare(token);
  }

  @Post(':token/take-charge')
  takeChargePublicShare(@Param('token') token: string) {
    return this.vehicleChecksService.takeChargePublicShare(token);
  }
}
