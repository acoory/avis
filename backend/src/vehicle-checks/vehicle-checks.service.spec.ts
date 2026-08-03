jest.mock(
  '../../prisma/generated/client.cjs',
  () => ({
    NotificationType: {},
    PartOrderStatus: { TO_ORDER: 'TO_ORDER' },
    Prisma: { PrismaClientKnownRequestError: class extends Error {} },
    PrismaClient: class {},
    RepairDecisionStatus: {},
    RepairExecutionMode: { EXTERNAL_PROVIDER: 'EXTERNAL_PROVIDER' },
    Role: {
      ADMIN: 'ADMIN',
      COLLABORATOR: 'COLLABORATOR',
      MANAGER: 'MANAGER',
    },
    VehicleCheckConversationParticipantRole: {},
    VehicleCheckConversationStatus: {},
    VehicleCheckItemOperationalStatus: { ACTIVE: 'ACTIVE' },
    VehicleCheckStatus: {},
  }),
  { virtual: true },
);

import { VehicleChecksService } from './vehicle-checks.service';

type SearchFindManyRequest = {
  include?: unknown;
  orderBy: unknown;
  select: Record<string, unknown>;
  take: number;
  where: {
    AND: Array<{ OR: unknown[] }>;
    OR?: unknown;
    collaboratorId?: string;
  };
};

const roles = {
  admin: 'ADMIN',
  collaborator: 'COLLABORATOR',
  manager: 'MANAGER',
} as const;

describe('VehicleChecksService search', () => {
  const findMany = jest.fn<Promise<unknown[]>, [SearchFindManyRequest]>();
  const service = new VehicleChecksService(
    { vehicleCheck: { findMany } } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  it('normalizes plate terms and returns only lightweight fields', async () => {
    await service.search(
      { q: 'AB-123-CD Peugeot', limit: 8 },
      {
        sub: 'admin-1',
        email: 'admin@example.com',
        role: roles.admin,
      },
    );

    expect(findMany).toHaveBeenCalledTimes(1);
    const request = findMany.mock.calls[0]?.[0];
    expect(request).toBeDefined();
    if (!request) throw new Error('Search request was not captured');

    expect(request).toEqual(
      expect.objectContaining({
        orderBy: [{ checkDate: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          licensePlate: true,
          licensePlateRaw: true,
          licensePlateCountry: true,
          checkNumber: true,
          checkDate: true,
          city: true,
          manufacturer: { select: { id: true, name: true } },
          vehicleModel: { select: { id: true, name: true } },
        },
      }),
    );
    expect(request.include).toBeUndefined();
    expect(request.where.AND[0]?.OR).toContainEqual({
      licensePlate: {
        contains: 'AB123CD',
        mode: 'insensitive',
      },
    });
  });

  it('restricts collaborators to their own checks', async () => {
    await service.search(
      { q: '208', limit: 5 },
      {
        sub: 'collaborator-1',
        email: 'collaborator@example.com',
        role: roles.collaborator,
      },
    );

    expect(findMany.mock.calls[0]?.[0].where).toEqual(
      expect.objectContaining({ collaboratorId: 'collaborator-1' }),
    );
  });

  it('restricts managers to their checks and managed collaborators', async () => {
    await service.search(
      { q: 'Paris', limit: 8 },
      {
        sub: 'manager-1',
        email: 'manager@example.com',
        role: roles.manager,
      },
    );

    expect(findMany.mock.calls[0]?.[0].where.OR).toEqual([
      { collaboratorId: 'manager-1' },
      {
        collaborator: {
          managerAssignments: {
            some: { managerId: 'manager-1', isActive: true },
          },
        },
      },
    ]);
  });
});
