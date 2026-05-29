import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateVehicleModelDto {
  @IsOptional()
  @IsUUID()
  manufacturerId?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
