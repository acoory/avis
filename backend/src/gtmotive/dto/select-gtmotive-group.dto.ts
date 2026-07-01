import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SelectGtmotiveGroupDto {
  @IsString()
  groupId: string;

  @IsOptional()
  @IsNumber()
  securityProfileId?: number;
}
