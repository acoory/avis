import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { RepairDecisionItemDto } from './repair-decision-item.dto';

export class PreviewRepairDecisionDto {
  @IsUUID()
  manufacturerId: string;

  @IsOptional()
  @IsUUID()
  vehicleModelId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepairDecisionItemDto)
  items: RepairDecisionItemDto[];
}
