import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class VerifyPublicAccessCodeDto {
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.toUpperCase().replace(/[^A-Z2-9]/g, '')
      : value,
  )
  @IsString()
  @Matches(/^[A-HJ-NP-Z2-9]{8}$/)
  code!: string;
}
