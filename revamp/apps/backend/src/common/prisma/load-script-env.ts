/**
 * Loads the database env vars for standalone CLI scripts (seed runs through the
 * Prisma CLI which loads `prisma.config.ts`, but `ts-node` scripts do not, and
 * Prisma 7 no longer auto-loads `.env`). Best-effort: missing files are ignored.
 * Call this BEFORE constructing a PrismaClient so the pg adapter sees DATABASE_URL.
 */
export function loadScriptEnv(): void {
  const load = (process as NodeJS.Process & { loadEnvFile?: (path: string) => void }).loadEnvFile;
  if (typeof load !== 'function') {
    return;
  }
  for (const path of ['prisma/.env', '.env.local', '.env']) {
    try {
      load(path);
    } catch {
      /* file may not exist — ignore */
    }
  }
}
