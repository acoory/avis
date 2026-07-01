import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGtmotiveEstimateDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  billingCodeId?: number;

  @IsOptional()
  @IsNumber()
  estimateProfileId?: number;
}
