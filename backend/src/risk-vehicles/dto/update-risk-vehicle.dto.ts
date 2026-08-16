import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateRiskVehicleDto {
  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @IsOptional()
  @IsUUID()
  manufacturerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  licensePlate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(UNKNOWN|[A-Za-z]{2})$/)
  licensePlateCountry?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  licensePlateRecognitionConfidence?: number;

  @IsOptional()
  @IsUUID()
  primaryAssigneeId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  assigneeIds?: string[];
}
