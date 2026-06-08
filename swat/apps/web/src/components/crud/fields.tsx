'use client';

import { type ReactNode } from 'react';

import {
  DatePicker,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
          <Select
            value={field.value != null && field.value !== '' ? String(field.value) : undefined}
            onValueChange={(v) => field.onChange(numeric ? Number(v) : v)}
            disabled={disabled}
          >
            <SelectTrigger error={Boolean(fieldState.error)}>
              <SelectValue placeholder={placeholder ?? '—'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <DatePicker
            value={(field.value as string | undefined) ?? undefined}
            onValueChange={(v) => field.onChange(v ?? '')}
            error={Boolean(fieldState.error)}
          />
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
          <TimePicker
            value={(field.value as string | undefined) ?? ''}
            onValueChange={(v) => field.onChange(v)}
            presets={presets}
            error={Boolean(fieldState.error)}
          />
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
