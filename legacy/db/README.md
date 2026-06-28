# Legacy SWAT DB Backup (`dkp_swat`)

Batch-script backup of the legacy MySQL/MariaDB (XAMPP) database, run on the server via RDP.
Modeled on the old phpMyAdmin dumps in `../../old_swat/db_backup/`: one **structure** file +
**per-table data** files. The big tables can optionally be **split per year** (opt-in) so future
re-backups only need the current year.

## Files

| File | Purpose |
|------|---------|
| `backup_swat.bat` | Dump structure + per-table data (+ optional per-year split for big tables). |
| `restore_swat.bat` | Restore a full dump, or load a single file (e.g. one year). |
| `verify_counts.bat` | Exact `COUNT(*)` per table from the live DB (ground truth). |

Everything lands in a `dump\` subfolder next to the scripts.

---

## What the backup produces

```
dump\
  _structure.sql              DROP+CREATE for ALL tables + every procedure,
                              function, trigger and event (single file)
  _rowcounts.txt              per-table row count + size (reference)
  aplikasikendaraan.sql       full data for each normal table
  kendaraan.sql
  ...
  trayek.2018.sql             big tables -> one file per year
  trayek.2019.sql
  ...
  trayek.others.sql           rows with no / zero / orphan date (nothing lost)
  transaksiangkutsampah.2026.sql
  ...
```

### Design choices (and why)

- **Structure is one file** with `DROP TABLE IF EXISTS` + `CREATE TABLE`, plus all routines /
  triggers / events (`--routines --events --triggers`). `--databases` adds `CREATE DATABASE` +
  `USE`, exactly like the reference dump. Restoring it gives a clean, complete schema.
- **Data is one file per table** (`--no-create-info`), so a table can be reloaded on its own.
- **Per-year split is OPT-IN.** By default every table is dumped whole (one file each). Year
  splitting only happens in `split` / `current` / `<year>` modes, and applies to five big tables,
  bucketed by their **realisasi** (actual-event) date — not the target/planned date, which is
  often `0000-00-00`:

  | Table | Year comes from (realisasi) |
  |-------|-----------------------------|
  | `trayek` | own `TRAYEK_WAKTUREALISASI` |
  | `detailtransaksiangkutsampah` | own `..._REKAPWAKTUREALISASIBERANGKATKANDANG` |
  | `jatahkitir` | own `JATAHKITIR_WAKTUDITERBITKAN` (permit issue date; no realisasi field) |
  | `transaksiangkutsampah` | parent `haritransaksi.HARITRANSAKSI_TANGGAL` |
  | `dokumentasitrayek` | parent `trayek.TRAYEK_WAKTUREALISASI` |

  Years are discovered automatically from the data, and a `*.others.sql` file captures any row
  whose date is NULL/`0000-00-00`/orphaned — so **the year files + others = the whole table**,
  nothing is dropped or duplicated. (Fields are editable at the top of `backup_swat.bat`.)
- **`REPLACE INTO`** (not `INSERT`): reloading a file overwrites rows by primary key. This is the
  "restore with replace" workflow — re-dump just the current year and reload it.
- **`latin1`** charset (the DB's real charset, confirmed: `latin1_swedish_ci`) → a byte-faithful
  copy. Convert to UTF-8 later at migration time, not here.
- **`--single-transaction`** → consistent, non-locking InnoDB snapshot; safe while the app is
  live. (`konversi_si_swat` and `sampahmasuktpa` are MyISAM and can't be snapshotted; they dump
  as-is — both are tiny.)

---

## Prerequisite — 7-Zip (for compression, on by default)

`COMPRESS=1` is the default so files transfer small over FileZilla. It needs 7-Zip:

1. Download the **7-Zip installer** from <https://www.7-zip.org/download.html> (32-bit `.exe`
   works on Server 2008).
2. Copy it to the server (FileZilla/RDP) and install — it lands at
   `C:\Program Files\7-Zip\7z.exe`, which is the path the scripts already use.

If 7-Zip is missing the backup still runs but stays plain `.sql` (with a notice). To skip
compression entirely, set `COMPRESS=0`.

## Step 1 — Back up (on the server)

Put `backup_swat.bat` in a folder with ≥ 3 GB free and run one of:

```bat
backup_swat.bat            REM FULL backup, NO split - every table one file (simple default)
backup_swat.bat split      REM FULL backup, big tables split into per-year files
backup_swat.bat current    REM master tables + only THIS year's slice of the big tables
backup_swat.bat 2026       REM master tables + only year 2026
```

Press Enter for user (`root`) and Enter for the blank XAMPP password (or type `AdminDKP`).

- **FULL (default)** writes `_structure.sql` + every table whole. Simplest and safest — start here.
- **SPLIT** is the same but slices the 5 big tables into per-year files (+ `*.others.sql`).
- **YEAR** (`current` / `2026`) skips `_structure.sql` (restoring structure would drop tables)
  and dumps the master tables + only that year's slice of the big tables — the fast recurring
  refresh.

> Note: splitting scans each big table once per year, so `split` mode on `trayek` (1.1 GB) takes
> a few minutes; a single-year run is much quicker. Plain FULL is one streamed pass per table.

---

## Step 2 — Transfer to your PC

Use **FileZilla** over the VPN (you already have it). Pull the whole `dump\` folder; enable
**resume** on transfer conflicts so a WiFi drop continues instead of restarting. With the
default `COMPRESS=1` the files are already gzipped (`.sql.gz`), so the transfer is small.

---

## Step 3 — Restore

Full restore into a target XAMPP/MySQL:
```bat
restore_swat.bat
```
(loads `_structure.sql` first, then every data file; data files disable FK checks, so load order
doesn't matter.)

Reload just one year (overwrites those rows only, leaves other years untouched):
```bat
restore_swat.bat dump\trayek.2026.sql
```

---

## Recurring backup (the whole point)

After the first FULL backup, refresh with:
```bat
backup_swat.bat current
```
Copy the changed current-year files via FileZilla, then on the target:
```bat
restore_swat.bat dump\transaksiangkutsampah.2026.sql.gz
restore_swat.bat dump\trayek.2026.sql.gz
```
Because the data is `REPLACE INTO`, this updates the current year in place. (To mirror deletions
too, `DELETE` that year's range first, then load.) `restore_swat.bat` auto-detects `.gz` and
streams it through 7-Zip — no manual unzip.

---

## Adjusting which tables split

Edit `SPLIT_TABLES` at the top of `backup_swat.bat` (space-padded list), and the matching
`call :split_self` / `call :split_parent` lines in step 3. `split_self` takes a table + its own
date column; `split_parent` takes child + FK + parent + parent PK + parent date column.

---

## Verifying a backup is complete

Don't trust file size or phpMyAdmin's row count:
- A dump is **plain SQL gzipped** — no indexes/overhead, so it's ~10× smaller than the DB's
  on-disk size. A 2 GB DB → a few hundred MB of `.sql.gz` is normal.
- phpMyAdmin's row counts (the `~` numbers) are **InnoDB estimates** and can be off ~2× on big
  tables. They are only exact on small tables.

Real checks:
1. **Completion footer** — every finished dump ends with `-- Dump completed on …`. If a file
   lacks it, that table was truncated. (`zcat t.sql.gz | tail` on Linux, or open the `.sql`.)
2. **Exact counts** — run `verify_counts.bat` on the server for the true `COUNT(*)` per table,
   then compare to the rows in each dump file. The big transactional tables (`trayek`, etc.)
   will be far higher than phpMyAdmin's estimate — that's expected, not data loss.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `mysqldump.exe not found` | Fix `MYSQL_BIN`; find it with `dir /s /b C:\*mysqldump.exe`. |
| `Access denied` | Wrong user/password — try `root` blank, or `AdminDKP`. |
| `Unknown table 'x' ... PROCESS privilege` | Already handled via `--no-tablespaces`. |
| Password has `% & ^ < > |` | Tell me — we'll switch to a stdin password to avoid batch escaping. |
| A big table has a weird/empty year file | Check `*.others.sql` — rows with NULL/`0000-00-00`/orphan dates land there by design. |
