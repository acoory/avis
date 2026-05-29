import { Module } from '@nestjs/common';
import { ManufacturerRepairRulesController } from './manufacturer-repair-rules.controller';
import { ManufacturerRepairRulesService } from './manufacturer-repair-rules.service';

@Module({
  controllers: [ManufacturerRepairRulesController],
  providers: [ManufacturerRepairRulesService],
})
export class ManufacturerRepairRulesModule {}
