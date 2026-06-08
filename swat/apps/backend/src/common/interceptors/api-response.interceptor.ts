import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, map } from 'rxjs';

import { type ApiResponse, type PaginationMeta, successResponse } from '../types/api-response';

/**
 * Shape a handler may return when it wants to attach pagination metadata.
 * Returning a bare value wraps it as `{ success, data }`; returning
 * `{ data, meta }` additionally surfaces the pagination envelope.
 */
interface PaginatedResult<T> {
  readonly data: T;
  readonly meta: PaginationMeta;
}

function isPaginated<T>(value: unknown): value is PaginatedResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    typeof (value as PaginatedResult<T>).meta === 'object'
  );
}

/**
 * Wraps every successful controller return value in the canonical
 * {@link ApiResponse} envelope. Errors are handled by the global exception
 * filter, not here.
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (isPaginated<T>(payload)) {
          return successResponse(payload.data, payload.meta);
        }
        return successResponse(payload);
      }),
    );
  }
}
