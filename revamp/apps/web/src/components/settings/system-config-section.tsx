'use client';

import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
  Switch,
} from '@/components/ui';
import {
  useClearSystemConfig,
  useSetSystemConfig,
  useSystemConfig,
} from '@/hooks/use-system-config';
import { type ConfigDescription } from '@/lib/system-config-api';

const GROUP_LABELS: Record<string, string> = {
  gpsid: 'Integrasi GPS.id',
  maps: 'Peta (Google Maps)',
  gps: 'Ambang GPS',
  weighbridge: 'Jembatan Timbang',
};
const GROUP_ORDER = ['gpsid', 'maps', 'gps', 'weighbridge'];

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

/**
 * Admin system settings — runtime-editable global config (GPS.id integration, Maps
 * keys, GPS thresholds, weighbridge). A value here overrides the env var; "Bawaan"
 * reverts. Secrets are write-only (never shown). Gated by `system-config:manage`.
 */
export function SystemConfigSection(): JSX.Element {
  const { data, isLoading, isError } = useSystemConfig();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-6 w-6 text-neutral-400" />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-body-sm text-danger-600">Gagal memuat setelan sistem.</p>;
  }

  const groups = GROUP_ORDER.filter((g) => data.some((d) => d.group === g));

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>{GROUP_LABELS[group] ?? group}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data
              .filter((d) => d.group === group)
              .map((item) => (
                <ConfigRow key={item.key} item={item} />
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
