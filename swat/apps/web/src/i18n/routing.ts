import { defineRouting } from 'next-intl/routing';

import { defaultLocale, locales } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  // Indonesian-first: don't let the browser Accept-Language header steer the
  // root redirect to en-US. `/` always resolves to `defaultLocale` (id-ID).
  localeDetection: false,
});
