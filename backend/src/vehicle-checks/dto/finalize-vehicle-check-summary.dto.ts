import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class FinalizeVehicleCheckSummaryDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  selectedItemIds: string[];
}
