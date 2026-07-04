'use client';

import { useTranslations } from 'next-intl';

import {
  InfoHint,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
} from '@/components/ui';
import { type DeviationRule, type DeviationSeverity, type DeviationType } from '@/lib/tracking-api';

/** A full snapshot of a rule's editable fields (staged before Save). */
export interface StagedRule {
  readonly threshold: number | null;
  readonly hysteresisSec: number;
  readonly severity: DeviationSeverity;
  readonly enabled: boolean;
}

export function snapshotOf(rule: DeviationRule): StagedRule {
  return {
    threshold: rule.threshold,
    hysteresisSec: rule.hysteresisSec,
    severity: rule.severity,
    enabled: rule.enabled,
  };
}

export function rulesEqual(a: StagedRule, b: StagedRule): boolean {
  return (
    a.threshold === b.threshold &&
    a.hysteresisSec === b.hysteresisSec &&
    a.severity === b.severity &&
    a.enabled === b.enabled
  );
}

/** The threshold's unit per deviation type (null = no threshold input). */
const RULE_UNIT: Record<DeviationType, 'm' | 's' | null> = {
  off_corridor: 'm',
  off_sequence: null,
  dwell_too_long: 's',
  late_to_schedule: 's',
};

const SEVERITIES: readonly DeviationSeverity[] = ['INFO', 'WARNING', 'CRITICAL'];

function RuleRow({
  rule,
  staged,
  onStage,
}: {
  rule: DeviationRule;
  staged: StagedRule | undefined;
  onStage: (patch: Partial<StagedRule>) => void;
}): JSX.Element {
  const t = useTranslations('settings.sys');
  const unit = RULE_UNIT[rule.deviationType];
  const v = staged ?? snapshotOf(rule);
  const isStaged = staged !== undefined;

  return (
    <div className="rounded-base border border-neutral-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <p className="text-body-sm font-semibold text-neutral-900">
              {t(`deviation.rules.${rule.deviationType}.label`)}
            </p>
            <p className="text-tiny text-neutral-500">
              {t(`deviation.rules.${rule.deviationType}.hint`)}
            </p>
          </div>
          {isStaged ? (
            <span className="rounded-[5px] bg-amber-100 px-1.5 py-0.5 text-tiny font-semibold text-amber-700">
              {t('staged')}
            </span>
          ) : null}
        </div>
        <Switch
          checked={v.enabled}
          onCheckedChange={(c) => onStage({ enabled: c })}
          aria-label={t('deviation.enableRule')}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {unit ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`thr-${rule.deviationType}`}>
                {unit === 'm' ? t('deviation.thresholdMeter') : t('deviation.thresholdSecond')}
              </Label>
              <InfoHint
                label={unit === 'm' ? t('deviation.hintThresholdM') : t('deviation.hintThresholdS')}
              />
            </div>
            <Input
              id={`thr-${rule.deviationType}`}
              type="number"
              min={0}
              value={v.threshold?.toString() ?? ''}
              onChange={(e) =>
                onStage({ threshold: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor={`hys-${rule.deviationType}`}>{t('deviation.hysteresis')}</Label>
            <InfoHint label={t('deviation.hintHysteresis')} />
          </div>
          <Input
            id={`hys-${rule.deviationType}`}
            type="number"
            min={0}
            value={v.hysteresisSec.toString()}
            onChange={(e) => onStage({ hysteresisSec: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor={`sev-${rule.deviationType}`}>{t('deviation.severity')}</Label>
            <InfoHint label={t('deviation.hintSeverity')} />
          </div>
          <Select value={v.severity} onValueChange={(s) => onStage({ severity: s as DeviationSeverity })}>
            <SelectTrigger id={`sev-${rule.deviationType}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`deviation.sev.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export interface DeviationRulesControlProps {
  rules: DeviationRule[] | undefined;
  isLoading: boolean;
  isError: boolean;
  staged: Map<DeviationType, StagedRule>;
  onStage: (type: DeviationType, patch: Partial<StagedRule>) => void;
}

/**
 * Tune the GPS route-deviation rules (Phase 7). Presentational/controlled: edits stage
 * into the parent's pending map and are committed by the group's single Save (no
 * per-rule save button). Gated upstream by `deviation-rule:manage`.
 */
export function DeviationRulesControl({
  rules,
  isLoading,
  isError,
  staged,
  onStage,
}: DeviationRulesControlProps): JSX.Element {
  const t = useTranslations('settings.sys');
  if (isLoading) {
    return <Skeleton className="h-40" />;
  }
  if (isError || !rules) {
    return <p className="text-body-sm text-danger-600">{t('deviation.loadError')}</p>;
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <RuleRow
          key={rule.deviationType}
          rule={rule}
          staged={staged.get(rule.deviationType)}
          onStage={(patch) => onStage(rule.deviationType, patch)}
        />
      ))}
    </div>
  );
}
