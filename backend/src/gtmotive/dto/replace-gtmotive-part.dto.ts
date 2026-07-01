import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ReplaceGtmotivePartDto {
  @IsString()
  partCode: string;

  @IsOptional()
  @IsString()
  partDescription?: string;

  @IsOptional()
  @IsNumber()
  relatedPartType?: number;

  @IsOptional()
  @IsNumber()
  securityProfileId?: number;
}
