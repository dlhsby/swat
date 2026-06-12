import { type SessionUser } from '../common/auth/session.types';

/**
 * Bearer-authenticated requests (native .NET clients) carry no session cookie;
 * the {@link TokenBearerMiddleware} attaches the verified principal here instead.
 * Guards, `@CurrentUser`, and the actor-context middleware read
 * `req.session?.user ?? req.user`, so cookie and bearer paths converge.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export {};
