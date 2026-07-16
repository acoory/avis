import { Module } from '@nestjs/common';
import { DamagePhotosModule } from '../damage-photos/damage-photos.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicAccessModule } from '../public-access/public-access.module';
import { VehicleCheckConversationsController } from './vehicle-check-conversations.controller';
import { VehicleCheckConversationsPublicController } from './vehicle-check-conversations-public.controller';
import { VehicleCheckConversationsService } from './vehicle-check-conversations.service';

@Module({
  imports: [DamagePhotosModule, NotificationsModule, PublicAccessModule],
  controllers: [
    VehicleCheckConversationsController,
    VehicleCheckConversationsPublicController,
  ],
  providers: [VehicleCheckConversationsService],
})
export class VehicleCheckConversationsModule {}
