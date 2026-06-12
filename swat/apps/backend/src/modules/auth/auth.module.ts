import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppConfigService } from '../../config/config.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';

/**
 * Authentication module. Depends on the global PrismaModule, CacheModule, and
 * SecurityModule (which provides {@link RolePermissionsService}). Issues both
 * cookie sessions (web) and OAuth2 bearer tokens (native clients) via
 * {@link TokenService}, signed with the configured `JWT_SECRET`.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController, TokenController],
  providers: [AuthService, LoginThrottleService, TokenService],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
