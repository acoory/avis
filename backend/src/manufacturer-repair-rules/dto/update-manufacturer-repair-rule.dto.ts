import { IsBoolean, IsDecimal, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ManufacturerRepairRuleStatus } from '../../../prisma/generated/client.cjs';

export class UpdateManufacturerRepairRuleDto {
  @IsOptional()
  @IsUUID()
  vehiclePartId?: string;

  @IsOptional()
  @IsEnum(ManufacturerRepairRuleStatus)
  status?: ManufacturerRepairRuleStatus;

  @IsOptional()
  @IsBoolean()
  allowed?: boolean;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @IsOptional()
  @IsDecimal()
  thresholdAmount?: string;

  @IsOptional()
  @IsDecimal()
  thresholdPercentage?: string;

  @IsOptional()
  @IsDecimal()
  customInternalSavingAmount?: string;

  @IsOptional()
  @IsDecimal()
  customInternalCost?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
