import { randomBytes } from 'node:crypto';

/**
 * Service-account API keys (Phase 4 weighbridge integration). A key is a CSPRNG
 * 64-hex-char secret behind a recognizable `swatwb_` prefix. Only the Argon2 hash
 * is persisted (see `hashPassword`); the first {@link API_KEY_PREFIX_LENGTH} chars
 * are stored separately as `apiKeyPrefix` so a presented key can be looked up by
 * prefix (indexed) before the constant-time hash verification. Mirrors the
 * password utilities so hashing is identical across both credential types.
 */
export const API_KEY_BRAND = 'swatwb_';

/** Length of the stored, non-secret identifying prefix (`swatwb_` + 5 hex chars). */
export const API_KEY_PREFIX_LENGTH = 12;

/** Generate a new API key and its stored prefix. The full key is shown ONCE. */
export function generateApiKey(): { key: string; prefix: string } {
  const key = `${API_KEY_BRAND}${randomBytes(32).toString('hex')}`;
  return { key, prefix: apiKeyPrefix(key) };
}

/** The non-secret prefix of a (presented or generated) key, used for lookup. */
export function apiKeyPrefix(key: string): string {
  return key.slice(0, API_KEY_PREFIX_LENGTH);
}
