/**
 * Role-indicating avatar tones. Each role maps deterministically to one tone so
 * the initials chip has a distinct background + ring per role.
 *
 * Dark-mode-safe: the semantic ramps invert their `-700` to a bright shade in
 * `.dark`, so `bg-{tone}-100 text-{tone}-700` reads in both modes. The explicit
 * `dark:text-{tone}-700` neutralises the AvatarFallback default's
 * `dark:text-primary-400` (which would otherwise win in dark mode). Primary is
 * intentionally excluded (its `-700` does NOT flip bright in dark).
 */
const TONES = ['info', 'success', 'warning', 'danger', 'neutral'] as const;

const TONE_CLASSES: Record<(typeof TONES)[number], string> = {
  info: 'bg-info-100 text-info-700 dark:text-info-700 ring-info-500',
  success: 'bg-success-100 text-success-700 dark:text-success-700 ring-success-500',
  warning: 'bg-warning-100 text-warning-700 dark:text-warning-700 ring-warning-500',
  danger: 'bg-danger-100 text-danger-700 dark:text-danger-700 ring-danger-500',
  neutral: 'bg-neutral-200 text-neutral-700 dark:text-neutral-700 ring-neutral-400',
};

/** Deterministic tone classes from a seed (role name) — same role, same colour. */
export function avatarToneClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const tone = TONES[Math.abs(hash) % TONES.length] ?? 'neutral';
  return TONE_CLASSES[tone];
}
