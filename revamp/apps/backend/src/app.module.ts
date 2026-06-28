import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { ActorContextMiddleware } from './common/audit/actor-context.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { SecurityModule } from './common/security.module';
import { AppConfigModule } from './config';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ArchivingModule } from './modules/archiving/archiving.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { TokenBearerMiddleware } from './modules/auth/token-bearer.middleware';
import { CacheModule } from './modules/cache/cache.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { GeographyModule } from './modules/geography/geography.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { LevyModule } from './modules/levy/levy.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { OperationsModule } from './modules/operations/operations.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RolesModule } from './modules/roles/roles.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { ServiceAccountsModule } from './modules/service-accounts/service-accounts.module';
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
    PermissionsModule,
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
    LevyModule,
    MonitoringModule,
    ArchivingModule,
    ReportsModule,
    ServiceAccountsModule,
    IntegrationsModule,
    RealtimeModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_PIPE, useClass: AppValidationPipe },
  ],
})
export class AppModule implements NestModule {
  // Resolve a bearer token into `req.user` BEFORE the actor context reads it, so
  // native-client requests get the same audit stamping as cookie sessions; then
  // establish the per-request actor context for every route so the Prisma audit
  // middleware can stamp who created/updated/deleted.
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TokenBearerMiddleware, ActorContextMiddleware).forRoutes('*');
  }
}
