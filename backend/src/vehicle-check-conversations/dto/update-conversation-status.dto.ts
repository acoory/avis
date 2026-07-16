import { IsEnum } from 'class-validator';
import { VehicleCheckConversationStatus } from '../../../prisma/generated/client.cjs';

export class UpdateConversationStatusDto {
  @IsEnum(VehicleCheckConversationStatus)
  status!: VehicleCheckConversationStatus;
}
