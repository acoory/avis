import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '../../prisma/generated/client.cjs';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto';
import { VehicleModelsService } from './vehicle-models.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicle-models')
export class VehicleModelsController {
  constructor(private readonly vehicleModelsService: VehicleModelsService) {}

  @Get()
  findAll(@Query('manufacturerId') manufacturerId?: string) {
    return this.vehicleModelsService.findAll(manufacturerId);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateVehicleModelDto) {
    return this.vehicleModelsService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleModelDto) {
    return this.vehicleModelsService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehicleModelsService.remove(id);
  }
}
