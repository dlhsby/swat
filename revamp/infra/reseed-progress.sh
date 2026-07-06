#!/usr/bin/env bash
#
# Live progress monitor for a legacy reseed (see infra/seed-legacy-from-dump.sh).
#
# Reads TRUTH from the target Postgres — per-table row counts vs the full-history dump
# totals (legacy/db/dump/_rowcounts.txt) — so it works regardless of log state, session,
# or a WSL/Docker crash. Re-attach after any interruption and instantly see real progress.
#
# Usage (run from revamp/, where the target Postgres is reachable — e.g. via the SSM tunnel):
#   bash infra/reseed-progress.sh staging              # one-shot snapshot
#   bash infra/reseed-progress.sh staging --watch      # refresh every 30s, showing +deltas
#   bash infra/reseed-progress.sh staging --watch --interval=15
#
# Target URL: STAGING_DATABASE_URL / TARGET_DATABASE_URL wins (the tunnel URL); otherwise it
# is decrypted from infra/env/backend/.env.<env> (needs the dotenvx key). NOTE: pct is measured
# against FULL-history dump totals, so a windowed load (--since-year) plateaus below 100%.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/apps/backend"
ROWCOUNTS="$REPO_ROOT/../legacy/db/dump/_rowcounts.txt"
DOTENVX="$BACKEND_DIR/node_modules/.bin/dotenvx"

TARGET_ENV="staging"
WATCH=""
INTERVAL=30
for arg in "$@"; do
  case "$arg" in
    staging|production) TARGET_ENV="$arg" ;;
    --watch) WATCH=1 ;;
    --interval=*) INTERVAL="${arg#--interval=}" ;;
    *) echo "Unknown argument: $arg (expected staging|production, --watch, --interval=N)" >&2; exit 2 ;;
  esac
done

# ---- Resolve the target Postgres URL (override wins, else decrypt) ----
if [[ "$TARGET_ENV" == "production" ]]; then
  URL="${PROD_DATABASE_URL:-${TARGET_DATABASE_URL:-}}"
else
  URL="${STAGING_DATABASE_URL:-${TARGET_DATABASE_URL:-}}"
fi
if [[ -z "$URL" ]]; then
  URL="$("$DOTENVX" get DATABASE_URL -f "$REPO_ROOT/infra/env/backend/.env.$TARGET_ENV" 2>/dev/null || true)"
fi
[[ "$URL" == postgres* ]] || {
  echo "ERROR: no reachable target DATABASE_URL for $TARGET_ENV." >&2
  echo "       Set ${TARGET_ENV^^}_DATABASE_URL to the tunnel URL (postgresql://…@127.0.0.1:15433/…)." >&2
  exit 1; }

# ---- target Postgres table -> legacy dump table (for the full-history target count) ----
declare -A LEGACY_OF=(
  [transaction_day]=haritransaksi
  [haul]=transaksiangkutsampah
  [haul_assignment]=detailtransaksiangkutsampah
  [trip]=trayek
  [tpa_inbound_log]=sampahmasuktpa
  [disposal_permit]=jatahkitir
)
TABLES=(transaction_day haul haul_assignment trip tpa_inbound_log disposal_permit)

target_for() {
  awk -F'\t' -v t="${LEGACY_OF[$1]}" '$1==t{print $2; f=1} END{if(!f)print 0}' "$ROWCOUNTS"
}

# One-shot count of every table, printed as "table<TAB>count". Run from the backend package so
# `pg` (a backend dependency) resolves.
query_counts() {
  ( cd "$BACKEND_DIR" && PROGRESS_DATABASE_URL="$URL" PROGRESS_TABLES="${TABLES[*]}" node -e '
      const { Client } = require("pg");
      (async () => {
        const c = new Client({ connectionString: process.env.PROGRESS_DATABASE_URL });
        await c.connect();
        for (const t of process.env.PROGRESS_TABLES.split(" ")) {
          const { rows } = await c.query(`SELECT count(*)::bigint AS n FROM "${t}"`);
          console.log(t + "\t" + rows[0].n);
        }
        await c.end();
      })().catch((e) => { console.error(e.message); process.exit(1); });
    ' )
}

declare -A PREV
render() {
  local counts
  if ! counts="$(query_counts 2>&1)"; then
    echo "── reseed progress ($TARGET_ENV) @ $(date '+%H:%M:%S') ── query failed (tunnel down?): $counts"
    return 0
  fi
  echo "── reseed progress ($TARGET_ENV) @ $(date '+%H:%M:%S')  [pct = of full-history dump] ──"
  local tbl n tgt pct delta
  while IFS=$'\t' read -r tbl n; do
    [[ -z "$tbl" ]] && continue
    tgt="$(target_for "$tbl")"
    pct="—"
    [[ "$tgt" -gt 0 ]] && pct="$(awk -v a="$n" -v b="$tgt" 'BEGIN{printf "%.1f%%", (a/b)*100}')"
    delta=""
    [[ -n "${PREV[$tbl]:-}" ]] && delta="  (+$((n - PREV[$tbl])))"
    PREV[$tbl]="$n"
    printf "  %-18s %12s / %-11s %8s%s\n" "$tbl" "$n" "$tgt" "$pct" "$delta"
  done <<< "$counts"
}

if [[ -n "$WATCH" ]]; then
  echo "Watching $TARGET_ENV every ${INTERVAL}s (Ctrl-C to stop)…"
  while true; do render; echo; sleep "$INTERVAL"; done
else
  render
fi
