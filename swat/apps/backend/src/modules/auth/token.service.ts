import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type SessionUser } from '../../common/auth/session.types';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

/** Access-token lifetime — short, so logout/disable take effect quickly. */
const ACCESS_TTL_SECONDS = 15 * 60;
/** Refresh-token lifetime — rotated on every use. */
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

const refreshKey = (tokenId: string): string => `oauth:refresh:${tokenId}`;
const familyKey = (familyId: string): string => `oauth:family:${familyId}`;
const familyRevokedKey = (familyId: string): string => `oauth:family:${familyId}:revoked`;

const INVALID_REFRESH = 'Refresh token tidak valid, kedaluwarsa, atau telah dicabut.';
const REUSE_DETECTED = 'Penggunaan ulang refresh token terdeteksi; sesi telah dicabut.';
const INVALID_ACCESS = 'Token akses tidak valid atau telah kedaluwarsa.';

/** What a verified access token resolves to (mirrors {@link SessionUser}). */
export type TokenPrincipal = SessionUser;

/** Issued credential pair returned to native clients. */
export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
}

interface AccessClaims {
  readonly sub: string;
  readonly username: string;
  readonly roleId: string;
  /** Token family — lets logout/reuse-detection revoke an access token before it expires. */
  readonly fam: string;
  readonly type: 'access';
}

interface RefreshRecord {
  readonly userId: string;
  readonly username: string;
  readonly roleId: string;
  readonly familyId: string;
  readonly tokenHash: string;
}

/**
 * OAuth2 password-grant tokens for the native .NET clients (TPA weighbridge,
 * kitir printing). Per-user bearer tokens that ride the same RBAC + audit as the
 * web sessions (specs/06-auth-rbac.md §1.7).
 *
 * Access tokens are short-lived signed JWTs; refresh tokens are opaque
 * `"<id>:<secret>"` handles whose record lives in Redis and is **rotated** on
 * every refresh. A "family" pointer tracks the one currently-valid token per
 * login: presenting a superseded token (reuse) or a wrong secret revokes the
 * whole family, and the access JWT carries the family id so a revoke takes effect
 * within the access TTL rather than waiting for expiry.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  /** Issue a fresh access+refresh pair, opening a new token family. */
  async issueTokens(user: Pick<SessionUser, 'id' | 'username' | 'roleId'>): Promise<TokenPair> {
    return this.mint(user, randomUUID());
  }

  /**
   * Rotate a refresh token: validate it, detect reuse, re-check the account, then
   * issue a new pair in the same family and invalidate the presented token.
   */
  async rotateRefreshToken(refreshToken: string): Promise<TokenPair> {
    const sep = refreshToken.indexOf(':');
    if (sep <= 0) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }
    const tokenId = refreshToken.slice(0, sep);
    const secret = refreshToken.slice(sep + 1);

    const record = await this.cache.get<RefreshRecord>(refreshKey(tokenId));
    if (!record) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }
    if (hashSecret(secret) !== record.tokenHash) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException(REUSE_DETECTED);
    }
    // Reuse of an already-rotated (superseded) token: the family pointer has
    // moved on. Treat as compromise and revoke the family.
    const current = await this.cache.get<string>(familyKey(record.familyId));
    if (current !== tokenId) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException(REUSE_DETECTED);
    }

    // Account may have been disabled/deleted since the token was issued.
    const user = await this.prisma.user.findFirst({
      where: { id: record.userId, deletedAt: null },
      select: { id: true, username: true, roleId: true },
    });
    if (!user) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    // The presented token's record is intentionally left in place (it expires by
    // TTL): the family pointer below makes it a *superseded* token, so replaying
    // it is caught as reuse and revokes the family. Deleting it here would mask
    // that replay as a plain "expired" error.
    return this.mint(user, record.familyId);
  }

  /** Verify a bearer access token and resolve its principal (RBAC-ready). */
  async verifyAccessToken(token: string): Promise<TokenPrincipal> {
    let claims: AccessClaims;
    try {
      // Pin the algorithm on verify (not just sign) so a token forged with a
      // different alg — or `alg:none` — can never be accepted.
      claims = await this.jwt.verifyAsync<AccessClaims>(token, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException(INVALID_ACCESS);
    }
    if (claims.type !== 'access') {
      throw new UnauthorizedException(INVALID_ACCESS);
    }
    const revoked = await this.cache.get<number>(familyRevokedKey(claims.fam));
    if (revoked) {
      throw new UnauthorizedException(INVALID_ACCESS);
    }
    return {
      id: claims.sub,
      username: claims.username,
      roleId: claims.roleId,
      mustChangePassword: false,
    };
  }

  /** Revoke the family behind a presented access token (native-client logout). */
  async revokeAccessToken(token: string): Promise<void> {
    let claims: AccessClaims | null = null;
    try {
      // Verify the signature (so a forged `fam` can't revoke someone else's
      // session) but ignore expiry — logging out a just-expired token should
      // still tear down its family.
      claims = await this.jwt.verifyAsync<AccessClaims>(token, {
        algorithms: ['HS256'],
        ignoreExpiration: true,
      });
    } catch {
      claims = null;
    }
    if (claims?.type === 'access' && claims.fam) {
      await this.revokeFamily(claims.fam);
    }
  }

  /** Tear down a token family: drop its active refresh token + tombstone it. */
  private async revokeFamily(familyId: string): Promise<void> {
    const current = await this.cache.get<string>(familyKey(familyId));
    if (current) {
      await this.cache.del(refreshKey(current));
    }
    await this.cache.del(familyKey(familyId));
    // Tombstone outlives any in-flight access token so revoke is "immediate".
    await this.cache.set(familyRevokedKey(familyId), 1, ACCESS_TTL_SECONDS);
  }

  private async mint(
    user: Pick<SessionUser, 'id' | 'username' | 'roleId'>,
    familyId: string,
  ): Promise<TokenPair> {
    const claims: AccessClaims = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      fam: familyId,
      type: 'access',
    };
    const accessToken = await this.jwt.signAsync(claims, { expiresIn: ACCESS_TTL_SECONDS });

    const tokenId = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    const record: RefreshRecord = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      familyId,
      tokenHash: hashSecret(secret),
    };
    await this.cache.set(refreshKey(tokenId), record, REFRESH_TTL_SECONDS);
    await this.cache.set(familyKey(familyId), tokenId, REFRESH_TTL_SECONDS);
    // A fresh issue clears any stale tombstone for a reused family id.
    await this.cache.del(familyRevokedKey(familyId));

    return {
      accessToken,
      refreshToken: `${tokenId}:${secret}`,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TTL_SECONDS,
    };
  }
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}
