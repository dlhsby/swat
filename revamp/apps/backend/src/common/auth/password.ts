import { randomBytes } from 'node:crypto';

import { hash, verify } from 'argon2';

/**
 * Argon2id parameters per specs/06-auth-rbac.md §1.1. Kept identical to the
 * seed (`prisma/seed.ts`) so hashes are interchangeable across both paths.
 */
export const ARGON2_OPTIONS = {
  type: 2, // argon2id
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const SYMBOLS = '!@#$%^&*';

/** Hash a plaintext password with Argon2id. */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored hash. Never throws — a malformed
 * hash or mismatch returns `false` so callers branch on a boolean only.
 */
export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}

/**
 * The Super Administrator's password is never a hardcoded default — it always
 * comes from the environment (plaintext locally, dotenvx-encrypted in
 * staging/production), and every seed/script path fails loudly if it's unset.
 * Shared by prisma/seed.ts, migrate-legacy.ts, and reset-staging-passwords.ts so
 * the env var name and failure behavior can't drift between them.
 */
export function getSuperadminPassword(): string {
  const value = process.env.SUPERADMIN_PASSWORD;
  if (!value) {
    throw new Error('SUPERADMIN_PASSWORD env var is required to seed the superadmin user.');
  }
  return value;
}

/**
 * Generate a random temporary password that satisfies the policy
 * (≥12 chars, upper + lower + digit + symbol). Issued on user creation and
 * admin force-reset; the recipient must change it on first login. Uses CSPRNG
 * bytes — never `Math.random`.
 */
export function generateTempPassword(): string {
  const random = randomBytes(12).toString('base64url');
  const picks = randomBytes(2);
  const symbol = SYMBOLS.charAt((picks[0] ?? 0) % SYMBOLS.length);
  const digit = ((picks[1] ?? 0) % 10).toString();
  // Guarantee every character class regardless of the base64url payload.
  return `Aa${digit}${symbol}${random}`;
}
