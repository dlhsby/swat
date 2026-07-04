'use client';

import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Navigation, RotateCcw, Satellite, Scale, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { DeviationRulesControl } from '@/components/settings/deviation-rules-control';
import { SettingsNavButton } from '@/components/settings/settings-nav-button';
import { SettingsSaveBar } from '@/components/settings/settings-save-bar';
import { Button, Card, CardContent, InfoHint, Input, Spinner, Switch, notify } from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { useSystemConfig } from '@/hooks/use-system-config';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { type ConfigDescription, systemConfigApi } from '@/lib/system-config-api';

/** A block within a group panel: a set of config keys, or the deviation-rules editor. */
type Block =
  | { kind: 'config'; requires: 'config'; title?: string; help?: string; keys: readonly string[] }
  | { kind: 'deviation'; requires: 'deviation'; title: string; help: string };

interface GroupDef {
  readonly id: string;
  readonly label: string;
  readonly help: string;
  readonly icon: typeof Satellite;
  readonly blocks: readonly Block[];
}

/** Left-rail groups. GPS intake, movement detection, and route-deviation alerts are
 * merged into one "Pelacakan GPS" group (three labelled sections). */
const GROUPS: readonly GroupDef[] = [
  {
    id: 'gpsid',
    label: 'Integrasi GPS.id',
    help: 'Kredensial & sinkronisasi otomatis',
    icon: Satellite,
    blocks: [
      {
        kind: 'config',
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
    ],
  },
  {
    id: 'maps',
    label: 'Peta (Google Maps)',
    help: 'Kunci API peta (server & peramban)',
    icon: MapPin,
    blocks: [{ kind: 'config', requires: 'config', keys: ['maps.serverKey', 'maps.browserKey'] }],
  },
  {
    id: 'tracking',
    label: 'Pelacakan GPS',
    help: 'Penerimaan data, deteksi pergerakan & alarm penyimpangan',
    icon: Navigation,
    blocks: [
      {
        kind: 'config',
        requires: 'config',
        title: 'Penerimaan Data & Webhook',
        help: 'Keamanan dan laju endpoint yang menerima posisi dari GPS.id.',
        keys: ['gps.webhookToken', 'gps.allowedIps', 'gps.ingestRateLimitPerMin'],
      },
      {
        kind: 'config',
        requires: 'config',
        title: 'Deteksi Pergerakan',
        help: 'Ambang penentuan status offline dan pagar geo tiba/berangkat.',
        keys: ['gps.deviceOfflineMinutes', 'gps.geofenceDefaultRadiusM'],
      },
      {
        kind: 'deviation',
        requires: 'deviation',
        title: 'Alarm Penyimpangan Rute',
        help: 'Ambang & tingkat alarm saat kendaraan menyimpang dari rencana rute/jadwal.',
      },
    ],
  },
  {
    id: 'weighbridge',
    label: 'Jembatan Timbang',
    help: 'Integrasi timbangan TPA',
    icon: Scale,
    blocks: [{ kind: 'config', requires: 'config', keys: ['weighbridge.rateLimitPerMin'] }],
  },
];

const SOURCE_META: Record<ConfigDescription['source'], { text: string; cls: string }> = {
  db: { text: 'Kustom', cls: 'bg-primary-50 text-primary-700 dark:bg-neutral-800 dark:text-primary-400' },
  env: { text: 'Dari env', cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800' },
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

/** One setting: label + help tooltip + status + the appropriate control. Fully
 * controlled — edits stage into the section's pending map, applied only on Save. */
function ConfigRow({ item, staged, onStage, onRevert, onUndo }: ConfigRowProps): JSX.Element {
  const isStaged = staged !== undefined;
  const isClear = staged === null;
  const textValue = isStaged ? (staged ?? '') : item.isSecret ? '' : String(item.value ?? '');
  const boolChecked = isStaged ? staged === 'true' : item.value === true;

  return (
    <div className="flex flex-col gap-2 rounded-base border border-neutral-200 bg-neutral-0 p-3 dark:border-neutral-700 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
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
            <span className="rounded-[5px] bg-neutral-100 px-1.5 py-0.5 text-tiny text-neutral-500 dark:bg-neutral-800">
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
 * Admin system settings — a master/detail like the roles editor. Edits (text, number,
 * toggles) STAGE into a pending map and take effect only when the user clicks "Simpan
 * Perubahan" (so an accidental toggle/typo can't apply). Config groups need
 * `system-config:manage`; the deviation-rules section needs `deviation-rule:manage`.
 */
export function SystemConfigSection(): JSX.Element | null {
  const { can } = usePermissions();
  const canConfig = can('system-config:manage');
  const canDeviation = can('deviation-rule:manage');
  const allows = (b: Block): boolean => (b.requires === 'config' ? canConfig : canDeviation);

  const qc = useQueryClient();
  const { data, isLoading, isError } = useSystemConfig({ enabled: canConfig });
  const byKey = useMemo(() => new Map((data ?? []).map((d) => [d.key, d] as const)), [data]);

  // Staged edits: key → new string value, or `null` to clear (revert to env/default).
  const [pending, setPending] = useState<Map<string, string | null>>(new Map());
  const [saving, setSaving] = useState(false);

  const stage = (key: string, value: string): void => {
    const item = byKey.get(key);
    setPending((prev) => {
      const next = new Map(prev);
      // Editing back to the saved value clears the "dirty" mark.
      if (item && value === savedString(item)) next.delete(key);
      else next.set(key, value);
      return next;
    });
  };
  const revert = (key: string): void =>
    setPending((prev) => new Map(prev).set(key, null));
  const undo = (key: string): void =>
    setPending((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });

  const groups = useMemo(
    () =>
      GROUPS.filter((g) =>
        g.blocks.some((b) => (b.requires === 'config' ? canConfig : canDeviation)),
      ),
    [canConfig, canDeviation],
  );

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (selected === null && groups.length > 0) setSelected(groups[0]?.id ?? null);
  }, [groups, selected]);

  const dirtyInGroup = (g: GroupDef): number =>
    g.blocks.reduce(
      (n, b) => n + (b.kind === 'config' ? b.keys.filter((k) => pending.has(k)).length : 0),
      0,
    );

  const saveAll = async (): Promise<void> => {
    if (pending.size === 0) return;
    setSaving(true);
    const failed = new Map<string, string | null>();
    let ok = 0;
    for (const [key, val] of pending) {
      try {
        if (val === null) await systemConfigApi.clear(key);
        else await systemConfigApi.set(key, val);
        ok += 1;
      } catch (err) {
        failed.set(key, val);
        if (failed.size === 1) {
          const item = byKey.get(key);
          notify.error(
            `${item?.label ?? key}: ${err instanceof ApiError ? err.message : 'gagal disimpan'}`,
          );
        }
      }
    }
    await qc.invalidateQueries({ queryKey: ['system-config'] });
    setPending(failed);
    setSaving(false);
    if (failed.size === 0) notify.success(`${ok} setelan disimpan.`);
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
  const blocks = (active?.blocks ?? []).filter(allows);
  const hasConfigBlock = blocks.some((b) => b.kind === 'config');
  const configKeyCount = (g: GroupDef): number =>
    g.blocks.reduce(
      (n, b) => n + (b.kind === 'config' && allows(b) ? b.keys.length : 0),
      0,
    );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Group rail */}
        <nav
          aria-label="Kelompok setelan"
          className="h-fit overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {groups.map((group) => {
            const isActive = active?.id === group.id;
            const dirty = dirtyInGroup(group);
            const meta = configKeyCount(group) > 0 ? `${configKeyCount(group)} setelan` : 'aturan';
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
                  ) : (
                    <span
                      className={cn(
                        'shrink-0 whitespace-nowrap font-mono text-[11px]',
                        isActive ? 'text-white/75' : 'text-neutral-400',
                      )}
                    >
                      {meta}
                    </span>
                  )
                }
                onSelect={() => setSelected(group.id)}
              />
            );
          })}
        </nav>

        {/* Detail */}
        <Card>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-body-lg font-semibold text-neutral-900">{active?.label}</h3>
              <p className="text-body-sm text-neutral-500">{active?.help}</p>
            </div>

            {hasConfigBlock ? (
              <p className="rounded-base bg-neutral-50 px-3 py-2 text-tiny text-neutral-500 dark:bg-neutral-800/60">
                <b className="text-primary-700 dark:text-primary-400">Kustom</b> = nilai khusus
                tersimpan · <b>Dari env</b> = memakai nilai bawaan server ·{' '}
                <b className="text-amber-700">Belum diset</b> = belum ada nilai. Perubahan berlaku
                setelah <b>Simpan Perubahan</b>; <b>Bawaan</b> menghapus nilai kustom.
              </p>
            ) : null}

            {blocks.map((block, i) => (
              <section key={block.kind === 'config' ? `cfg-${i}` : 'deviation'} className="space-y-2">
                {block.title ? (
                  <div className="flex items-center gap-1.5 pt-1">
                    <h4 className="text-label font-semibold uppercase tracking-wide text-neutral-500">
                      {block.title}
                    </h4>
                    {block.help ? <InfoHint label={block.help} srLabel={block.title} /> : null}
                  </div>
                ) : null}
                {block.kind === 'deviation' ? (
                  <DeviationRulesControl />
                ) : (
                  block.keys
                    .map((k) => byKey.get(k))
                    .filter((item): item is ConfigDescription => item !== undefined)
                    .map((item) => (
                      <ConfigRow
                        key={item.key}
                        item={item}
                        staged={pending.has(item.key) ? (pending.get(item.key) as string | null) : undefined}
                        onStage={stage}
                        onRevert={revert}
                        onUndo={undo}
                      />
                    ))
                )}
              </section>
            ))}
          </CardContent>
        </Card>
      </div>

      <SettingsSaveBar
        visible={pending.size > 0}
        message={`${pending.size} perubahan belum disimpan`}
        saving={saving}
        onCancel={() => setPending(new Map())}
        onSave={() => void saveAll()}
        saveLabel="Simpan Perubahan"
        cancelLabel="Batal"
      />
    </div>
  );
}
