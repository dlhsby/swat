import { Module } from '@nestjs/common';

import { CacheInvalidationInterceptor } from '../../common/interceptors/cache-invalidation.interceptor';
import { AnalyticsModule } from '../analytics/analytics.module';
import { StorageModule } from '../storage/storage.module';

import { DailyInitService } from './daily-init/daily-init.service';
import { HaulAssignmentsController } from './haul-assignments/haul-assignments.controller';
import { HaulAssignmentsRepository } from './haul-assignments/haul-assignments.repository';
import { HaulAssignmentsService } from './haul-assignments/haul-assignments.service';
import { TransactionDaysController } from './transaction-days/transaction-days.controller';
import { TransactionDaysRepository } from './transaction-days/transaction-days.repository';
import { TransactionDaysService } from './transaction-days/transaction-days.service';
import { TripFinderService } from './trip-finder.service';
import { TripPhotosService } from './trips/trip-photos.service';
import { TripsController } from './trips/trips.controller';
import { TripsRepository } from './trips/trips.repository';
import { TripsService } from './trips/trips.service';

/**
 * Transaction lifecycle (Epics 1.7–1.8): daily initialization of the operational
 * plan, transaction-day queries, haul-assignment depart/return, and trip
 * recording + verification.
 */
@Module({
  imports: [AnalyticsModule, StorageModule],
  controllers: [TransactionDaysController, HaulAssignmentsController, TripsController],
  providers: [
    DailyInitService,
    TransactionDaysService,
    TransactionDaysRepository,
    HaulAssignmentsService,
    HaulAssignmentsRepository,
    TripsService,
    TripsRepository,
    TripFinderService,
    TripPhotosService,
    CacheInvalidationInterceptor,
  ],
  exports: [DailyInitService, TripFinderService],
})
export class TransactionsModule {}
