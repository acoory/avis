import { IsString, MaxLength } from 'class-validator';

export class DeleteDamagePhotoDto {
  @IsString()
  @MaxLength(255)
  publicId: string;
}
