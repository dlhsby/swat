import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { runWithActor } from './actor-context';

/**
 * Establishes the per-request {@link Actor} context from the session (populated
 * by express-session, which runs before this). Everything downstream — guards,
 * controllers, services, the Prisma audit middleware — reads it via `getActor()`.
 * Runs for the whole request because `runWithActor` wraps `next()`.
 */
@Injectable()
export class ActorContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const user = req.session?.user;
    runWithActor({ id: user?.id ?? null, name: user?.username ?? 'system' }, () => next());
  }
}
