import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { AppConfigService } from './config.service';
import { validateEnv } from './env.validation';

/**
 * Global configuration module. Loads `.env` / `.env.local` from the repo root
 * and the backend app directory, validates the result, and exposes the typed
 * {@link AppConfigService} everywhere.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      // Root monorepo env first, then app-local overrides.
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
