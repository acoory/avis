import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VehicleCheckItemOperationalStatus } from '../../../prisma/generated/client.cjs';

export class UpdateOperationalStatusDto {
  @IsEnum(VehicleCheckItemOperationalStatus)
  operationalStatus: VehicleCheckItemOperationalStatus;

  @IsOptional()
  @IsString()
  operationalComment?: string;
}
