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
      TRUNK: 'TRUNK',
      TIRE_DAMAGE: 'TIRE_DAMAGE',
      TIRE_WEAR: 'TIRE_WEAR',
      WHEEL_FRONT_LEFT: 'WHEEL_FRONT_LEFT',
      WHEEL_FRONT_RIGHT: 'WHEEL_FRONT_RIGHT',
      WHEEL_REAR_LEFT: 'WHEEL_REAR_LEFT',
      WHEEL_REAR_RIGHT: 'WHEEL_REAR_RIGHT',
    },
    RiskVehicleStatus: {
      CLOSED: 'CLOSED',
      COMMERCIAL_PHOTOS: 'COMMERCIAL_PHOTOS',
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

  it('prepares a categorized photo archive for an authorized user', async () => {
    const archiveService = new RiskVehiclesService(
      {
        riskVehicle: {
          findFirst: jest.fn().mockResolvedValue({
            licensePlate: 'AA111AA',
            photos: [
              {
                category: RiskPhotoCategory.EXTERIOR_FRONT_THREE_QUARTER,
                format: 'webp',
                secureUrl:
                  'https://res.cloudinary.com/demo/image/upload/front.webp',
              },
              {
                category: RiskPhotoCategory.DAMAGE_CLOSE_UP,
                format: 'jpg',
                secureUrl:
                  'https://res.cloudinary.com/demo/image/upload/damage.jpg',
              },
            ],
            riskNumber: 'RISK-20260828-0001',
          }),
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      archiveService.photoArchive('risk-1', {
        email: 'admin@example.com',
        role: Role.ADMIN,
        sub: 'admin-1',
      }),
    ).resolves.toEqual({
      fileName: 'RISK_AA-111-AA.zip',
      photos: [
        {
          archivePath: 'RISK_AA-111-AA/Exterieur/01-vue-3-4-avant.jpg',
          downloadUrl:
            'https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto:good,c_limit,w_2048/front.webp',
        },
        {
          archivePath: 'RISK_AA-111-AA/Dommages/02-vue-rapprochee.jpg',
          downloadUrl:
            'https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto:good,c_limit,w_2048/damage.jpg',
        },
      ],
    });
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

describe('Risk commercial workflow', () => {
  const user = {
    sub: 'manager-1',
    email: 'manager@example.com',
    role: Role.MANAGER,
  };
  const slots = [
    'front-left',
    'front-right',
    'rear-left',
    'rear-right',
    'dashboard',
    'interior-front',
    'interior-rear',
    'seats-front',
    'seats-rear',
    'wheel-front-left',
    'wheel-front-right',
    'wheel-rear-left',
    'wheel-rear-right',
    'trunk',
  ];
  function vehicle() {
    return {
      id: 'risk-1',
      status: RiskVehicleStatus.COMMERCIAL_PHOTOS,
      commercialMileage: 45200,
      commercialEquipment: {
        secondScreen: 'ABSENT',
        sunroof: 'ABSENT',
        serviceBook: 'ABSENT',
        manual: 'ABSENT',
        accessories: 'ABSENT',
      },
      commercialPhotos: slots.map((slotKey) => ({ slotKey })),
      assignments: [
        {
          userId: user.sub,
          role: 'PRIMARY',
          user: { id: user.sub, isActive: true },
        },
      ],
      creator: { id: user.sub, isActive: true },
    };
  }
  function validate(record: unknown) {
    const service = new RiskVehiclesService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return (
      service as unknown as {
        validateCommercialCompleteness(value: unknown): void;
      }
    ).validateCommercialCompleteness(record);
  }
  it('accepts all mandatory commercial views and checked absent equipment', () => {
    expect(() => validate(vehicle())).not.toThrow();
  });
  it('requires a second display photo only when two screens are declared', () => {
    const record = vehicle();
    record.commercialEquipment.secondScreen = 'PRESENT';
    expect(() => validate(record)).toThrow(BadRequestException);
    record.commercialPhotos.push({ slotKey: 'secondScreen' });
    expect(() => validate(record)).not.toThrow();
    record.commercialEquipment.secondScreen = 'TO_CHECK';
    expect(() => validate(record)).toThrow(BadRequestException);
  });
  it.each(['seats-front', 'seats-rear'])(
    'requires the dedicated %s photo',
    (slot) => {
      const record = vehicle();
      record.commercialPhotos = record.commercialPhotos.filter(
        (photo) => photo.slotKey !== slot,
      );
      expect(() => validate(record)).toThrow(BadRequestException);
    },
  );
  it('does not accept treatment photos in place of commercial photos', () => {
    expect(() =>
      validate({
        ...vehicle(),
        photos: requiredPhotos(),
        commercialPhotos: [],
      }),
    ).toThrow(BadRequestException);
  });
  it('requires a photo for a present document and rejects unchecked equipment', () => {
    for (const manual of ['PRESENT', 'TO_CHECK']) {
      const record = vehicle();
      record.commercialEquipment.manual = manual;
      expect(() => validate(record)).toThrow(BadRequestException);
    }
  });
  it('rejects missing mileage and contradictory absent equipment photos', () => {
    expect(() => validate({ ...vehicle(), commercialMileage: null })).toThrow(
      BadRequestException,
    );
    const record = vehicle();
    record.commercialPhotos.push({ slotKey: 'manual' });
    expect(() => validate(record)).toThrow(BadRequestException);
  });
  it('prevents direct closure from the treatment stage', async () => {
    const prisma = {
      riskVehicle: {
        findFirst: jest.fn().mockResolvedValue({
          ...vehicle(),
          status: RiskVehicleStatus.SUBMITTED,
        }),
      },
    };
    const service = new RiskVehiclesService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.close('risk-1', user)).rejects.toThrow(
      BadRequestException,
    );
  });
  it('rejects a participant who is neither creator nor primary assignee', async () => {
    const prisma = {
      riskVehicle: {
        findFirst: jest.fn().mockResolvedValue({
          ...vehicle(),
          status: RiskVehicleStatus.SUBMITTED,
        }),
      },
    };
    const service = new RiskVehiclesService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.startCommercial('risk-1', { ...user, sub: 'participant' }),
    ).rejects.toThrow('Seuls le créateur');
  });
  it('allows the collaborator who created the dossier to start commercial photography', async () => {
    const creator = { ...user, sub: 'creator-1', role: Role.COLLABORATOR };
    const update = jest
      .fn()
      .mockResolvedValue({ status: RiskVehicleStatus.COMMERCIAL_PHOTOS });
    const prisma = {
      riskVehicle: {
        findFirst: jest.fn().mockResolvedValue({
          ...vehicle(),
          creatorId: creator.sub,
          status: RiskVehicleStatus.SUBMITTED,
        }),
        update,
      },
    };
    const service = new RiskVehiclesService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.startCommercial('risk-1', creator)).resolves.toEqual({
      status: RiskVehicleStatus.COMMERCIAL_PHOTOS,
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statusHistory: {
            create: {
              actorId: creator.sub,
              fromStatus: RiskVehicleStatus.SUBMITTED,
              toStatus: RiskVehicleStatus.COMMERCIAL_PHOTOS,
            },
          },
        }),
      }),
    );
  });

  it('does not allow an ordinary participant to close a dossier', async () => {
    const service = new RiskVehiclesService(
      {
        riskVehicle: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...vehicle(), creatorId: 'creator-1' }),
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.close('risk-1', {
        ...user,
        sub: 'participant',
        role: Role.COLLABORATOR,
      }),
    ).rejects.toThrow('Seuls le créateur');
  });

  it.each([Role.MANAGER, Role.ADMIN, Role.COLLABORATOR])(
    'queues the commercial email for the primary assignee when %s closes',
    async (role) => {
      const record = {
        ...vehicle(),
        creatorId: role === Role.COLLABORATOR ? 'creator-1' : user.sub,
        riskNumber: 'RISK-001',
        licensePlate: 'AA123BB',
        licensePlateCountry: 'FR',
        manufacturer: { name: 'Renault' },
      };
      const responsible = {
        id: user.sub,
        firstName: 'Test',
        lastName: 'User',
        email: user.email,
        isActive: true,
      };
      record.creator =
        role === Role.COLLABORATOR
          ? { ...responsible, id: 'creator-1' }
          : responsible;
      record.assignments[0].user = responsible;
      const closer =
        role === Role.ADMIN
          ? { ...user, sub: 'admin-1', role }
          : role === Role.COLLABORATOR
            ? { ...user, sub: 'creator-1', role }
            : user;
      const tx = {
        notification: {
          createManyAndReturn: jest
            .fn()
            .mockResolvedValue([
              { id: 'notification-1', recipientId: user.sub },
            ]),
        },
        notificationEmail: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        riskVehicle: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(record),
          update: jest
            .fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({ ...record, ...data }),
            ),
        },
      };
      const prisma = {
        riskVehicle: { findFirst: jest.fn().mockResolvedValue(record) },
        user: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: user.sub,
            firstName: 'Test',
            lastName: 'User',
          }),
        },
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      };
      const service = new RiskVehiclesService(
        prisma as never,
        {} as never,
        { get: () => 'https://readyline.example' } as never,
        { kick: jest.fn() } as never,
      );
      const closed = await service.close('risk-1', closer);
      expect(closed.status).toBe(RiskVehicleStatus.CLOSED);
      expect(closed.commercialShareToken).toMatch(/^[a-f0-9]{64}$/);
      expect(closed.closedById).toBe(closer.sub);
      expect(tx.notificationEmail.createMany).toHaveBeenCalledTimes(1);
      expect(tx.notificationEmail.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            recipientEmail: user.email,
            notificationId: 'notification-1',
            subject: expect.stringContaining('Photos commerciales disponibles'),
            text: expect.stringContaining(
              `https://readyline.example/commercial/${closed.commercialShareToken}`,
            ),
            html: expect.stringContaining('Voir les photos commerciales'),
          }),
        ],
      });
      expect(tx.notification.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              recipientId: user.sub,
              type: NotificationType.RISK_CLOSED,
              excerpt: expect.stringContaining(
                'Les photos commerciales sont disponibles',
              ),
            }),
          ],
        }),
      );
      expect(tx.riskVehicle.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'risk-1', status: RiskVehicleStatus.COMMERCIAL_PHOTOS },
        }),
      );
    },
  );
  it('rejects an invalid public token without querying dossiers', async () => {
    const findFirst = jest.fn();
    const service = new RiskVehiclesService(
      { riskVehicle: { findFirst } } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.publicCommercialGallery('risk-1')).rejects.toThrow(
      'Galerie introuvable',
    );
    expect(findFirst).not.toHaveBeenCalled();
  });
  it('only selects the public fields of a closed commercial gallery', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      manufacturer: { name: 'Renault' },
      licensePlate: 'AA123BB',
      commercialMileage: 45200,
      commercialPhotos: [],
    });
    const service = new RiskVehiclesService(
      { riskVehicle: { findFirst } } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const token = 'a'.repeat(64);
    expect(await service.publicCommercialGallery(token)).toEqual({
      manufacturer: 'Renault',
      licensePlate: 'AA123BB',
      mileage: 45200,
      photos: [],
    });
    const query = findFirst.mock.calls[0][0];
    expect(query.where).toEqual({
      commercialShareToken: token,
      status: RiskVehicleStatus.CLOSED,
    });
    expect(Object.keys(query.select).sort()).toEqual([
      'commercialMileage',
      'commercialPhotos',
      'licensePlate',
      'manufacturer',
    ]);
  });
  it('accepts a commercial upload URL matching its asset and rejects a different asset', async () => {
    const dto = {
      slotKey: 'front-left',
      publicId: 'risk/risk-1/commercial-photos/manager-1/asset',
      format: 'jpg',
      secureUrl:
        'https://res.cloudinary.com/demo/image/upload/v123/risk/risk-1/commercial-photos/manager-1/asset.jpg',
      width: 1200,
      height: 900,
      bytes: 1000,
    };
    const tx = {
      riskVehicle: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      riskCommercialPhoto: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(dto),
      },
    };
    const prisma = {
      riskVehicle: { findFirst: jest.fn().mockResolvedValue(vehicle()) },
      $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    };
    const cloudinary = { isRiskPhotoAsset: jest.fn().mockReturnValue(true) };
    const service = new RiskVehiclesService(
      prisma as never,
      cloudinary as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.addCommercialPhoto('risk-1', dto, user),
    ).resolves.toEqual(dto);
    expect(cloudinary.isRiskPhotoAsset).toHaveBeenCalledWith(
      dto.publicId,
      'risk-1',
      user.sub,
      true,
    );
    await expect(
      service.addCommercialPhoto(
        'risk-1',
        {
          ...dto,
          secureUrl: dto.secureUrl.replace('asset.jpg', 'private-document.jpg'),
        },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not allow replacing commercial photos once the dossier is closed', async () => {
    const service = new RiskVehiclesService(
      {
        riskVehicle: {
          findFirst: jest.fn().mockResolvedValue({
            ...vehicle(),
            status: RiskVehicleStatus.CLOSED,
          }),
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.commercialSignature('risk-1', user)).rejects.toThrow(
      'ne sont pas modifiables',
    );
  });
});
