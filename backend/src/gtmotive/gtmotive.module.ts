import { Module } from '@nestjs/common';
import { GtmotiveController } from './gtmotive.controller';
import { GtmotiveService } from './gtmotive.service';

@Module({
  controllers: [GtmotiveController],
  providers: [GtmotiveService],
})
export class GtmotiveModule {}
