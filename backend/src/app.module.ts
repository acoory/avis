import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AgenciesModule } from './agencies/agencies.module';
import { ManufacturerRepairRulesModule } from './manufacturer-repair-rules/manufacturer-repair-rules.module';
import { ManufacturerRulesModule } from './manufacturer-rules/manufacturer-rules.module';
import { ManufacturersModule } from './manufacturers/manufacturers.module';
import { RepairTypesModule } from './repair-types/repair-types.module';
import { VehicleChecksModule } from './vehicle-checks/vehicle-checks.module';
import { VehicleModelsModule } from './vehicle-models/vehicle-models.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportsModule } from './exports/exports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AgenciesModule,
    ManufacturersModule,
    VehicleModelsModule,
    RepairTypesModule,
    ManufacturerRulesModule,
    ManufacturerRepairRulesModule,
    VehicleChecksModule,
    DashboardModule,
    ExportsModule,
  ],
})
export class AppModule {}
