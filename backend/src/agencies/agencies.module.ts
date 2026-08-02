import { Module } from '@nestjs/common';
import { AgenciesPublicController } from './agencies-public.controller';
import { AgenciesController } from './agencies.controller';
import { AgenciesService } from './agencies.service';

@Module({
  controllers: [AgenciesController, AgenciesPublicController],
  providers: [AgenciesService],
})
export class AgenciesModule {}
