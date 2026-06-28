'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { forwardRef, useState } from 'react';

import { cn } from '@/lib/cn';

import { Input, type InputProps } from './input';

/**
 * PasswordInput — an Input wired to a show/hide toggle (design-system §3.2).
 * Reuses the base Input for styling/validation and overlays an interactive eye
 * button (the Input `trailing` slot is non-interactive by design).
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'type' | 'leading' | 'trailing'>
>(function PasswordInput({ className, ...props }, ref) {
  const t = useTranslations('common');
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center rounded-r-base px-3 text-neutral-400 transition-colors hover:text-neutral-600 focus-visible:text-neutral-600 focus-visible:outline-none"
      >
        {visible ? (
          <EyeOff className="h-[18px] w-[18px]" aria-hidden />
        ) : (
          <Eye className="h-[18px] w-[18px]" aria-hidden />
        )}
      </button>
    </div>
  );
});
