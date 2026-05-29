import { Module } from '@nestjs/common';
import { RepairDecisionService } from './repair-decision.service';

@Module({
  providers: [RepairDecisionService],
  exports: [RepairDecisionService],
})
export class RepairDecisionsModule {}
