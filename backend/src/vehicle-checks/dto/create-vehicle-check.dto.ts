import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { RepairDecisionItemDto } from '../../repair-decisions/dto/repair-decision-item.dto';

export class CreateVehicleCheckDto {
  @IsUUID()
  agencyId: string;

  @IsUUID()
  manufacturerId: string;

  @IsOptional()
  @IsUUID()
  vehicleModelId?: string;

  @IsString()
  licensePlate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsDateString()
  checkDate?: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepairDecisionItemDto)
  items: RepairDecisionItemDto[];
}
