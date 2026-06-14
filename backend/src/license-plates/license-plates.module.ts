import { Module } from '@nestjs/common';
import { LicensePlatesController } from './license-plates.controller';
import { LicensePlatesService } from './license-plates.service';

@Module({
  controllers: [LicensePlatesController],
  providers: [LicensePlatesService],
})
export class LicensePlatesModule {}
