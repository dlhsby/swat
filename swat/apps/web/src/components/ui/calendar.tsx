'use client';

import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/cn';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar (design-system §3.6) — react-day-picker styled with SWAT tokens.
 * Indonesian month/day names; today ring primary-600, selected fill primary-700.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={id}
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'space-y-3',
        month_caption: 'flex h-9 items-center justify-center',
        caption_label: 'text-body-sm font-semibold text-neutral-900 capitalize',
        nav: 'absolute inset-x-2 top-3 flex items-center justify-between',
        button_previous:
          'inline-flex h-7 w-7 items-center justify-center rounded-base text-neutral-500 hover:bg-neutral-100 disabled:opacity-40',
        button_next:
          'inline-flex h-7 w-7 items-center justify-center rounded-base text-neutral-500 hover:bg-neutral-100 disabled:opacity-40',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-tiny font-medium text-neutral-400',
        week: 'flex w-full mt-1',
        day: 'h-9 w-9 p-0 text-center text-body-sm',
        day_button:
          'inline-flex h-9 w-9 items-center justify-center rounded-base text-neutral-900 hover:bg-neutral-100 aria-selected:bg-primary-700 aria-selected:text-white',
        today: 'rounded-base ring-1 ring-inset ring-primary-600',
        selected: 'rounded-base',
        outside: 'text-neutral-400 opacity-60',
        disabled: 'text-neutral-300 opacity-50',
        hidden: 'invisible',
        range_middle:
          'aria-selected:bg-primary-50 aria-selected:text-primary-800 dark:aria-selected:text-primary-400',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" {...rest} />
          ) : (
            <ChevronRight className="h-4 w-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
