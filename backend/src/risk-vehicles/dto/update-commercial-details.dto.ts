import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CommercialEquipmentDto {
  @IsOptional()
  @IsIn(['PRESENT', 'ABSENT', 'TO_CHECK'])
  secondScreen?: string;
  @IsIn(['PRESENT', 'ABSENT', 'TO_CHECK']) sunroof!: string;
  @IsIn(['PRESENT', 'ABSENT', 'TO_CHECK']) serviceBook!: string;
  @IsIn(['PRESENT', 'ABSENT', 'TO_CHECK']) manual!: string;
  @IsIn(['PRESENT', 'ABSENT', 'TO_CHECK']) accessories!: string;
}
export class UpdateCommercialDetailsDto {
  @IsInt() @Min(0) @Max(10000000) mileage!: number;
  @IsDefined()
  @ValidateNested()
  @Type(() => CommercialEquipmentDto)
  equipment!: CommercialEquipmentDto;
}
