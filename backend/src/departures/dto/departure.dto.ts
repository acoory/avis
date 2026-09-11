import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  DeparturePriority,
  DepartureStatus,
  InterventionType,
} from '../../../prisma/generated/client.cjs';

export class CreateDepartureDto {
  @IsUUID() agencyId!: string;
  @IsString() @MinLength(2) @MaxLength(20) registration!: string;
  @IsOptional() @IsString() @MaxLength(80) brand?: string;
  @IsOptional() @IsString() @MaxLength(80) model?: string;
  @IsUUID() providerId!: string;
  @IsEnum(InterventionType) interventionType!: InterventionType;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsEnum(DeparturePriority) priority?: DeparturePriority;
  @IsOptional() @IsDateString() appointmentAt?: string;
  @IsOptional() @IsDateString() plannedDepartureAt?: string;
  @IsOptional() @IsDateString() estimatedReturnAt?: string;
  @IsOptional() @IsUUID() assignedUserId?: string;
}

export class UpdateDepartureDto {
  @IsOptional() @IsEnum(InterventionType) interventionType?: InterventionType;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsEnum(DeparturePriority) priority?: DeparturePriority;
  @IsOptional() @IsDateString() appointmentAt?: string;
  @IsOptional() @IsDateString() plannedDepartureAt?: string;
  @IsOptional() @IsDateString() estimatedReturnAt?: string;
  @IsOptional() @IsUUID() assignedUserId?: string;
}

export class ChangeStatusDto {
  @IsEnum(DepartureStatus) status!: DepartureStatus;
}
export class ChangeProviderDto {
  @IsUUID() providerId!: string;
}
export class AddCommentDto {
  @IsString() @MinLength(1) @MaxLength(4000) message!: string;
}
export class DateActionDto {
  @IsOptional() @IsDateString() at?: string;
}

export class DepartureHistoryQueryDto {
  @IsUUID() agencyId!: string;
  @IsOptional() @IsString() registration?: string;
  @IsOptional() @IsUUID() providerId?: string;
  @IsOptional() @IsEnum(DepartureStatus) status?: DepartureStatus;
  @IsOptional() @Type(() => Number) page?: number;
}
