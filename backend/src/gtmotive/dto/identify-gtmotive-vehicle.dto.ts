import { IsNumber, IsOptional, IsString } from 'class-validator';

export class IdentifyGtmotiveVehicleDto {
  @IsNumber()
  estimateId: number;

  @IsOptional()
  @IsNumber()
  securityProfileId?: number;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsNumber()
  billingCodeId?: number;
}
