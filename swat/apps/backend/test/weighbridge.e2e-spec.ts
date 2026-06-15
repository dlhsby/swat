import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config';
import { configureApp } from '../src/configure-app';
import { CacheService } from '../src/modules/cache/cache.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

/**
 * Live integration test for the Phase-4 weighbridge API. Builds a deterministic
 * fixture (ACTIVE DisposalPermit → GOOD vehicle → TPA site with a DISPOSAL route,
 * a TransactionDay + Haul + assignment for today) from seeded reference data via
 * Prisma, then exercises resolve-kitir / post-weighing / patch / list plus the
 * service-account API-key path. Requires the docker-compose stack with the demo
 * seed. If the required reference data is missing, the suite skips its body.
 */
const ADMIN = { username: 'admin', password: 'Password123!' };
const today = (): string => new Date().toISOString().slice(0, 10);

interface Fixture {
  permitId: string;
  code: string;
  plateNumber: string;
  vehicleId: string;
  tpaSiteId: string;
  transactionDayId: string;
  haulId: string;
  assignmentId: string;
  createdHaul: boolean;
  createdAssignment: boolean;
}

describe('Weighbridge API (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let cookie: string[];
  let fx: Fixture | null = null;
  const createdTripIds: string[] = [];

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
    // The weighbridge:* permissions were added in Phase 4; drop any cached role
    // grants so the freshly-seeded grants are read.
    await cache.invalidatePattern('rbac:role:*:permissions');
    const login = await request(server).post('/api/v1/auth/login').send(ADMIN).expect(200);
    const raw = login.headers['set-cookie'] as string[] | string;
    cookie = Array.isArray(raw) ? raw : [raw];

    fx = await buildFixture(prisma);
  });

  afterAll(async () => {
    if (fx) {
      await prisma.tpaInboundLog.deleteMany({ where: { plateNumber: fx.plateNumber } });
      if (createdTripIds.length > 0) {
        await prisma.trip.deleteMany({ where: { id: { in: createdTripIds } } });
      }
      if (fx.createdAssignment) {
        await prisma.haulAssignment.deleteMany({ where: { id: fx.assignmentId } });
      }
      if (fx.createdHaul) {
        await prisma.haul.deleteMany({ where: { id: fx.haulId } });
      }
      await prisma.disposalPermit.deleteMany({ where: { id: fx.permitId } });
    }
    await app.close();
  });

  it('rejects unauthenticated requests (401)', async () => {
    await request(server)
      .post('/api/v1/weighbridge/resolve-kitir')
      .send({ code: 'X', date: today() })
      .expect(401);
  });

  it('resolves a kitir by code (200)', async () => {
    if (!fx) {
      return;
    }
    const res = await request(server)
      .post('/api/v1/weighbridge/resolve-kitir')
      .set('Cookie', cookie)
      .send({ code: fx.code, date: today() })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plateNumber).toBe(fx.plateNumber);
    expect(res.body.data.vehicle).toHaveProperty('currentTareWeight');
  });

  it('resolves a kitir by plate (200)', async () => {
    if (!fx) {
      return;
    }
    const res = await request(server)
      .post('/api/v1/weighbridge/resolve-kitir')
      .set('Cookie', cookie)
      .send({ plateNumber: fx.plateNumber, date: today() })
      .expect(200);
    expect(res.body.data.id).toBe(fx.permitId);
  });

  it('400 when neither code nor plate is provided', async () => {
    await request(server)
      .post('/api/v1/weighbridge/resolve-kitir')
      .set('Cookie', cookie)
      .send({ date: today() })
      .expect(400);
  });

  it('404 for an unknown kitir', async () => {
    await request(server)
      .post('/api/v1/weighbridge/resolve-kitir')
      .set('Cookie', cookie)
      .send({ code: 'KT-DOES-NOT-EXIST', date: today() })
      .expect(404);
  });

  it('posts a weighing: 201, server-computed net, Trip DONE, TpaInboundLog created', async () => {
    if (!fx) {
      return;
    }
    const res = await request(server)
      .post('/api/v1/weighbridge/post-weighing')
      .set('Cookie', cookie)
      .send({
        kitirId: fx.permitId,
        plateNumber: fx.plateNumber,
        date: today(),
        grossWeight: 6200,
        tareWeight: 4200,
        wasteVolume: 10,
        cctvReference: 'CCTV-E2E-001',
      })
      .expect(201);
    expect(res.body.data.netWeight).toBe(2000);
    createdTripIds.push(res.body.data.tripId);

    const trip = await prisma.trip.findUnique({ where: { id: res.body.data.tripId } });
    expect(trip?.status).toBe('DONE');
    expect(trip?.netWeight).toBe(2000);

    const log = await prisma.tpaInboundLog.findFirst({ where: { tripId: res.body.data.tripId } });
    expect(log?.netWeight).toBe(2000);
  });

  it('422 when gross < tare', async () => {
    if (!fx) {
      return;
    }
    await request(server)
      .post('/api/v1/weighbridge/post-weighing')
      .set('Cookie', cookie)
      .send({
        kitirId: fx.permitId,
        plateNumber: fx.plateNumber,
        date: today(),
        grossWeight: 100,
        tareWeight: 4200,
      })
      .expect(422);
  });

  it('409 when the plate does not match the kitir', async () => {
    if (!fx) {
      return;
    }
    await request(server)
      .post('/api/v1/weighbridge/post-weighing')
      .set('Cookie', cookie)
      .send({
        kitirId: fx.permitId,
        plateNumber: 'ZZ-0000-ZZ',
        date: today(),
        grossWeight: 6200,
        tareWeight: 4200,
      })
      .expect(409);
  });

  it('is idempotent: same Idempotency-Key returns the same result with no duplicate log', async () => {
    if (!fx) {
      return;
    }
    // Unique per run — the server caches idempotent responses for 24h, so a fixed
    // key would replay a prior run's (now-deleted) result.
    const key = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const body = {
      kitirId: fx.permitId,
      plateNumber: fx.plateNumber,
      date: today(),
      grossWeight: 7000,
      tareWeight: 4200,
    };
    const first = await request(server)
      .post('/api/v1/weighbridge/post-weighing')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    createdTripIds.push(first.body.data.tripId);
    const second = await request(server)
      .post('/api/v1/weighbridge/post-weighing')
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    expect(second.body.data.tripId).toBe(first.body.data.tripId);

    const logs = await prisma.tpaInboundLog.count({
      where: { tripId: first.body.data.tripId, netWeight: 2800 },
    });
    expect(logs).toBe(1);
  });

  it('lists weighings (200) and patches/verifies one (200)', async () => {
    if (!fx || createdTripIds.length === 0) {
      return;
    }
    const list = await request(server)
      .get(`/api/v1/weighbridge/weighings?plateNumber=${encodeURIComponent(fx.plateNumber)}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(list.body.success).toBe(true);
    expect(Array.isArray(list.body.data)).toBe(true);

    const tripId = createdTripIds[0];
    const patch = await request(server)
      .patch(`/api/v1/weighbridge/weighings/${tripId}`)
      .set('Cookie', cookie)
      .send({ verified: true, cctvReference: 'CCTV-E2E-PATCH' })
      .expect(200);
    expect(patch.body.success).toBe(true);
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    expect(trip?.status).toBe('VERIFIED');
  });

  it('supports the service-account API-key path and rejects after revoke', async () => {
    if (!fx) {
      return;
    }
    // Create a service account with the weighbridge role via the admin API.
    const role = await prisma.role.findFirst({
      where: { name: 'Integrasi Timbang' },
      select: { id: true },
    });
    if (!role) {
      return;
    }
    const created = await request(server)
      .post('/api/v1/admin/service-accounts')
      .set('Cookie', cookie)
      .send({ name: 'E2E Weighbridge', roleId: role.id })
      .expect(201);
    const apiKey: string = created.body.data.apiKey;
    const saId: string = created.body.data.id;
    expect(apiKey).toMatch(/^swatwb_/);

    await request(server)
      .post('/api/v1/weighbridge/resolve-kitir')
      .set('X-API-Key', apiKey)
      .send({ code: fx.code, date: today() })
      .expect(200);

    await request(server)
      .delete(`/api/v1/admin/service-accounts/${saId}`)
      .set('Cookie', cookie)
      .expect(200);

    await request(server)
      .post('/api/v1/weighbridge/resolve-kitir')
      .set('X-API-Key', apiKey)
      .send({ code: fx.code, date: today() })
      .expect(401);
  });
});

/** Build the minimal fixture from seeded reference data; returns null if absent. */
async function buildFixture(prisma: PrismaService): Promise<Fixture | null> {
  const route = await prisma.route.findFirst({
    where: { category: 'DISPOSAL', deletedAt: null },
    select: { destinationSiteId: true },
  });
  const vehicle = await prisma.vehicle.findFirst({
    where: { status: 'GOOD', deletedAt: null },
    select: { id: true, plateNumber: true },
  });
  const driver = await prisma.driver.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });
  if (!route || !vehicle || !driver) {
    return null;
  }
  const tpaSiteId = route.destinationSiteId;

  const code = `KT-E2E-${Date.now().toString().slice(-8)}`;
  const permit = await prisma.disposalPermit.create({
    data: {
      code,
      vehicleId: vehicle.id,
      siteId: tpaSiteId,
      status: 'ACTIVE',
      issuedAt: new Date(),
      validFrom: new Date('2020-01-01T00:00:00Z'),
      validTo: new Date('2099-12-31T00:00:00Z'),
    },
    select: { id: true },
  });

  const operationDate = new Date(`${today()}T00:00:00.000Z`);
  const transactionDay = await prisma.transactionDay.upsert({
    where: { date: operationDate },
    update: {},
    create: { date: operationDate, status: 'IN_PROGRESS' },
    select: { id: true },
  });
  const existingHaul = await prisma.haul.findFirst({
    where: { transactionDayId: transactionDay.id, vehicleId: vehicle.id, operationDate },
    select: { id: true },
  });
  const createdHaul = !existingHaul;
  const haul =
    existingHaul ??
    (await prisma.haul.create({
      data: {
        transactionDayId: transactionDay.id,
        vehicleId: vehicle.id,
        operationDate,
        status: 'IN_PROGRESS',
      },
      select: { id: true },
    }));

  const existingAssignment = await prisma.haulAssignment.findFirst({
    where: { haulId: haul.id },
    select: { id: true },
  });
  const createdAssignment = !existingAssignment;
  const assignment =
    existingAssignment ??
    (await prisma.haulAssignment.create({
      data: { haulId: haul.id, driverId: driver.id, operationDate, status: 'IN_PROGRESS' },
      select: { id: true },
    }));

  return {
    permitId: permit.id,
    code,
    plateNumber: vehicle.plateNumber,
    vehicleId: vehicle.id,
    tpaSiteId,
    transactionDayId: transactionDay.id,
    haulId: haul.id,
    assignmentId: assignment.id,
    createdHaul,
    createdAssignment,
  };
}
