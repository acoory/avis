import { IsBoolean, IsDecimal, IsOptional, IsString } from 'class-validator';

export class UpdateRepairTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsDecimal()
  defaultInternalSavingAmount?: string;

  @IsOptional()
  @IsDecimal()
  defaultInternalCost?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
