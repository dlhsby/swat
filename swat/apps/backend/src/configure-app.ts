import { type INestApplication } from '@nestjs/common';

import { type AppConfigService } from './config';
import { buildSessionMiddleware, SessionRedis } from './session';

/**
 * Applies runtime configuration shared by the real bootstrap (`main.ts`) and
 * e2e tests: the global `/api/v1` prefix (health excluded for probes), CORS for
 * the web client, and the Redis-backed session middleware. Keeping this in one
 * place means tests exercise the same request pipeline as production.
 */
export async function configureApp(app: INestApplication, config: AppConfigService): Promise<void> {
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors({ origin: true, credentials: true });

  const sessionRedis = app.get(SessionRedis);
  await sessionRedis.ready();
  app.use(buildSessionMiddleware(config, sessionRedis.client));
}
