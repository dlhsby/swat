import { Check } from 'lucide-react';
import { Fragment } from 'react';

import { cn } from '@/lib/cn';

export interface Step {
  label: string;
}

export interface StepperProps {
  steps: Step[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
}

/**
 * Stepper / Steps (design-system §3.25) — multi-step transaction forms.
 * done = primary-700 + check · active = ringed primary-50 · upcoming = neutral.
 * On mobile, collapses to "Langkah n dari m".
 */
export function Stepper({ steps, current, className }: StepperProps): JSX.Element {
  return (
    <div className={className}>
      {/* Mobile: compact label */}
      <p className="text-body-sm font-medium text-neutral-700 sm:hidden" aria-hidden>
        Langkah {Math.min(current + 1, steps.length)} dari {steps.length}
      </p>

      {/* Desktop: full node + connector trail */}
      <ol className="hidden items-center sm:flex" role="list">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <Fragment key={step.label}>
              <li className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-tiny font-semibold',
                    done && 'bg-primary-700 text-white',
                    active && 'bg-primary-50 text-primary-700 ring-2 ring-primary-600',
                    !done && !active && 'bg-neutral-100 text-neutral-400',
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-body-sm',
                    active ? 'font-semibold text-primary-700' : 'text-neutral-600',
                    !done && !active && 'text-neutral-400',
                  )}
                >
                  {step.label}
                </span>
              </li>
              {i < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn('mx-3 h-0.5 flex-1', done ? 'bg-primary-600' : 'bg-neutral-200')}
                />
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
