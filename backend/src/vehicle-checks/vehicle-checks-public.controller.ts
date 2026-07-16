import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PublicAccessCodeService } from '../public-access/public-access-code.service';
import { VehicleChecksService } from './vehicle-checks.service';

@Controller('public/vehicle-checks')
export class VehicleChecksPublicController {
  constructor(
    private readonly vehicleChecksService: VehicleChecksService,
    private readonly publicAccessService: PublicAccessCodeService,
  ) {}

  @Get('decision/:token')
  async findPublicDecisionShare(
    @Param('token') token: string,
    @Req() request: Request,
  ) {
    await this.publicAccessService.requireAccess(token, request);
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
