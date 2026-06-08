import { ServiceUnavailableException } from '@nestjs/common';

import { type PrismaService } from '../modules/prisma/prisma.service';

import { HealthService } from './health.service';

describe('HealthService', () => {
  let prisma: { $queryRaw: jest.Mock };
  let service: HealthService;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn() };
    service = new HealthService(prisma as unknown as PrismaService);
  });

  it('reports ready when the database responds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'ready',
      checks: { database: 'up' },
    });
  });

  it('throws 503 when the database is unreachable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(service.checkReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
