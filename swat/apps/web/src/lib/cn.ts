import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge taught about SWAT's custom `fontSize` scale so named text sizes
 * (`text-body`, `text-body-sm`, `text-h1`, `text-label`, `text-tiny`, …) are
 * classified as font-size — not mistaken for text *colors*. Without this, twMerge
 * treats e.g. `text-white text-body-sm` as two conflicting "text" utilities and
 * drops the color, silently stripping `text-white` from button variants (green
 * background, inherited dark text). Keep this list in sync with tailwind.config.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['h1', 'h2', 'h3', 'body-lg', 'body', 'body-sm', 'label', 'tiny'] }],
    },
  },
});

/** Merge conditional class names, de-duplicating conflicting Tailwind classes. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
