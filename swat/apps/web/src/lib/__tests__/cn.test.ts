import { describe, expect, it } from 'vitest';

import { cn } from '../cn';

describe('cn', () => {
  // Regression: twMerge must treat SWAT's named font sizes (`text-body-sm`,
  // `text-h1`, …) as font-size, not as text colors — otherwise it strips a real
  // color like `text-white` that precedes the size, leaving buttons with green
  // backgrounds and inherited dark text.
  it('keeps a text color when a named font-size class follows it', () => {
    expect(cn('bg-primary-700 text-white text-body-sm')).toContain('text-white');
    expect(cn('text-white text-body')).toContain('text-white');
    expect(cn('bg-danger-600 text-white text-label')).toContain('text-white');
  });

  it('still de-duplicates conflicting font sizes (last wins)', () => {
    const out = cn('text-body-sm text-h1');
    expect(out).toContain('text-h1');
    expect(out).not.toContain('text-body-sm');
  });

  it('still de-duplicates conflicting text colors (last wins)', () => {
    const out = cn('text-white text-neutral-600');
    expect(out).toContain('text-neutral-600');
    expect(out).not.toContain('text-white');
  });
});
