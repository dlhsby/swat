import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';

import { type SessionUser } from '../../common/auth/session.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { AuthService } from './auth.service';
import { type AuthContext, type ForceResetResult, type MeResult } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

const SESSION_COOKIE = 'swat.sid';

function contextOf(req: Request): AuthContext {
  return {
    ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
    userAgent: req.headers['user-agent'] ?? '',
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and open a session' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<{
    userId: number;
    username: string;
    name: string;
    roleId: number;
    roleName: string;
    mustChangePassword: boolean;
  }> {
    const result = await this.auth.login(dto, contextOf(req));
    const { session } = req;
    session.user = result.user;
    return {
      userId: result.user.id,
      username: result.user.username,
      name: result.name,
      roleId: result.user.roleId,
      roleName: result.roleName,
      mustChangePassword: result.user.mustChangePassword,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Destroy the current session' })
  async logout(
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.auth.logout(user, contextOf(req));
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.clearCookie(SESSION_COOKIE);
    return { message: 'Berhasil keluar.' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Current user with role and permissions' })
  getMe(@CurrentUser() user: SessionUser): Promise<MeResult> {
    return this.auth.getMe(user.id);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password (clears forced-change flag)' })
  async changePassword(
    @CurrentUser() user: SessionUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.auth.changePassword(user.id, dto, contextOf(req));
    // Reflect the cleared flag in the live session.
    const { session } = req;
    session.user = { ...user, mustChangePassword: false };
    return { message: 'Kata sandi telah diperbarui.' };
  }

  @Post('force-reset/:userId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:manage')
  @ApiOperation({ summary: 'Admin: issue a temporary password and force a reset' })
  forceReset(
    @CurrentUser() actor: SessionUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: Request,
  ): Promise<ForceResetResult> {
    if (userId === actor.id) {
      throw new ForbiddenException('Tidak dapat mereset kata sandi sendiri melalui endpoint ini.');
    }
    return this.auth.forceReset(userId, actor, contextOf(req));
  }
}
