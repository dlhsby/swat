import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config';
import { configureApp } from '../src/configure-app';
import { CacheService } from '../src/modules/cache/cache.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

/**
 * Live integration test for the Phase-4 service-account admin API: create (returns
 * the plaintext key ONCE), list (key masked to its prefix), update, and revoke.
 * Requires the docker stack + auth seed.
 */
const ADMIN = { username: 'admin', password: 'Password123!' };

describe('Service accounts admin API (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let cookie: string[];
  let roleId: string | null = null;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await configureApp(app, app.get(AppConfigService));
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);

    const cache = app.get(CacheService);
    await cache.invalidatePattern('login:fail:*');
    await cache.invalidatePattern('rbac:role:*:permissions');
    const login = await request(server).post('/api/v1/auth/login').send(ADMIN).expect(200);
    const raw = login.headers['set-cookie'] as string[] | string;
    cookie = Array.isArray(raw) ? raw : [raw];

    const role = await prisma.role.findFirst({
      where: { name: 'Integrasi Timbang' },
      select: { id: true },
    });
    roleId = role?.id ?? null;
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.serviceAccount.deleteMany({ where: { id: { in: createdIds } } });
    }
    await app.close();
  });

  it('requires authentication (401)', async () => {
    await request(server).get('/api/v1/admin/service-accounts').expect(401);
  });

  it('creates → returns the plaintext key once; lists with the key masked', async () => {
    if (!roleId) {
      return;
    }
    const created = await request(server)
      .post('/api/v1/admin/service-accounts')
      .set('Cookie', cookie)
      .send({ name: 'E2E SA', roleId, rateLimitPerMin: 120, allowedIPs: ['10.0.0.5'] })
      .expect(201);
    const { id, apiKey, apiKeyPrefix } = created.body.data;
    createdIds.push(id);
    expect(apiKey).toMatch(/^swatwb_/);
    expect(apiKey.startsWith(apiKeyPrefix)).toBe(true);
    expect(created.body.data.rateLimitPerMin).toBe(120);

    const list = await request(server)
      .get('/api/v1/admin/service-accounts')
      .set('Cookie', cookie)
      .expect(200);
    const row = (list.body.data as Array<Record<string, unknown>>).find((r) => r.id === id);
    expect(row).toBeDefined();
    expect(row).not.toHaveProperty('apiKey');
    expect(row).not.toHaveProperty('apiKeyHash');
    expect(row?.apiKeyPrefix).toBe(apiKeyPrefix);
  });

  it('updates metadata then revokes', async () => {
    if (!roleId) {
      return;
    }
    const created = await request(server)
      .post('/api/v1/admin/service-accounts')
      .set('Cookie', cookie)
      .send({ name: 'E2E SA 2', roleId })
      .expect(201);
    const id = created.body.data.id as string;
    createdIds.push(id);

    const updated = await request(server)
      .patch(`/api/v1/admin/service-accounts/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'E2E SA 2 renamed', rateLimitPerMin: 999 })
      .expect(200);
    expect(updated.body.data.name).toBe('E2E SA 2 renamed');
    expect(updated.body.data.rateLimitPerMin).toBe(999);

    const revoked = await request(server)
      .delete(`/api/v1/admin/service-accounts/${id}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(revoked.body.success).toBe(true);

    const after = await prisma.serviceAccount.findUnique({
      where: { id },
      select: { active: true, revokedAt: true },
    });
    expect(after?.active).toBe(false);
    expect(after?.revokedAt).not.toBeNull();
  });
});
