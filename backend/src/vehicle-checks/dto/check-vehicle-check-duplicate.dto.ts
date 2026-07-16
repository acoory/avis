import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CheckVehicleCheckDuplicateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  licensePlate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(UNKNOWN|[A-Za-z]{2})$/)
  licensePlateCountry?: string;

  @IsOptional()
  @IsUUID()
  excludedVehicleCheckId?: string;
}
