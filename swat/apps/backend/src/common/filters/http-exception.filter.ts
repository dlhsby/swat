import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type Response } from 'express';

import {
  isForeignKeyViolation,
  isNotFoundError,
  isUniqueViolation,
  prismaErrorCode,
} from '../prisma-errors';
import { type ApiErrorPayload, errorResponse } from '../types/api-response';

/**
 * Maps HTTP status codes to stable, machine-readable error codes used by the
 * frontend for branching (e.g. 401 → redirect to login).
 */
const STATUS_CODE_MAP: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

interface NestValidationBody {
  message?: string | string[];
  error?: string;
}

interface Resolved {
  readonly status: number;
  readonly payload: ApiErrorPayload;
}

/**
 * Global exception filter. Converts any thrown error into the canonical
 * {@link ApiErrorPayload} envelope:
 *  - `HttpException` → its status + (validation arrays grouped into `details`).
 *  - Prisma known-request errors → semantic 4xx (unique→409, FK→409, missing→404)
 *    instead of an opaque 500.
 *  - anything else → generic 500 (logged server-side, never leaked to the client).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, payload } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log full detail server-side only.
      this.logger.error(
        `Unhandled ${status} error: ${this.describe(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      const code = prismaErrorCode(exception);
      if (code) {
        // A Prisma error reached the filter — a pre-check is likely missing or a
        // race occurred. Worth a warning (no PII) so we notice.
        this.logger.warn(`Prisma ${code} mapped to ${status}`);
      }
    }

    response.status(status).json(errorResponse(payload));
  }

  private resolve(exception: unknown): Resolved {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = STATUS_CODE_MAP[status] ?? 'ERROR';
      return { status, payload: this.buildHttpPayload(exception, status, code) };
    }

    const prisma = this.resolvePrisma(exception);
    if (prisma) {
      return prisma;
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      payload: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server.' },
    };
  }

  private resolvePrisma(exception: unknown): Resolved | null {
    if (isUniqueViolation(exception)) {
      return {
        status: HttpStatus.CONFLICT,
        payload: { code: 'CONFLICT', message: 'Data sudah ada atau melanggar batasan keunikan.' },
      };
    }
    if (isNotFoundError(exception)) {
      return {
        status: HttpStatus.NOT_FOUND,
        payload: { code: 'NOT_FOUND', message: 'Data tidak ditemukan.' },
      };
    }
    if (isForeignKeyViolation(exception)) {
      return {
        status: HttpStatus.CONFLICT,
        payload: { code: 'CONFLICT', message: 'Operasi melanggar keterkaitan data.' },
      };
    }
    return null;
  }

  private buildHttpPayload(
    exception: HttpException,
    status: number,
    code: string,
  ): ApiErrorPayload {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return { code, message: 'Terjadi kesalahan pada server.' };
    }

    const body = exception.getResponse();
    if (typeof body === 'string') {
      return { code, message: body };
    }
    const { message, error } = body as NestValidationBody;
    if (Array.isArray(message)) {
      return { code, message: error ?? 'Validasi gagal.', details: this.groupMessages(message) };
    }
    return { code, message: message ?? exception.message };
  }

  /** Group `field must be ...` validation strings into `{ field: [msg] }`. */
  private groupMessages(messages: string[]): Record<string, string[]> {
    return messages.reduce<Record<string, string[]>>((acc, msg) => {
      const field = msg.split(' ')[0] ?? '_';
      const existing = acc[field] ?? [];
      return { ...acc, [field]: [...existing, msg] };
    }, {});
  }

  private describe(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Unknown exception';
  }
}
