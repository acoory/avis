import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SalvageEvaluationDto } from './dto/salvage-evaluation.dto';
import { SalvageEvaluationsService } from './salvage-evaluations.service';

@UseGuards(JwtAuthGuard)
@Controller('salvage-evaluations')
export class SalvageEvaluationsController {
  constructor(
    private readonly salvageEvaluationsService: SalvageEvaluationsService,
  ) {}

  @Post('preview.xlsx')
  async preview(
    @Body() dto: SalvageEvaluationDto,
    @Res() response: Response,
  ) {
    const workbook = await this.salvageEvaluationsService.workbook(dto);
    const filename = this.salvageEvaluationsService.filename(dto);

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    response.send(workbook);
  }

  @Post('send')
  send(@Body() dto: SalvageEvaluationDto) {
    return this.salvageEvaluationsService.send(dto);
  }
}
