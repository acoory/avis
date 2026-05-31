import { IsBoolean, IsDecimal, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ManufacturerRepairRuleStatus } from '../../../prisma/generated/client.cjs';

export class CreateManufacturerRepairRuleDto {
  @IsUUID()
  repairTypeId: string;

  @IsOptional()
  @IsUUID()
  vehiclePartId?: string;

  @IsEnum(ManufacturerRepairRuleStatus)
  status: ManufacturerRepairRuleStatus;

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
