import { Module } from '@nestjs/common';
import { DamagePhotosModule } from '../damage-photos/damage-photos.module';
import { ExternalRepairContactsModule } from '../external-repair-contacts/external-repair-contacts.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RepairDecisionsModule } from '../repair-decisions/repair-decisions.module';
import { PublicAccessModule } from '../public-access/public-access.module';
import { VehicleChecksController } from './vehicle-checks.controller';
import { VehicleChecksPublicController } from './vehicle-checks-public.controller';
import { VehicleChecksService } from './vehicle-checks.service';

@Module({
  imports: [
    RepairDecisionsModule,
    DamagePhotosModule,
    ExternalRepairContactsModule,
    MailModule,
    NotificationsModule,
    PublicAccessModule,
  ],
  controllers: [VehicleChecksController, VehicleChecksPublicController],
  providers: [VehicleChecksService],
})
export class VehicleChecksModule {}
