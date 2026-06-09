import { cn } from '@/lib/cn';

/**
 * SWAT brand mark — emerald rounded-square with the white leaf glyph.
 * Inlined (not an <img>) so it scales crisply and inherits sizing via className.
 * Decorative by default; pass `title` to expose an accessible label.
 */
export function BrandMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('block h-full w-full', className)}
    >
      <rect width="256" height="256" rx="58" fill="#047857" />
      <g transform="rotate(-20 128 128)">
        <path d="M128 40 C 184 88, 184 158, 128 214 C 72 158, 72 88, 128 40 Z" fill="#ffffff" />
        <path d="M128 214 L128 232" stroke="#047857" strokeWidth="7" strokeLinecap="round" />
        <path d="M128 58 L128 206" stroke="#047857" strokeWidth="6.5" strokeLinecap="round" />
        <path
          d="M128 100 L101 80 M128 100 L155 80 M128 132 L97 114 M128 132 L159 114 M128 164 L102 149 M128 164 L154 149"
          stroke="#047857"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
