import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config';
import { configureApp } from '../src/configure-app';
import { CacheService } from '../src/modules/cache/cache.service';

/**
 * Live integration test for the transaction lifecycle (Epics 1.7–1.8): daily
 * initialization → transaction-day tree → depart/return → trip recording
 * (REFUEL/PICKUP/DISPOSAL/passive) → verify + lock. Requires the
 * docker-compose stack with the synthetic seed (`SEED_SYNTHETIC=true`), which
 * provides crew schedules for the daily-init to materialize.
 */
const ADMIN = { username: 'admin', password: 'Password123!' };

const today = (): string => new Date().toISOString().slice(0, 10);

describe('Transactions lifecycle (e2e)', () => {
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

    await app.get(CacheService).invalidatePattern('login:fail:*');
    const login = await request(server).post('/api/v1/auth/login').send(ADMIN).expect(200);
    const raw = login.headers['set-cookie'] as string[] | string;
    cookie = Array.isArray(raw) ? raw : [raw];
  });

  afterAll(async () => {
    await app.close();
  });

  it('guards the transaction routes (401 without a session)', async () => {
    await request(server).get(`/api/v1/transaction-days?date=${today()}`).expect(401);
  });

  it('initializes today idempotently', async () => {
    const first = await request(server)
      .post('/api/v1/transaction-days/initialize-today')
      .set('Cookie', cookie)
      .expect(201);
    expect(first.body.data).toMatchObject({ date: today() });

    const second = await request(server)
      .post('/api/v1/transaction-days/initialize-today')
      .set('Cookie', cookie)
      .expect(201);
    // A second run for the same day must not create a second transaction day.
    expect(second.body.data.created).toBe(false);
  });

  it('returns the full day tree for the date', async () => {
    const res = await request(server)
      .get(`/api/v1/transaction-days?date=${today()}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.hauls)).toBe(true);
  });

  it('drives an assignment depart → trip records → return, and verifies a trip', async () => {
    const day = await request(server)
      .get(`/api/v1/transaction-days?date=${today()}`)
      .set('Cookie', cookie)
      .expect(200);

    const haul = day.body.data.hauls[0];
    if (!haul) {
      // No seeded crew schedules → nothing to record. Skip the body assertions.
      return;
    }
    const assignment = haul.assignments[0];

    await request(server)
      .put(`/api/v1/haul-assignments/${assignment.id}/record-depart`)
      .set('Cookie', cookie)
      .send({
        actualOdometer: assignment.departTargetOdometer,
        actualTime: new Date().toISOString(),
      })
      .expect(200);

    const disposal = assignment.trips.find(
      (t: { routeCategory: string }) => t.routeCategory === 'DISPOSAL',
    );
    if (disposal) {
      const recorded = await request(server)
        .put(`/api/v1/trips/${disposal.id}`)
        .set('Cookie', cookie)
        .send({
          actualTime: new Date().toISOString(),
          actualOdometer: assignment.departTargetOdometer + 10,
          grossWeight: 14000,
        })
        .expect(200);
      // Server computes net = gross − tare.
      expect(recorded.body.data.netWeight).toBe(14000 - recorded.body.data.tareWeight);

      await request(server)
        .put(`/api/v1/trips/${disposal.id}/verify`)
        .set('Cookie', cookie)
        .expect(200);

      const verified = await request(server)
        .get(`/api/v1/trips/${disposal.id}`)
        .set('Cookie', cookie)
        .expect(200);
      expect(verified.body.data.status).toBe('VERIFIED');
    }
  });

  it('rejects a disposal where gross < tare (negative net)', async () => {
    const day = await request(server)
      .get(`/api/v1/transaction-days?date=${today()}`)
      .set('Cookie', cookie)
      .expect(200);
    const haul = day.body.data.hauls[0];
    if (!haul) return;
    const assignment = haul.assignments[0];
    const disposal = assignment.trips.find(
      (t: { routeCategory: string; status: string }) =>
        t.routeCategory === 'DISPOSAL' && t.status === 'IN_PROGRESS',
    );
    if (!disposal) return;
    await request(server)
      .put(`/api/v1/trips/${disposal.id}`)
      .set('Cookie', cookie)
      .send({
        actualTime: new Date().toISOString(),
        actualOdometer: assignment.departTargetOdometer + 5,
        grossWeight: 1,
      })
      .expect(400);
  });
});
