import { type SessionUser } from '../common/auth/session.types';
import { type ApiPrincipal } from '../modules/integrations/types/principal';

/**
 * Bearer-authenticated requests (native .NET clients) carry no session cookie;
 * the {@link TokenBearerMiddleware} attaches the verified principal here instead.
 * Guards, `@CurrentUser`, and the actor-context middleware read
 * `req.session?.user ?? req.user`, so cookie and bearer paths converge.
 *
 * `principal` is set by the Phase-4 {@link WeighbridgeGuard} to the unified
 * principal (user OR service account) so the rate-limit middleware and API-audit
 * interceptor can read it regardless of credential type.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
      principal?: ApiPrincipal;
    }
  }
}

export {};
