'use client';

import { Slot } from '@radix-ui/react-slot';
import { createContext, forwardRef, type HTMLAttributes, useContext, useId } from 'react';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';

import { Label } from './label';

import { cn } from '@/lib/cn';

/**
 * Form (design-system §3.9) — react-hook-form bindings. <FormField> wires a
 * control to its <FormLabel>/<FormControl>/<FormDescription>/<FormMessage>,
 * threading aria-describedby + aria-invalid for accessibility.
 */
export const Form = FormProvider;

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);
const FormItemContext = createContext<{ id: string } | null>(null);

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>): JSX.Element {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error('useFormField must be used within a <FormField>');
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const id = itemContext?.id ?? fieldContext.name;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-control`,
    formDescriptionId: `${id}-description`,
    formMessageId: `${id}-message`,
    ...fieldState,
  };
}

export const FormItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function FormItem({ className, ...props }, ref) {
    const id = useId();
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
      </FormItemContext.Provider>
    );
  },
);

export const FormLabel = forwardRef<
  HTMLLabelElement,
  HTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(function FormLabel({ className, ...props }, ref) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      ref={ref}
      htmlFor={formItemId}
      className={cn(error && 'text-danger-700', className)}
      {...props}
    />
  );
});

export const FormControl = forwardRef<HTMLElement, { children: React.ReactNode }>(
  function FormControl({ ...props }, ref) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return (
      <Slot
        ref={ref as React.Ref<HTMLElement>}
        id={formItemId}
        aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
        aria-invalid={!!error}
        {...props}
      />
    );
  },
);

export const FormDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function FormDescription({ className, ...props }, ref) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-tiny text-neutral-500', className)}
      {...props}
    />
  );
});

export const FormMessage = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function FormMessage({ className, children, ...props }, ref) {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error.message ?? '') : children;
    if (!body) return null;
    return (
      <p
        ref={ref}
        id={formMessageId}
        className={cn('text-tiny text-danger-600', className)}
        {...props}
      >
        {body}
      </p>
    );
  },
);
