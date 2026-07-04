import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, the GCM recommendation
const KEY_BYTES = 32; // AES-256

/**
 * Authenticated symmetric encryption for SECRET runtime settings stored in the
 * `system_config` table (GPS.id password, Maps keys, webhook token). AES-256-GCM,
 * with the key from `CONFIG_ENCRYPTION_KEY` (base64, 32 bytes). Stored format is
 * `iv:tag:ciphertext` (hex). The key is bootstrap-only (env); if it is absent, only
 * NON-secret settings can be used — any attempt to encrypt/decrypt a secret fails
 * loudly rather than silently storing plaintext.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer | null;

  constructor(config: AppConfigService) {
    const raw = config.configEncryptionKey;
    this.key = raw ? Buffer.from(raw, 'base64') : null;
    if (this.key && this.key.length !== KEY_BYTES) {
      throw new Error(
        `CONFIG_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (base64); got ${this.key.length}.`,
      );
    }
  }

  /** Whether a valid key is configured (so secret settings can be used). */
  get available(): boolean {
    return this.key !== null;
  }

  /** Encrypt a UTF-8 string → `iv:tag:ciphertext` (hex). */
  encrypt(plaintext: string): string {
    const key = this.requireKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /** Reverse {@link encrypt}; throws if the key is missing or the tag doesn't verify. */
  decrypt(payload: string): string {
    const key = this.requireKey();
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) {
      throw new Error('Malformed encrypted value (expected iv:tag:ciphertext).');
    }
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }

  private requireKey(): Buffer {
    if (!this.key) {
      throw new Error(
        'CONFIG_ENCRYPTION_KEY is not set — cannot encrypt/decrypt secret settings. ' +
          'Set a 32-byte base64 key to store secrets in system_config.',
      );
    }
    return this.key;
  }
}
