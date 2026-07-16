import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PreviewRepairDecisionDto } from '../repair-decisions/dto/preview-repair-decision.dto';
import { RepairDecisionService } from '../repair-decisions/repair-decision.service';
import { CheckVehicleCheckDuplicateDto } from './dto/check-vehicle-check-duplicate.dto';
import { CreatePublicShareDto } from './dto/create-public-share.dto';
import { CreateVehicleCheckDto } from './dto/create-vehicle-check.dto';
import { FinalizeVehicleCheckSummaryDto } from './dto/finalize-vehicle-check-summary.dto';
import { ListVehicleChecksQueryDto } from './dto/list-vehicle-checks-query.dto';
import { SendDecisionRequestEmailDto } from './dto/send-decision-request-email.dto';
import { SendRepairRequestEmailDto } from './dto/send-repair-request-email.dto';
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
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListVehicleChecksQueryDto,
  ) {
    return this.vehicleChecksService.findAll(query, user);
  }

  @Get('decision-managers')
  findDecisionManagers(@CurrentUser() user: CurrentUserPayload) {
    return this.vehicleChecksService.findDecisionManagers(user);
  }

  @Post('duplicate-check')
  checkDuplicate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CheckVehicleCheckDuplicateDto,
  ) {
    return this.vehicleChecksService.checkDuplicate(dto, user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.vehicleChecksService.findOne(id, user);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateVehicleCheckDto,
  ) {
    return this.vehicleChecksService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleCheckDto,
  ) {
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

  @Post(':id/public-share')
  createPublicShare(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreatePublicShareDto,
  ) {
    return this.vehicleChecksService.createPublicShare(id, user, dto);
  }

  @Post(':id/repair-request-email')
  sendRepairRequestEmail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SendRepairRequestEmailDto,
  ) {
    return this.vehicleChecksService.sendRepairRequestEmail(id, user, dto);
  }

  @Post(':id/decision-request-email')
  sendDecisionRequestEmail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SendDecisionRequestEmailDto,
  ) {
    return this.vehicleChecksService.sendDecisionRequestEmail(id, user, dto);
  }

  @Post(':id/public-share/recovered')
  markVehicleRecovered(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.vehicleChecksService.markVehicleRecovered(id, user);
  }

  @Post('preview-decision')
  previewDecision(@Body() dto: PreviewRepairDecisionDto) {
    return this.repairDecisionService.preview(dto.manufacturerId, dto.items);
  }
}
