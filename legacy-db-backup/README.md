# Legacy SWAT DB Backup & Transfer Guide

Pull the ~2 GB legacy SWAT MySQL database (`dkp_swat`) off the old server **quickly** and
**safely**, over the internal Pemkot WiFi.

## TL;DR

1. **Server:** drop `7za.exe` next to the scripts → run `backup_swat.bat` → run `share_swat.bat`.
2. **Laptop:** run `fetch_swat.bat <SERVER_IP>` (re-run if WiFi drops — it resumes).
3. **Laptop:** run `verify_checksums.bat` (Windows) or `verify_checksums.sh` (Mac/Linux).
4. **Server:** `net share swatbak /delete` to take the share down.

---

## Environment (confirmed by recon)

| What | Value | Consequence |
|------|-------|-------------|
| OS | **Windows Server 2008 Standard SP2** (6.0.6003) | No built-in `tar`, `curl`, or modern PowerShell tooling. |
| PowerShell | **2.0** | **No `Compress-Archive`** (needs PS 5+). Use a portable `7za.exe` or `makecab`. |
| Available built-ins | `certutil`, `robocopy`, `makecab` | Hashing, resumable copy, and fallback compression all work with no install. |
| Network | Internal LAN over WiFi, flaky | **Resume matters more than raw speed.** |
| Sensitivity | Internal only | No encryption needed; we verify integrity with SHA-1 checksums. |

### Why this approach

- **Per-table dumps** → one WiFi drop costs one table, not the whole 2 GB. Each file
  resumes and verifies independently.
- **Compress on the server first** → a SQL dump shrinks ~5–10× (2 GB → ~200–400 MB). This is
  the single biggest speedup; you transfer a few hundred MB, not 2 GB.
- **`robocopy /Z`** (restartable mode) → survives WiFi drops, built into both the server and
  any Win7+ laptop, no software to install on either side.
- **SHA-1 manifest via `certutil`** → on plain Server 2008, `certutil -hashfile` reliably
  supports SHA-1 (SHA-256 is not guaranteed). SHA-1 is more than enough to detect transfer
  corruption.

---

## Files in this folder

| File | Where it runs | Purpose |
|------|---------------|---------|
| `backup_swat.bat` | **Server** | Per-table dump → gzip (`7za`) → SHA-1 manifest. **Recommended.** |
| `backup_swat_makecab.bat` | **Server** | Same, but compresses with built-in `makecab` (`.cab`) — use only if you can't get `7za.exe`. |
| `share_swat.bat` | **Server** | Publishes the `dump\` folder read-only as `\\<server>\swatbak`. |
| `fetch_swat.bat` | **Laptop (Windows)** | Resumable `robocopy` pull. |
| `verify_checksums.bat` | **Laptop (Windows)** | Verifies downloaded files against the manifest. |
| `verify_checksums.sh` | **Laptop (Mac/Linux)** | Same, for non-Windows laptops. |

Put `backup_swat.bat`, `backup_swat_makecab.bat`, `share_swat.bat` (and `7za.exe`) **together
in one folder on the server** that has ≥ 3 GB free. The dump lands in a `dump\` subfolder
beside them.

---

## Step 0 — Finish recon on the server

You confirmed OS + PowerShell. Two things still needed before the backup:

```bat
:: Where is mysqldump? (sets MYSQL_BIN in the script)
dir /s /b C:\*mysqldump.exe

:: Free space on each drive (need ~2 GB raw + ~0.4 GB compressed during the run)
:: The script deletes each .sql right after compressing, so peak stays near ~2.4 GB.
wmic logicaldisk get name,freespace,size
```

Common `mysqldump.exe` locations: `C:\xampp\mysql\bin`, `C:\Program Files\MySQL\MySQL Server X.Y\bin`.

### Get `7za.exe` (recommended)
Download **"7-Zip Extra"** from <https://www.7-zip.org/download.html> on any machine, take the
single `7za.exe` out of it, and copy it into this folder on the server. No install, no admin
beyond copying a file. If you genuinely can't, use `backup_swat_makecab.bat` instead.

---

## Step 1 — Back up (on the server)

1. Open **cmd.exe as Administrator**.
2. Edit the top of `backup_swat.bat`:
   - `MYSQL_BIN` → the folder from Step 0.
   - `DB` → `dkp_swat` (already set).
   - `DBUSER` → `AdminDKP` (already set; change if different).
3. Run it:
   ```bat
   backup_swat.bat
   ```
   It prompts for the MySQL password, lists every table, and for each one:
   dumps with `mysqldump --single-transaction` → gzips to `dump\<table>.sql.gz` → deletes the
   raw `.sql` → appends a SHA-1 line to `dump\manifest.sha1`. Finally it dumps stored
   routines/triggers/events to `dump\_routines.sql.gz`.

**Result:** `dump\` contains one `.sql.gz` per table, `_routines.sql.gz`, and `manifest.sha1`.

### Safety notes
- `--single-transaction` takes a consistent, **non-locking** InnoDB snapshot — safe to run
  while the legacy app is live. (Consistency is per-table, not one global snapshot across all
  tables; fine for a migration backup.)
- The script **never touches the live data files** and is read-only against MySQL.

---

## Step 2 — Share the folder (on the server)

```bat
share_swat.bat
```
This publishes `dump\` read-only as `\\<server>\swatbak` and prints the server's IPv4 address.
Note that IP for the next step.

> Firewall: if the laptop can't reach the share, allow **File and Printer Sharing** for the LAN:
> `netsh advfirewall firewall set rule group="File and Printer Sharing" new enable=Yes`

---

## Step 3 — Download to the laptop

### Windows laptop (recommended)
Copy this folder to the laptop, then:
```bat
fetch_swat.bat 172.17.44.6
```
(use the IP printed by `share_swat.bat`). `robocopy /Z` resumes through WiFi drops — **if it
stops, just run the exact same command again.** Files land in `downloaded\`.

### Mac/Linux laptop (or if SMB is blocked) — HTTP instead
Server 2008 has no Python/curl, so use a portable **HTTP File Server (HFS)** —
<https://www.rejetto.com/hfs/> — a single `.exe`. Drag the `dump\` folder into HFS. Then on
the laptop:
```bash
SRV=172.17.44.6:8080
curl -O "http://$SRV/manifest.sha1"
for f in $(awk '{n=$2; sub(/^\*/,"",n); print n}' manifest.sha1); do
  curl -C - -O "http://$SRV/$f"   # -C - resumes a partial file; re-run the loop after a drop
done
```

---

## Step 4 — Verify integrity (on the laptop)

Inside the `downloaded\` folder:

- **Windows:** `verify_checksums.bat`
- **Mac/Linux:** `bash verify_checksums.sh`

Expect every file `OK`. Any `BAD`/`MISSING` → re-run the fetch (it re-pulls only those files)
and verify again. **Do not delete the server share until this passes clean.**

Then on the server: `net share swatbak /delete`.

---

## Step 5 (optional) — Restore / sanity check

Decompress and load one table into a throwaway DB to confirm the dump is usable:
```bash
# .gz files
gunzip -k *.sql.gz
# .cab files (makecab fallback): Windows -> expand file.sql.cab file.sql ; Linux -> cabextract
mysql -u root -p scratch_db < haritransaksi.sql
```
On a clean target DB, load `_routines.sql` **last** (after all table data). This feeds the
project's existing `seed:legacy` / `migrate:legacy` track once the data sits on a machine that
can reach the target DB (see the main project guide).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `mysqldump.exe not found` | Fix `MYSQL_BIN`; locate with `dir /s /b C:\*mysqldump.exe`. |
| `Access denied` / can't list tables | Wrong user/password, or the user lacks `SELECT`/`LOCK TABLES`/`PROCESS`. Check the printed error. |
| **Mojibake** (garbled accents) on restore | Legacy DB is likely `latin1`. Re-run the backup with `--default-character-set=latin1` (edit both `mysqldump` lines). |
| Password has `% & ^ < > |` etc. | Batch may mangle it. Easiest: temporarily set a simple password for the dump, or create a `[client]` section in a my.cnf and call mysqldump with `--defaults-extra-file=my.cnf`. |
| `7za.exe not found` | Get it (Step 0) **or** run `backup_swat_makecab.bat`. |
| Laptop can't see `\\<ip>\swatbak` | Enable File & Printer Sharing in the firewall (Step 2 note); confirm you're on the Pemkot WiFi; try `\\<ip>\swatbak` in Explorer. |
| WiFi keeps dropping mid-transfer | Expected — just re-run `fetch_swat.bat`. Per-table files + `/Z` mean you lose seconds, not the whole transfer. |
| `certutil` rejects `SHA256` | That's why the scripts use `SHA1` on Server 2008. Keep SHA-1. |
