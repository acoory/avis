import { CreateCommercialPhotoDto } from './dto/create-commercial-photo.dto';
import { UpdateCommercialDetailsDto } from './dto/update-commercial-details.dto';
import {
  BadGatewayException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import archiver from 'archiver';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateRiskMessageDto } from './dto/create-risk-message.dto';
import { CreateRiskPhotoDto } from './dto/create-risk-photo.dto';
import { CreateRiskVehicleDto } from './dto/create-risk-vehicle.dto';
import { SearchRiskVehiclesQueryDto } from './dto/search-risk-vehicles-query.dto';
import { UpdateRiskVehicleDto } from './dto/update-risk-vehicle.dto';
import { RiskVehiclesService } from './risk-vehicles.service';

@UseGuards(JwtAuthGuard)
@Controller('risk-vehicles')
export class RiskVehiclesController {
  constructor(private readonly riskVehiclesService: RiskVehiclesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.riskVehiclesService.findAll(user);
  }

  @Get('assignees')
  findAssignees(@CurrentUser() user: CurrentUserPayload) {
    return this.riskVehiclesService.findAssignees(user);
  }

  @Get('search')
  search(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: SearchRiskVehiclesQueryDto,
  ) {
    return this.riskVehiclesService.search(query, user);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateRiskVehicleDto,
  ) {
    return this.riskVehiclesService.create(user, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.riskVehiclesService.findOne(id, user);
  }

  @Get(':id/photos/archive.zip')
  async downloadPhotoArchive(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const manifest = await this.riskVehiclesService.photoArchive(id, user);
    let photos: Awaited<ReturnType<typeof downloadArchivePhotos>>;

    try {
      photos = await downloadArchivePhotos(manifest.photos);
    } catch {
      throw new BadGatewayException(
        'Impossible de recuperer les photos du dossier Risk',
      );
    }

    const archive = archiver('zip', { store: true });

    response.setHeader('Content-Type', 'application/zip');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${manifest.fileName}"`,
    );
    archive.on('error', (error) => response.destroy(error));
    archive.pipe(response);

    try {
      for (const photo of photos) {
        archive.append(photo.content, { name: photo.archivePath });
      }
      await archive.finalize();
    } catch (error) {
      archive.unpipe(response);
      archive.abort();
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined);
        return;
      }
      throw new BadGatewayException(
        'Impossible de recuperer les photos du dossier Risk',
      );
    }
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRiskVehicleDto,
  ) {
    return this.riskVehiclesService.update(id, dto, user);
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.riskVehiclesService.submit(id, user);
  }

  @Post(':id/treated')
  treated(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.riskVehiclesService.startCommercial(id, user);
  }

  @Patch(':id/commercial')
  commercialDetails(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCommercialDetailsDto,
  ) {
    return this.riskVehiclesService.updateCommercialDetails(id, dto, user);
  }

  @Post(':id/commercial/upload-signature')
  commercialSignature(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.riskVehiclesService.commercialSignature(id, user);
  }

  @Post(':id/commercial/photos')
  addCommercialPhoto(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateCommercialPhotoDto,
  ) {
    return this.riskVehiclesService.addCommercialPhoto(id, dto, user);
  }

  @Delete(':id/commercial/photos/:photoId')
  removeCommercialPhoto(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.riskVehiclesService.removeCommercialPhoto(id, photoId, user);
  }

  @Post(':id/close')
  close(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.riskVehiclesService.close(id, user);
  }

  @Post(':id/photos/upload-signature')
  photoUploadSignature(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.riskVehiclesService.photoUploadSignature(id, user);
  }

  @Post(':id/photos')
  addPhoto(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateRiskPhotoDto,
  ) {
    return this.riskVehiclesService.addPhoto(id, dto, user);
  }

  @Delete(':id/photos/:photoId')
  removePhoto(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.riskVehiclesService.removePhoto(id, photoId, user);
  }

  @Post(':id/conversation/attachment-signature')
  attachmentSignature(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.riskVehiclesService.attachmentSignature(id, user);
  }

  @Post(':id/conversation/messages')
  createMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateRiskMessageDto,
  ) {
    return this.riskVehiclesService.createMessage(id, dto, user);
  }
}

const ARCHIVE_DOWNLOAD_CONCURRENCY = 4;
const MAX_ARCHIVE_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_ARCHIVE_TOTAL_BYTES = 80 * 1024 * 1024;

export async function downloadArchivePhotos(
  photos: Array<{ archivePath: string; downloadUrl: string }>,
) {
  const downloaded = new Array<{ archivePath: string; content: Buffer }>(
    photos.length,
  );
  let cursor = 0;
  let totalBytes = 0;

  async function worker() {
    while (cursor < photos.length) {
      const index = cursor;
      cursor += 1;
      const photo = photos[index];
      const photoResponse = await fetch(photo.downloadUrl, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!photoResponse.ok) {
        throw new Error(`Cloudinary returned ${photoResponse.status}`);
      }

      const declaredSize = Number(
        photoResponse.headers.get('content-length') ?? 0,
      );
      if (declaredSize > MAX_ARCHIVE_PHOTO_BYTES) {
        throw new Error('An optimized Risk photo is too large');
      }

      const content = Buffer.from(await photoResponse.arrayBuffer());
      totalBytes += content.byteLength;
      if (
        content.byteLength > MAX_ARCHIVE_PHOTO_BYTES ||
        totalBytes > MAX_ARCHIVE_TOTAL_BYTES
      ) {
        throw new Error('The Risk photo archive is too large');
      }
      downloaded[index] = { archivePath: photo.archivePath, content };
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(ARCHIVE_DOWNLOAD_CONCURRENCY, photos.length) },
      () => worker(),
    ),
  );
  return downloaded;
}
