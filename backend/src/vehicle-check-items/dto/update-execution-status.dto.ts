import { IsBoolean } from 'class-validator';

export class UpdateExecutionStatusDto {
  @IsBoolean()
  completed: boolean;
}
