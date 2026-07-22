import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { SalvageEvaluationsController } from './salvage-evaluations.controller';
import { SalvageEvaluationsService } from './salvage-evaluations.service';

@Module({
  controllers: [SalvageEvaluationsController],
  imports: [MailModule],
  providers: [SalvageEvaluationsService],
})
export class SalvageEvaluationsModule {}
