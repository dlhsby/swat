/**
 * T-151 — Migration discovery (READ-ONLY). Profiles the legacy MySQL database so
 * the team can size partitions, archive windows, and cutover timing before any
 * write. Produces `reports/migration-discovery-report.{json,md}`.
 *
 * Run (operator, on-prem — needs a reachable legacy MySQL):
 *   LEGACY_DB_HOST=… LEGACY_DB_USER=… LEGACY_DB_NAME=dkp_swat \
 *     pnpm --filter @swat/backend run migrate:discovery
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { connectLegacy, countRows, legacyDbConfigFromEnv, log, query } from './lib/runtime';

const TRANSACTIONAL = [
  { table: 'trayek', dateExpr: 'DATE(TRAYEK_WAKTUTARGET)' },
  { table: 'transaksiangkutsampah', dateExpr: null },
  { table: 'detailtransaksiangkutsampah', dateExpr: null },
  { table: 'sampahmasuktpa', dateExpr: 'FROM_UNIXTIME(tgl)' },
  { table: 'jatahkitir', dateExpr: 'JATAHKITIR_MASABERLAKUAWAL' },
  { table: 'haritransaksi', dateExpr: 'HARITRANSAKSI_TANGGAL' },
] as const;

const ALL_TABLES = [
  'aplikasikendaraan',
  'bahanbakar',
  'kategoribahanbakar',
  'sim',
  'spot',
  'rute',
  'kategorisumbersampah',
  'kategorikendaraan',
  'kendaraan',
  'kategorisumbersampahkendaraan',
  'pengemudi',
  'kepemilikansim',
  'hakakses',
  'pengguna',
  'masterdetailtransaksiangkutsampah',
  'mastertrayek',
  'jatahkitir',
  'haritransaksi',
  'transaksiangkutsampah',
  'detailtransaksiangkutsampah',
  'trayek',
  'sampahmasuktpa',
  'tonase',
  'retribusi',
  'konversi_si_swat',
  'riwayatperawatan',
  'detailriwayatperawatan',
];

interface DiscoveryReport {
  generatedAt: string;
  database: string;
  tableCounts: Record<string, number>;
  perYear: Record<string, Record<string, number>>;
  dataQuality: Record<string, number>;
  imageColumns: Record<string, number>;
}

async function main(): Promise<void> {
  const config = legacyDbConfigFromEnv();
  const conn = await connectLegacy(config);
  log(`Connected to legacy MySQL ${config.database} for read-only discovery.`);

  const report: DiscoveryReport = {
    generatedAt: new Date().toISOString(),
    database: config.database,
    tableCounts: {},
    perYear: {},
    dataQuality: {},
    imageColumns: {},
  };

  for (const table of ALL_TABLES) {
    try {
      report.tableCounts[table] = await countRows(conn, table);
    } catch {
      report.tableCounts[table] = -1; // table absent in this snapshot
    }
    log(`count ${table} = ${report.tableCounts[table]}`);
  }

  // Per-year row counts for the high-volume transactional tables.
  for (const { table, dateExpr } of TRANSACTIONAL) {
    if (!dateExpr) {
      continue;
    }
    try {
      const rows = await query<{ yr: number; cnt: number }>(
        conn,
        `SELECT YEAR(${dateExpr}) AS yr, COUNT(*) AS cnt FROM \`${table}\` GROUP BY yr ORDER BY yr`,
      );
      report.perYear[table] = Object.fromEntries(rows.map((r) => [String(r.yr), Number(r.cnt)]));
    } catch {
      report.perYear[table] = {};
    }
  }

  // Data-quality scans (counts + presence).
  report.dataQuality = {
    spotZeroGps: await scalar(
      conn,
      `SELECT COUNT(*) AS c FROM spot WHERE SPOT_LATITUDE = 0 AND SPOT_LONGITUDE = 0`,
    ),
    vehicleBogusYear: await scalar(
      conn,
      `SELECT COUNT(*) AS c FROM kendaraan WHERE KENDARAAN_TAHUNPEMBUATAN < 1960`,
    ),
    duplicateRoutes: await scalar(
      conn,
      `SELECT COUNT(*) AS c FROM (SELECT 1 FROM rute GROUP BY SPOT_ASAL_ID, SPOT_TUJUAN_ID, KATEGORIRUTE_ID HAVING COUNT(*) > 1) t`,
    ),
    md5Passwords: await scalar(conn, `SELECT COUNT(*) AS c FROM pengguna`),
  };

  // Image inventory proxy (filesystem not reachable from here): non-null path columns.
  report.imageColumns = {
    penggunaFoto: await scalar(
      conn,
      `SELECT COUNT(*) AS c FROM pengguna WHERE PENGGUNA_FOTO IS NOT NULL AND PENGGUNA_FOTO <> ''`,
    ),
    spotFoto: await scalar(
      conn,
      `SELECT COUNT(*) AS c FROM spot WHERE SPOT_FOTO IS NOT NULL AND SPOT_FOTO <> ''`,
    ),
    pengemudiFoto: await scalar(
      conn,
      `SELECT COUNT(*) AS c FROM pengemudi WHERE PENGEMUDI_FOTO IS NOT NULL AND PENGEMUDI_FOTO <> ''`,
    ),
    dokumentasiKendaraan: await safeCount(conn, 'dokumentasikendaraan'),
    dokumentasiTrayek: await safeCount(conn, 'dokumentasitrayek'),
  };

  await conn.end();

  const dir = join(__dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'migration-discovery-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  writeFileSync(join(dir, 'migration-discovery-report.md'), renderMarkdown(report));
  log(`Discovery report written to ${dir}`);
}

async function scalar(conn: Parameters<typeof query>[0], sql: string): Promise<number> {
  try {
    const rows = await query<{ c: number }>(conn, sql);
    return Number(rows[0]?.c ?? 0);
  } catch {
    return -1;
  }
}

async function safeCount(conn: Parameters<typeof countRows>[0], table: string): Promise<number> {
  try {
    return await countRows(conn, table);
  } catch {
    return -1;
  }
}

function renderMarkdown(r: DiscoveryReport): string {
  const lines = [
    '# Migration discovery report',
    '',
    `- **Generated:** ${r.generatedAt}`,
    `- **Database:** ${r.database}`,
    '',
    '## Table row counts',
    '',
    '| Table | Rows |',
    '|-------|-----:|',
  ];
  for (const [t, c] of Object.entries(r.tableCounts)) {
    lines.push(`| ${t} | ${c === -1 ? 'absent' : c} |`);
  }
  lines.push('', '## Data-quality flags', '');
  for (const [k, v] of Object.entries(r.dataQuality)) {
    lines.push(`- **${k}:** ${v}`);
  }
  lines.push('', '## Image path inventory (filesystem reconciled separately)', '');
  for (const [k, v] of Object.entries(r.imageColumns)) {
    lines.push(`- **${k}:** ${v}`);
  }
  return `${lines.join('\n')}\n`;
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
