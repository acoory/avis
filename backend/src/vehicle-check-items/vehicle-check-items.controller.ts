import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
}
