import {
  BadRequestException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthAction } from '@prisma/client';

import { type RolePermissionsService } from '../../common/auth/role-permissions.service';
import { type SessionUser } from '../../common/auth/session.types';
import { type PrismaService } from '../prisma/prisma.service';

import { AuthService } from './auth.service';
import { type AuthContext } from './auth.types';
import { type LoginThrottleService } from './login-throttle.service';

jest.mock('../../common/auth/password', () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn(),
  generateTempPassword: jest.fn(),
}));

// eslint-disable-next-line import/order
import { generateTempPassword, hashPassword, verifyPassword } from '../../common/auth/password';

const verify = verifyPassword as jest.Mock;
const hashFn = hashPassword as jest.Mock;
const genTemp = generateTempPassword as jest.Mock;

const ctx: AuthContext = { ip: '127.0.0.1', userAgent: 'jest' };

function buildUser(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    username: 'admin',
    name: 'Administrator',
    roleId: 7,
    passwordHash: '$argon2id$hash',
    mustChangePassword: true,
    deletedAt: null,
    role: { name: 'Administrator' },
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findFirst: jest.Mock; update: jest.Mock };
    authAuditLog: { create: jest.Mock };
  };
  let throttle: { assertAllowed: jest.Mock; registerFailure: jest.Mock; reset: jest.Mock };
  let rolePermissions: { getPermissionKeys: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      user: { findFirst: jest.fn(), update: jest.fn() },
      authAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    throttle = {
      assertAllowed: jest.fn().mockResolvedValue(undefined),
      registerFailure: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    };
    rolePermissions = { getPermissionKeys: jest.fn() };
    service = new AuthService(
      prisma as unknown as PrismaService,
      throttle as unknown as LoginThrottleService,
      rolePermissions as unknown as RolePermissionsService,
    );
  });

  describe('login', () => {
    it('returns the session user on valid credentials and resets the throttle', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser());
      verify.mockResolvedValue(true);

      const result = await service.login({ username: 'admin', password: 'good' }, ctx);

      expect(result.user).toEqual({
        id: 1,
        username: 'admin',
        roleId: 7,
        mustChangePassword: true,
      });
      expect(result.roleName).toBe('Administrator');
      expect(throttle.reset).toHaveBeenCalledWith('127.0.0.1', 'admin');
      expect(prisma.authAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuthAction.LOGIN }) }),
      );
    });

    it('rejects an unknown username generically and records a failure', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login({ username: 'ghost', password: 'x' }, ctx)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(verify).not.toHaveBeenCalled();
      expect(throttle.registerFailure).toHaveBeenCalledWith('127.0.0.1', 'ghost');
      expect(prisma.authAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuthAction.FAILED_LOGIN, userId: null }),
        }),
      );
    });

    it('rejects a wrong password generically and records a failure with the user id', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser());
      verify.mockResolvedValue(false);

      await expect(
        service.login({ username: 'admin', password: 'bad' }, ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(throttle.registerFailure).toHaveBeenCalled();
      expect(prisma.authAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuthAction.FAILED_LOGIN, userId: 1 }),
        }),
      );
    });

    it('refuses to even look up the user when throttled', async () => {
      throttle.assertAllowed.mockRejectedValue(new HttpException('too many', 429));

      await expect(service.login({ username: 'admin', password: 'x' }, ctx)).rejects.toBeInstanceOf(
        HttpException,
      );
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('still succeeds when the audit write fails', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser());
      verify.mockResolvedValue(true);
      prisma.authAuditLog.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.login({ username: 'admin', password: 'good' }, ctx),
      ).resolves.toMatchObject({ name: 'Administrator' });
    });
  });

  describe('getMe', () => {
    it('returns identity plus resolved permissions', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser());
      rolePermissions.getPermissionKeys.mockResolvedValue(['user:read', 'role:read']);

      const me = await service.getMe(1);

      expect(me).toMatchObject({
        userId: 1,
        username: 'admin',
        roleName: 'Administrator',
        permissions: ['user:read', 'role:read'],
      });
    });

    it('throws when the user no longer exists', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.getMe(99)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    const dto = {
      currentPassword: 'OldPass!2025',
      newPassword: 'NewPass!2026x',
      confirmPassword: 'NewPass!2026x',
    };

    it('rejects when confirmation does not match', async () => {
      await expect(
        service.changePassword(1, { ...dto, confirmPassword: 'different' }, ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when the user is missing', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.changePassword(1, dto, ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    describe('voluntary change (mustChangePassword = false)', () => {
      beforeEach(() => {
        prisma.user.findFirst.mockResolvedValue(buildUser({ mustChangePassword: false }));
      });

      it('rejects a missing current password', async () => {
        await expect(
          service.changePassword(1, { ...dto, currentPassword: '' }, ctx),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.user.update).not.toHaveBeenCalled();
      });

      it('rejects when the new password equals the current one', async () => {
        await expect(
          service.changePassword(
            1,
            {
              currentPassword: 'Same!2026abc',
              newPassword: 'Same!2026abc',
              confirmPassword: 'Same!2026abc',
            },
            ctx,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('rejects a wrong current password', async () => {
        verify.mockResolvedValue(false);
        await expect(service.changePassword(1, dto, ctx)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(prisma.user.update).not.toHaveBeenCalled();
      });

      it('updates the hash and clears the forced-change flag', async () => {
        verify.mockResolvedValue(true);
        hashFn.mockResolvedValue('$argon2id$new');
        prisma.user.update.mockResolvedValue(buildUser());

        await service.changePassword(1, dto, ctx);

        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { passwordHash: '$argon2id$new', mustChangePassword: false },
        });
        expect(prisma.authAuditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ action: AuthAction.PASSWORD_CHANGE }),
          }),
        );
      });
    });

    describe('forced change (mustChangePassword = true)', () => {
      const forcedDto = { newPassword: 'NewPass!2026x', confirmPassword: 'NewPass!2026x' };

      beforeEach(() => {
        prisma.user.findFirst.mockResolvedValue(buildUser({ mustChangePassword: true }));
      });

      it('succeeds without a current password and never checks one', async () => {
        verify.mockResolvedValue(false); // reuse guard: new != stored
        hashFn.mockResolvedValue('$argon2id$forced');
        prisma.user.update.mockResolvedValue(buildUser());

        await service.changePassword(1, forcedDto, ctx);

        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { passwordHash: '$argon2id$forced', mustChangePassword: false },
        });
        // Only the reuse guard runs — no current-password verification.
        expect(verify).toHaveBeenCalledTimes(1);
        expect(verify).toHaveBeenCalledWith('$argon2id$hash', forcedDto.newPassword);
      });

      it('rejects reusing the previous password', async () => {
        verify.mockResolvedValue(true); // new matches the stored hash
        await expect(service.changePassword(1, forcedDto, ctx)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(prisma.user.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('forceReset', () => {
    const actor: SessionUser = { id: 2, username: 'boss', roleId: 7, mustChangePassword: false };

    it('issues a temporary password and forces a change', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser({ id: 5, username: 'opr' }));
      genTemp.mockReturnValue('Aa1!temporaryxx');
      hashFn.mockResolvedValue('$argon2id$temp');
      prisma.user.update.mockResolvedValue({});

      const result = await service.forceReset(5, actor, ctx);

      expect(result).toEqual({ userId: 5, username: 'opr', temporaryPassword: 'Aa1!temporaryxx' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { passwordHash: '$argon2id$temp', mustChangePassword: true },
      });
      expect(prisma.authAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuthAction.FORCE_RESET }),
        }),
      );
    });

    it('throws when the target user is missing', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.forceReset(5, actor, ctx)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('logout', () => {
    it('writes a logout audit entry', async () => {
      const user: SessionUser = { id: 1, username: 'admin', roleId: 7, mustChangePassword: false };
      await service.logout(user, ctx);
      expect(prisma.authAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuthAction.LOGOUT }) }),
      );
    });
  });
});
