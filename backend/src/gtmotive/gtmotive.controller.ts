import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AddGtmotiveOperationDto } from './dto/add-gtmotive-operation.dto';
import { CreateGtmotiveEstimateDto } from './dto/create-gtmotive-estimate.dto';
import { IdentifyGtmotiveVehicleDto } from './dto/identify-gtmotive-vehicle.dto';
import { ReplaceGtmotivePartDto } from './dto/replace-gtmotive-part.dto';
import { SelectGtmotiveGroupDto } from './dto/select-gtmotive-group.dto';
import { GtmotiveService } from './gtmotive.service';

@UseGuards(JwtAuthGuard)
@Controller('api/gtmotive')
export class GtmotiveController {
  constructor(private readonly gtmotiveService: GtmotiveService) {}

  @Post('session')
  session() {
    return this.gtmotiveService.session();
  }

  @Post('estimate')
  createEstimate(@Body() dto: CreateGtmotiveEstimateDto) {
    return this.gtmotiveService.createEstimate(dto);
  }

  @Post('identify-vehicle')
  identifyVehicle(@Body() dto: IdentifyGtmotiveVehicleDto) {
    return this.gtmotiveService.identifyVehicle(dto);
  }

  @Get('estimates/:estimateId/navigation-board')
  navigationBoard(
    @Param('estimateId', ParseIntPipe) estimateId: number,
    @Query('securityProfileId') securityProfileId?: string,
    @Query('makeCode') makeCode?: string,
    @Query('modelId') modelId?: string,
    @Query('navigationModelCode') navigationModelCode?: string,
    @Query('equipment') equipment?: string,
  ) {
    return this.gtmotiveService.getNavigationBoard({
      estimateId,
      securityProfileId: securityProfileId ? Number(securityProfileId) : undefined,
      makeCode,
      modelId,
      navigationModelCode,
      equipment,
    });
  }

  @Get('assets/navigation-board/:boardId.svg')
  async navigationBoardSvg(
    @Param('boardId') boardId: string,
    @Query('version') version: string | undefined,
    @Res() response: Response,
  ) {
    const asset = await this.gtmotiveService.proxyNavigationBoardSvg(
      boardId,
      version,
    );
    response.setHeader('Content-Type', asset.contentType);
    response.send(asset.body);
  }

  @Get('assets/navigation-board-image/:imageId')
  async navigationBoardImage(
    @Param('imageId') imageId: string,
    @Res() response: Response,
  ) {
    const asset = await this.gtmotiveService.proxyNavigationBoardImage(imageId);
    response.setHeader('Content-Type', asset.contentType);
    response.send(asset.body);
  }

  @Post('estimates/:estimateId/select-group')
  selectGroup(
    @Param('estimateId', ParseIntPipe) estimateId: number,
    @Body() dto: SelectGtmotiveGroupDto,
  ) {
    return this.gtmotiveService.selectGroup(
      estimateId,
      dto.groupId,
      dto.securityProfileId,
    );
  }

  @Get('estimates/:estimateId/parts')
  parts(
    @Param('estimateId', ParseIntPipe) estimateId: number,
    @Query('securityProfileId') securityProfileId?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.gtmotiveService.getParts(
      estimateId,
      securityProfileId ? Number(securityProfileId) : undefined,
      groupId,
    );
  }

  @Get('estimates/:estimateId/graphic-zone/:groupId')
  graphicZone(
    @Param('estimateId', ParseIntPipe) estimateId: number,
    @Param('groupId') groupId: string,
    @Query('securityProfileId') securityProfileId?: string,
    @Query('makeCode') makeCode?: string,
    @Query('modelId') modelId?: string,
    @Query('navigationModelCode') navigationModelCode?: string,
    @Query('equipment') equipment?: string,
  ) {
    return this.gtmotiveService.getGraphicZone(groupId, {
      estimateId,
      securityProfileId: securityProfileId ? Number(securityProfileId) : undefined,
      makeCode,
      modelId,
      navigationModelCode,
      equipment,
    });
  }

  @Post('estimates/:estimateId/replace')
  replace(
    @Param('estimateId', ParseIntPipe) estimateId: number,
    @Body() dto: ReplaceGtmotivePartDto,
  ) {
    return this.gtmotiveService.replacePart(estimateId, dto);
  }

  @Post('estimates/:estimateId/operations')
  addOperation(
    @Param('estimateId', ParseIntPipe) estimateId: number,
    @Body() dto: AddGtmotiveOperationDto,
  ) {
    return this.gtmotiveService.addPartOperation(estimateId, dto);
  }

  @Post('estimates/:estimateId/operations/switch')
  switchOperation(
    @Param('estimateId', ParseIntPipe) estimateId: number,
    @Body() dto: AddGtmotiveOperationDto,
  ) {
    return this.gtmotiveService.switchPartOperation(estimateId, dto);
  }

  @Get('estimates/:estimateId/operations')
  operations(
    @Param('estimateId', ParseIntPipe) estimateId: number,
    @Query('securityProfileId') securityProfileId?: string,
  ) {
    return this.gtmotiveService.getOperations({
      id: estimateId,
      securityProfileId: securityProfileId ? Number(securityProfileId) : undefined,
    });
  }
}
