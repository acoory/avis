import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PreviewRepairDecisionDto } from '../repair-decisions/dto/preview-repair-decision.dto';
import { RepairDecisionService } from '../repair-decisions/repair-decision.service';
import { CreateVehicleCheckDto } from './dto/create-vehicle-check.dto';
import { FinalizeVehicleCheckSummaryDto } from './dto/finalize-vehicle-check-summary.dto';
import { ListVehicleChecksQueryDto } from './dto/list-vehicle-checks-query.dto';
import { UpdateVehicleCheckDto } from './dto/update-vehicle-check.dto';
import { VehicleChecksService } from './vehicle-checks.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicle-checks')
export class VehicleChecksController {
  constructor(
    private readonly vehicleChecksService: VehicleChecksService,
    private readonly repairDecisionService: RepairDecisionService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload, @Query() query: ListVehicleChecksQueryDto) {
    return this.vehicleChecksService.findAll(query, user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.vehicleChecksService.findOne(id, user);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateVehicleCheckDto) {
    return this.vehicleChecksService.create(user.sub, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateVehicleCheckDto) {
    return this.vehicleChecksService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.vehicleChecksService.remove(id, user);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.vehicleChecksService.complete(id, user);
  }

  @Post(':id/finalize-summary')
  finalizeSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: FinalizeVehicleCheckSummaryDto,
  ) {
    return this.vehicleChecksService.finalizeSummary(id, dto, user);
  }

  @Post('preview-decision')
  previewDecision(@Body() dto: PreviewRepairDecisionDto) {
    return this.repairDecisionService.preview(dto.manufacturerId, dto.items);
  }
}
