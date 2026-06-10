'use client';

import { type ReactNode } from 'react';

import {
  Combobox,
  DatePicker,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumberInput,
  Switch,
  Textarea,
  TimePicker,
} from '@/components/ui';

interface BaseProps {
  name: string;
  label: string;
  required?: boolean;
  description?: ReactNode;
}

export function TextField({
  name,
  label,
  required,
  description,
  placeholder,
  type = 'text',
}: BaseProps & { placeholder?: string; type?: string }): JSX.Element {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              value={(field.value as string | undefined) ?? ''}
              error={Boolean(fieldState.error)}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function NumberField({
  name,
  label,
  required,
  description,
  unit,
  min,
  max,
  placeholder,
}: BaseProps & {
  unit?: ReactNode;
  min?: number;
  max?: number;
  placeholder?: string;
}): JSX.Element {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <NumberInput
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={(field.value as number | undefined) ?? ''}
              // Clearing the input yields NaN → store undefined so the field can
              // be emptied (NumberInput only fires onValueChange for real numbers).
              onChange={(e) => {
                if (e.target.value === '') {
                  field.onChange(undefined);
                }
              }}
              onValueChange={(v) => field.onChange(Number.isNaN(v) ? undefined : v)}
              unit={unit}
              min={min}
              max={max}
              placeholder={placeholder}
              error={Boolean(fieldState.error)}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export function SelectField({
  name,
  label,
  required,
  description,
  options,
  placeholder,
  numeric = false,
  disabled,
}: BaseProps & {
  options: readonly SelectOption[];
  placeholder?: string;
  numeric?: boolean;
  disabled?: boolean;
}): JSX.Element {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          {/* Searchable combobox: long option sets (vehicle type, fuel, pool…)
              get type-to-search. A `0`/'' FK value means "nothing chosen yet". */}
          <Combobox
            options={options.map((o) => ({ value: String(o.value), label: o.label }))}
            value={
              field.value != null && field.value !== '' && field.value !== 0
                ? String(field.value)
                : ''
            }
            onValueChange={(v) => field.onChange(numeric ? Number(v) : v)}
            placeholder={placeholder ?? '—'}
            error={Boolean(fieldState.error)}
            disabled={disabled}
          />
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function DateField({ name, label, required, description }: BaseProps): JSX.Element {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <DatePicker
              value={(field.value as string | undefined) ?? undefined}
              onValueChange={(v) => field.onChange(v ?? '')}
              error={Boolean(fieldState.error)}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TimeField({
  name,
  label,
  required,
  description,
  presets = false,
}: BaseProps & { presets?: boolean }): JSX.Element {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <TimePicker
              value={(field.value as string | undefined) ?? ''}
              onValueChange={(v) => field.onChange(v)}
              presets={presets}
              error={Boolean(fieldState.error)}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextareaField({
  name,
  label,
  required,
  description,
  placeholder,
}: BaseProps & { placeholder?: string }): JSX.Element {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              placeholder={placeholder}
              value={(field.value as string | undefined) ?? ''}
              error={Boolean(fieldState.error)}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SwitchField({
  name,
  label,
  description,
}: Omit<BaseProps, 'required'>): JSX.Element {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <FormLabel>{label}</FormLabel>
            {description ? <FormDescription>{description}</FormDescription> : null}
          </div>
          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
        </FormItem>
      )}
    />
  );
}
