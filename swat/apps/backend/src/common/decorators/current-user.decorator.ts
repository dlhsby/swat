import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import { type Request } from 'express';

import { type SessionUser } from '../auth/session.types';

/**
 * Injects the authenticated {@link SessionUser} from the cookie session or, for
 * native-client requests, from the verified bearer token (`req.user`).
 * Guaranteed to be present on guarded routes (the {@link AuthGuard} rejects
 * unauthenticated requests first); `undefined` only on `@Public` routes.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.session?.user ?? request.user;
  },
);
