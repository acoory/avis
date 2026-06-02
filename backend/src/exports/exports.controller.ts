import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ExportVehicleChecksQueryDto } from './dto/export-vehicle-checks-query.dto';
import { ExportsService } from './exports.service';

@UseGuards(JwtAuthGuard)
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('vehicle-checks.xlsx')
  async exportVehicleChecks(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ExportVehicleChecksQueryDto,
    @Res() response: Response,
  ) {
    const buffer = await this.exportsService.vehicleChecksWorkbook(query, user);
    const filename = `vehicle-checks-${new Date().toISOString().slice(0, 10)}.xlsx`;

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.send(buffer);
  }
}
