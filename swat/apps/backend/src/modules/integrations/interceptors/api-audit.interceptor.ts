import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { type Observable, tap } from 'rxjs';

import { ApiAuditService, endpointOf, ipOf, summarizeRequest } from '../api-audit.service';

/**
 * Records an {@link ApiAuditService} entry for every SUCCESSFUL integration API
 * call (Phase 4, T-412). Runs after the {@link WeighbridgeGuard} so `req.principal`
 * is set. Rejected calls (the guard throws before interceptors run) are audited by
 * the guard itself. Summaries are intentionally coarse — no request/response
 * bodies, so no secrets are persisted.
 */
@Injectable()
export class ApiAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: ApiAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const write = (statusCode: number): void => {
      const principal = request.principal;
      if (!principal) {
        return;
      }
      void this.audit.log({
        principal,
        method: request.method,
        endpoint: endpointOf(request),
        statusCode,
        requestSummary: summarizeRequest(request),
        ipAddress: ipOf(request),
        userAgent: request.headers['user-agent'] ?? '',
      });
    };

    // Success and business-logic failures (422/409/404 thrown by the handler after
    // the guard passed) are both audited here; guard rejections short-circuit
    // before interceptors and are audited by the guard.
    return next.handle().pipe(
      tap({
        next: () => write(response.statusCode),
        error: (err: { status?: number }) =>
          write(typeof err?.status === 'number' ? err.status : 500),
      }),
    );
  }
}
