import { Module } from '@nestjs/common';

import { ServiceAccountsModule } from '../service-accounts/service-accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';

import { ApiAuditController } from './api-audit.controller';
import { ApiAuditService } from './api-audit.service';
import { WeighbridgeGuard } from './guards/weighbridge.guard';
import { ApiAuditInterceptor } from './interceptors/api-audit.interceptor';
import { RateLimitService } from './rate-limit.service';
import { ConversionService } from './weighbridge/conversion.service';
import { IdempotencyService } from './weighbridge/idempotency.service';
import { TpaInboundLogService } from './weighbridge/tpa-inbound-log.service';
import { WeighbridgeResolutionService } from './weighbridge/weighbridge-resolution.service';
import { WeighbridgeValidationService } from './weighbridge/weighbridge-validation.service';
import { WeighbridgeController } from './weighbridge/weighbridge.controller';
import { WeighbridgeRepository } from './weighbridge/weighbridge.repository';
import { WeighbridgeService } from './weighbridge/weighbridge.service';
import { WeighingImportService } from './weighbridge/weighing-import.service';

/**
 * External integrations (Phase 4). Currently the TPA weighbridge REST API:
 * service-account/operator auth ({@link WeighbridgeGuard}), per-principal rate
 * limiting, API-call auditing, kitir resolution + weighing validation, and the
 * post/patch/list weighing endpoints. Depends on {@link ServiceAccountsModule}
 * for API-key validation and {@link TransactionsModule} for the trip finder.
 */
@Module({
  imports: [ServiceAccountsModule, TransactionsModule],
  controllers: [WeighbridgeController, ApiAuditController],
  providers: [
    WeighbridgeGuard,
    RateLimitService,
    ApiAuditService,
    ApiAuditInterceptor,
    WeighbridgeRepository,
    WeighbridgeResolutionService,
    WeighbridgeValidationService,
    TpaInboundLogService,
    IdempotencyService,
    WeighbridgeService,
    ConversionService,
    WeighingImportService,
  ],
})
export class IntegrationsModule {}
