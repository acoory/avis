import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { RepairExecutionMode } from '../../../prisma/generated/client.cjs';

export class FinalizeVehicleCheckSummaryItemDto {
  @IsUUID('4')
  id: string;

  @IsEnum(RepairExecutionMode)
  executionMode: RepairExecutionMode;
}

export class FinalizeVehicleCheckSummaryDto {
  @IsArray()
  @ArrayUnique((item: FinalizeVehicleCheckSummaryItemDto) => item?.id)
  @ValidateNested({ each: true })
  @Type(() => FinalizeVehicleCheckSummaryItemDto)
  items: FinalizeVehicleCheckSummaryItemDto[];
}
