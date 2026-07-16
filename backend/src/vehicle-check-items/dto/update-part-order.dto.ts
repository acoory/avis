import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PartOrderStatus } from '../../../prisma/generated/client.cjs';

export class UpdatePartOrderDto {
  @IsOptional()
  @IsBoolean()
  partOrderRequired?: boolean;

  @IsOptional()
  @IsEnum(PartOrderStatus)
  partOrderStatus?: PartOrderStatus;
}
