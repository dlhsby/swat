import { PERMISSION_CATALOG } from '../../common/auth/permission-catalog';
import { type PrismaService } from '../prisma/prisma.service';

import { PermissionsSyncService } from './permissions-sync.service';

describe('PermissionsSyncService', () => {
  let prisma: { permission: { upsert: jest.Mock } };
  let service: PermissionsSyncService;

  beforeEach(() => {
    prisma = { permission: { upsert: jest.fn().mockResolvedValue({}) } };
    service = new PermissionsSyncService(prisma as unknown as PrismaService);
  });

  it('upserts every catalog key and returns the count', async () => {
    const count = await service.syncCatalog();

    expect(count).toBe(PERMISSION_CATALOG.length);
    expect(prisma.permission.upsert).toHaveBeenCalledTimes(PERMISSION_CATALOG.length);
    // Upsert keys on `key`, refresh the description, never touch grants.
    const [first] = PERMISSION_CATALOG;
    if (!first) {
      throw new Error('catalog is empty');
    }
    expect(prisma.permission.upsert).toHaveBeenCalledWith({
      where: { key: first.key },
      update: { description: first.description },
      create: { key: first.key, description: first.description },
    });
  });
});
