import { cn } from '@/lib/cn';

/** Names map 1:1 to files in /public/illustrations. */
export type IllustrationName =
  | 'empty'
  | 'error'
  | 'loading'
  | 'login'
  | 'maintenance'
  | 'no-access'
  | 'no-results'
  | 'not-found'
  | 'offline'
  | 'server-error'
  | 'success';

interface IllustrationProps {
  readonly name: IllustrationName;
  readonly size?: number;
  readonly className?: string;
}

/**
 * Decorative spot illustration. Rendered via <img> from /public/illustrations,
 * marked aria-hidden (purely decorative), with a subtle brightness lift in dark
 * mode so the emerald artwork stays legible on dark surfaces.
 */
export function Illustration({ name, size = 200, className }: IllustrationProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/illustrations/${name}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={cn('select-none dark:brightness-110 dark:contrast-95', className)}
    />
  );
}
