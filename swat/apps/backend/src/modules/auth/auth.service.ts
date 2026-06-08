import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthAction } from '@prisma/client';

import { generateTempPassword, hashPassword, verifyPassword } from '../../common/auth/password';
import { RolePermissionsService } from '../../common/auth/role-permissions.service';
import { type SessionUser } from '../../common/auth/session.types';
import { PrismaService } from '../prisma/prisma.service';

import {
  type AuthContext,
  type ForceResetResult,
  type LoginResult,
  type MeResult,
} from './auth.types';
import { type ChangePasswordDto } from './dto/change-password.dto';
import { type LoginDto } from './dto/login.dto';
import { LoginThrottleService } from './login-throttle.service';

const INVALID_CREDENTIALS = 'Nama pengguna atau kata sandi salah.';
const SESSION_INVALID = 'Sesi tidak valid atau telah berakhir.';

interface AuditInput {
  readonly action: AuthAction;
  readonly userId: number | null;
  readonly username: string;
  readonly ctx: AuthContext;
  readonly details?: string;
}

/**
 * Authentication & account-security logic. Verifies credentials (Argon2id),
 * enforces login throttling, and writes an {@link AuthAction} audit row for
 * every security event. Session creation/destruction is the controller's
 * responsibility — this service is transport-agnostic and unit-testable.
 *
 * Application logs never contain credentials or usernames (PII lives only in
 * the audit table, per specs/06-auth-rbac.md §4).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly throttle: LoginThrottleService,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  async login(dto: LoginDto, ctx: AuthContext): Promise<LoginResult> {
    await this.throttle.assertAllowed(ctx.ip, dto.username);

    const user = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
      include: { role: true },
    });
    const passwordOk = user ? await verifyPassword(user.passwordHash, dto.password) : false;

    if (!user || !passwordOk) {
      await this.throttle.registerFailure(ctx.ip, dto.username);
      await this.audit({
        action: AuthAction.FAILED_LOGIN,
        userId: user?.id ?? null,
        username: dto.username,
        ctx,
      });
      throw new BadRequestException(INVALID_CREDENTIALS);
    }

    await this.throttle.reset(ctx.ip, dto.username);
    await this.audit({
      action: AuthAction.LOGIN,
      userId: user.id,
      username: user.username,
      ctx,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        roleId: user.roleId,
        mustChangePassword: user.mustChangePassword,
      },
      name: user.name,
      roleName: user.role.name,
    };
  }

  async logout(user: SessionUser, ctx: AuthContext): Promise<void> {
    await this.audit({
      action: AuthAction.LOGOUT,
      userId: user.id,
      username: user.username,
      ctx,
    });
  }

  async getMe(userId: number): Promise<MeResult> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException(SESSION_INVALID);
    }

    const permissions = await this.rolePermissions.getPermissionKeys(user.roleId);
    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions,
      mustChangePassword: user.mustChangePassword,
    };
  }

  /** Change the caller's own password; clears the forced-change flag. */
  async changePassword(userId: number, dto: ChangePasswordDto, ctx: AuthContext): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Konfirmasi kata sandi tidak cocok.');
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('Kata sandi baru harus berbeda dari kata sandi saat ini.');
    }

    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) {
      throw new UnauthorizedException(SESSION_INVALID);
    }

    const currentOk = await verifyPassword(user.passwordHash, dto.currentPassword);
    if (!currentOk) {
      throw new BadRequestException('Kata sandi saat ini salah.');
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    await this.audit({
      action: AuthAction.PASSWORD_CHANGE,
      userId,
      username: user.username,
      ctx,
    });
  }

  /**
   * Admin-initiated reset: issue a temporary password and force a change on next
   * login. The plaintext is returned once for out-of-band delivery (never
   * logged, never stored).
   */
  async forceReset(
    targetUserId: number,
    actor: SessionUser,
    ctx: AuthContext,
  ): Promise<ForceResetResult> {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    const temporaryPassword = generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash, mustChangePassword: true },
    });
    await this.audit({
      action: AuthAction.FORCE_RESET,
      userId: targetUserId,
      username: user.username,
      ctx,
      details: `Reset oleh pengguna #${actor.id}`,
    });

    return { userId: user.id, username: user.username, temporaryPassword };
  }

  private async audit({ action, userId, username, ctx, details }: AuditInput): Promise<void> {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          action,
          userId,
          username: username.slice(0, 100),
          ip: ctx.ip.slice(0, 45),
          userAgent: ctx.userAgent.slice(0, 512),
          timestamp: new Date(),
          details: details ?? null,
        },
      });
    } catch {
      // Audit must never break the request; a write failure is logged without PII.
      this.logger.warn(`Gagal menulis audit log (${action})`);
    }
  }
}
