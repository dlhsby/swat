import { type INestApplication } from '@nestjs/common';
import helmet from 'helmet';

import { resolveCorsOrigin } from './common/cors';
import { type AppConfigService } from './config';
import { buildSessionMiddleware, SessionRedis } from './session';

/**
 * Applies runtime configuration shared by the real bootstrap (`main.ts`) and
 * e2e tests: security headers (helmet), the global `/api/v1` prefix (health
 * excluded for probes), CORS for the web client, and the Redis-backed session
 * middleware. Keeping this in one place means tests exercise the same request
 * pipeline as production.
 */
export async function configureApp(app: INestApplication, config: AppConfigService): Promise<void> {
  // Trust the reverse proxy (nginx) so `req.ip` / `X-Forwarded-For` reflect the
  // real client, not the proxy. Required for the weighbridge service-account IP
  // allowlist and accurate audit-log IPs. `1` = trust the single nearest hop.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers. CSP is disabled here — this app serves JSON + the Swagger
  // UI (whose inline assets a default CSP would block); the HTML web app's CSP
  // is set at the Nginx layer. frameguard `deny` + noSniff satisfy the
  // X-Frame-Options/X-Content-Type-Options requirements (specs/10-nonfunctional §1).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: { action: 'deny' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });
  app.enableCors({ origin: resolveCorsOrigin(process.env.CORS_ORIGIN), credentials: true });

  const sessionRedis = app.get(SessionRedis);
  await sessionRedis.ready();
  app.use(buildSessionMiddleware(config, sessionRedis.client));
}
