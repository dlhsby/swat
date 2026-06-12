import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type CacheService } from '../cache/cache.service';
import { type PrismaService } from '../prisma/prisma.service';

import { TokenService } from './token.service';

/** Minimal in-memory stand-in for the Redis-backed CacheService. */
function makeCache(): CacheService {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  } as unknown as CacheService;
}

const USER = { id: 'u-1', username: 'tpa1', roleId: 'r-1' };

describe('TokenService', () => {
  let jwt: JwtService;
  let cache: CacheService;
  let prisma: { user: { findFirst: jest.Mock } };
  let service: TokenService;

  beforeEach(() => {
    jwt = new JwtService({
      secret: 'test-secret-value-1234567890',
      signOptions: { algorithm: 'HS256' },
    });
    cache = makeCache();
    prisma = { user: { findFirst: jest.fn().mockResolvedValue(USER) } };
    service = new TokenService(jwt, cache, prisma as unknown as PrismaService);
  });

  it('issues a verifiable access token and an opaque refresh token', async () => {
    const pair = await service.issueTokens(USER);
    expect(pair.tokenType).toBe('Bearer');
    expect(pair.expiresIn).toBe(900);
    expect(pair.refreshToken).toMatch(/^[0-9a-f-]+:.+$/);

    const principal = await service.verifyAccessToken(pair.accessToken);
    expect(principal).toEqual({
      id: USER.id,
      username: USER.username,
      roleId: USER.roleId,
      mustChangePassword: false,
    });
  });

  it('rejects a malformed or unsigned access token', async () => {
    await expect(service.verifyAccessToken('not-a-jwt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rotates a refresh token into a new pair and invalidates the old one', async () => {
    const first = await service.issueTokens(USER);
    const second = await service.rotateRefreshToken(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(service.verifyAccessToken(second.accessToken)).resolves.toMatchObject({
      id: USER.id,
    });
    // The consumed token can no longer be used.
    await expect(service.rotateRefreshToken(first.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('detects reuse of a superseded refresh token and revokes the family', async () => {
    const first = await service.issueTokens(USER);
    const second = await service.rotateRefreshToken(first.refreshToken);

    // Replaying the ORIGINAL (already-rotated) token is reuse → family revoked.
    await expect(service.rotateRefreshToken(first.refreshToken)).rejects.toThrow(/ulang/i);
    // The legitimate latest token is now revoked too.
    await expect(service.rotateRefreshToken(second.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a refresh token presented with the wrong secret', async () => {
    const pair = await service.issueTokens(USER);
    const tokenId = pair.refreshToken.split(':')[0];
    await expect(service.rotateRefreshToken(`${tokenId}:wrong-secret`)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refuses to rotate when the account has been disabled/deleted', async () => {
    const pair = await service.issueTokens(USER);
    prisma.user.findFirst.mockResolvedValueOnce(null);
    await expect(service.rotateRefreshToken(pair.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('revokes an access token family on logout (immediate, before expiry)', async () => {
    const pair = await service.issueTokens(USER);
    await expect(service.verifyAccessToken(pair.accessToken)).resolves.toMatchObject({
      id: USER.id,
    });

    await service.revokeAccessToken(pair.accessToken);
    await expect(service.verifyAccessToken(pair.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an access token signed with a foreign secret (algorithm/secret pinned)', async () => {
    const foreign = new JwtService({ secret: 'a-totally-different-secret-0987654321' });
    const forged = await foreign.signAsync({
      sub: USER.id,
      username: USER.username,
      roleId: USER.roleId,
      fam: 'f1',
      type: 'access',
    });
    await expect(service.verifyAccessToken(forged)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ignores a forged-signature logout: cannot revoke a family it does not own', async () => {
    const pair = await service.issueTokens(USER);
    const realFam = (jwt.decode(pair.accessToken) as { fam: string }).fam;
    // Attacker forges a token carrying the victim's family id but signs it with
    // their own secret — the signature check must reject it, so no revoke fires.
    const foreign = new JwtService({ secret: 'a-totally-different-secret-0987654321' });
    const forged = await foreign.signAsync({ fam: realFam, type: 'access' });

    await service.revokeAccessToken(forged);

    // The real access token still verifies — the forged logout did nothing.
    await expect(service.verifyAccessToken(pair.accessToken)).resolves.toMatchObject({
      id: USER.id,
    });
  });
});
