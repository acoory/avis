import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ExportVehicleChecksQueryDto {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  collaboratorId?: string;
}
