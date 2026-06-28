import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge taught about SWAT's custom scales so conflicting utilities
 * de-duplicate correctly. Keep both lists in sync with `tailwind.config.ts`.
 *
 * - **`font-size`** — named text sizes (`text-body`, `text-h1`, `text-tiny`, …)
 *   are classified as font-size, not mistaken for text *colors*. Without this,
 *   twMerge treats `text-white text-body-sm` as two "text" utilities and drops
 *   the color, stripping `text-white` from button variants.
 * - **`z-index`** — the named z tokens (`z-raised`, `z-sticky`, …) are classified
 *   as z-index, so `cn('z-raised', 'z-[15]')` keeps only the last. Without this,
 *   both survive and the cascade can pick the wrong one — e.g. a sticky pinned
 *   table header tying with the scrolling header and bleeding through.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['h1', 'h2', 'h3', 'body-lg', 'body', 'body-sm', 'label', 'tiny'] }],
      z: [{ z: ['raised', 'sticky', 'fixed', 'overlay', 'modal', 'popover', 'toast', 'tooltip'] }],
    },
  },
});

/** Merge conditional class names, de-duplicating conflicting Tailwind classes. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
