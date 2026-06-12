import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { TokenService } from './token.service';

/**
 * Resolves an `Authorization: Bearer <jwt>` header into a request principal
 * (`req.user`) so the global guards, `@CurrentUser`, and the actor-context
 * middleware authenticate native-client requests the same way as cookie
 * sessions. Runs before {@link ActorContextMiddleware}. Never throws: an
 * absent/invalid token simply leaves `req.user` unset and the guard rejects.
 */
@Injectable()
export class TokenBearerMiddleware implements NestMiddleware {
  constructor(private readonly tokens: TokenService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // A live cookie session always wins; skip the token check when one exists.
    if (req.session?.user) {
      return next();
    }
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7).trim();
      if (token) {
        try {
          // Object.assign avoids the no-param-reassign lint on a direct `req.user =`.
          Object.assign(req, { user: await this.tokens.verifyAccessToken(token) });
        } catch {
          // Invalid/expired/revoked — leave req.user unset; the guard 401s.
        }
      }
    }
    return next();
  }
}
