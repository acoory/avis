import { IsBoolean, IsDecimal, IsOptional, IsString } from 'class-validator';

export class UpsertManufacturerRuleDto {
  @IsDecimal()
  constructorAllowanceAmount: string;

  @IsOptional()
  @IsDecimal()
  laborRate?: string;

  @IsOptional()
  @IsDecimal()
  paintRate?: string;

  @IsOptional()
  @IsDecimal()
  partsDiscountRate?: string;

  @IsOptional()
  @IsDecimal()
  dentRemovalCost?: string;

  @IsOptional()
  @IsDecimal()
  servicingCost?: string;

  @IsOptional()
  @IsBoolean()
  revisionRequired?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
