import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExternalRepairContactsController } from './external-repair-contacts.controller';
import { ExternalRepairContactsService } from './external-repair-contacts.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExternalRepairContactsController],
  providers: [ExternalRepairContactsService],
})
export class ExternalRepairContactsModule {}
