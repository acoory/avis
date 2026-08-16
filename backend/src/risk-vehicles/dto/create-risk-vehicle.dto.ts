import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRiskVehicleDto {
  @IsUUID()
  agencyId!: string;

  @IsUUID()
  manufacturerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  licensePlate!: string;

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

  @IsUUID()
  primaryAssigneeId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  assigneeIds!: string[];
}
