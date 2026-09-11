import {
  Body,
  Controller,
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
import {
  AddCommentDto,
  ChangeProviderDto,
  ChangeStatusDto,
  CreateDepartureDto,
  DateActionDto,
  DepartureHistoryQueryDto,
  UpdateDepartureDto,
} from './dto/departure.dto';
import { DeparturesService } from './departures.service';

@UseGuards(JwtAuthGuard)
@Controller('departures')
export class DeparturesController {
  constructor(private readonly departures: DeparturesService) {}
  @Post() create(
    @Body() dto: CreateDepartureDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.departures.create(dto, user);
  }
  @Get('active') active(
    @Query('agencyId') agencyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.departures.findActive(agencyId, user);
  }
  @Get('history') history(
    @Query() query: DepartureHistoryQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.departures.findHistory(query, user);
  }
  @Get(':id') one(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.departures.findOne(id, user);
  }
  @Patch(':id') async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartureDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.departures.findOne(id, user);
    return this.departures.update(id, dto, user.sub);
  }
  @Patch(':id/status') async status(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.departures.findOne(id, user);
    return this.departures.changeStatus(id, dto, user.sub);
  }
  @Patch(':id/provider') async provider(
    @Param('id') id: string,
    @Body() dto: ChangeProviderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.departures.findOne(id, user);
    return this.departures.changeProvider(id, dto, user.sub);
  }
  @Post(':id/depart') async depart(
    @Param('id') id: string,
    @Body() dto: DateActionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.departures.findOne(id, user);
    return this.departures.depart(id, dto, user.sub);
  }
  @Post(':id/ready') async ready(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.departures.findOne(id, user);
    return this.departures.ready(id, user.sub);
  }
  @Post(':id/return') async returnVehicle(
    @Param('id') id: string,
    @Body() dto: DateActionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.departures.findOne(id, user);
    return this.departures.returnVehicle(id, dto, user.sub);
  }
  @Post(':id/comments') async comment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.departures.findOne(id, user);
    return this.departures.addComment(id, dto, user.sub);
  }
}
