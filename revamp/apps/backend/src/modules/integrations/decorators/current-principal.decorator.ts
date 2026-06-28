import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import { type Request } from 'express';

import { type ApiPrincipal } from '../types/principal';

/**
 * Injects the unified {@link ApiPrincipal} resolved by the {@link WeighbridgeGuard}.
 * Guaranteed present on weighbridge routes (the guard 401s otherwise).
 */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiPrincipal | undefined => {
    return ctx.switchToHttp().getRequest<Request>().principal;
  },
);
