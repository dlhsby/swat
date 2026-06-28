import { Prisma } from '@prisma/client';

function isKnownError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

/** A Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return isKnownError(error) && error.code === 'P2002';
}

/** A Prisma foreign-key constraint violation (P2003). */
export function isForeignKeyViolation(error: unknown): boolean {
  return isKnownError(error) && error.code === 'P2003';
}

/** A Prisma "record not found" error (P2025), e.g. update/delete of a missing row. */
export function isNotFoundError(error: unknown): boolean {
  return isKnownError(error) && error.code === 'P2025';
}

/** The Prisma error code (e.g. `P2002`) for logging, or null if not a known Prisma error. */
export function prismaErrorCode(error: unknown): string | null {
  return isKnownError(error) ? error.code : null;
}
