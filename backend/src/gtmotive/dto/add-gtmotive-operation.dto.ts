import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AddGtmotiveOperationDto {
  @IsString()
  partCode: string;

  @IsOptional()
  @IsString()
  partDescription?: string;

  @IsNumber()
  taskType: number;

  @IsOptional()
  @IsNumber()
  relatedPartType?: number;

  @IsOptional()
  @IsNumber()
  securityProfileId?: number;
}
