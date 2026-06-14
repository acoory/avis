import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DamagePhotosService } from './damage-photos.service';
import { DeleteDamagePhotoDto } from './dto/delete-damage-photo.dto';

@UseGuards(JwtAuthGuard)
@Controller('damage-photos')
export class DamagePhotosController {
  constructor(private readonly damagePhotosService: DamagePhotosService) {}

  @Post('upload-signature')
  uploadSignature(@CurrentUser() user: CurrentUserPayload) {
    return this.damagePhotosService.uploadSignature(user);
  }

  @Delete()
  remove(
    @Body() dto: DeleteDamagePhotoDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.damagePhotosService.remove(dto.publicId, user);
  }
}
