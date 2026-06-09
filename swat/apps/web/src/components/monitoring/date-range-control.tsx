'use client';

import { useTranslations } from 'next-intl';

import { Button, DatePicker } from '@/components/ui';
import { cn } from '@/lib/cn';
import { type DateRange } from '@/lib/monitoring-api';
import { datePresets, type PresetKey } from '@/lib/monitoring-charts';

const PRESET_ORDER: readonly PresetKey[] = ['today', 'last7', 'thisMonth', 'lastMonth', 'ytd'];

/**
 * Date-range filter for the monitoring dashboards: quick presets plus custom
 * from/to pickers. Controlled — the page owns the range and reflects it in state.
 */
export function DateRangeControl({
  value,
  today,
  onChange,
}: {
  value: DateRange;
  today: string;
  onChange: (range: DateRange) => void;
}): JSX.Element {
  const t = useTranslations('monitoring.range');
  const presets = datePresets(today);
  const activePreset = PRESET_ORDER.find(
    (key) => presets[key].dateFrom === value.dateFrom && presets[key].dateTo === value.dateTo,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_ORDER.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={activePreset === key ? 'primary' : 'outline'}
            onClick={() =>
              onChange({ dateFrom: presets[key].dateFrom, dateTo: presets[key].dateTo })
            }
            className={cn(activePreset === key ? '' : 'text-neutral-600')}
          >
            {t(key)}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <DatePicker
          value={value.dateFrom}
          onValueChange={(date) => date && onChange({ ...value, dateFrom: date })}
        />
        <span className="text-neutral-400">–</span>
        <DatePicker
          value={value.dateTo}
          onValueChange={(date) => date && onChange({ ...value, dateTo: date })}
        />
      </div>
    </div>
  );
}
