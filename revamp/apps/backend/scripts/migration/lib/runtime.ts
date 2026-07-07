/**
 * Runtime glue for the migration scripts: legacy MySQL connection, a typed query
 * helper, CLI-flag parsing, and a tiny timestamped logger. Kept apart from the
 * pure libs so those stay DB-free and unit-testable.
 *
 * NOTE: the live run requires a reachable legacy MySQL and the target PostgreSQL
 * (Docker is unavailable in the dev environment, so end-to-end execution is the
 * operator's on-prem step — see scripts/migration/README.md).
 */
import * as mysql from 'mysql2/promise';

export interface LegacyDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function legacyDbConfigFromEnv(): LegacyDbConfig {
  const required = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required env var ${key} (legacy MySQL connection).`);
    }
    return value;
  };
  return {
    host: required('LEGACY_DB_HOST'),
    port: Number(process.env.LEGACY_DB_PORT ?? 3306),
    user: required('LEGACY_DB_USER'),
    password: process.env.LEGACY_DB_PASSWORD ?? '',
    database: required('LEGACY_DB_NAME'),
  };
}

export function connectLegacy(config: LegacyDbConfig): Promise<mysql.Connection> {
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    dateStrings: true, // keep legacy 0000-00-00 intact for fixDate() to handle
    supportBigNumbers: true,
  });
}

export async function query<T>(
  conn: mysql.Connection,
  sql: string,
  params: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  const [rows] = await conn.query(sql, params as unknown[]);
  return rows as T[];
}

export async function countRows(conn: mysql.Connection, table: string): Promise<number> {
  const rows = await query<{ cnt: number }>(conn, `SELECT COUNT(*) AS cnt FROM \`${table}\``);
  return Number(rows[0]?.cnt ?? 0);
}

export interface Flags {
  resume: boolean;
  forceReset: boolean;
  batchSize: number;
  /** Load the high-volume transactional history (staging/production only). */
  includeTransactions: boolean;
  /** Required acknowledgement for the production target (guards seed:production). */
  confirmProduction: boolean;
  /**
   * Only load date-scoped data from this year onward (`--since-year=2025`) —
   * windows TransactionDay/Haul/HaulAssignment/Trip + DisposalPermit
   * so a constrained target (e.g. AWS free-tier RDS) holds a recent subset. Null =
   * all history. Masters are always loaded in full.
   */
  sinceYear: number | null;
  /**
   * Run ONLY the transactional phase (skip master/auth/scheduling/aggregate/route
   * loading) — for resuming a transactional load whose masters are already in place
   * (e.g. a fragile over-tunnel staging load continued with `--resume`). Implies
   * `--include-transactions`.
   */
  transactionsOnly: boolean;
  /**
   * Skip the route-corridor backfill (`--skip-corridors`). The backfill needs Site
   * lat/lng to snap corridors; when those are absent it is a no-op that still fires
   * ~17k Google Directions calls, so skipping it speeds up a master reseed.
   */
  skipCorridors: boolean;
}

export function parseFlags(argv: readonly string[]): Flags {
  const batchArg = argv.find((a) => a.startsWith('--batch='));
  const sinceArg = argv.find((a) => a.startsWith('--since-year='));
  const sinceYear = sinceArg ? Number(sinceArg.split('=')[1]) : NaN;
  const transactionsOnly = argv.includes('--transactions-only');
  return {
    resume: argv.includes('--resume'),
    forceReset: argv.includes('--force-reset'),
    batchSize: batchArg ? Math.max(1, Number(batchArg.split('=')[1])) : 10_000,
    includeTransactions: argv.includes('--include-transactions') || transactionsOnly,
    confirmProduction: argv.includes('--confirm-production'),
    sinceYear: Number.isInteger(sinceYear) && sinceYear > 2000 ? sinceYear : null,
    transactionsOnly,
    skipCorridors: argv.includes('--skip-corridors'),
  };
}

export function log(message: string): void {
  // Migration scripts run on a console; timestamped progress is the intended
  // output here (not application logging).

  console.log(`[${new Date().toISOString()}] ${message}`);
}

export function warn(message: string): void {
  console.warn(`[${new Date().toISOString()}] WARN ${message}`);
}

/**
 * Throttled per-stage progress reporter for the high-volume keyset loops. Returns a
 * function to call each batch with the running count (+ optional last keyset id); it
 * emits a `<label>: N so far (last id X)…` line only when the count crosses the next
 * `everyRows` boundary, so a durable log shows continuous movement without one line
 * per 10k-row batch.
 */
export function progressLogger(
  label: string,
  everyRows = 50_000,
): (count: number, lastId?: number | bigint) => void {
  let nextThreshold = everyRows;
  return (count, lastId) => {
    if (count < nextThreshold) return;
    log(
      `${label}: ${count.toLocaleString('en-US')} so far${lastId != null ? ` (last id ${lastId})` : ''}…`,
    );
    nextThreshold = (Math.floor(count / everyRows) + 1) * everyRows;
  };
}
