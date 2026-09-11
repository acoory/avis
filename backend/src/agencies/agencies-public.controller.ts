import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get(':token/export.xlsx')
  @Header('Cache-Control', 'no-store')
  async exportVehicleStatuses(
    @Param('token') token: string,
    @Query() query: PublicVehicleStatusQueryDto,
    @Res() response: Response,
  ) {
    const buffer = await this.agenciesService.publicVehicleStatusesWorkbook(
      token,
      query,
    );
    const filename = `suivi-vehicules-${new Date().toISOString().slice(0, 10)}.xlsx`;

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    response.send(buffer);
  }
}
