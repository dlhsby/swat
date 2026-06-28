import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, isLocale } from './config';

/**
 * Per-request i18n config consumed by the next-intl plugin. Loads the message
 * bundle for the active locale, falling back to the default locale.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
