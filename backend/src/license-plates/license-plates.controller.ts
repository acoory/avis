import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LicensePlatesService } from './license-plates.service';

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@UseGuards(JwtAuthGuard)
@Controller('license-plates')
export class LicensePlatesController {
  constructor(private readonly licensePlatesService: LicensePlatesService) {}

  @Post('recognize')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 4 * 1024 * 1024, files: 1 },
    }),
  )
  recognize(@UploadedFile() file?: UploadedImage) {
    if (!file) {
      throw new BadRequestException('Aucune image fournie');
    }

    return this.licensePlatesService.recognize(file);
  }
}
