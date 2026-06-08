import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  /** Omit href on the current (last) page. */
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb (design-system §3.20) — e.g. "Master Data / Kendaraan / Ubah".
 * The final item is the current page (aria-current, no link).
 */
export function Breadcrumb({ items, className }: BreadcrumbProps): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-body-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li>
                {item.href && !isLast ? (
                  <Link href={item.href} className="text-primary-700 hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-neutral-600" aria-current={isLast ? 'page' : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden className="text-neutral-400">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/** Re-export the separator glyph for callers composing custom trails. */
export function BreadcrumbSeparator({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <span aria-hidden className="text-neutral-400">
      {children ?? <ChevronRight className="h-3.5 w-3.5" />}
    </span>
  );
}
