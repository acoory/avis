import { IsBoolean, IsDecimal, IsOptional, IsString } from 'class-validator';

export class CreateRepairTypeDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsDecimal()
  defaultInternalSavingAmount: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
