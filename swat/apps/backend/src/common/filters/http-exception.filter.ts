import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type Response } from 'express';

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

/**
 * Global exception filter. Converts any thrown error into the canonical
 * {@link ApiErrorPayload} envelope. Validation messages (arrays) are grouped
 * into field-level `details`. Unknown errors are logged (no PII / stack to the
 * client) and returned as a generic 500.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const code = STATUS_CODE_MAP[status] ?? 'ERROR';
    const payload = this.buildPayload(exception, status, code);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log full detail server-side only.
      this.logger.error(
        `Unhandled ${status} error: ${this.describe(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(errorResponse(payload));
  }

  private buildPayload(exception: unknown, status: number, code: string): ApiErrorPayload {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return { code, message: 'Terjadi kesalahan pada server.' };
    }

    if (exception instanceof HttpException) {
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

    return { code, message: 'Terjadi kesalahan.' };
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
