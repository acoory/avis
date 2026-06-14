import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class DamagePhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  uploadSignature(user: CurrentUserPayload) {
    return this.cloudinary.createUploadSignature(user.sub);
  }

  async remove(publicId: string, user: CurrentUserPayload) {
    const photo = await this.prisma.vehicleCheckItemPhoto.findFirst({
      where: {
        publicId,
        ...(user.role === Role.ADMIN
          ? {}
          : user.role === Role.MANAGER
            ? {
                vehicleCheckItem: {
                  vehicleCheck: {
                    OR: [
                      { collaboratorId: user.sub },
                      { collaborator: { managerId: user.sub } },
                    ],
                  },
                },
              }
            : {
                vehicleCheckItem: {
                  vehicleCheck: { collaboratorId: user.sub },
                },
              }),
      },
      select: {
        id: true,
        vehicleCheckItem: {
          select: {
            vehicleCheck: {
              select: { collaboratorId: true },
            },
          },
        },
      },
    });

    if (!photo && !publicId.startsWith(`avis/${user.sub}/`)) {
      throw new ForbiddenException('This uploaded photo does not belong to the current user');
    }

    await this.cloudinary.destroy(publicId);
    if (photo) {
      await this.prisma.vehicleCheckItemPhoto.delete({ where: { id: photo.id } });
    }

    return { success: true };
  }
}
