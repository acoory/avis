import { IsString, IsUUID } from 'class-validator';

export class CreateVehicleModelDto {
  @IsUUID()
  manufacturerId: string;

  @IsString()
  name: string;
}
