import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PublicAccessModule } from '../public-access/public-access.module';
import { NotificationEmailWorkerService } from './notification-email-worker.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [MailModule, PublicAccessModule],
  controllers: [NotificationsController],
  providers: [NotificationEmailWorkerService, NotificationsService],
  exports: [NotificationEmailWorkerService, NotificationsService],
})
export class NotificationsModule {}
