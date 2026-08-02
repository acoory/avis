import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PublicVehicleStatusQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  search?: string;

  @IsOptional()
  @IsIn(['IN_PROGRESS', 'COMPLETED', 'ALL'])
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ALL' = 'IN_PROGRESS';
}
