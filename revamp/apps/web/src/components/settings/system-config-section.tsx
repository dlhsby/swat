'use client';

import { MapPin, Navigation, RotateCcw, Satellite, Scale } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { DeviationRulesControl } from '@/components/settings/deviation-rules-control';
import { Button, Card, CardContent, InfoHint, Input, Spinner, Switch } from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useClearSystemConfig,
  useSetSystemConfig,
  useSystemConfig,
} from '@/hooks/use-system-config';
import { cn } from '@/lib/cn';
import { type ConfigDescription } from '@/lib/system-config-api';

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

function SourceBadge({ source }: { source: ConfigDescription['source'] }): JSX.Element {
  const m = SOURCE_META[source];
  return (
    <span className={`rounded-[5px] px-1.5 py-0.5 text-tiny font-semibold ${m.cls}`}>{m.text}</span>
  );
}

/** One setting: label + help tooltip + source badge + the appropriate control. */
function ConfigRow({ item }: { item: ConfigDescription }): JSX.Element {
  const setMut = useSetSystemConfig();
  const clearMut = useClearSystemConfig();
  const [value, setValue] = useState(
    item.isSecret || item.valueType === 'boolean' || item.value === undefined
      ? ''
      : String(item.value),
  );

  const save = (v: string): void => setMut.mutate({ key: item.key, value: v });

  const revertButton =
    item.isSet && item.valueType !== 'boolean' ? (
      <Button
        variant="ghost"
        size="sm"
        className="text-neutral-500"
        title="Hapus nilai kustom; kembali ke nilai bawaan (env/sistem)"
        onClick={() => clearMut.mutate(item.key)}
        loading={clearMut.isPending}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        Bawaan
      </Button>
    ) : null;

  return (
    <div className="flex flex-col gap-2 rounded-base border border-neutral-200 bg-neutral-0 p-3 dark:border-neutral-700 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-body-sm font-semibold text-neutral-900">{item.label}</p>
          {item.help ? <InfoHint label={item.help} srLabel={`Penjelasan ${item.label}`} /> : null}
          <SourceBadge source={item.source} />
          {item.isSecret ? (
            <span className="rounded-[5px] bg-neutral-100 px-1.5 py-0.5 text-tiny text-neutral-500 dark:bg-neutral-800">
              rahasia
            </span>
          ) : null}
        </div>
      </div>
      {item.valueType === 'boolean' ? (
        <Switch
          checked={item.value === true}
          onCheckedChange={(c) => save(String(c))}
          aria-label={item.label}
        />
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:flex-nowrap">
          <Input
            type={item.isSecret ? 'password' : item.valueType === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              item.isSecret
                ? item.isSet
                  ? '• • • • • •  (isi untuk mengganti)'
                  : 'Belum diset'
                : undefined
            }
            className="w-full min-w-0 flex-1 sm:w-64 sm:flex-none"
            autoComplete="off"
          />
          <Button
            size="sm"
            onClick={() => save(value)}
            loading={setMut.isPending}
            disabled={item.isSecret && value === ''}
          >
            Simpan
          </Button>
          {revertButton}
        </div>
      )}
    </div>
  );
}

/** Left-rail entry for one group. */
function GroupNavButton({
  group,
  active,
  meta,
  onSelect,
}: {
  group: GroupDef;
  active: boolean;
  meta: string;
  onSelect: () => void;
}): JSX.Element {
  const Icon = group.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2.5 border-b border-l-[3px] border-b-neutral-100 px-4 py-3 text-left transition-colors last:border-b-0 dark:border-b-neutral-800',
        active
          ? 'border-l-primary-700 bg-primary-700 text-white'
          : 'border-l-transparent text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800',
      )}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-neutral-400')}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-semibold">{group.label}</span>
        <span className={cn('block truncate text-tiny', active ? 'text-white/75' : 'text-neutral-500')}>
          {group.help}
        </span>
      </span>
      {meta ? (
        <span
          className={cn(
            'shrink-0 whitespace-nowrap font-mono text-[11px]',
            active ? 'text-white/75' : 'text-neutral-400',
          )}
        >
          {meta}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Admin system settings — a master/detail like the roles editor: pick a group in the
 * left rail, edit its settings on the right (so the page doesn't grow endlessly).
 * Config groups need `system-config:manage`; the deviation-rules section needs
 * `deviation-rule:manage`. Secrets are write-only; each setting carries a help tooltip.
 */
export function SystemConfigSection(): JSX.Element | null {
  const { can } = usePermissions();
  const canConfig = can('system-config:manage');
  const canDeviation = can('deviation-rule:manage');
  const allows = (b: Block): boolean => (b.requires === 'config' ? canConfig : canDeviation);

  const { data, isLoading, isError } = useSystemConfig({ enabled: canConfig });
  const byKey = useMemo(
    () => new Map((data ?? []).map((d) => [d.key, d] as const)),
    [data],
  );

  // Groups the user can see at all (≥1 permitted block). Predicate inlined so the
  // memo depends only on the permission booleans (not the per-render `allows`).
  const groups = useMemo(
    () =>
      GROUPS.filter((g) =>
        g.blocks.some((b) => (b.requires === 'config' ? canConfig : canDeviation)),
      ),
    [canConfig, canDeviation],
  );

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (selected === null && groups.length > 0) {
      setSelected(groups[0]?.id ?? null);
    }
  }, [groups, selected]);

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
    g.blocks.filter((b) => b.kind === 'config' && allows(b)).reduce((n, b) => n + (b.kind === 'config' ? b.keys.length : 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Group rail */}
      <nav
        aria-label="Kelompok setelan"
        className="h-fit overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0 dark:border-neutral-700 dark:bg-neutral-900"
      >
        {groups.map((group) => (
          <GroupNavButton
            key={group.id}
            group={group}
            active={active?.id === group.id}
            meta={configKeyCount(group) > 0 ? `${configKeyCount(group)} setelan` : 'aturan'}
            onSelect={() => setSelected(group.id)}
          />
        ))}
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
              <b className="text-amber-700">Belum diset</b> = belum ada nilai. Tombol{' '}
              <b>Bawaan</b> menghapus nilai kustom dan kembali ke bawaan.
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
                  .map((item) => <ConfigRow key={item.key} item={item} />)
              )}
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
