'use client';

import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Navigation, Plug, RotateCcw, Scale, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

/** A card inside a group panel: a set of config keys, or the deviation-rules editor.
 * `id` keys the localized title/help under `settings.sys.cards.<id>`. */
type CardDef =
  | { id: string; requires: 'config'; keys: readonly string[] }
  | { id: string; requires: 'deviation'; deviation: true };

interface GroupDef {
  readonly id: string;
  readonly icon: typeof Navigation;
  readonly cards: readonly CardDef[];
}

/**
 * Left-rail groups. All GPS concerns (GPS.id integration, webhook intake, movement
 * detection, route-deviation alerts) live under one "GPS.id & Pelacakan" group, split
 * into clearly-separated cards. Labels/help are localized (settings.sys.*).
 */
const GROUPS: readonly GroupDef[] = [
  {
    id: 'gps',
    icon: Navigation,
    cards: [
      {
        id: 'gpsid',
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
        id: 'webhook',
        requires: 'config',
        keys: ['gps.webhookToken', 'gps.allowedIps', 'gps.ingestRateLimitPerMin'],
      },
      {
        id: 'detection',
        requires: 'config',
        keys: ['gps.deviceOfflineMinutes', 'gps.geofenceDefaultRadiusM'],
      },
      { id: 'deviation', requires: 'deviation', deviation: true },
    ],
  },
  {
    id: 'maps',
    icon: MapPin,
    cards: [{ id: 'maps', requires: 'config', keys: ['maps.serverKey', 'maps.browserKey'] }],
  },
  {
    id: 'weighbridge',
    icon: Scale,
    cards: [{ id: 'weighbridge', requires: 'config', keys: ['weighbridge.rateLimitPerMin'] }],
  },
  {
    id: 'thirdParty',
    icon: Plug,
    cards: [
      {
        id: 'gasifikasi',
        requires: 'config',
        keys: [
          'gasification.enabled',
          'gasification.baseUrl',
          'gasification.apiKey',
          'gasification.photoBaseUrl',
          'gasification.pullIntervalMin',
          'gasification.lookbackDays',
          'gasification.matchBeforeMin',
          'gasification.matchAfterMin',
          'gasification.maxRequestsPerMin',
          'gasification.requeryCooldownMin',
        ],
      },
    ],
  },
];

const SOURCE_CLASS: Record<ConfigDescription['source'], string> = {
  db: 'bg-primary-50 text-primary-700 dark:text-primary-400',
  env: 'bg-neutral-100 text-neutral-600',
  unset: 'bg-amber-100 text-amber-700',
};
const SOURCE_KEY: Record<ConfigDescription['source'], string> = {
  db: 'sys.sourceDb',
  env: 'sys.sourceEnv',
  unset: 'sys.sourceUnset',
};

/** The current saved value of a setting as a comparable string (secrets are opaque). */
function savedString(item: ConfigDescription): string {
  if (item.valueType === 'boolean') return item.value === true ? 'true' : 'false';
  if (item.isSecret || item.value === undefined) return '';
  return String(item.value);
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
 * into the section's pending map, applied only on Save. Labels/help are localized, with
 * the API's catalog label as a fallback for keys not yet translated. */
function ConfigRow({ item, staged, onStage, onRevert, onUndo }: ConfigRowProps): JSX.Element {
  const t = useTranslations('settings');
  const label = t.has(`sys.fields.${item.key}.label`)
    ? t(`sys.fields.${item.key}.label`)
    : item.label;
  const help = t.has(`sys.fields.${item.key}.help`) ? t(`sys.fields.${item.key}.help`) : item.help;

  const isStaged = staged !== undefined;
  const isClear = staged === null;
  const textValue = isStaged ? (staged ?? '') : item.isSecret ? '' : String(item.value ?? '');
  const boolChecked = isStaged ? staged === 'true' : item.value === true;

  return (
    <div className="flex flex-col gap-2 rounded-base border border-neutral-200 bg-neutral-0 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-body-sm font-semibold text-neutral-900">{label}</p>
          {help ? <InfoHint label={help} srLabel={label} /> : null}
          {isStaged ? (
            <span className="rounded-[5px] bg-amber-100 px-1.5 py-0.5 text-tiny font-semibold text-amber-700">
              {t('sys.staged')}
            </span>
          ) : (
            <span
              className={`rounded-[5px] px-1.5 py-0.5 text-tiny font-semibold ${SOURCE_CLASS[item.source]}`}
            >
              {t(SOURCE_KEY[item.source])}
            </span>
          )}
          {item.isSecret ? (
            <span className="rounded-[5px] bg-neutral-100 px-1.5 py-0.5 text-tiny text-neutral-500">
              {t('sys.secret')}
            </span>
          ) : null}
        </div>
      </div>

      {item.valueType === 'boolean' ? (
        <Switch
          checked={boolChecked}
          onCheckedChange={(c) => onStage(item.key, String(c))}
          aria-label={label}
        />
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:flex-nowrap">
          <Input
            type={item.isSecret ? 'password' : item.valueType === 'number' ? 'number' : 'text'}
            value={textValue}
            onChange={(e) => onStage(item.key, e.target.value)}
            placeholder={
              isClear
                ? t('sys.phRevert')
                : item.isSecret
                  ? item.isSet
                    ? t('sys.phSecretSet')
                    : t('sys.phUnset')
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
              title={t('sys.undoTitle')}
              onClick={() => onUndo(item.key)}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              {t('sys.undo')}
            </Button>
          ) : item.isSet ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-500"
              title={t('sys.revertTitle')}
              onClick={() => onRevert(item.key)}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              {t('sys.revert')}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Admin system settings — a master/detail like the roles editor. Each left-rail group
 * shows its settings as clearly-separated cards on the right, with its OWN staged Save.
 * Config cards need `system-config:manage`; the deviation-rules card needs
 * `deviation-rule:manage` and shares the same Save.
 */
export function SystemConfigSection(): JSX.Element | null {
  const t = useTranslations('settings');
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
    configKeysOf(g).filter((k) => pending.has(k)).length +
    (groupHasDeviation(g) ? pendingRules.size : 0);

  const groups = useMemo(
    () =>
      GROUPS.filter((g) =>
        g.cards.some((c) => (c.requires === 'config' ? canConfig : canDeviation)),
      ),
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
    let firstError: { label: string; err: unknown } | null = null;
    for (const key of keys) {
      const val = pending.get(key) as string | null;
      try {
        if (val === null) await systemConfigApi.clear(key);
        else await systemConfigApi.set(key, val);
        nextPending.delete(key);
      } catch (err) {
        const label = t.has(`sys.fields.${key}.label`)
          ? t(`sys.fields.${key}.label`)
          : (byKey.get(key)?.label ?? key);
        firstError ??= { label, err };
      }
    }
    for (const type of ruleTypes) {
      const snap = pendingRules.get(type) as StagedRule;
      try {
        await trackingApi.upsertDeviationRule(type, {
          threshold: snap.threshold, // may be null (clear) — preserved, not dropped
          hysteresisSec: snap.hysteresisSec,
          severity: snap.severity,
          enabled: snap.enabled,
        });
        nextRules.delete(type);
      } catch (err) {
        firstError ??= { label: t(`sys.deviation.rules.${type}.label`), err };
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
          firstError.err instanceof ApiError ? firstError.err.message : t('sys.saveError')
        }`,
      );
    } else {
      notify.success(t('saved'));
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
    return <p className="text-body-sm text-danger-600">{t('sys.loadError')}</p>;
  }
  if (groups.length === 0) {
    return null;
  }

  const active = groups.find((g) => g.id === selected) ?? groups[0];
  const cards = (active?.cards ?? []).filter(cardAllowed);
  const groupDirty = active ? groupDirtyCount(active) : 0;
  const hasConfigCard = cards.some((c) => c.requires === 'config');
  const saveable = cards.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Group rail */}
        <nav
          aria-label={t('systemTitle')}
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
                label={t(`sys.groups.${group.id}.label`)}
                help={t(`sys.groups.${group.id}.help`)}
                active={isActive}
                right={
                  dirty > 0 ? (
                    <span
                      className="shrink-0 rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white"
                      title={t('sys.unsavedCount', { count: dirty })}
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
                      {t('sys.settingsCount', { count: keys.length })}
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
              {t.rich('sys.legend', { b: (c) => <b className="text-neutral-700">{c}</b> })}
            </p>
          ) : null}

          {cards.map((card) => (
            <Card key={card.id}>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-h3 text-neutral-900">{t(`sys.cards.${card.id}.title`)}</h3>
                  <p className="mt-1 text-body-sm text-neutral-500">
                    {t(`sys.cards.${card.id}.help`)}
                  </p>
                </div>
                <div className="space-y-2">
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
                            pending.has(item.key)
                              ? (pending.get(item.key) as string | null)
                              : undefined
                          }
                          onStage={stage}
                          onRevert={revert}
                          onUndo={undo}
                        />
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {saveable && active ? (
        <SettingsSaveBar
          visible
          dirty={groupDirty > 0}
          message={groupDirty > 0 ? t('sys.unsavedCount', { count: groupDirty }) : t('noChanges')}
          saving={saving}
          onCancel={() => cancelGroup(active)}
          onSave={() => void saveGroup(active)}
          saveLabel={t('saveChanges')}
          cancelLabel={t('cancel')}
        />
      ) : null}
    </div>
  );
}
