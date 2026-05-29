import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PreviewRepairDecisionDto } from '../repair-decisions/dto/preview-repair-decision.dto';
import { RepairDecisionService } from '../repair-decisions/repair-decision.service';
import { CreateVehicleCheckDto } from './dto/create-vehicle-check.dto';
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
  findAll(@Query() query: ListVehicleChecksQueryDto) {
    return this.vehicleChecksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehicleChecksService.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateVehicleCheckDto) {
    return this.vehicleChecksService.create(user.sub, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleCheckDto) {
    return this.vehicleChecksService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehicleChecksService.remove(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.vehicleChecksService.complete(id);
  }

  @Post('preview-decision')
  previewDecision(@Body() dto: PreviewRepairDecisionDto) {
    return this.repairDecisionService.preview(dto.manufacturerId, dto.items);
  }
}
