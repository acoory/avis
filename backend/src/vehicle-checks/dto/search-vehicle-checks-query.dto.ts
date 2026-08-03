import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class SearchVehicleChecksQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 100)
  q!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 8;
}
