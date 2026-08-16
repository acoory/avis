jest.mock(
  '../../prisma/generated/client.cjs',
  () => ({
    NotificationType: {
      RISK_CLOSED: 'RISK_CLOSED',
      RISK_MESSAGE: 'RISK_MESSAGE',
      RISK_SUBMITTED: 'RISK_SUBMITTED',
    },
    Prisma: { PrismaClientKnownRequestError: class extends Error {} },
    PrismaClient: class {},
    RiskAssignmentRole: { PARTICIPANT: 'PARTICIPANT', PRIMARY: 'PRIMARY' },
    RiskPhotoCategory: {
      DAMAGE_CLOSE_UP: 'DAMAGE_CLOSE_UP',
      DAMAGE_WIDE: 'DAMAGE_WIDE',
      DASHBOARD: 'DASHBOARD',
      EXTERIOR_FRONT_THREE_QUARTER: 'EXTERIOR_FRONT_THREE_QUARTER',
      EXTERIOR_REAR_THREE_QUARTER: 'EXTERIOR_REAR_THREE_QUARTER',
      INTERIOR_FRONT: 'INTERIOR_FRONT',
      INTERIOR_REAR: 'INTERIOR_REAR',
      TIRE_DAMAGE: 'TIRE_DAMAGE',
      TIRE_WEAR: 'TIRE_WEAR',
      WHEEL_FRONT_LEFT: 'WHEEL_FRONT_LEFT',
      WHEEL_FRONT_RIGHT: 'WHEEL_FRONT_RIGHT',
      WHEEL_REAR_LEFT: 'WHEEL_REAR_LEFT',
      WHEEL_REAR_RIGHT: 'WHEEL_REAR_RIGHT',
    },
    RiskVehicleStatus: {
      CLOSED: 'CLOSED',
      DRAFT: 'DRAFT',
      SUBMITTED: 'SUBMITTED',
    },
    Role: { ADMIN: 'ADMIN', COLLABORATOR: 'COLLABORATOR', MANAGER: 'MANAGER' },
  }),
  { virtual: true },
);

import { BadRequestException } from '@nestjs/common';
import {
  NotificationType,
  RiskPhotoCategory,
  RiskVehicleStatus,
  Role,
} from '../../prisma/generated/client.cjs';
import { RiskVehiclesService } from './risk-vehicles.service';

describe('RiskVehiclesService', () => {
  const service = new RiskVehiclesService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const photoValidationService = new RiskVehiclesService(
    {} as never,
    { isRiskPhotoAsset: () => true } as never,
    {} as never,
    {} as never,
  );

  it('keeps assigned users out of drafts', () => {
    const where = (
      service as unknown as {
        scopeWhere(user: { sub: string; email: string; role: Role }): unknown;
      }
    ).scopeWhere({
      sub: 'user-1',
      email: 'user@example.com',
      role: Role.MANAGER,
    });

    expect(where).toEqual({
      OR: [
        { creatorId: 'user-1' },
        {
          status: { not: RiskVehicleStatus.DRAFT },
          assignments: { some: { userId: 'user-1' } },
        },
      ],
    });
  });

  it('accepts a dossier containing every required photo', () => {
    expect(() => validatePhotoCompleteness(requiredPhotos())).not.toThrow();
  });

  it('rejects a dossier when a required photo is missing', () => {
    const photos = requiredPhotos().filter(
      (photo) => photo.category !== RiskPhotoCategory.DASHBOARD,
    );
    expect(() => validatePhotoCompleteness(photos)).toThrow(
      BadRequestException,
    );
  });

  it('requires both views for every declared damage', () => {
    const photos = [
      ...requiredPhotos(),
      {
        category: RiskPhotoCategory.DAMAGE_WIDE,
        damageGroupId: 'damage-1',
      },
    ];
    expect(() => validatePhotoCompleteness(photos)).toThrow(
      BadRequestException,
    );
  });

  it('accepts one wear photo and multiple damage slots for a tire', () => {
    expect(() =>
      validateRiskPhoto({
        category: RiskPhotoCategory.TIRE_WEAR,
        slotKey: 'tire:front-left:wear',
      }),
    ).not.toThrow();
    expect(() =>
      validateRiskPhoto({
        category: RiskPhotoCategory.TIRE_DAMAGE,
        slotKey: 'tire:front-left:damage:123e4567-e89b-42d3-a456-426614174000',
      }),
    ).not.toThrow();
    expect(() =>
      validateRiskPhoto({
        category: RiskPhotoCategory.TIRE_DAMAGE,
        slotKey: 'tire:front-left:damage:123e4567-e89b-42d3-a456-426614174001',
      }),
    ).not.toThrow();
  });

  it('rejects a tire damage slot without a unique photo id', () => {
    expect(() =>
      validateRiskPhoto({
        category: RiskPhotoCategory.TIRE_DAMAGE,
        slotKey: 'tire:front-left:damage:photo',
      }),
    ).toThrow(BadRequestException);
  });

  it('identifies the author, comment and files in a Risk response email', () => {
    const email = (
      service as unknown as {
        riskEmail(
          recipient: {
            email: string;
            firstName: string;
            id: string;
            lastName: string;
          },
          actor: {
            firstName: string;
            id: string;
            lastName: string;
          },
          vehicle: unknown,
          input: {
            emailResponse: {
              attachments: Array<{
                bytes: number;
                mimeType: string;
                originalName: string;
                publicId: string;
                resourceType: string;
                secureUrl: string;
              }>;
              body: string;
            };
            excerpt: string;
            type: NotificationType;
          },
          url: string,
        ): { html: string; subject: string; text: string };
      }
    ).riskEmail(
      {
        email: 'creator@example.com',
        firstName: 'Camille',
        id: 'creator-1',
        lastName: 'Martin',
      },
      { firstName: 'Alex', id: 'manager-1', lastName: 'Dupont' },
      {
        licensePlate: 'AA111AA',
        licensePlateCountry: 'FR',
        licensePlateRaw: 'AA-111-AA',
        manufacturer: { name: 'Peugeot' },
        riskNumber: 'RISK-20260816-0001',
      },
      {
        emailResponse: {
          attachments: [
            {
              bytes: 2048,
              mimeType: 'application/pdf',
              originalName: 'devis carrosserie.pdf',
              publicId: 'risk/file-1',
              resourceType: 'raw',
              secureUrl: 'https://res.cloudinary.com/demo/raw/upload/devis.pdf',
            },
          ],
          body: 'Merci de remplacer le pare-chocs.',
        },
        excerpt: 'Merci de remplacer le pare-chocs.',
        type: NotificationType.RISK_MESSAGE,
      },
      'https://app.example.com/dashboard/risk/risk-1',
    );

    expect(email.subject).toContain('Nouvelle réponse de Alex Dupont');
    expect(email.text).toContain('Alex Dupont a répondu');
    expect(email.text).toContain('Merci de remplacer le pare-chocs.');
    expect(email.text).toContain('1 fichier ajouté');
    expect(email.text).toContain('devis carrosserie.pdf');
    expect(email.html).toContain('devis carrosserie.pdf');
    expect(email.html).toContain(
      'https://res.cloudinary.com/demo/raw/upload/devis.pdf',
    );
  });

  function validateRiskPhoto(photo: {
    category: RiskPhotoCategory;
    slotKey: string;
  }) {
    return (
      photoValidationService as unknown as {
        validateRiskPhoto(
          dto: {
            category: RiskPhotoCategory;
            publicId: string;
            secureUrl: string;
            slotKey: string;
          },
          riskVehicleId: string,
          userId: string,
        ): void;
      }
    ).validateRiskPhoto(
      {
        ...photo,
        publicId: 'risk-vehicles/risk-1/user-1/photo-1',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/photo.jpg',
      },
      'risk-1',
      'user-1',
    );
  }

  function validatePhotoCompleteness(
    photos: Array<{
      category: RiskPhotoCategory;
      damageGroupId: string | null;
    }>,
  ) {
    return (
      service as unknown as {
        validatePhotoCompleteness(vehicle: { photos: typeof photos }): void;
      }
    ).validatePhotoCompleteness({ photos });
  }
});

function requiredPhotos() {
  return [
    RiskPhotoCategory.EXTERIOR_FRONT_THREE_QUARTER,
    RiskPhotoCategory.EXTERIOR_REAR_THREE_QUARTER,
    RiskPhotoCategory.DASHBOARD,
    RiskPhotoCategory.INTERIOR_FRONT,
    RiskPhotoCategory.INTERIOR_REAR,
    RiskPhotoCategory.WHEEL_FRONT_LEFT,
    RiskPhotoCategory.WHEEL_FRONT_RIGHT,
    RiskPhotoCategory.WHEEL_REAR_LEFT,
    RiskPhotoCategory.WHEEL_REAR_RIGHT,
  ].map((category) => ({ category, damageGroupId: null }));
}
