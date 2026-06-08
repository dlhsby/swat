import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { SecurityModule } from './common/security.module';
import { AppConfigModule } from './config';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from './modules/cache/cache.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { GeographyModule } from './modules/geography/geography.module';
import { OperationsModule } from './modules/operations/operations.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RolesModule } from './modules/roles/roles.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { StorageModule } from './modules/storage/storage.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { WasteModule } from './modules/waste/waste.module';
import { SessionModule } from './session.module';

/**
 * Root application module.
 *
 * Wires cross-cutting concerns globally:
 *  - {@link ApiResponseInterceptor} — wraps responses in the API envelope.
 *  - {@link HttpExceptionFilter} — converts errors to the envelope.
 *  - {@link AppValidationPipe} — strict DTO validation (422 on failure).
 */
@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    CacheModule,
    SessionModule,
    SecurityModule,
    ScheduleModule.forRoot(),
    AuditModule,
    HealthModule,
    StorageModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    GeographyModule,
    WasteModule,
    FleetModule,
    PersonnelModule,
    SchedulingModule,
    TransactionsModule,
    OperationsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_PIPE, useClass: AppValidationPipe },
  ],
})
export class AppModule {}
