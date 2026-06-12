import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';

import { AuthService } from './auth.service';
import { type AuthContext } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { TokenRefreshDto } from './dto/token-refresh.dto';
import { type TokenPair, TokenService } from './token.service';

function contextOf(req: Request): AuthContext {
  return {
    ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
    userAgent: req.headers['user-agent'] ?? '',
  };
}

function bearerOf(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7).trim() || null;
}

/**
 * OAuth2 password-grant endpoints for the native .NET clients (specs/06-auth-rbac.md
 * §1.7). The web app keeps cookie sessions; these issue per-user bearer tokens
 * that share the same credential check, RBAC, and audit trail.
 */
@ApiTags('auth')
@Controller('auth')
export class TokenController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  @Public()
  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Native client: exchange credentials for bearer tokens' })
  async token(@Body() dto: LoginDto, @Req() req: Request): Promise<TokenPair> {
    // Reuse the session login path: throttle + Argon2id verify + AuthAuditLog.
    const result = await this.auth.login(dto, contextOf(req));
    // A forced password change can only be completed in the web app; refuse to
    // issue tokens so the native client can't bypass it.
    if (result.user.mustChangePassword) {
      throw new ForbiddenException({
        error: 'mustChangePassword',
        message: 'Kata sandi harus diganti melalui aplikasi web sebelum memakai aplikasi ini.',
      });
    }
    return this.tokens.issueTokens(result.user);
  }

  @Public()
  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Native client: rotate a refresh token' })
  refresh(@Body() dto: TokenRefreshDto): Promise<TokenPair> {
    return this.tokens.rotateRefreshToken(dto.refreshToken);
  }

  @Public()
  @Post('token/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Native client: revoke the current bearer session' })
  async tokenLogout(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<{ message: string }> {
    const token = bearerOf(authorization);
    if (token) {
      await this.tokens.revokeAccessToken(token);
    }
    return { message: 'Sesi telah dicabut.' };
  }
}
