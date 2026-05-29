import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VehicleCheckItemsController } from './vehicle-check-items.controller';
import { VehicleCheckItemsService } from './vehicle-check-items.service';

@Module({
  imports: [PrismaModule],
  controllers: [VehicleCheckItemsController],
  providers: [VehicleCheckItemsService],
})
export class VehicleCheckItemsModule {}
