import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { RiskPhotoCategory } from '../../../prisma/generated/client.cjs';

export class CreateRiskPhotoDto {
  @IsString()
  @MaxLength(100)
  slotKey!: string;

  @IsEnum(RiskPhotoCategory)
  category!: RiskPhotoCategory;

  @IsOptional()
  @IsUUID()
  damageGroupId?: string;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
