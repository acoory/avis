import { Module } from '@nestjs/common';
import { ManufacturerRulesController } from './manufacturer-rules.controller';
import { ManufacturerRulesService } from './manufacturer-rules.service';

@Module({
  controllers: [ManufacturerRulesController],
  providers: [ManufacturerRulesService],
})
export class ManufacturerRulesModule {}
