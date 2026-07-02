'use client';

import { useEffect, useState } from 'react';

import {
  Button,
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
import { useDeviationRules, useUpsertDeviationRule } from '@/hooks/use-tracking';
import {
  type DeviationRule,
  type DeviationSeverity,
  type DeviationType,
} from '@/lib/tracking-api';

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

function RuleRow({ rule }: { rule: DeviationRule }): JSX.Element {
  const meta = RULE_META[rule.deviationType];
  const upsert = useUpsertDeviationRule();
  const [threshold, setThreshold] = useState(rule.threshold?.toString() ?? '');
  const [hysteresis, setHysteresis] = useState(rule.hysteresisSec.toString());
  const [severity, setSeverity] = useState<DeviationSeverity>(rule.severity);
  const [enabled, setEnabled] = useState(rule.enabled);

  const save = (): void => {
    upsert.mutate({
      type: rule.deviationType,
      body: {
        ...(meta.unit ? { threshold: Number(threshold) || 0 } : {}),
        hysteresisSec: Number(hysteresis) || 0,
        severity,
        enabled,
      },
    });
  };

  return (
    <div className="rounded-base border border-neutral-200 p-4 dark:border-neutral-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-body-sm font-semibold text-neutral-900">{meta.label}</p>
          <p className="text-tiny text-neutral-500">{meta.hint}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Aktifkan aturan" />
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
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
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
            value={hysteresis}
            onChange={(e) => setHysteresis(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor={`sev-${rule.deviationType}`}>Tingkat</Label>
            <InfoHint label="Tingkat keparahan alarm saat aturan ini terpicu: Info (catatan), Peringatan, atau Kritis (paling mendesak)." />
          </div>
          <Select value={severity} onValueChange={(v) => setSeverity(v as DeviationSeverity)}>
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

      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={save} loading={upsert.isPending}>
          Simpan
        </Button>
      </div>
    </div>
  );
}

/**
 * Tune the GPS route-deviation rules (Phase 7). One card per rule type; each saves
 * independently via PUT /gps/deviation-rules/:type. Gated upstream by
 * `deviation-rule:manage`.
 */
export function DeviationRulesControl(): JSX.Element {
  const { data: rules, isLoading, isError } = useDeviationRules();
  // Re-key rows by the loaded rule identity so local edit state resets on refetch.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (rules) setVersion((v) => v + 1);
  }, [rules]);

  if (isLoading) {
    return <Skeleton className="h-40" />;
  }
  if (isError || !rules) {
    return <p className="text-body-sm text-danger-600">Gagal memuat aturan penyimpangan.</p>;
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <RuleRow key={`${rule.deviationType}-${version}`} rule={rule} />
      ))}
    </div>
  );
}
