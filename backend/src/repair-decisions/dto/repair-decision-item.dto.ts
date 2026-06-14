import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { DamagePhotoDto } from '../../damage-photos/dto/damage-photo.dto';

export class RepairDecisionItemDto {
  @IsUUID()
  repairTypeId: string;

  @IsOptional()
  @IsUUID()
  vehiclePartId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsBoolean()
  partOrderRequired?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => DamagePhotoDto)
  photos?: DamagePhotoDto[];
}
