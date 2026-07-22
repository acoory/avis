import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum SalvagePurchaseChannel {
  BUYBACK = 'BB',
  RISK = 'Risk',
}

export class SalvageEvaluationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  make!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  model!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  mva!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  licenseNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  purchaseType!: string;

  @IsEnum(SalvagePurchaseChannel)
  purchaseChannel!: SalvagePurchaseChannel;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  kilometers!: number;

  @IsDateString({ strict: true })
  registrationDate!: string;

  @IsDateString({ strict: true })
  returnDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  estimatedRepairDays!: number;

  @IsEmail()
  @MaxLength(180)
  recipientEmail!: string;
}
