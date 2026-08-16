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
import { CreateRiskMessageDto } from './dto/create-risk-message.dto';
import { CreateRiskPhotoDto } from './dto/create-risk-photo.dto';
import { CreateRiskVehicleDto } from './dto/create-risk-vehicle.dto';
import { SearchRiskVehiclesQueryDto } from './dto/search-risk-vehicles-query.dto';
import { UpdateRiskVehicleDto } from './dto/update-risk-vehicle.dto';
import { RiskVehiclesService } from './risk-vehicles.service';

@UseGuards(JwtAuthGuard)
@Controller('risk-vehicles')
export class RiskVehiclesController {
  constructor(private readonly riskVehiclesService: RiskVehiclesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.riskVehiclesService.findAll(user);
  }

  @Get('assignees')
  findAssignees(@CurrentUser() user: CurrentUserPayload) {
    return this.riskVehiclesService.findAssignees(user);
  }

  @Get('search')
  search(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: SearchRiskVehiclesQueryDto,
  ) {
    return this.riskVehiclesService.search(query, user);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateRiskVehicleDto,
  ) {
    return this.riskVehiclesService.create(user, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.riskVehiclesService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRiskVehicleDto,
  ) {
    return this.riskVehiclesService.update(id, dto, user);
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.riskVehiclesService.submit(id, user);
  }

  @Post(':id/close')
  close(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.riskVehiclesService.close(id, user);
  }

  @Post(':id/photos/upload-signature')
  photoUploadSignature(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.riskVehiclesService.photoUploadSignature(id, user);
  }

  @Post(':id/photos')
  addPhoto(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateRiskPhotoDto,
  ) {
    return this.riskVehiclesService.addPhoto(id, dto, user);
  }

  @Delete(':id/photos/:photoId')
  removePhoto(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.riskVehiclesService.removePhoto(id, photoId, user);
  }

  @Post(':id/conversation/attachment-signature')
  attachmentSignature(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.riskVehiclesService.attachmentSignature(id, user);
  }

  @Post(':id/conversation/messages')
  createMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateRiskMessageDto,
  ) {
    return this.riskVehiclesService.createMessage(id, dto, user);
  }
}
