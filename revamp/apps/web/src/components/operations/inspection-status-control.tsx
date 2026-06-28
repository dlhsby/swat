'use client';

import { cn } from '@/lib/cn';
import { type InspectionItemStatusValue } from '@/lib/operations-api';

const OPTIONS: ReadonlyArray<{ value: InspectionItemStatusValue; label: string; active: string }> =
  [
    { value: 'OK', label: 'OK', active: 'bg-success-500 text-white border-success-500' },
    {
      value: 'ATTENTION',
      label: 'Perhatian',
      active: 'bg-warning-500 text-white border-warning-500',
    },
    { value: 'FAIL', label: 'Gagal', active: 'bg-danger-500 text-white border-danger-500' },
  ];

export interface InspectionStatusControlProps {
  value: InspectionItemStatusValue;
  onChange: (value: InspectionItemStatusValue) => void;
  ariaLabel: string;
}

/** Compact 3-way segmented control for a checklist item's status. */
export function InspectionStatusControl({
  value,
  onChange,
  ariaLabel,
}: InspectionStatusControlProps): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-base border border-neutral-200"
    >
      {OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2.5 py-1 text-tiny font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            i === 0 && 'rounded-l-[5px]',
            i === OPTIONS.length - 1 && 'rounded-r-[5px]',
            value === opt.value ? opt.active : 'text-neutral-500 hover:bg-neutral-50',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
