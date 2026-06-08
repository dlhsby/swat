/** Locale configuration. Indonesian-first; en-US scaffolded for later. */
export const locales = ['id-ID', 'en-US'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'id-ID';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
