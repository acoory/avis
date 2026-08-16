import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ConversationAttachmentDto } from '../../vehicle-check-conversations/dto/conversation-attachment.dto';

export class CreateRiskMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ConversationAttachmentDto)
  attachments?: ConversationAttachmentDto[];
}
