import { Injectable, Logger, type OnModuleInit, UnprocessableEntityException } from '@nestjs/common';
import { type DeviationRule, DeviationSeverity, DeviationType } from '@prisma/client';

import { DeviationRuleRepository } from './deviation-rule.repository';
import { type UpsertDeviationRuleDto } from './dto/upsert-deviation-rule.dto';

/**
 * The sane default rule set. Ensured at boot (idempotent) so every environment —
 * incl. legacy-seeded staging/prod, where the demo seed never runs — shows the
 * tunable rules instead of an empty card. Operators then override per site.
 */
export const DEFAULT_DEVIATION_RULES: ReadonlyArray<{
  deviationType: DeviationType;
  threshold: number | null;
  hysteresisSec: number;
  severity: DeviationSeverity;
}> = [
  { deviationType: DeviationType.off_corridor, threshold: 150, hysteresisSec: 30, severity: DeviationSeverity.WARNING },
  { deviationType: DeviationType.off_sequence, threshold: null, hysteresisSec: 0, severity: DeviationSeverity.WARNING },
  { deviationType: DeviationType.dwell_too_long, threshold: 600, hysteresisSec: 0, severity: DeviationSeverity.INFO },
  { deviationType: DeviationType.late_to_schedule, threshold: 900, hysteresisSec: 0, severity: DeviationSeverity.INFO },
];

export interface DeviationRuleDto {
  readonly deviationType: string;
  readonly threshold: number | null;
  readonly hysteresisSec: number;
  readonly severity: string;
  readonly enabled: boolean;
}

function toDto(rule: DeviationRule): DeviationRuleDto {
  return {
    deviationType: rule.deviationType,
    threshold: rule.threshold,
    hysteresisSec: rule.hysteresisSec,
    severity: rule.severity,
    enabled: rule.enabled,
  };
}

const VALID_TYPES = new Set<string>(Object.values(DeviationType));

@Injectable()
export class DeviationRuleService implements OnModuleInit {
  private readonly logger = new Logger(DeviationRuleService.name);

  constructor(private readonly repo: DeviationRuleRepository) {}

  /** Idempotently ensure the default rules exist; never overwrites operator edits
   * (empty `update`). Best-effort — a failure must not block boot. */
  async onModuleInit(): Promise<void> {
    try {
      for (const rule of DEFAULT_DEVIATION_RULES) {
        await this.repo.upsert(rule.deviationType, { ...rule, enabled: true }, {});
      }
    } catch (err) {
      this.logger.warn(`deviation-rule defaults ensure skipped: ${String(err)}`);
    }
  }

  async list(): Promise<DeviationRuleDto[]> {
    const rules = await this.repo.list();
    return rules.map(toDto);
  }

  /** Upsert one rule by its type. A new rule takes sensible defaults. */
  async upsert(type: string, dto: UpsertDeviationRuleDto): Promise<DeviationRuleDto> {
    if (!VALID_TYPES.has(type)) {
      throw new UnprocessableEntityException('Jenis deviasi tidak dikenal.');
    }
    const deviationType = type as DeviationType;
    const rule = await this.repo.upsert(
      deviationType,
      {
        deviationType,
        threshold: dto.threshold ?? null,
        hysteresisSec: dto.hysteresisSec ?? 30,
        ...(dto.severity ? { severity: dto.severity } : {}),
        enabled: dto.enabled ?? true,
      },
      {
        ...(dto.threshold !== undefined ? { threshold: dto.threshold } : {}),
        ...(dto.hysteresisSec !== undefined ? { hysteresisSec: dto.hysteresisSec } : {}),
        ...(dto.severity !== undefined ? { severity: dto.severity } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    );
    return toDto(rule);
  }
}
