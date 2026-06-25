import { Injectable } from '@nestjs/common';
import { type DeviationRule, type DeviationType } from '@prisma/client';

import { CacheService } from '../../cache/cache.service';
import { PrismaService } from '../../prisma/prisma.service';

import { CorridorRepository } from './corridor.repository';
import { DeviationAlertService } from './deviation-alert.service';
import { DeviationRuleRepository } from './deviation-rule.repository';

/** A normalized fix handed to the matcher (subset of the persisted ping). */
export interface MatchPing {
  readonly vehicleId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly speedKmh: number;
  readonly recordedAt: Date;
}

interface ActiveTrip {
  readonly tripId: string;
  readonly targetTime: Date | null;
  readonly actualTime: Date | null;
}

const RULE_CACHE_TTL_MS = 60_000;
/** Redis key TTL for the off-corridor hysteresis marker (self-clears if pings stop). */
const HYSTERESIS_TTL_SEC = 600;

/**
 * Route-deviation matcher (Phase 7, T-712). Runs per persisted ping for a
 * GPS-tracked vehicle (untracked vehicles never reach here). Resolves the active
 * trip, then evaluates:
 *  - **off_corridor** — ST_DWithin against the effective corridor, sustained beyond
 *    the rule's hysteresis (debounced via a Redis first-seen marker so a single
 *    noisy ping never alerts); auto-resolves on corridor re-entry.
 *  - **late_to_schedule** — ping time past targetTime + threshold for an
 *    un-actualized trip.
 * Graceful degradation: no active trip → track only; no corridor → skip
 * off_corridor. `dwell_too_long` + `off_sequence` are deferred (need site-geofence
 * + leg-sequence logic) — tracked as a follow-up.
 */
@Injectable()
export class DeviationMatcherService {
  private rulesCache: { at: number; map: Map<string, DeviationRule> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly corridor: CorridorRepository,
    private readonly alerts: DeviationAlertService,
    private readonly rules: DeviationRuleRepository,
    private readonly cache: CacheService,
  ) {}

  async match(ping: MatchPing): Promise<void> {
    const active = await this.resolveActiveTrip(ping.vehicleId, ping.recordedAt);
    if (!active) {
      return; // No active leg — track position only.
    }
    const ruleMap = await this.getRules();
    await this.checkOffCorridor(ping, active, ruleMap.get('off_corridor'));
    await this.checkLate(ping, active, ruleMap.get('late_to_schedule'));
  }

  private async checkOffCorridor(
    ping: MatchPing,
    active: ActiveTrip,
    rule: DeviationRule | undefined,
  ): Promise<void> {
    if (!rule?.enabled) {
      return;
    }
    const corridor = await this.corridor.resolveTripCorridor(active.tripId);
    if (!corridor) {
      return; // Route without a drawn corridor — tracked, not corridor-checked.
    }
    const within = await this.corridor.isPointWithinCorridor(
      corridor.geojson,
      ping.latitude,
      ping.longitude,
      corridor.toleranceMeters,
    );
    const hysteresisKey = `gps:hys:offc:${ping.vehicleId}`;

    if (within) {
      // Back on route → clear the pending marker + resolve any open off_corridor.
      await this.cache.del(hysteresisKey);
      await this.alerts.autoResolve(ping.vehicleId, 'off_corridor');
      return;
    }

    // Off corridor — debounce: only alert once sustained beyond hysteresisSec.
    const firstSeen = await this.cache.get<number>(hysteresisKey);
    const nowMs = ping.recordedAt.getTime();
    if (firstSeen === null) {
      await this.cache.set(hysteresisKey, nowMs, HYSTERESIS_TTL_SEC);
      return;
    }
    if (nowMs - firstSeen < rule.hysteresisSec * 1000) {
      return; // Not sustained long enough yet.
    }
    const distanceM = await this.corridor.distanceToCorridorMeters(
      corridor.geojson,
      ping.latitude,
      ping.longitude,
    );
    await this.alerts.raiseOrCoalesce({
      vehicleId: ping.vehicleId,
      tripId: active.tripId,
      alertType: 'off_corridor',
      severity: rule.severity,
      latitude: ping.latitude,
      longitude: ping.longitude,
      distanceM,
    });
  }

  private async checkLate(
    ping: MatchPing,
    active: ActiveTrip,
    rule: DeviationRule | undefined,
  ): Promise<void> {
    if (!rule?.enabled || !active.targetTime || active.actualTime) {
      return;
    }
    const lateBySec = (ping.recordedAt.getTime() - active.targetTime.getTime()) / 1000;
    if (lateBySec > (rule.threshold ?? 0)) {
      await this.alerts.raiseOrCoalesce({
        vehicleId: ping.vehicleId,
        tripId: active.tripId,
        alertType: 'late_to_schedule',
        severity: rule.severity,
        latitude: ping.latitude,
        longitude: ping.longitude,
        distanceM: null,
      });
    }
  }

  /**
   * The vehicle's active leg: among today's IN_PROGRESS trips, the one whose
   * targetTime is nearest the ping time (ties → earliest). Null when the vehicle
   * has no open leg today.
   */
  private async resolveActiveTrip(vehicleId: string, now: Date): Promise<ActiveTrip | null> {
    const operationDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const trips = await this.prisma.trip.findMany({
      where: {
        operationDate,
        status: 'IN_PROGRESS',
        haulAssignment: { haul: { vehicleId } },
      },
      select: { id: true, targetTime: true, actualTime: true },
    });
    if (trips.length === 0) {
      return null;
    }
    const nowMs = now.getTime();
    const best = trips
      .map((t) => ({
        tripId: t.id,
        targetTime: t.targetTime,
        actualTime: t.actualTime,
        distance: t.targetTime ? Math.abs(t.targetTime.getTime() - nowMs) : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    return best
      ? { tripId: best.tripId, targetTime: best.targetTime, actualTime: best.actualTime }
      : null;
  }

  /** Deviation rules, cached in-memory for a minute (4 rows, read per ping). */
  private async getRules(): Promise<Map<string, DeviationRule>> {
    const now = Date.now();
    if (this.rulesCache && now - this.rulesCache.at < RULE_CACHE_TTL_MS) {
      return this.rulesCache.map;
    }
    const rows = await this.rules.list();
    const map = new Map<string, DeviationRule>(
      rows.map((r) => [r.deviationType as DeviationType, r]),
    );
    this.rulesCache = { at: now, map };
    return map;
  }
}
