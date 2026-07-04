'use client';

import { Gauge, type LucideIcon, MapPin, Satellite, Scale, Waypoints } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { DeviationRulesControl } from '@/components/settings/deviation-rules-control';
import { Button, Input, Spinner, Switch } from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useClearSystemConfig,
  useSetSystemConfig,
  useSystemConfig,
} from '@/hooks/use-system-config';
import { cn } from '@/lib/cn';
import { type ConfigDescription } from '@/lib/system-config-api';

/** A group shown in the left rail: either a config group (keyed by `group`) or the
 * special deviation-rules panel. `id` is a stable selection key. */
interface GroupDef {
  readonly id: string;
  readonly label: string;
  readonly help: string;
  readonly icon: LucideIcon;
  /** The `system_config` group these rows belong to; absent for the rules panel. */
  readonly configGroup?: string;
  /** Renders the deviation-rules editor instead of config rows. */
  readonly deviation?: boolean;
}

const CONFIG_GROUPS: readonly GroupDef[] = [
  { id: 'gpsid', configGroup: 'gpsid', label: 'Integrasi GPS.id', help: 'Kredensial & sinkronisasi otomatis', icon: Satellite },
  { id: 'maps', configGroup: 'maps', label: 'Peta (Google Maps)', help: 'Kunci API peta (server & peramban)', icon: MapPin },
  { id: 'gps', configGroup: 'gps', label: 'Ambang GPS', help: 'Batas offline, geofence, webhook', icon: Gauge },
  { id: 'weighbridge', configGroup: 'weighbridge', label: 'Jembatan Timbang', help: 'Integrasi timbangan TPA', icon: Scale },
];
const DEVIATION_GROUP: GroupDef = {
  id: 'pelacakan',
  label: 'Aturan Penyimpangan',
  help: 'Ambang deteksi penyimpangan rute GPS',
  icon: Waypoints,
  deviation: true,
};

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

/** One setting: label + help + source badge + the appropriate control. */
function ConfigRow({ item }: { item: ConfigDescription }): JSX.Element {
  const setMut = useSetSystemConfig();
  const clearMut = useClearSystemConfig();
  const [value, setValue] = useState(
    item.isSecret || item.valueType === 'boolean' || item.value === undefined
      ? ''
      : String(item.value),
  );

  const save = (v: string): void => setMut.mutate({ key: item.key, value: v });

  const control =
    item.valueType === 'boolean' ? (
      <Switch
        checked={item.value === true}
        onCheckedChange={(c) => save(String(c))}
        aria-label={item.label}
      />
    ) : (
      <div className="flex items-center gap-2">
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
          className="w-full sm:w-64"
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
      </div>
    );

  return (
    <div className="flex flex-col gap-2 rounded-base border border-neutral-200 p-3 dark:border-neutral-700 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-body-sm font-semibold text-neutral-900">{item.label}</p>
          <SourceBadge source={item.source} />
          {item.isSecret ? (
            <span className="rounded-[5px] bg-neutral-100 px-1.5 py-0.5 text-tiny text-neutral-500 dark:bg-neutral-800">
              rahasia
            </span>
          ) : null}
        </div>
        {item.help ? <p className="mt-0.5 text-tiny text-neutral-500">{item.help}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {control}
        {item.isSet && item.valueType !== 'boolean' ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-500"
            onClick={() => clearMut.mutate(item.key)}
            loading={clearMut.isPending}
          >
            Bawaan
          </Button>
        ) : null}
      </div>
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
      <span
        className={cn('shrink-0 font-mono text-[11px]', active ? 'text-white/75' : 'text-neutral-400')}
      >
        {meta}
      </span>
    </button>
  );
}

/**
 * Admin system settings — a master/detail like the roles editor: pick a group in the
 * left rail, edit its settings on the right (so the page doesn't grow endlessly).
 * Config groups (GPS.id, Maps, thresholds, weighbridge) need `system-config:manage`;
 * the deviation-rules group needs `deviation-rule:manage`. Secrets are write-only.
 */
export function SystemConfigSection(): JSX.Element | null {
  const { can } = usePermissions();
  const canConfig = can('system-config:manage');
  const canDeviation = can('deviation-rule:manage');

  const { data, isLoading, isError } = useSystemConfig({ enabled: canConfig });

  const groups = useMemo<GroupDef[]>(() => {
    const configGroups = canConfig
      ? CONFIG_GROUPS.filter((g) => (data ?? []).some((d) => d.group === g.configGroup))
      : [];
    return [...configGroups, ...(canDeviation ? [DEVIATION_GROUP] : [])];
  }, [canConfig, canDeviation, data]);

  const [selected, setSelected] = useState<string | null>(null);
  // Default to the first available group once we know what's available.
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
  const rows = active?.configGroup
    ? (data ?? []).filter((d) => d.group === active.configGroup)
    : [];

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
            meta={
              group.deviation
                ? 'aturan'
                : `${(data ?? []).filter((d) => d.group === group.configGroup).length} setelan`
            }
            onSelect={() => setSelected(group.id)}
          />
        ))}
      </nav>

      {/* Detail */}
      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <div className="mb-3">
          <h3 className="text-body-lg font-semibold text-neutral-900">{active?.label}</h3>
          <p className="text-body-sm text-neutral-500">{active?.help}</p>
        </div>
        {active?.deviation ? (
          <DeviationRulesControl />
        ) : (
          <div className="space-y-2">
            {rows.map((item) => (
              <ConfigRow key={item.key} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
