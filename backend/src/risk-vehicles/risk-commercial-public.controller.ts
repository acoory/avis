import {
  BadGatewayException,
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import archiver from 'archiver';
import { RiskVehiclesService } from './risk-vehicles.service';
import { downloadArchivePhotos } from './risk-vehicles.controller';

@Controller('public/risk-commercial')
export class RiskCommercialPublicController {
  constructor(private readonly service: RiskVehiclesService) {}

  @Get(':token')
  gallery(
    @Param('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('Cache-Control', 'no-store');
    return this.service.publicCommercialGallery(token);
  }

  @Get(':token/archive.zip')
  async archive(@Param('token') token: string, @Res() response: Response) {
    const manifest = await this.service.commercialArchive(token);
    let photos: Awaited<ReturnType<typeof downloadArchivePhotos>>;
    try {
      photos = await downloadArchivePhotos(manifest.photos);
    } catch {
      throw new BadGatewayException('Impossible de télécharger les photos');
    }
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${manifest.fileName}"`,
    );
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const archive = archiver('zip', { store: true });
    archive.on('error', (error) => response.destroy(error));
    archive.pipe(response);
    try {
      for (const photo of photos)
        archive.append(photo.content, { name: photo.archivePath });
      await archive.finalize();
    } catch (error) {
      archive.abort();
      response.destroy(error instanceof Error ? error : undefined);
    }
  }
}
