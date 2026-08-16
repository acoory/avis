import { Module } from '@nestjs/common';
import { DamagePhotosModule } from '../damage-photos/damage-photos.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RiskVehiclesController } from './risk-vehicles.controller';
import { RiskVehiclesService } from './risk-vehicles.service';

@Module({
  imports: [DamagePhotosModule, NotificationsModule],
  controllers: [RiskVehiclesController],
  providers: [RiskVehiclesService],
})
export class RiskVehiclesModule {}
