import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { DamagePhotosController } from './damage-photos.controller';
import { DamagePhotosService } from './damage-photos.service';

@Module({
  controllers: [DamagePhotosController],
  providers: [CloudinaryService, DamagePhotosService],
  exports: [CloudinaryService],
})
export class DamagePhotosModule {}
