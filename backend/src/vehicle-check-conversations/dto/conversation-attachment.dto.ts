import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ConversationAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  publicId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  resourceType!: string;

  @IsUrl({ require_protocol: true })
  secureUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  bytes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  format?: string;
}
