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
}

export function parseFlags(argv: readonly string[]): Flags {
  const batchArg = argv.find((a) => a.startsWith('--batch='));
  return {
    resume: argv.includes('--resume'),
    forceReset: argv.includes('--force-reset'),
    batchSize: batchArg ? Math.max(1, Number(batchArg.split('=')[1])) : 10_000,
  };
}

export function log(message: string): void {
  // Migration scripts run on a console; timestamped progress is the intended
  // output here (not application logging).
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toISOString()}] ${message}`);
}

export function warn(message: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[${new Date().toISOString()}] WARN ${message}`);
}
