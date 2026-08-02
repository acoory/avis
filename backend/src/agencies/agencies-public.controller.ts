import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { PublicVehicleStatusQueryDto } from './dto/public-vehicle-status-query.dto';

@Controller('public/vehicle-status')
export class AgenciesPublicController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  findVehicleStatuses(
    @Param('token') token: string,
    @Query() query: PublicVehicleStatusQueryDto,
  ) {
    return this.agenciesService.findPublicVehicleStatuses(token, query);
  }
}
