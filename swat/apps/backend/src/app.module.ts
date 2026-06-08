import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { AppConfigModule } from './config';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CacheModule } from './modules/cache/cache.module';
import { StorageModule } from './modules/storage/storage.module';

/**
 * Root application module.
 *
 * Wires cross-cutting concerns globally:
 *  - {@link ApiResponseInterceptor} — wraps responses in the API envelope.
 *  - {@link HttpExceptionFilter} — converts errors to the envelope.
 *  - {@link AppValidationPipe} — strict DTO validation (422 on failure).
 */
@Module({
  imports: [AppConfigModule, HealthModule, StorageModule, CacheModule, AnalyticsModule],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_PIPE, useClass: AppValidationPipe },
  ],
})
export class AppModule {}
