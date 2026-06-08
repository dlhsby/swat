import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';

/**
 * Authentication module. Depends on the global PrismaModule, CacheModule, and
 * SecurityModule (which provides {@link RolePermissionsService}).
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, LoginThrottleService],
  exports: [AuthService],
})
export class AuthModule {}
