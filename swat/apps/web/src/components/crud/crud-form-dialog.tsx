'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect } from 'react';
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
  useForm,
} from 'react-hook-form';
import { type ZodType } from 'zod';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
} from '@/components/ui';
import { type ResourceManager } from '@/hooks/use-resource-manager';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/cn';

export interface CrudFormDialogProps<T, F extends FieldValues> {
  manager: ResourceManager<T>;
  schema: ZodType<F>;
  defaults: DefaultValues<F>;
  /** Map the record being edited to form values. */
  toForm: (row: T) => F;
  /** Transform form values into the request body (e.g. strip create-only fields on edit). */
  buildPayload?: (values: F, isEdit: boolean) => Record<string, unknown>;
  title: { create: string; edit: string };
  /** The field components (read RHF context). */
  children: ReactNode;
  className?: string;
}

/**
 * Create/edit dialog hosting a react-hook-form + Zod form. Resets to the edited
 * record (or defaults) whenever it opens; submits through the resource manager,
 * which closes the dialog on success and keeps it open (toast) on error.
 */
export function CrudFormDialog<T, F extends FieldValues>({
  manager,
  schema,
  defaults,
  toForm,
  buildPayload,
  title,
  children,
  className,
}: CrudFormDialogProps<T, F>): JSX.Element {
  const t = useTranslations('crud');
  const form = useForm<F>({
    // The resolver package's zod typing skews against our generic ZodType<F>;
    // the runtime contract (schema validates F) is sound, so coerce the type.
    resolver: zodResolver(schema as never) as Resolver<F>,
    defaultValues: defaults,
  });

  const { dialogOpen, editing } = manager;
  useEffect(() => {
    if (dialogOpen) {
      form.reset(editing ? toForm(editing) : defaults);
    }
    // form/defaults/toForm are stable for the page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editing]);

  const onSubmit = async (values: F): Promise<void> => {
    try {
      const payload = buildPayload
        ? buildPayload(values, Boolean(editing))
        : (values as Record<string, unknown>);
      await manager.submit(payload);
    } catch (err) {
      // The manager already toasts; additionally map server field errors (422)
      // onto the form so they show inline. Dialog stays open on failure.
      if (err instanceof ApiError && err.details) {
        for (const [field, messages] of Object.entries(err.details)) {
          form.setError(field as Path<F>, { message: messages.join(' ') });
        }
      }
    }
  };

  const heading = editing ? title.edit : title.create;

  return (
    <Dialog open={dialogOpen} onOpenChange={manager.setDialogOpen}>
      <DialogContent className={cn('max-w-[600px]', className)}>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription className="sr-only">{heading}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-0.5">{children}</div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => manager.setDialogOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" loading={manager.saving}>
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
