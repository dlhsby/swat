import { type ConfigCatalogEntry } from './system-config.catalog';

/** Sentinel row marking that the one-time env→DB preseed already ran (per DB). */
export const PRESEED_MARKER = '__preseeded__';

/** A `system_config` row to insert during preseed (value already encrypted if secret). */
export interface ConfigPreseedRow {
  readonly key: string;
  readonly value: string;
  readonly isSecret: boolean;
  readonly valueType: string;
  readonly group: string;
}

export interface BuildPreseedOptions {
  /** Read the current value of an env var (returns undefined when unset). */
  readonly readEnv: (envKey: string) => unknown;
  /** Encrypt a secret plaintext to its at-rest form. */
  readonly encrypt: (plaintext: string) => string;
  /** Whether encryption is available (secrets are skipped when false). */
  readonly canEncrypt: boolean;
  /** True when a key already has a DB override (skip it). Defaults to never. */
  readonly isOverridden?: (key: string) => boolean;
}

/**
 * Build the env→DB preseed rows for a config catalog. Pure and side-effect free so
 * both the boot service (reads via AppConfigService, encrypts via EncryptionService)
 * and the standalone Prisma seed (reads `process.env`) share one implementation.
 * Skips: already-overridden keys, secrets when encryption is unavailable, and
 * empty/unset env values.
 */
export function buildConfigPreseedRows(
  catalog: readonly ConfigCatalogEntry[],
  opts: BuildPreseedOptions,
): ConfigPreseedRow[] {
  const rows: ConfigPreseedRow[] = [];
  for (const entry of catalog) {
    if (opts.isOverridden?.(entry.key)) continue;
    if (entry.isSecret && !opts.canEncrypt) continue;
    const envValue = opts.readEnv(entry.envKey);
    if (envValue === undefined || envValue === null || envValue === '') continue;
    const str = String(envValue);
    rows.push({
      key: entry.key,
      value: entry.isSecret ? opts.encrypt(str) : str,
      isSecret: entry.isSecret,
      valueType: entry.valueType,
      group: entry.group,
    });
  }
  return rows;
}
