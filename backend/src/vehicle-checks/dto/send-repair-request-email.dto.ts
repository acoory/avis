import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class RepairRequestRecipientDto {
  @IsOptional()
  @IsString()
  id?: string;

  @ValidateIf((recipient: RepairRequestRecipientDto) => !recipient.id)
  @IsString()
  @MaxLength(120)
  name?: string;

  @ValidateIf((recipient: RepairRequestRecipientDto) => !recipient.id)
  @IsEmail()
  @MaxLength(180)
  email?: string;
}

export class SendRepairRequestEmailDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RepairRequestRecipientDto)
  recipients!: RepairRequestRecipientDto[];
}
