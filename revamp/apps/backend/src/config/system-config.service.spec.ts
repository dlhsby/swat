import { randomBytes } from 'node:crypto';

import { EncryptionService } from '../common/crypto/encryption.service';
import { type CacheService } from '../modules/cache/cache.service';
import { type PrismaService } from '../modules/prisma/prisma.service';

import { type AppConfigService } from './config.service';
import { SystemConfigService } from './system-config.service';

const KEY = randomBytes(32).toString('base64');

interface PrismaMock {
  systemConfig: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
    deleteMany: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
  };
  $transaction: jest.Mock;
}

function make(envValues: Partial<Record<string, unknown>> = {}): {
  svc: SystemConfigService;
  prisma: PrismaMock;
  redis: { publish: jest.Mock };
} {
  const prisma: PrismaMock = {
    systemConfig: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
  };
  const config = { raw: (k: string) => envValues[k] } as unknown as AppConfigService;
  const encryption = new EncryptionService({ configEncryptionKey: KEY } as never);
  const redis = { publish: jest.fn().mockResolvedValue(1) };
  const svc = new SystemConfigService(
    prisma as unknown as PrismaService,
    config,
    encryption,
    redis as unknown as CacheService,
  );
  return { svc, prisma, redis };
}

describe('SystemConfigService', () => {
  it('falls back to the env value when no DB override is set', () => {
    const { svc } = make({ GPSID_USERNAME: 'env-user' });
    expect(svc.getGpsidCredentials()).toBeNull(); // baseUrl/password missing
    expect(svc.describe().find((d) => d.key === 'gpsid.username')?.value).toBe('env-user');
  });

  it('DB override wins over env', async () => {
    const { svc, prisma, redis } = make({ GPSID_USERNAME: 'env-user' });
    await svc.set('gpsid.username', 'db-user', 'admin-id');
    expect(prisma.systemConfig.upsert).toHaveBeenCalled();
    expect(redis.publish).toHaveBeenCalled();
    expect(svc.describe().find((d) => d.key === 'gpsid.username')?.value).toBe('db-user');
  });

  it('coerces number + boolean env values', () => {
    const { svc } = make({ GPS_DEVICE_OFFLINE_MINUTES: 12, GPSID_VEHICLE_SYNC: true });
    expect(svc.getGpsDeviceOfflineMinutes()).toBe(12);
    expect(svc.getGpsidVehicleSync()).toBe(true);
  });

  it('encrypts a secret on set and never returns its value from describe()', async () => {
    const { svc, prisma } = make();
    await svc.set('gpsid.password', 'hunter2', 'admin');
    const call = prisma.systemConfig.upsert.mock.calls[0] as [{ create: { value: string } }];
    const stored = call[0].create.value;
    expect(stored).not.toContain('hunter2'); // encrypted
    expect(stored.split(':')).toHaveLength(3);
    const desc = svc.describe().find((d) => d.key === 'gpsid.password');
    expect(desc?.isSecret).toBe(true);
    expect(desc).not.toHaveProperty('value'); // secret value never leaves the server
    expect(desc?.isSet).toBe(true);
    // But the typed getter can still read it (decrypts internally).
    expect(svc.getGpsidCredentials()).toBeNull(); // still null (baseUrl/username unset)
  });

  it('rejects an out-of-range value', async () => {
    const { svc } = make();
    await expect(svc.set('gpsid.vehicleSyncIntervalMin', '0', 'a')).rejects.toThrow();
    await expect(svc.set('unknown.key', 'x', 'a')).rejects.toThrow(/tidak dikenal/);
  });

  const preseed = (svc: SystemConfigService): Promise<void> =>
    (svc as unknown as { preseedFromEnvOnce(): Promise<void> }).preseedFromEnvOnce();

  it('preseeds env values into DB once, encrypting secrets + writing a marker', async () => {
    const { svc, prisma } = make({ GPSID_USERNAME: 'bob', GPSID_PASSWORD: 'p@ss' });
    await preseed(svc);
    const rows = (prisma.systemConfig.createMany.mock.calls[0] as [{ data: Array<{ key: string; value: string }> }])[0].data;
    const uname = rows.find((r) => r.key === 'gpsid.username');
    const pw = rows.find((r) => r.key === 'gpsid.password');
    expect(uname?.value).toBe('bob'); // non-secret stored plain
    expect(pw?.value).not.toBe('p@ss'); // secret encrypted
    expect(pw?.value.split(':')).toHaveLength(3);
    expect(prisma.systemConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ key: '__preseeded__' }) }),
    );
  });

  it('does not preseed twice (marker present)', async () => {
    const { svc, prisma } = make({ GPSID_USERNAME: 'bob' });
    prisma.systemConfig.findUnique.mockResolvedValue({ key: '__preseeded__' });
    await preseed(svc);
    expect(prisma.systemConfig.createMany).not.toHaveBeenCalled();
    expect(prisma.systemConfig.create).not.toHaveBeenCalled();
  });

  it('clear() removes the override and re-publishes', async () => {
    const { svc, prisma, redis } = make({ GPSID_USERNAME: 'env-user' });
    await svc.set('gpsid.username', 'db-user', 'a');
    await svc.clear('gpsid.username');
    expect(prisma.systemConfig.deleteMany).toHaveBeenCalledWith({ where: { key: 'gpsid.username' } });
    expect(redis.publish).toHaveBeenCalledTimes(2);
    expect(svc.describe().find((d) => d.key === 'gpsid.username')?.value).toBe('env-user');
  });
});
