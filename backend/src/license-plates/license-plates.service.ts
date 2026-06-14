import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type FastAlprPrediction = {
  plate: string;
  confidence: number;
  region?: string | null;
  regionConfidence?: number | null;
  detectionConfidence?: number;
};

type FastAlprResponse = {
  predictions?: FastAlprPrediction[];
};

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class LicensePlatesService {
  constructor(private readonly configService: ConfigService) {}

  async recognize(file: UploadedImage) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Le fichier doit etre une image');
    }

    const baseUrl = this.configService.get<string>('FASTALPR_URL');
    if (!baseUrl) {
      throw new ServiceUnavailableException('Le service de reconnaissance de plaque est desactive');
    }

    const formData = new FormData();
    formData.append(
      'image',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname || 'plate.jpg',
    );

    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, '')}/recognize`, {
        method: 'POST',
        headers: {
          'X-Internal-Token':
            this.configService.get<string>('FASTALPR_INTERNAL_TOKEN') ?? '',
        },
        body: formData,
        signal: AbortSignal.timeout(12000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException('La reconnaissance de plaque a expire');
      }

      throw new BadGatewayException('Le service de reconnaissance de plaque est inaccessible');
    }

    if (response.status === 503) {
      throw new ServiceUnavailableException('Le modele de reconnaissance est en cours de chargement');
    }

    if (!response.ok) {
      throw new BadGatewayException('La reconnaissance de plaque a echoue');
    }

    const payload = (await response.json()) as FastAlprResponse;
    const prediction = payload.predictions?.[0];

    if (!prediction?.plate) {
      return { detected: false, candidates: [] };
    }

    return {
      detected: true,
      plate: prediction.plate,
      confidence: Math.round(prediction.confidence * 100),
      region: prediction.region ?? null,
      regionConfidence:
        prediction.regionConfidence === null || prediction.regionConfidence === undefined
          ? null
          : Math.round(prediction.regionConfidence * 100),
      detectionConfidence: Math.round((prediction.detectionConfidence ?? 0) * 100),
      candidates: payload.predictions?.slice(0, 3).map((item) => ({
        plate: item.plate,
        confidence: Math.round(item.confidence * 100),
        region: item.region ?? null,
      })),
    };
  }
}
