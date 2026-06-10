# 03 — Hi-Fi Specification (Web Back-Office)

Authoritative hi-fi spec for the **SWAT web back-office**, mirrored from the vendored design bundle
(`designs/design_handoff_swat_webapp/README.md` + screenshots + `prototype_src/`). It documents the
**app shell**, the **information architecture**, and the **per-screen design** for every screen, with
states and interactions. Tokens and component contracts come from
[`01-design-system.md`](./01-design-system.md); wireframe structure from
[`02-wireframes.md`](./02-wireframes.md).

> **Locale:** Bahasa Indonesia UI; numbers/dates/currency `id-ID`; timezone **Asia/Jakarta (WIB)**.
> **Themes:** Light (baseline) + Dark, via a `.dark` class on `<html>`. **A11y:** WCAG 2.1 AA.
> **Source of truth:** the bundle. On any conflict, the bundle wins; update this doc to match.

**Visual references:** `designs/design_handoff_swat_webapp/screenshots/*.png` (light + dark, desktop +
mobile). The runnable prototype is `designs/design_handoff_swat_webapp/hifi-web.html` — **reference
only**. Its **Gallery / viewport-toggle / browse-vs-demo** modes are prototype scaffolding and **must
not be built into the product** (see `designs/INDEX.md`).

---

## App Shell

**Layout:** CSS grid. Topbar spans full width (height **`76px`**, `--hf-topbar-h`); below it a left
**sidebar** (`256px`, collapses to a `64px` icon rail) and a scrollable **content** area. Content
max-width `1400px`, padding `32px` (`24px` < 1280px wide).

**Topbar** (`neutral-0` bg, bottom border `neutral-200`, subtle drop shadow so it separates from the
recessed canvas):
- Left: hamburger (mobile/collapse), brand mark (40×40, radius 10) + "SWAT · DLH Surabaya".
- Right: theme toggle (sun/moon), notification bell (red-dot indicator), user menu (avatar 38px +
  name + role → dropdown: **Profil / Ubah Kata Sandi / Keluar**).

**Content canvas** is intentionally **recessed** vs. the topbar: `neutral-100` light / `neutral-50` dark.

**Sidebar:** group headers (uppercase `10.5px`, letter-spacing `.07em`) that expand/collapse; leaf
links `13px`. Active leaf: `primary-50` bg, `primary-700` text, `3px` left border `primary-600`.
Not-yet-built items show a "Segera" pill. **Role-driven visibility:** items the user's role lacks
`:read` on are **hidden** (not disabled). **< lg:** sidebar becomes an off-canvas drawer with a scrim.

---

## Information Architecture (sidebar)

```
Dasbor                         (dashboard)
Monitoring
  ├─ Volume per Hari           (tonnage charts)        — Phase 2 build
  ├─ Konsumsi BBM              (fuel charts)            — Phase 2 build
  └─ Laporan                   (reports)                — Phase 3 build
Master Data
  ├─ Kendaraan
  ├─ Model Kendaraan           (reference master — parity G1)
  ├─ Aplikasi Kendaraan        (reference master — parity G2)
  ├─ Bahan Bakar               (reference master — parity G3)
  ├─ Pengemudi                 (+ SIM tab)
  ├─ Spot & Rute               (sites + routes tabs)
  └─ Sumber Sampah
Penjadwalan
  ├─ Jadwal Kru
  └─ Jatah Kitir               (issuance — parity G6)
Transaksi
  ├─ Hari Transaksi            (→ Haul Board → Trip Sheet)
  ├─ Pengisian Bahan Bakar     (refuel log — parity G7)
  ├─ Pemeriksaan Kendaraan     (inspection — parity G4)
  └─ Perawatan                 (maintenance — parity G5)
Pengguna & Akses
  ├─ Pengguna
  └─ Hak Akses                 (RBAC)
```

The four **reference-master** items (Model Kendaraan, Aplikasi Kendaraan, Bahan Bakar) and the
Monitoring/Reports group screens use the standard **List + Modal** patterns from `02-wireframes.md`;
they were not bespoke-mocked in the prototype gallery but are required for legacy parity. Monitoring &
Reports screens are **designed** but **built** in Phases 2–3.

---

## Status enums → pill mapping

Every status renders as a `Badge` (pill with a leading dot + label — **color is never the only
signal**). See `01-design-system.md` §1.4 for the full enum→token table (Trip, Day, DisposalPermit,
Vehicle, Maintenance, Inspection, Employment, License, Refuel, Report, User).

---

## Spot Illustrations (where they're used)

Flat-geometric SVGs in `designs/design_handoff_swat_webapp/assets/illustrations/` (brand emerald
palette), rendered via a reusable `<Illustration name size/>` (decorative, `aria-hidden`; text label
carries the meaning; a dark-mode filter keeps them from glowing).

| Illustration | Used on |
|---|---|
| `login.svg` | Login screen hero |
| `empty.svg` | "Belum ada data" empty states |
| `no-results.svg` | search returned nothing |
| `server-error.svg` | table load-failure ("Gagal memuat data" + retry) |
| `maintenance.svg` | generic "Segera" / placeholder fallback |
| `success`,`offline`,`error`,`no-access`,`not-found`,`loading` | confirmation, offline, error-boundary, 403, 404, full-screen loading |

---

## Screens / Views (21)

> Component references (`<Sheet>`, `<Stepper>`, `<DescriptionList>`, etc.) are defined in
> `01-design-system.md` §3. Prototype source per screen is noted in parentheses.

### Auth & Account
1. **Login** (`screens-auth.jsx → LoginScreen`) — centered card (`400px`) on `neutral-50` with a faint
   emerald radial glow; logo lockup (56px mark, "SWAT", org subtitle) + `login` illustration above the
   card. Username + password fields, danger alert on error, full-width primary submit (shows "Memuat…"
   + spinner while loading), "Lupa kata sandi?" link. Both fields required → inline danger alert "Nama
   pengguna dan kata sandi wajib diisi." Successful submit advances to forced password change (first
   login) or the app.
2. **Ubah Kata Sandi** (`ChangePasswordScreen`) — forced on first login (`mustChangePassword`); also
   voluntary. Current / new / confirm + a **strength meter** (5 levels Sangat lemah→Sangat kuat via a
   `progress` bar colored danger→success); warning alert when forced. Valid = new ≥ 8 chars AND
   strength ≥ "Sedang" AND confirm === new; submit disabled until valid; match error inline. Success
   toast "Kata sandi telah diperbarui."
3. **Profil** (`ProfileScreen`) — 2-col grid. Left card: avatar (64px) + name + `@username` + role
   badge, photo dropzone, editable name, read-only username. Right: Keamanan card ("Ubah Kata Sandi")
   + Sesi card ("Keluar" destructive → confirm dialog).

### Dashboard
4. **Dasbor** (`screens-master.jsx → DashboardScreen`) — `PageHead` (greeting + date + "Inisiasi Hari
   Ini" primary action) → **4-metric grid** (Kendaraan Aktif, Haul Berjalan, BBM Hari Ini L, Tonase
   Hari Ini ton; each: icon chip 36px, label, big value 32px/700 tabular-nums + unit, delta line) →
   **2-col** row: left "Hari Transaksi Terakhir" table (Tanggal / Status pill / Kendaraan / Tonase;
   rows → Haul Board), right "Perlu Perhatian" warning/danger/info alerts.

### Master Data
5. **Kendaraan — Daftar** (`VehiclesScreen`) — `PageHead` + "Buat Baru" → toolbar (search, status
   filter menu, column menu, count) → table card. Columns: Nopol (mono bold), Merek/Model, Aplikasi,
   Odometer (numeric right tabular), Status pill, Aksi (Lihat/Ubah/Hapus menu). All states designed:
   loading (skeleton), ready, empty (truck illustration + "Buat Baru"), no-results, error (+ "Coba
   Lagi"). Pagination footer.
6. **Kendaraan — Form** (`VehicleForm`, Dialog 600px) — sectioned (uppercase divider labels): **Data
   Dasar** (Nopol*, Tahun* 1990–2030, Merek/Model* select, Aplikasi* select), **Dimensi & Odometer**
   (Berat Kosong* kg, Odometer* km — unit affixes), **Masa Berlaku** (STNK, Pajak STNK — date
   `dd/MM/yyyy` + calendar affix), Catatan textarea, plus **Sumber Sampah** assignment. Validation:
   required; **duplicate plate** → "Nomor polisi sudah ada." Save disabled until valid.
7. **Model Kendaraan / Aplikasi Kendaraan / Bahan Bakar** *(parity G1–G3, reference-master)* — each is
   a standard **List + Modal**: list (name/specs/count + Aksi), create/edit dialog. Bahan Bakar form
   has price-per-liter (Rp) and a read-only Kategori (Bersubsidi/Non-Subsidi); delete blocked when in
   use ("Tidak dapat dihapus: masih dipakai"). Follow `02-wireframes.md` reusable patterns.
8. **Pengemudi** (`screens-master2.jsx → DriversScreen` + `DriverForm`) — list: avatar+name, KTP
   (mono), employment pill (SATGAS/PNS/HONORER), pool, contact, SIM count, worst-license status pill;
   **rows with expiring licenses tinted yellow, expired tinted red**; a warning alert summarizes
   licenses needing attention. Form (tabbed dialog 640px): **Data Pribadi** (KTP* 16-digit, Nama*,
   Status kepegawaian, Tgl lahir, Pool*, Kontak*, alamat asal/sekarang, pelatihan K3) + **Lisensi
   (SIM)** (sub-table class/number/expiry/status, issue + revoke; empty uses `no-results` illustration).
9. **Spot & Rute** (`SitesScreen` + `SiteForm` + `RouteForm`) — tabbed (Lokasi / Rute). Sites: type
   icon + name, type pill (POOL/SPBU/TPS/TPA), address, coordinates. Routes: origin → destination,
   RouteCategory pill, distance. Site form: name, type segmented choice, address, optional lat/lng
   (both-or-neither) + map-picker dropzone. Route form: origin/destination/category/distance with
   uniqueness + distinct-endpoints validation alert.
10. **Sumber Sampah** (`WasteScreen`) — table: code chip (mono, primary-tinted), name, notes,
    assigned-vehicle count. Simple add/edit dialog (code ≤5 unique, name, notes).

### Penjadwalan
11. **Jadwal Kru** (`screens-sched.jsx → CrewScreen`) — fixed vehicle↔driver pairings. Table:
    Kendaraan, Pengemudi, Pool, Berangkat, Kembali, Trayek (count), Status. Row → Template Trayek;
    row menu: Kelola Trayek / Hapus.
12. **Template Trayek** (`TemplateScreen`) — breadcrumb back to Jadwal Kru, header (plate · driver),
    "Waktu Jadwal" card (Berangkat / Kembali time inputs), then a **Trayek Terencana** table (# /
    Jenis RouteCategory / Rute / Target time / BBM L / drag handle). "Tambah Trayek" action; info
    alert about insertion-order sequencing.
13. **Jatah Kitir** *(parity G6)* (`QuotaScreen`) — authorize a vehicle↔TPA pairing for a date range.
    Table: Kode (mono `KT-202606-0042`), Kendaraan, Lokasi, Berlaku Dari/Sampai, Status. Toolbar:
    search, status filter, "Berlaku pada" date filter; actions **"Impor Massal"** (bulk import, G8) +
    "Terbitkan Kitir". Issue dialog (`QuotaForm` 560px): Kendaraan* (GOOD only), Lokasi*, Berlaku
    Dari*/Sampai*, Status radio (Berlaku/Tidak Berlaku). Validation: Sampai ≥ Dari; warns on duplicate
    active kitir.

### Transaksi
14. **Hari Transaksi** (`screens-txn.jsx → DaysScreen`) — info alert explaining **Inisiasi Hari**
    (creates the day & seeds Hauls + assignments from active crew schedules; **idempotent**), toolbar,
    table (Tanggal mono / Status pill / Kendaraan / Tonase / "Lihat Board"). Inisiasi dialog:
    operational date (defaults to today) + info note.
15. **Haul Board** (`BoardScreen`) — the operational core. Header: breadcrumb, title "Haul · {date}",
    DayStatus pill + "{verified}/{total} trayek terverifikasi", "Tandai Hari Selesai". **Haul rows**
    (card-like grid: Kendaraan / Verifikasi badge / Berangkat T/A / Kembali T/A / Ritase / actions).
    Verification badge: slate "Belum mulai", amber/green "{verified}/{total} Terverifikasi". Actions:
    "Edit" (reconcile) + "Lihat" (trip sheet).
16. **Trip Sheet** (right-side `<Sheet>`) — per-haul trip list. Each trip row: type icon chip
    (Pickup=info/blue `inbox`, Disposal=success/green `scale`, Refuel=warning/amber `fuel`), label +
    target time, status pill, contextual action — **Catat** when `IN_PROGRESS`, **Verifikasi** when
    `DONE`.
17. **Pickup** (`PickupForm`, dialog) — **Stepper** (Pilih Trayek → Catat Aktual → Konfirmasi); Waktu
    Aktual, Odometer (≥ depart), Sumber Sampah* select, Volume (optional m³), Catatan.
18. **Disposal + Weighbridge** (`DisposalForm`, dialog) — Tare kg (prefilled, editable) + Gross kg →
    **Net auto-computed read-only** (`Gross − Tare`, green panel). **Gate:** Gross ≥ Tare or Save
    disabled + danger alert. Plus Volume m³, actual time, odometer.
19. **Refuel** (`RefuelForm`, dialog) — Jenis BBM (filtered by vehicle), Jumlah Diminta L, Jumlah
    Disetujui L (**disabled unless the role has approval rights**), actual time, odometer. **Gate:**
    Disetujui ≤ Diminta.
20. **Verifikasi Trayek** (`VerifyForm`, dialog) — a **DescriptionList** of target→actual (time +delta,
    odometer, tare, gross, net in green, volume, recorded-by) + readiness alert + rejection note
    textarea. Buttons: **Tolak** / **Terverifikasi**.
21. **Rekalibrasi Berangkat/Kembali** (`ReconcileForm`, dialog) — two sections (Berangkat / Kembali),
    each time + odometer with target labels. **Validation:** actual ≥ target; on return, the vehicle's
    odometer is updated.

### Transaksi — parity operational screens (designed; Phase 1 build)
22. **Pengisian Bahan Bakar** *(parity G7)* (`screens-txn2.jsx → RefuelScreen` + `RefuelLogForm`) —
    standalone refuel log. KPI grid (count, total approved L, estimated cost Rp, flagged anomalies) →
    table (time, vehicle, driver, fuel, requested/approved L, cost = approved × price/L, SPBU, status
    pill; approved < requested in danger). Record dialog auto-computes estimated cost in a primary
    panel and gates approved ≤ requested.
23. **Pemeriksaan Kendaraan** *(parity G4)* (`InspectScreen`) — table (date, vehicle, model, inspector,
    passed/total, result pill PASS/ATTENTION/FAIL) → **detail Sheet** with a pass-count panel + a
    12-item checklist (each: tick chip OK/Attention/Fail + label + status badge). Create dialog uses a
    switch per checklist item.
24. **Perawatan** *(parity G5)* (`MaintScreen`) — KPI grid (total, running, monthly cost Rp,
    scheduled) → table (code mono, date, vehicle, type pill Servis/Perbaikan, work description,
    workshop, cost Rp, status pill Terjadwal/Berjalan/Selesai). Record/edit dialog (vehicle, date,
    type, odometer, workshop, cost, work description + documentation dropzone).

### Pengguna & Akses
25. **Pengguna** (`screens-users.jsx → UsersScreen`) — table: Nama (avatar+name), Username (mono `@`),
    Peran badge, Status pill. Row menu: Ubah / Reset paksa kata sandi / Hapus. Form (`UserForm`):
    Nama*, Nama pengguna*, Peran* select. **No password field** — new users are auto
    `mustChangePassword`; admin shares a temp password out-of-band (info alert). Delete = soft-delete.
26. **Hak Akses (RBAC)** (`RolesScreen`) — master-detail. Left: role list (`320px`, each = shield icon
    + name + "{n} izin", active = primary tint + left border). Right: detail card — role name +
    description + grouped **permission toggles** (Switch per permission, label + mono key `trip:verify`).
    "Simpan Izin"; info alert: saving permissions changes sidebar visibility for that role.

### Monitoring (designed; Phase 2 build) & Reports (designed; Phase 3 build)
- **Volume per Hari** (`screens-monitor.jsx → MonVolScreen`) — KPI grid → **stacked column chart**
  (tonnage/day by waste source) + **donut** (source composition) → **ranked table** (tonnage per TPS).
  Info alert documents the aggregation rule (DISPOSAL legs, DONE/VERIFIED, nightly TPA reconciliation,
  >5% = anomaly). *Add the Swasta/Dinas/Total source-type split (parity G9).*
- **Konsumsi BBM** (`MonFuelScreen`) — KPI grid → **grouped bar chart** (requested vs approved per
  vehicle; bar turns red when variance < −5%) → vehicle detail table with signed variance % + status
  pill (Sesuai / Di bawah / Anomali).
- **Laporan** (`ReportsScreen`) — card grid of report types (Tonase, Konsumsi BBM, Ringkasan Rute,
  Retribusi) each with period + format pills + "Hasilkan". Generate dialog (date range + format radio
  + async note). History table (report, format pill, size, by, time, status) — DONE rows get a
  download button, PROCESSING rows show a spinner.

> Charts are token-styled and dependency-free in the prototype; **build with Recharts using the same
> data shapes** (see `08-frontend-spec.md`). The prototype charts are the visual contract, not the impl.

---

## Interactions & Behavior

- **Navigation:** SPA routing; clicking a sidebar/leaf or in-content link swaps the content area and
  resets scroll to top. Breadcrumbs reflect IA.
- **Dialogs:** centered modal over a `rgb(15 23 42 / .5)` scrim; Esc closes; click-outside closes
  (not for destructive `Confirm`). Enter animation: pop (`.16s cubic-bezier(.16,1,.3,1)`).
- **Right-side Sheet** (trip sheet, inspection detail): slides in from right (`.2s`).
- **Toasts:** bottom-right stack; success/info auto-dismiss `3s`, error `5s`; slide-in `.22s`. Variants
  success / error / warning / info, each with matching icon + accent.
- **Menus:** click trigger to open; click-outside / Esc closes.
- **Forms:** validate on submit (set `touched`); disabled submit until valid; inline field errors with
  an alert-circle icon.
- **Theme toggle:** flips `.dark` on `<html>`, persists to `localStorage('swat-theme')`, updates
  `<meta theme-color>`. An inline `<head>` script applies the saved theme **before paint** to avoid flash.
- **Animations** are transform-only on entrance (never start at `opacity:0`) and are fully disabled
  under `prefers-reduced-motion: reduce`.

---

## Microcopy (id-ID)
Buttons imperative: Simpan · Batal · Hapus · Terverifikasi · Tolak · Buat Baru · Inisiasi Hari ·
Terbitkan Kitir · Impor Massal · Tandai Hari Selesai · Hasilkan. Toasts: "Berhasil" / "Gagal" /
"Peringatan" / "Informasi". Human errors ("Nomor polisi sudah ada"). Empty: "Belum ada data" /
"Tidak ada hasil pencarian". Glossary terms used verbatim (`specs/01-glossary.md`).

## Responsive
≥ lg: persistent sidebar, full tables, centered dialogs, right-side sheets. < lg: off-canvas drawer
(hamburger) + scrim; forms collapse to single column; tables → stacked cards (< md); dialogs → bottom
sheets (< sm); touch targets ≥ 44px on coarse pointers (inherited from `swat-components.css`).
