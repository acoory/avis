import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';

@Injectable()
export class CloudinaryService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly folder: string;

  constructor(configService: ConfigService) {
    this.cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';
    this.apiKey = configService.get<string>('CLOUDINARY_API_KEY') ?? '';
    this.apiSecret = configService.get<string>('CLOUDINARY_API_SECRET') ?? '';
    this.folder = configService.get<string>('CLOUDINARY_FOLDER') ?? 'avis';
  }

  createUploadSignature(userId: string) {
    this.ensureConfigured();
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${userId}/${randomUUID()}`;
    const params = {
      folder: this.folder,
      overwrite: 'false',
      public_id: publicId,
      timestamp: timestamp.toString(),
    };

    return {
      apiKey: this.apiKey,
      cloudName: this.cloudName,
      folder: this.folder,
      publicId,
      timestamp,
      signature: this.sign(params),
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
    };
  }

  async destroy(publicId: string) {
    this.ensureConfigured();
    if (!publicId.startsWith(`${this.folder}/`)) {
      throw new BadRequestException('Invalid Cloudinary photo folder');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.sign({
      invalidate: 'true',
      public_id: publicId,
      timestamp: timestamp.toString(),
    });
    const body = new URLSearchParams({
      api_key: this.apiKey,
      invalidate: 'true',
      public_id: publicId,
      signature,
      timestamp: timestamp.toString(),
    });
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    if (!response.ok) {
      throw new ServiceUnavailableException('Cloudinary photo deletion failed');
    }
  }

  private sign(params: Record<string, string>) {
    const value = Object.entries(params)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entryValue]) => `${key}=${entryValue}`)
      .join('&');

    return createHash('sha1').update(`${value}${this.apiSecret}`).digest('hex');
  }

  private ensureConfigured() {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new ServiceUnavailableException('Cloudinary is not configured');
    }
  }
}
