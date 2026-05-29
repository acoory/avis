import { Module } from '@nestjs/common';
import { RepairTypesController } from './repair-types.controller';
import { RepairTypesService } from './repair-types.service';

@Module({
  controllers: [RepairTypesController],
  providers: [RepairTypesService],
})
export class RepairTypesModule {}
