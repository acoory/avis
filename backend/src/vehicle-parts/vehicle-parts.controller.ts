import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VehiclePartsService } from './vehicle-parts.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicle-parts')
export class VehiclePartsController {
  constructor(private readonly vehiclePartsService: VehiclePartsService) {}

  @Get()
  findAll() {
    return this.vehiclePartsService.findAll();
  }
}
