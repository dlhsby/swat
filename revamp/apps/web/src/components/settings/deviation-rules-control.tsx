'use client';

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

/** Display metadata per deviation type — Indonesian label + the threshold's unit. */
const RULE_META: Record<DeviationType, { label: string; unit: 'm' | 's' | null; hint: string }> = {
  off_corridor: { label: 'Keluar koridor', unit: 'm', hint: 'Jarak dari koridor sebelum dianggap menyimpang' },
  off_sequence: { label: 'Urutan lokasi salah', unit: null, hint: 'Mengunjungi lokasi di luar urutan rencana' },
  dwell_too_long: { label: 'Berhenti terlalu lama', unit: 's', hint: 'Diam di luar geofence lokasi melebihi batas' },
  late_to_schedule: { label: 'Terlambat dari jadwal', unit: 's', hint: 'Tiba melebihi waktu target' },
};

const SEVERITY_OPTIONS: { value: DeviationSeverity; label: string }[] = [
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Peringatan' },
  { value: 'CRITICAL', label: 'Kritis' },
];

function RuleRow({
  rule,
  staged,
  onStage,
}: {
  rule: DeviationRule;
  staged: StagedRule | undefined;
  onStage: (patch: Partial<StagedRule>) => void;
}): JSX.Element {
  const meta = RULE_META[rule.deviationType];
  const v = staged ?? snapshotOf(rule);
  const isStaged = staged !== undefined;

  return (
    <div className="rounded-base border border-neutral-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <p className="text-body-sm font-semibold text-neutral-900">{meta.label}</p>
            <p className="text-tiny text-neutral-500">{meta.hint}</p>
          </div>
          {isStaged ? (
            <span className="rounded-[5px] bg-amber-100 px-1.5 py-0.5 text-tiny font-semibold text-amber-700">
              Belum disimpan
            </span>
          ) : null}
        </div>
        <Switch
          checked={v.enabled}
          onCheckedChange={(c) => onStage({ enabled: c })}
          aria-label="Aktifkan aturan"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {meta.unit ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`thr-${rule.deviationType}`}>
                Ambang ({meta.unit === 'm' ? 'meter' : 'detik'})
              </Label>
              <InfoHint
                label={
                  meta.unit === 'm'
                    ? 'Jarak batas sebelum dianggap menyimpang, dalam meter — mis. 150 berarti kendaraan dianggap keluar koridor bila lebih dari 150 m dari jalur.'
                    : 'Nilai batas sebelum kondisi dicatat sebagai penyimpangan, dalam detik.'
                }
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
            <Label htmlFor={`hys-${rule.deviationType}`}>Jeda konfirmasi (detik)</Label>
            <InfoHint label="Lama kondisi harus bertahan terus-menerus sebelum alarm dibunyikan — meredam lonjakan GPS sesaat agar tidak memicu alarm palsu. Mis. 30 berarti harus menyimpang selama 30 detik dulu." />
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
            <Label htmlFor={`sev-${rule.deviationType}`}>Tingkat</Label>
            <InfoHint label="Tingkat keparahan alarm saat aturan ini terpicu: Info (catatan), Peringatan, atau Kritis (paling mendesak)." />
          </div>
          <Select value={v.severity} onValueChange={(s) => onStage({ severity: s as DeviationSeverity })}>
            <SelectTrigger id={`sev-${rule.deviationType}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
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
  if (isLoading) {
    return <Skeleton className="h-40" />;
  }
  if (isError || !rules) {
    return <p className="text-body-sm text-danger-600">Gagal memuat aturan penyimpangan.</p>;
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
