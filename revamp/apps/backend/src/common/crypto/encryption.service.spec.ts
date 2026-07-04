import { randomBytes } from 'node:crypto';

import { type AppConfigService } from '../../config';

import { EncryptionService } from './encryption.service';

const KEY_B64 = randomBytes(32).toString('base64');
const withKey = (key?: string): EncryptionService =>
  new EncryptionService({ configEncryptionKey: key } as unknown as AppConfigService);

describe('EncryptionService', () => {
  it('round-trips a secret (decrypt(encrypt(x)) === x)', () => {
    const svc = withKey(KEY_B64);
    const plaintext = 'GPS.id-p@ssw0rd · rahasia';
    const ciphertext = svc.encrypt(plaintext);
    expect(ciphertext).not.toContain(plaintext);
    expect(ciphertext.split(':')).toHaveLength(3);
    expect(svc.decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const svc = withKey(KEY_B64);
    expect(svc.encrypt('same')).not.toBe(svc.encrypt('same'));
  });

  it('reports availability from the key presence', () => {
    expect(withKey(KEY_B64).available).toBe(true);
    expect(withKey(undefined).available).toBe(false);
  });

  it('fails loudly when no key is set', () => {
    const svc = withKey(undefined);
    expect(() => svc.encrypt('x')).toThrow(/CONFIG_ENCRYPTION_KEY is not set/);
    expect(() => svc.decrypt('a:b:c')).toThrow(/CONFIG_ENCRYPTION_KEY is not set/);
  });

  it('rejects a key of the wrong length', () => {
    expect(() => withKey(randomBytes(16).toString('base64'))).toThrow(/32 bytes/);
  });

  it('throws on a tampered/malformed ciphertext', () => {
    const svc = withKey(KEY_B64);
    expect(() => svc.decrypt('not-valid')).toThrow(/Malformed/);
    const [iv, tag, data] = svc.encrypt('hello').split(':') as [string, string, string];
    // Flip a byte in the ciphertext → GCM auth tag must fail.
    const tampered = `${iv}:${tag}:${data.slice(0, -2)}ff`;
    expect(() => svc.decrypt(tampered)).toThrow();
  });
});
