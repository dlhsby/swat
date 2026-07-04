'use client';

import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Navigation, RotateCcw, Scale, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  DeviationRulesControl,
  rulesEqual,
  snapshotOf,
  type StagedRule,
} from '@/components/settings/deviation-rules-control';
import { SettingsNavButton } from '@/components/settings/settings-nav-button';
import { SettingsSaveBar } from '@/components/settings/settings-save-bar';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  InfoHint,
  Input,
  Spinner,
  Switch,
  notify,
} from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { useSystemConfig } from '@/hooks/use-system-config';
import { useDeviationRules } from '@/hooks/use-tracking';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { type ConfigDescription, systemConfigApi } from '@/lib/system-config-api';
import { type DeviationType, trackingApi } from '@/lib/tracking-api';

/** A card inside a group panel: a set of config keys, or the deviation-rules editor. */
type CardDef =
  | { title: string; help: string; requires: 'config'; keys: readonly string[] }
  | { title: string; help: string; requires: 'deviation'; deviation: true };

interface GroupDef {
  readonly id: string;
  readonly label: string;
  readonly help: string;
  readonly icon: typeof Navigation;
  readonly cards: readonly CardDef[];
}

/**
 * Left-rail groups. All GPS concerns (GPS.id integration, webhook intake, movement
 * detection, route-deviation alerts) live under one "GPS.id & Pelacakan" group, split
 * into clearly-separated cards.
 */
const GROUPS: readonly GroupDef[] = [
  {
    id: 'gps',
    label: 'GPS.id & Pelacakan',
    help: 'Integrasi GPS.id, webhook, deteksi & alarm penyimpangan',
    icon: Navigation,
    cards: [
      {
        title: 'Integrasi GPS.id',
        help: 'Kredensial akun GPS.id dan sinkronisasi otomatis terjadwal.',
        requires: 'config',
        keys: [
          'gpsid.baseUrl',
          'gpsid.username',
          'gpsid.password',
          'gpsid.vehicleSync',
          'gpsid.vehicleSyncIntervalMin',
          'gpsid.positionPull',
          'gpsid.pullIntervalMin',
        ],
      },
      {
        title: 'Penerimaan Data & Webhook',
        help: 'Keamanan dan laju endpoint yang menerima posisi dari GPS.id.',
        requires: 'config',
        keys: ['gps.webhookToken', 'gps.allowedIps', 'gps.ingestRateLimitPerMin'],
      },
      {
        title: 'Deteksi Pergerakan',
        help: 'Ambang penentuan status offline dan pagar geo tiba/berangkat.',
        requires: 'config',
        keys: ['gps.deviceOfflineMinutes', 'gps.geofenceDefaultRadiusM'],
      },
      {
        title: 'Alarm Penyimpangan Rute',
        help: 'Ambang & tingkat alarm saat kendaraan menyimpang dari rencana. Tiap aturan disimpan sendiri.',
        requires: 'deviation',
        deviation: true,
      },
    ],
  },
  {
    id: 'maps',
    label: 'Peta (Google Maps)',
    help: 'Kunci API peta (server & peramban)',
    icon: MapPin,
    cards: [
      {
        title: 'Kunci API Peta',
        help: 'Kunci Google Maps untuk render peta dan snap-to-road koridor.',
        requires: 'config',
        keys: ['maps.serverKey', 'maps.browserKey'],
      },
    ],
  },
  {
    id: 'weighbridge',
    label: 'Jembatan Timbang',
    help: 'Integrasi timbangan TPA',
    icon: Scale,
    cards: [
      {
        title: 'Jembatan Timbang',
        help: 'Batas laju permintaan API timbangan TPA.',
        requires: 'config',
        keys: ['weighbridge.rateLimitPerMin'],
      },
    ],
  },
];

const SOURCE_META: Record<ConfigDescription['source'], { text: string; cls: string }> = {
  db: { text: 'Kustom', cls: 'bg-primary-50 text-primary-700 dark:text-primary-400' },
  env: { text: 'Dari env', cls: 'bg-neutral-100 text-neutral-600' },
  unset: { text: 'Belum diset', cls: 'bg-amber-100 text-amber-700' },
};

/** The current saved value of a setting as a comparable string (secrets are opaque). */
function savedString(item: ConfigDescription): string {
  if (item.valueType === 'boolean') return item.value === true ? 'true' : 'false';
  if (item.isSecret || item.value === undefined) return '';
  return String(item.value);
}

function SourceBadge({ source }: { source: ConfigDescription['source'] }): JSX.Element {
  const m = SOURCE_META[source];
  return (
    <span className={`rounded-[5px] px-1.5 py-0.5 text-tiny font-semibold ${m.cls}`}>{m.text}</span>
  );
}

interface ConfigRowProps {
  item: ConfigDescription;
  /** Staged value: a string, `null` (staged revert-to-default), or `undefined` (no change). */
  staged: string | null | undefined;
  onStage: (key: string, value: string) => void;
  onRevert: (key: string) => void;
  onUndo: (key: string) => void;
}

/** One setting: label + help tooltip + status + control. Fully controlled — edits stage
 * into the section's pending map, applied only on Save. */
function ConfigRow({ item, staged, onStage, onRevert, onUndo }: ConfigRowProps): JSX.Element {
  const isStaged = staged !== undefined;
  const isClear = staged === null;
  const textValue = isStaged ? (staged ?? '') : item.isSecret ? '' : String(item.value ?? '');
  const boolChecked = isStaged ? staged === 'true' : item.value === true;

  return (
    <div className="flex flex-col gap-2 rounded-base border border-neutral-200 bg-neutral-0 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-body-sm font-semibold text-neutral-900">{item.label}</p>
          {item.help ? <InfoHint label={item.help} srLabel={`Penjelasan ${item.label}`} /> : null}
          {isStaged ? (
            <span className="rounded-[5px] bg-amber-100 px-1.5 py-0.5 text-tiny font-semibold text-amber-700">
              Belum disimpan
            </span>
          ) : (
            <SourceBadge source={item.source} />
          )}
          {item.isSecret ? (
            <span className="rounded-[5px] bg-neutral-100 px-1.5 py-0.5 text-tiny text-neutral-500">
              rahasia
            </span>
          ) : null}
        </div>
      </div>

      {item.valueType === 'boolean' ? (
        <Switch
          checked={boolChecked}
          onCheckedChange={(c) => onStage(item.key, String(c))}
          aria-label={item.label}
        />
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:flex-nowrap">
          <Input
            type={item.isSecret ? 'password' : item.valueType === 'number' ? 'number' : 'text'}
            value={textValue}
            onChange={(e) => onStage(item.key, e.target.value)}
            placeholder={
              isClear
                ? '↩ akan dikembalikan ke bawaan'
                : item.isSecret
                  ? item.isSet
                    ? '• • • • • •  (isi untuk mengganti)'
                    : 'Belum diset'
                  : undefined
            }
            className="w-full min-w-0 flex-1 sm:w-64 sm:flex-none"
            autoComplete="off"
          />
          {isStaged ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-500"
              title="Urungkan perubahan baris ini"
              onClick={() => onUndo(item.key)}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Urungkan
            </Button>
          ) : item.isSet ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-500"
              title="Kembalikan ke nilai bawaan (hapus nilai kustom saat disimpan)"
              onClick={() => onRevert(item.key)}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Bawaan
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Admin system settings — a master/detail like the roles editor. Each left-rail group
 * shows its settings as clearly-separated cards on the right, with its OWN staged Save
 * (edits apply only on "Simpan Perubahan", so an accidental toggle/typo can't take
 * effect). Config cards need `system-config:manage`; the deviation-rules card needs
 * `deviation-rule:manage` and saves each rule itself.
 */
export function SystemConfigSection(): JSX.Element | null {
  const { can } = usePermissions();
  const canConfig = can('system-config:manage');
  const canDeviation = can('deviation-rule:manage');
  const cardAllowed = (c: CardDef): boolean => (c.requires === 'config' ? canConfig : canDeviation);

  const qc = useQueryClient();
  const { data, isLoading, isError } = useSystemConfig({ enabled: canConfig });
  const byKey = useMemo(() => new Map((data ?? []).map((d) => [d.key, d] as const)), [data]);

  // Deviation rules (Phase 7) share the same staged Save as the config settings.
  const {
    data: rules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useDeviationRules({ enabled: canDeviation });
  const ruleByType = useMemo(
    () => new Map((rules ?? []).map((r) => [r.deviationType, r] as const)),
    [rules],
  );

  // Staged edits: key → new string value, or `null` to clear (revert to env/default).
  const [pending, setPending] = useState<Map<string, string | null>>(new Map());
  const [pendingRules, setPendingRules] = useState<Map<DeviationType, StagedRule>>(new Map());
  const [saving, setSaving] = useState(false);

  const stage = (key: string, value: string): void => {
    const item = byKey.get(key);
    setPending((prev) => {
      const next = new Map(prev);
      if (item && value === savedString(item)) next.delete(key);
      else next.set(key, value);
      return next;
    });
  };
  const revert = (key: string): void => setPending((prev) => new Map(prev).set(key, null));
  const undo = (key: string): void =>
    setPending((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });

  const stageRule = (type: DeviationType, patch: Partial<StagedRule>): void => {
    const rule = ruleByType.get(type);
    if (!rule) return;
    setPendingRules((prev) => {
      const next = new Map(prev);
      const merged = { ...(prev.get(type) ?? snapshotOf(rule)), ...patch };
      if (rulesEqual(merged, snapshotOf(rule))) next.delete(type);
      else next.set(type, merged);
      return next;
    });
  };

  const configKeysOf = (g: GroupDef): string[] =>
    g.cards.flatMap((c) => (c.requires === 'config' && canConfig ? [...c.keys] : []));
  const groupHasDeviation = (g: GroupDef): boolean =>
    canDeviation && g.cards.some((c) => c.requires === 'deviation');
  const groupDirtyCount = (g: GroupDef): number =>
    configKeysOf(g).filter((k) => pending.has(k)).length + (groupHasDeviation(g) ? pendingRules.size : 0);

  const groups = useMemo(
    () => GROUPS.filter((g) => g.cards.some((c) => (c.requires === 'config' ? canConfig : canDeviation))),
    [canConfig, canDeviation],
  );

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (selected === null && groups.length > 0) setSelected(groups[0]?.id ?? null);
  }, [groups, selected]);

  const saveGroup = async (g: GroupDef): Promise<void> => {
    const keys = configKeysOf(g).filter((k) => pending.has(k));
    const ruleTypes = groupHasDeviation(g) ? [...pendingRules.keys()] : [];
    if (keys.length === 0 && ruleTypes.length === 0) return;
    setSaving(true);
    const nextPending = new Map(pending);
    const nextRules = new Map(pendingRules);
    let ok = 0;
    let firstError: { label: string; err: unknown } | null = null;
    for (const key of keys) {
      const val = pending.get(key) as string | null;
      try {
        if (val === null) await systemConfigApi.clear(key);
        else await systemConfigApi.set(key, val);
        ok += 1;
        nextPending.delete(key);
      } catch (err) {
        firstError ??= { label: byKey.get(key)?.label ?? key, err };
      }
    }
    for (const type of ruleTypes) {
      const snap = pendingRules.get(type) as StagedRule;
      try {
        await trackingApi.upsertDeviationRule(type, {
          threshold: snap.threshold ?? undefined,
          hysteresisSec: snap.hysteresisSec,
          severity: snap.severity,
          enabled: snap.enabled,
        });
        ok += 1;
        nextRules.delete(type);
      } catch (err) {
        firstError ??= { label: `Aturan ${type}`, err };
      }
    }
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['system-config'] }),
      qc.invalidateQueries({ queryKey: ['gps-tracking', 'deviation-rules'] }),
    ]);
    setPending(nextPending);
    setPendingRules(nextRules);
    setSaving(false);
    if (firstError) {
      notify.error(
        `${firstError.label}: ${
          firstError.err instanceof ApiError ? firstError.err.message : 'gagal disimpan'
        }`,
      );
    } else {
      notify.success(`${ok} setelan disimpan.`);
    }
  };

  const cancelGroup = (g: GroupDef): void => {
    const keys = configKeysOf(g);
    setPending((prev) => {
      const next = new Map(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });
    if (groupHasDeviation(g)) setPendingRules(new Map());
  };

  if (canConfig && isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-6 w-6 text-neutral-400" />
      </div>
    );
  }
  if (canConfig && (isError || !data)) {
    return <p className="text-body-sm text-danger-600">Gagal memuat setelan sistem.</p>;
  }
  if (groups.length === 0) {
    return null;
  }

  const active = groups.find((g) => g.id === selected) ?? groups[0];
  const cards = (active?.cards ?? []).filter(cardAllowed);
  const groupDirty = active ? groupDirtyCount(active) : 0;
  const hasConfigCard = cards.some((c) => c.requires === 'config');
  const saveable = cards.length > 0; // every visible card can be saved via this bar

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Group rail */}
      <nav
        aria-label="Kelompok setelan"
        className="h-fit overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0"
      >
        {groups.map((group) => {
          const isActive = active?.id === group.id;
          const keys = configKeysOf(group);
          const dirty = groupDirtyCount(group);
          return (
            <SettingsNavButton
              key={group.id}
              icon={group.icon}
              label={group.label}
              help={group.help}
              active={isActive}
              right={
                dirty > 0 ? (
                  <span
                    className="shrink-0 rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white"
                    title={`${dirty} perubahan belum disimpan`}
                  >
                    {dirty}
                  </span>
                ) : keys.length > 0 ? (
                  <span
                    className={cn(
                      'shrink-0 whitespace-nowrap font-mono text-[11px]',
                      isActive ? 'text-white/75' : 'text-neutral-400',
                    )}
                  >
                    {keys.length} setelan
                  </span>
                ) : undefined
              }
              onSelect={() => setSelected(group.id)}
            />
          );
        })}
      </nav>

      {/* Detail: one card per sub-section + a per-group save bar */}
      <div className="space-y-4">
        {hasConfigCard ? (
          <p className="rounded-base bg-neutral-50 px-3 py-2 text-tiny text-neutral-500">
            <b className="text-primary-700 dark:text-primary-400">Kustom</b> = nilai khusus tersimpan ·{' '}
            <b>Dari env</b> = memakai nilai bawaan server ·{' '}
            <b className="text-amber-700">Belum diset</b> = belum ada nilai. Perubahan berlaku setelah{' '}
            <b>Simpan Perubahan</b>; <b>Bawaan</b> menghapus nilai kustom.
          </p>
        ) : null}

        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
              <p className="text-body-sm text-neutral-500">{card.help}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {card.requires === 'deviation' ? (
                <DeviationRulesControl
                  rules={rules}
                  isLoading={rulesLoading}
                  isError={rulesError}
                  staged={pendingRules}
                  onStage={stageRule}
                />
              ) : (
                card.keys
                  .map((k) => byKey.get(k))
                  .filter((item): item is ConfigDescription => item !== undefined)
                  .map((item) => (
                    <ConfigRow
                      key={item.key}
                      item={item}
                      staged={
                        pending.has(item.key) ? (pending.get(item.key) as string | null) : undefined
                      }
                      onStage={stage}
                      onRevert={revert}
                      onUndo={undo}
                    />
                  ))
              )}
            </CardContent>
          </Card>
        ))}

        {saveable && active ? (
          <SettingsSaveBar
            visible
            dirty={groupDirty > 0}
            message={groupDirty > 0 ? `${groupDirty} perubahan belum disimpan` : 'Tidak ada perubahan'}
            saving={saving}
            onCancel={() => cancelGroup(active)}
            onSave={() => void saveGroup(active)}
            saveLabel="Simpan Perubahan"
            cancelLabel="Batal"
          />
        ) : null}
      </div>
    </div>
  );
}
