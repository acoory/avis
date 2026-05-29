import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PartOrderStatus } from '../../../prisma/generated/client.cjs';

export class UpdatePartOrderDto {
  @IsOptional()
  @IsBoolean()
  partOrderRequired?: boolean;

  @IsOptional()
  @IsEnum(PartOrderStatus)
  partOrderStatus?: PartOrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  partOrderPrice?: number;

  @IsOptional()
  @IsString()
  partOrderReference?: string;
}
