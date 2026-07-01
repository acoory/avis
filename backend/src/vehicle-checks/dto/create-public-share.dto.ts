import { IsOptional, IsString } from 'class-validator';

export class CreatePublicShareDto {
  @IsOptional()
  @IsString()
  externalRepairContactId?: string;
}
