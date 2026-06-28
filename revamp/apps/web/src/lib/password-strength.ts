/**
 * Password strength scoring for the change-password meter. Five levels
 * (0 = Sangat lemah … 4 = Sangat kuat). The hard backend requirement is ≥12
 * chars with upper, lower, digit, and symbol — exposed as `meetsRequirements`.
 */
export interface PasswordStrength {
  /** 0–4 (very weak → very strong). */
  readonly level: number;
  /** `changePassword` namespace key for the level label. */
  readonly labelKey: string;
  /** Filled segments out of 5. */
  readonly filled: number;
  /** Tailwind background class for the filled segments. */
  readonly colorClass: string;
  /** True when the policy (≥12 chars + all character classes) is satisfied. */
  readonly meetsRequirements: boolean;
}

const LEVEL_LABELS = [
  'strengthVeryWeak',
  'strengthWeak',
  'strengthMedium',
  'strengthStrong',
  'strengthVeryStrong',
] as const;

const LEVEL_COLORS = [
  'bg-danger-500',
  'bg-danger-500',
  'bg-warning-500',
  'bg-info-500',
  'bg-success-500',
] as const;

export function scorePassword(password: string): PasswordStrength {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const checks = [
    password.length >= 8,
    password.length >= 12,
    hasLower && hasUpper,
    hasDigit,
    hasSymbol,
  ];
  const points = checks.filter(Boolean).length;
  const level = password.length === 0 ? 0 : Math.max(0, Math.min(4, points - 1));

  return {
    level,
    labelKey: LEVEL_LABELS[level] ?? LEVEL_LABELS[0],
    filled: password.length === 0 ? 0 : level + 1,
    colorClass: LEVEL_COLORS[level] ?? LEVEL_COLORS[0],
    meetsRequirements: password.length >= 12 && hasLower && hasUpper && hasDigit && hasSymbol,
  };
}
