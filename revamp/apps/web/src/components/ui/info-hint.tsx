'use client';

import { CircleHelp } from 'lucide-react';
import { type ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface InfoHintProps {
  /** The explanatory text shown on hover/focus. */
  label: ReactNode;
  /** Accessible name for the trigger button (defaults to "Penjelasan"). */
  srLabel?: string;
}

/**
 * A small "(?)" help icon that reveals a short explanation on hover/focus —
 * for jargon a user shouldn't be expected to know (e.g. "Ambang", "Debounce").
 * Self-contained (bundles its own TooltipProvider) so it works anywhere without
 * a global provider, and is keyboard-focusable for a11y.
 */
export function InfoHint({ label, srLabel = 'Penjelasan' }: InfoHintProps): JSX.Element {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="inline-flex text-neutral-400 transition-colors hover:text-neutral-600 focus-visible:text-neutral-600"
          aria-label={srLabel}
        >
          <CircleHelp className="h-3.5 w-3.5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
