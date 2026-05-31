import { Module } from '@nestjs/common';
import { VehiclePartsController } from './vehicle-parts.controller';
import { VehiclePartsService } from './vehicle-parts.service';

@Module({
  controllers: [VehiclePartsController],
  providers: [VehiclePartsService],
})
export class VehiclePartsModule {}
