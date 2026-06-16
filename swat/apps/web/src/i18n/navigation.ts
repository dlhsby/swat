import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Locale-aware navigation primitives. Every internal link/redirect goes through
 * these so the active `[locale]` prefix is preserved automatically. (next-intl v4
 * replaced `createSharedPathnamesNavigation` with `createNavigation`.)
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
