import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

import { Public } from '../../../common/decorators/public.decorator';
import { WeighbridgeGuard } from '../guards/weighbridge.guard';

/** Metadata key carrying the weighbridge permission(s) a route requires. */
export const WEIGHBRIDGE_PERMISSIONS_KEY = 'weighbridgePermissions';

/**
 * Protects a weighbridge endpoint (Phase 4). Marks the route `@Public` so the
 * global cookie/session {@link AuthGuard} steps aside, then delegates ALL
 * authentication + authorization to {@link WeighbridgeGuard}, which accepts
 * either an interactive operator (OAuth2 bearer / session) or a machine
 * ServiceAccount API key and enforces the listed permission(s).
 *
 * @example
 * ```ts
 * @WeighbridgeAuth('weighbridge:post')
 * @Post('post-weighing')
 * post() {}
 * ```
 */
export function WeighbridgeAuth(...permissions: string[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    Public(),
    SetMetadata(WEIGHBRIDGE_PERMISSIONS_KEY, permissions),
    UseGuards(WeighbridgeGuard),
  );
}
