import { createSharedPathnamesNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Locale-aware navigation primitives. Every internal link/redirect goes through
 * these so the active `[locale]` prefix is preserved automatically.
 */
export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation(routing);
