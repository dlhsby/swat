import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

/**
 * Minimal e2e smoke test: the health endpoint returns the API envelope.
 * `/health` (liveness) does not touch the DB; `HealthService` only needs
 * `PrismaService` for `/ready`, so we supply a lightweight stub (in the running
 * app, PrismaModule is global — hence the live endpoint resolves it fine).
 */
describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prismaStub = { $queryRaw: async () => [{ result: 1 }] };
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, { provide: PrismaService, useValue: prismaStub }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health -> { success: true, data: { status: "ok" } }', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /health/ready -> ready when the database is reachable', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ready');
    expect(res.body.data.checks.database).toBe('up');
  });
});
