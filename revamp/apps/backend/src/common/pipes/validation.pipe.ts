import { HttpStatus, type ValidationError, ValidationPipe } from '@nestjs/common';
import { UnprocessableEntityException } from '@nestjs/common';

/**
 * Strict global validation pipe.
 *
 * - `whitelist` strips properties not declared on the DTO.
 * - `forbidNonWhitelisted` rejects requests that send unknown properties.
 * - implicit conversion coerces path/query primitives to their declared types.
 *
 * Validation failures surface as 422 so the frontend can render field-level
 * errors; the flattened messages are grouped by the global exception filter.
 */
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = AppValidationPipe.flatten(errors);
        return new UnprocessableEntityException({
          message: messages,
          error: 'Validasi gagal.',
        });
      },
    });
  }

  private static flatten(errors: ValidationError[], parentPath = ''): string[] {
    return errors.flatMap((error) => {
      const path = parentPath ? `${parentPath}.${error.property}` : error.property;
      const own = error.constraints
        ? Object.values(error.constraints).map((msg) => msg.replace(error.property, path))
        : [];
      const children = error.children?.length
        ? AppValidationPipe.flatten(error.children, path)
        : [];
      return [...own, ...children];
    });
  }
}
