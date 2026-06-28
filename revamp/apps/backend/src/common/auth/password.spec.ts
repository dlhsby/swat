import { ARGON2_OPTIONS, generateTempPassword, hashPassword, verifyPassword } from './password';

describe('password helpers', () => {
  it('hashes and verifies a round-trip', async () => {
    const hash = await hashPassword('Sup3r!secret');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'Sup3r!secret')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong')).resolves.toBe(false);
  });

  it('returns false (never throws) on a malformed hash', async () => {
    await expect(verifyPassword('not-a-hash', 'whatever')).resolves.toBe(false);
  });

  it('generates a policy-compliant temporary password', () => {
    for (let i = 0; i < 50; i += 1) {
      const pw = generateTempPassword();
      expect(pw.length).toBeGreaterThanOrEqual(12);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/\d/);
      expect(pw).toMatch(/[!@#$%^&*]/);
    }
  });

  it('uses argon2id parameters', () => {
    expect(ARGON2_OPTIONS.type).toBe(2);
    expect(ARGON2_OPTIONS.memoryCost).toBe(19456);
  });
});
