import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config';
import { configureApp } from '../src/configure-app';
import { CacheService } from '../src/modules/cache/cache.service';

/**
 * Live integration test for the auth + RBAC pipeline. Requires the docker-compose
 * stack (Postgres + Redis) and a seeded admin (`admin` / `ChangeMe!2026`). Run
 * via `pnpm --filter @swat/backend test:e2e`.
 */
const ADMIN = { username: 'admin', password: 'ChangeMe!2026' };

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  function cookiesOf(res: request.Response): string[] {
    const raw = res.headers['set-cookie'] as string[] | string | undefined;
    if (!raw) {
      return [];
    }
    return Array.isArray(raw) ? raw : [raw];
  }

  async function loginAsAdmin(): Promise<string[]> {
    const res = await request(server).post('/api/v1/auth/login').send(ADMIN).expect(200);
    return cookiesOf(res);
  }

  it('rejects invalid credentials with 400 and no cookie', async () => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'wrong-password' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('logs in the admin, sets an httpOnly session cookie, and flags mustChangePassword', async () => {
    const res = await request(server).post('/api/v1/auth/login').send(ADMIN).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ username: 'admin', mustChangePassword: true });
    const cookie = cookiesOf(res)[0] ?? '';
    expect(cookie).toContain('swat.sid=');
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('returns 401 from /auth/me without a session', async () => {
    const res = await request(server).get('/api/v1/auth/me').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the current user with permissions when authenticated', async () => {
    const cookie = await loginAsAdmin();
    const res = await request(server).get('/api/v1/auth/me').set('Cookie', cookie).expect(200);
    expect(res.body.data.username).toBe('admin');
    expect(Array.isArray(res.body.data.permissions)).toBe(true);
    // Administrator holds the full catalog.
    expect(res.body.data.permissions).toContain('user:read');
  });

  it('guards protected routes: 401 without a session', async () => {
    await request(server).get('/api/v1/users').expect(401);
  });

  it('allows the admin (full permissions) to list users', async () => {
    const cookie = await loginAsAdmin();
    const res = await request(server).get('/api/v1/users').set('Cookie', cookie).expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
  });

  it('destroys the session on logout', async () => {
    const cookie = await loginAsAdmin();
    await request(server).post('/api/v1/auth/logout').set('Cookie', cookie).expect(200);
    await request(server).get('/api/v1/auth/me').set('Cookie', cookie).expect(401);
  });
});
