import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class ExportDashboardKpisQueryDto {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  collaboratorId?: string;

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsString()
  kpis?: string;

  @IsOptional()
  @IsString()
  partCodes?: string;
}
