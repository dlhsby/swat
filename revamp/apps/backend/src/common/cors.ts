/**
 * Resolves the CORS `origin` option from an optional env value.
 *
 * - unset / blank → `true` (reflect the request origin; convenient in dev and
 *   harmless in prod where Nginx fronts a single same-origin).
 * - comma-separated list → an explicit allowlist (trimmed, blanks dropped).
 *
 * Returning `true` rather than `'*'` keeps `credentials: true` valid (the
 * wildcard origin is forbidden with credentials).
 */
export function resolveCorsOrigin(raw?: string | null): true | string[] {
  if (!raw) {
    return true;
  }
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return origins.length > 0 ? origins : true;
}
