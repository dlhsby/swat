import { generateTempPassword, hashPassword, verifyPassword } from '../password';

describe('password utilities', () => {
  describe('generateTempPassword', () => {
    it('satisfies the password policy (≥12, upper/lower/digit/symbol)', () => {
      const pw = generateTempPassword();
      expect(pw.length).toBeGreaterThanOrEqual(12);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[!@#$%^&*]/);
    });

    it('produces a different value each call', () => {
      expect(generateTempPassword()).not.toEqual(generateTempPassword());
    });
  });

  describe('hash/verify round-trip', () => {
    it('verifies a correct password and rejects a wrong one', async () => {
      const hash = await hashPassword('CorrectHorse!9');
      expect(hash.startsWith('$argon2id$')).toBe(true);
      await expect(verifyPassword(hash, 'CorrectHorse!9')).resolves.toBe(true);
      await expect(verifyPassword(hash, 'wrong')).resolves.toBe(false);
    });

    it('returns false (never throws) on a malformed hash', async () => {
      await expect(verifyPassword('not-a-hash', 'anything')).resolves.toBe(false);
    });
  });
});
