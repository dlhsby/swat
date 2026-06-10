'use client';

import { type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: ReadonlyArray<SegmentOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * SegmentedControl — a single-select pill group (hi-fi `.hf-theme-seg`). Used
 * for appearance/language pickers in Settings; keyboard- and screen-reader-ready
 * via the radiogroup/radio roles.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-wrap gap-0.5 rounded-base border border-neutral-200 bg-neutral-50 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors',
              active
                ? 'bg-primary-700 text-white shadow-subtle'
                : 'text-neutral-500 hover:text-neutral-800',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
