import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication guard. Rejects any request without a valid session
 * unless the route (or its controller) is marked `@Public`. Runs before
 * {@link PermissionsGuard}, so downstream guards/handlers can assume a session
 * user exists.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    // Cookie session OR bearer token (native clients) — both resolve a principal.
    if (!request.session?.user && !request.user) {
      throw new UnauthorizedException('Sesi tidak valid atau telah berakhir.');
    }
    return true;
  }
}
