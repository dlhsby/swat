'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

/**
 * Toast (design-system §3.18) — bottom-right sonner toaster, SWAT-tinted via the
 * token variables. Auto-dismiss success/info 3s, error 5s.
 *
 * Usage: render <Toaster/> once in the app shell; call `notify.success(...)` etc.
 */
export function Toaster(): JSX.Element {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        duration: 3000,
        classNames: {
          toast: 'rounded-base border-l-4 bg-neutral-0 text-neutral-900 shadow-base !text-body-sm',
        },
      }}
    />
  );
}

/** Thin Indonesian-labelled wrapper over sonner's toast API. */
export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { description, duration: 3000 }),
  error: (message: string, description?: string) =>
    toast.error(message, { description, duration: 5000 }),
  warning: (message: string, description?: string) =>
    toast.warning(message, { description, duration: 5000 }),
  info: (message: string, description?: string) =>
    toast.info(message, { description, duration: 3000 }),
};
