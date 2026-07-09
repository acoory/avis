import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendDecisionRequestEmailDto {
  @IsString()
  managerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requestComment?: string;
}
