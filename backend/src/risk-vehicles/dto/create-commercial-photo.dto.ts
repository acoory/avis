import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommercialPhotoDto {
  @IsString()
  @MaxLength(100)
  slotKey!: string;

  @IsString()
  @MaxLength(500)
  publicId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  assetId?: string;

  @IsUrl({ require_protocol: true })
  secureUrl!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  width!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  height!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  bytes!: number;

  @IsString()
  @MaxLength(20)
  format!: string;
}
