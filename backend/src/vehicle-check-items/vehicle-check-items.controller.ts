import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateOperationalStatusDto } from './dto/update-operational-status.dto';
import { UpdatePartOrderDto } from './dto/update-part-order.dto';
import { VehicleCheckItemsService } from './vehicle-check-items.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicle-check-items')
export class VehicleCheckItemsController {
  constructor(private readonly vehicleCheckItemsService: VehicleCheckItemsService) {}

  @Patch(':id/part-order')
  updatePartOrder(@Param('id') id: string, @Body() dto: UpdatePartOrderDto) {
    return this.vehicleCheckItemsService.updatePartOrder(id, dto);
  }

  @Patch(':id/operational-status')
  updateOperationalStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOperationalStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vehicleCheckItemsService.updateOperationalStatus(id, dto, user);
  }
}
