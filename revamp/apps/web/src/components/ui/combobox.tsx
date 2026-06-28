'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/cn';

import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Search box placeholder. */
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  /**
   * Cap the number of options rendered at once (the rest stay searchable —
   * filter-as-you-type across the full list). Use for large sets (sites, etc.)
   * to avoid rendering hundreds of rows. Omit to render every option (cmdk filter).
   */
  limit?: number;
}

/**
 * Combobox (design-system §3.5) — searchable single-select for large option
 * sets (vehicle/driver/site/route pickers). Case-insensitive filter via cmdk;
 * with `limit`, shows the first N and filters the full list as the user types.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Pilih…',
  searchPlaceholder = 'Cari…',
  emptyText = 'Tidak ada opsi',
  disabled,
  error,
  className,
  limit,
}: ComboboxProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const capped = limit != null;

  // Reset the search box each time the popover closes.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const { visible, hiddenCount } = useMemo(() => {
    if (!capped) return { visible: options, hiddenCount: 0 };
    const q = query.trim().toLowerCase();
    const matched = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return { visible: matched.slice(0, limit), hiddenCount: Math.max(0, matched.length - limit) };
  }, [options, query, capped, limit]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-invalid={error || undefined}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-base border bg-neutral-0 px-3 py-2.5 text-body text-neutral-900 transition-[border-color,color] hover:border-neutral-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
          error && 'border-danger-500 focus:border-danger-500',
          !selected && 'text-neutral-400',
          className,
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        align="start"
      >
        <Command shouldFilter={!capped}>
          <CommandInput
            placeholder={searchPlaceholder}
            {...(capped ? { value: query, onValueChange: setQuery } : {})}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {visible.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onValueChange?.(option.value === value ? '' : option.value);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn('h-4 w-4', option.value === value ? 'opacity-100' : 'opacity-0')}
                  aria-hidden
                />
                {option.label}
              </CommandItem>
            ))}
            {hiddenCount > 0 ? (
              <p className="px-2 py-1.5 text-tiny text-neutral-400">
                +{hiddenCount} lainnya — ketik untuk mencari…
              </p>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
