import { Module } from '@nestjs/common';
import { DamagePhotosModule } from '../damage-photos/damage-photos.module';
import { RepairDecisionsModule } from '../repair-decisions/repair-decisions.module';
import { VehicleChecksController } from './vehicle-checks.controller';
import { VehicleChecksService } from './vehicle-checks.service';

@Module({
  imports: [RepairDecisionsModule, DamagePhotosModule],
  controllers: [VehicleChecksController],
  providers: [VehicleChecksService],
})
export class VehicleChecksModule {}
