import { Module } from '@nestjs/common';
import { RepairDecisionsModule } from '../repair-decisions/repair-decisions.module';
import { VehicleChecksController } from './vehicle-checks.controller';
import { VehicleChecksService } from './vehicle-checks.service';

@Module({
  imports: [RepairDecisionsModule],
  controllers: [VehicleChecksController],
  providers: [VehicleChecksService],
})
export class VehicleChecksModule {}
