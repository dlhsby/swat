import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { type DeviationRule, DeviationType } from '@prisma/client';

import { DeviationRuleRepository } from './deviation-rule.repository';
import { type UpsertDeviationRuleDto } from './dto/upsert-deviation-rule.dto';

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
export class DeviationRuleService {
  constructor(private readonly repo: DeviationRuleRepository) {}

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
