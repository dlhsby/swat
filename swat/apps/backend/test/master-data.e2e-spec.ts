import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config';
import { configureApp } from '../src/configure-app';
import { CacheService } from '../src/modules/cache/cache.service';

/**
 * Live integration test for the master-data pipeline (auth guard + validation +
 * business rules). Requires the docker-compose stack and a seeded admin. Each
 * run creates fresh sites so the route uniqueness checks stay idempotent.
 */
const ADMIN = { username: 'admin', password: 'ChangeMe!2026' };

describe('Master data (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let cookie: string[];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await configureApp(app, app.get(AppConfigService));
    await app.init();
    server = app.getHttpServer();

    // Clear login-throttle counters so prior runs don't trip the 429 limit.
    await app.get(CacheService).invalidatePattern('login:fail:*');

    const login = await request(server).post('/api/v1/auth/login').send(ADMIN).expect(200);
    const raw = login.headers['set-cookie'] as string[] | string;
    cookie = Array.isArray(raw) ? raw : [raw];
  });

  afterAll(async () => {
    await app.close();
  });

  it('guards master-data routes (401 without a session)', async () => {
    await request(server).get('/api/v1/sites').expect(401);
  });

  it('lists sites with pagination meta', async () => {
    const res = await request(server).get('/api/v1/sites').set('Cookie', cookie).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
  });

  it('rejects a partial coordinate pair (400)', async () => {
    const res = await request(server)
      .post('/api/v1/sites')
      .set('Cookie', cookie)
      .send({ type: 'TPA', name: 'Bad Coords', address: 'X', latitude: -7.2 })
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('enforces the route lifecycle: create, duplicate→409, same-site→400', async () => {
    const origin = await request(server)
      .post('/api/v1/sites')
      .set('Cookie', cookie)
      .send({ type: 'TPS', name: 'E2E TPS', address: 'A' })
      .expect(201);
    const destination = await request(server)
      .post('/api/v1/sites')
      .set('Cookie', cookie)
      .send({ type: 'TPA', name: 'E2E TPA', address: 'B' })
      .expect(201);

    const originId = origin.body.data.id as number;
    const destinationId = destination.body.data.id as number;
    const routeBody = {
      category: 'DISPOSAL',
      originSiteId: originId,
      destinationSiteId: destinationId,
      distanceKm: 25,
    };

    const created = await request(server)
      .post('/api/v1/routes')
      .set('Cookie', cookie)
      .send(routeBody)
      .expect(201);
    expect(created.body.data).toMatchObject({ originSiteName: 'E2E TPS', distanceKm: 25 });

    await request(server).post('/api/v1/routes').set('Cookie', cookie).send(routeBody).expect(409);

    await request(server)
      .post('/api/v1/routes')
      .set('Cookie', cookie)
      .send({ ...routeBody, destinationSiteId: originId })
      .expect(400);
  });

  it('rejects an invalid plate number with a 422 validation error', async () => {
    const res = await request(server)
      .post('/api/v1/vehicles')
      .set('Cookie', cookie)
      .send({
        poolSiteId: 1,
        modelId: 1,
        plateNumber: 'not-a-plate',
        chassisNumber: 'C',
        engineNumber: 'E',
        currentTareWeight: 8000,
        currentOdometer: 1000,
        registrationExpiry: '2027-01-01',
        taxExpiry: '2027-01-01',
      })
      .expect(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the seeded license-class lookup', async () => {
    const res = await request(server)
      .get('/api/v1/license-classes')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(7);
  });
});
