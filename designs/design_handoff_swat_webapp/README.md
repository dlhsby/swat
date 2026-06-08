# Handoff: SWAT Web Back-Office (Hi-Fi)

**SWAT** — *Solid Waste Administration Tracking* — back-office web app for **Dinas Lingkungan Hidup (DLH) Kota Surabaya**. This package documents the hi-fi design so a developer using **Claude Code** can implement it in a real codebase.

> **Locale:** Bahasa Indonesia UI. Numbers/dates/currency `id-ID`, timezone **Asia/Jakarta (WIB)**.
> **Themes:** Light (baseline) + Dark, toggled via a `.dark` class on `<html>`.
> **Accessibility target:** WCAG 2.1 AA.

---

## Screenshots

Rendered reference images live in `screenshots/`. The floating pill at the bottom-left of some shots
is the **prototype's dev toolbar** (gallery / viewport / theme) — it is **not** part of the product.

| File | Shows |
|---|---|
| `01-gallery.png` | Screen Library (prototype index — not a product screen) |
| `02-dashboard-light.png` | Dasbor — metric grid + recent days + attention alerts (light) |
| `03-vehicles-light.png` | Kendaraan list — toolbar, table, status pills |
| `04-vehicle-form.png` | Kendaraan form dialog — sectioned fields + unit affixes |
| `05-haul-board-light.png` | Haul Board — haul rows + verification badges (light) |
| `06-trip-sheet.png` | Trip Sheet — per-haul trips with type-icon chips + contextual actions |
| `07-verify-dialog.png` | Verifikasi Trayek — target→actual description list + net weight |
| `08-rbac-light.png` | Hak Akses — role master-detail + permission switches |
| `09-dashboard-dark.png` | Dasbor (dark theme) |
| `10-haul-board-dark.png` | Haul Board (dark theme) |
| `11-mobile-dashboard-dark.png` | Mobile phone frame — Dasbor (dark) |
| `12-mobile-drawer-light.png` | Mobile drawer navigation (light) |

---

## About the Design Files

The files in this bundle are **design references created in HTML/React-via-Babel** — prototypes that show the intended look and behavior. **They are not production code to copy directly.**

Your task is to **recreate these designs in the target codebase's environment** using its established patterns and libraries. The design was authored against **Tailwind CSS + shadcn/ui** conventions (the token file maps 1:1 to shadcn HSL CSS variables), so if you are starting fresh, **React + Tailwind + shadcn/ui** is the path of least resistance. If a stack already exists, adapt to it.

The single source of truth for styling is the two CSS files included here:
- `swat-tokens.css` — the complete variable layer (colors, type, spacing, radius, elevation, z-index, focus ring, light + dark). **Port these verbatim.**
- `swat-components.css` — reference component styles built on those tokens.

---

## Fidelity

**High-fidelity.** Final colors, typography, spacing, and interactions are all specified. Recreate the UI pixel-accurately using the codebase's component library, mapping each prototype component to its shadcn/ui (or equivalent) counterpart. Do not eyeball values — use the tokens.

---

## How the prototype is organized (for reference)

The prototype is a single-page React app (`hifi-web.html`) that boots into a **Screen Library** (gallery), from which any screen opens directly. It has three runtime modes that are **prototype scaffolding only — do NOT build these into the product**:
- **Gallery / "Pustaka Layar"** — a dev index of every screen. *(Prototype aid, not a product screen.)*
- **Viewport toggle** (Desktop / Mobile phone frame) — just to preview responsive behavior.
- **Browse vs Demo** — "Browse" jumps into a screen with auth bypassed; "Demo" runs the real login flow.

**What you actually build** is the real app: the auth flow + the authenticated app shell containing the screens listed below.

Source files (in `prototype_src/`):
| File | Contains |
|---|---|
| `data.js` | Mock data, navigation IA, status→pill enum map, `id-ID` formatters |
| `data2.js` | Extended mock data: drivers, sites, routes, waste sources, fuels, refuel log, inspections, maintenance, monitoring series, reports |
| `components.jsx` | Primitives: Icon set, **Illustration**, Button, Badge, Field/Input/Select/Textarea, Dialog, Confirm, Menu, Toast, Crumbs, PageHead, EmptyState (illustration-aware), Skeleton, TableFooter, Theme controller |
| `charts.jsx` | Dependency-free charts: ChartCard, StackedColumns, GroupedColumns, AreaTrend, Donut, Legend |
| `screens-auth.jsx` | Login (with illustration), Change Password, Profile |
| `screens-master.jsx` | Dashboard, Kendaraan (vehicles) list + form |
| `screens-master2.jsx` | Pengemudi (+ SIM tab), Spot & Rute (sites + routes), Sumber Sampah, Tabs primitive |
| `screens-sched.jsx` | Jadwal Kru, Template Trayek, Jatah Kitir |
| `screens-txn.jsx` | Hari Transaksi, Haul Board, Pickup/Disposal/Refuel/Verify/Reconcile dialogs, Sheet |
| `screens-monitor.jsx` | Volume per Hari, Konsumsi BBM, Laporan, Metric primitive |
| `screens-txn2.jsx` | Pengisian Bahan Bakar, Pemeriksaan Kendaraan, Perawatan |
| `screens-users.jsx` | Pengguna (users), Hak Akses (RBAC) |
| `app.jsx` | App shell (topbar + sidebar), router, theme wiring |
| `mobile.jsx` | Mobile chrome (phone top bar, drawer, bottom nav) |
| `hifi.css` | App-shell layout + polish on top of the design system (incl. charts, tabs, illustration states) |

---

## Information Architecture (sidebar navigation)

```
Dasbor                         (dashboard)              ✅ built
Monitoring                     (group)
  ├─ Volume per Hari           ✅ built (charts)
  ├─ Konsumsi BBM              ✅ built (charts)
  └─ Laporan                   ✅ built
Master Data                    (group)
  ├─ Kendaraan                 ✅ built
  ├─ Pengemudi                 ✅ built (+ SIM tab)
  ├─ Spot & Rute               ✅ built (sites + routes tabs)
  └─ Sumber Sampah             ✅ built
Penjadwalan                    (group)
  ├─ Jadwal Kru                ✅ built
  └─ Jatah Kitir               ✅ built
Transaksi                      (group)
  ├─ Hari Transaksi            ✅ built (→ Haul Board)
  ├─ Pengisian Bahan Bakar     ✅ built
  ├─ Pemeriksaan Kendaraan     ✅ built
  └─ Perawatan                 ✅ built
Pengguna & Akses               (group)
  ├─ Pengguna                  ✅ built
  └─ Hak Akses                 ✅ built
```

**All 21 screens across 6 modules are now designed** (no "Segera"/placeholder items remain). Monitoring dashboards use lightweight, token-styled, dependency-free charts (stacked columns, grouped bars, SVG area trend, donut) — in production swap for Recharts/visx with the same data shapes.

**Role-driven visibility:** sidebar items the user's role lacks `:read` on are **hidden** (not disabled).

---

## App Shell

**Layout:** CSS grid. Topbar spans full width (height `76px`, `--hf-topbar-h`); below it a left **sidebar** (`256px`, collapses to a `64px` icon rail) and a scrollable **content** area. Content max-width `1400px`, padding `32px` (`24px` < 1280px wide).

**Topbar** (`--neutral-0` background, bottom border `--neutral-200`, subtle drop shadow so it separates from the recessed canvas):
- Left: hamburger (mobile/collapse), brand mark (40×40, radius 10) + "SWAT · DLH Surabaya".
- Right: theme toggle (sun/moon), notification bell (with red dot indicator), user menu (avatar 38px + name + role, opens dropdown: Profil / Ubah Kata Sandi / Keluar).

**Content canvas** is intentionally **recessed** relative to the topbar for contrast: `--neutral-100` in light mode, `--neutral-50` in dark mode.

**Sidebar:** group headers (uppercase, `10.5px`, letter-spacing `.07em`) that expand/collapse; leaf links `13px`. Active leaf: `--primary-50` background, `--primary-700` text, `3px` left border `--primary-600`. Planned items show a "Segera" pill.

**Responsive:** below `1024px` the sidebar becomes an off-canvas drawer with a scrim (hamburger toggles it).

---

## Screens / Views

### 1. Login (`screens-auth.jsx → LoginScreen`)
- **Purpose:** Authenticate with username + password issued by an admin.
- **Layout:** Centered card (`400px`) on a `--neutral-50` canvas with a faint emerald radial glow top-center. Logo lockup (56px mark, "SWAT", org subtitle) above the card.
- **Components:** Username field, password field, danger alert on error, full-width primary submit (shows "Memuat…" + spinner while loading), "Lupa kata sandi?" link.
- **Validation:** both fields required → inline danger alert "Nama pengguna dan kata sandi wajib diisi."
- **Behavior:** successful submit (simulated ~850ms) advances to forced password change (first login) or the app.

### 2. Ubah Kata Sandi / Change Password (`ChangePasswordScreen`)
- **Purpose:** Forced on first login (`mustChangePassword`); also reachable voluntarily.
- **Components:** current password, new password, confirm; a **strength meter** (5 levels: Sangat lemah → Sangat kuat, colored danger→success via `progress` bar); warning alert when forced.
- **Validation:** new ≥ 8 chars AND strength ≥ "Sedang" AND confirm === new. Submit disabled until valid. Match error shown inline.
- **Success:** toast "Kata sandi telah diperbarui."

### 3. Profil (`ProfileScreen`)
- **Purpose:** View/edit account, manage security & session.
- **Layout:** 2-column grid. Left card: avatar (64px) + name + `@username` + role badge, photo dropzone, editable name, read-only username. Right column: Keamanan card ("Ubah Kata Sandi" button) + Sesi card ("Keluar" destructive button → confirm dialog).

### 4. Dasbor / Dashboard (`screens-master.jsx → DashboardScreen`)
- **Purpose:** Daily operations summary.
- **Layout:** `PageHead` (greeting + date + "Inisiasi Hari Ini" primary action), then a **4-metric grid**, then a **2-column** row.
- **Metric card:** icon chip (36px, `--primary-50` bg / `--primary-700` icon), label, big value (`32px`, weight 700, tabular-nums) + unit, delta line (up = `--success-700`, down = `--danger-600`). Metrics: Kendaraan Aktif, Haul Berjalan, BBM Hari Ini (L), Tonase Hari Ini (ton).
- **Left card:** "Hari Transaksi Terakhir" table (Tanggal / Status pill / Kendaraan / Tonase), rows clickable → Haul Board.
- **Right card:** "Perlu Perhatian" — warning / danger / info alerts.

### 5. Kendaraan / Vehicles — List (`VehiclesScreen`)
- **Purpose:** Manage the fleet (master data).
- **Layout:** `PageHead` + "Buat Baru" → toolbar (search, status filter menu, column menu, a "Pratinjau status" demo menu, count) → table card.
- **Table columns:** Nopol (mono, bold), Merek/Model, Aplikasi, Odometer (numeric, right-aligned, tabular), Status pill, Aksi (row menu: Lihat detail / Ubah / Hapus).
- **States (all designed):** `loading` (skeleton rows), `ready`, `empty` (truck icon + "Buat Baru"), `no-results` (search icon), `error` (warning icon + "Coba Lagi"). Pagination footer ("Menampilkan X–Y dari N", prev/next).
- **Behavior:** search filters Nopol+Model; status filter; delete opens confirm; toasts on save/delete.

### 6. Kendaraan — Form (`VehicleForm`, Dialog, 600px)
- **Sections** (with uppercase divider labels): **Data Dasar** (Nopol*, Tahun* 1990–2030, Merek/Model* select, Aplikasi* select), **Dimensi & Odometer** (Berat Kosong* kg, Odometer* km — both with unit affix), **Masa Berlaku** (STNK, Pajak STNK — date `dd/MM/yyyy` with calendar affix), Catatan textarea.
- **Validation:** required fields; **duplicate plate** check → "Nomor polisi sudah ada." Save disabled until valid.

### 7. Jadwal Kru / Crew Schedule (`screens-sched.jsx → CrewScreen`)
- **Purpose:** Fixed vehicle↔driver pairings (daily templates).
- **Table:** Kendaraan, Pengemudi, Pool, Berangkat, Kembali, Trayek (count), Status. Row → Template Trayek. Row menu: Kelola Trayek / Hapus.

### 8. Template Trayek / Route Template (`TemplateScreen`)
- **Purpose:** Define the planned legs of one crew schedule.
- **Layout:** breadcrumb back to Jadwal Kru, header (plate · driver), "Waktu Jadwal" card (Berangkat / Kembali time inputs), then a **Trayek Terencana** table: # / Jenis (RouteCategory) / Rute / Target time / BBM (L) / drag handle. "Tambah Trayek" action. Info alert about insertion-order sequencing.

### 9. Jatah Kitir / Fuel Quota (`QuotaScreen`)
- **Purpose:** Authorize a vehicle↔site (TPA) pairing for a date range.
- **Table:** Kode (mono, e.g. `KT-202606-0042`), Kendaraan, Lokasi, Berlaku Dari, Berlaku Sampai, Status. Toolbar: search, status filter, "Berlaku pada" date filter. Actions: "Impor Massal", "Terbitkan Kitir".
- **Issue dialog (`QuotaForm`, 560px):** Kendaraan* select (GOOD vehicles only), Lokasi* select, Berlaku Dari* / Sampai* (dates), Status radio (Berlaku / Tidak Berlaku). **Validation:** Sampai ≥ Dari; warns on duplicate active kitir.

### 10. Hari Transaksi / Transaction Day (`screens-txn.jsx → DaysScreen`)
- **Purpose:** Each operational date groups all hauls.
- **Layout:** info alert explaining **Inisiasi Hari** (creates the day & seeds Hauls + assignments from active crew schedules; **idempotent**), toolbar, table (Tanggal mono / Status pill / Kendaraan / Tonase / "Lihat Board").
- **Inisiasi dialog:** operational date input (defaults to today) + info note.

### 11. Haul Board (`BoardScreen`) — the operational core
- **Purpose:** Monitor & record every haul of a day.
- **Header:** breadcrumb, title "Haul · {date}", DayStatus pill + "{verified}/{total} trayek terverifikasi" summary, "Tandai Hari Selesai" button.
- **Haul rows** (card-like, grid: Kendaraan / Verifikasi badge / Berangkat T/A / Kembali T/A / Ritase / actions). Verification badge: slate "Belum mulai", amber/green "{verified}/{total} Terverifikasi". Actions: "Edit" (reconcile) + "Lihat" (trip sheet).
- **Trip Sheet (right-side `Sheet`):** per-haul list of trips. Each trip row: type icon chip (Pickup=info/blue `inbox`, Disposal=success/green `scale`, Refuel=warning/amber `fuel`), label + target time, status pill, and a contextual action — **Catat** (record) when `IN_PROGRESS`, **Verifikasi** when `DONE`.

### 12. Trip recording dialogs
- **Pickup (`PickupForm`):** stepper (Pilih Trayek → Catat Aktual → Konfirmasi); Waktu Aktual, Odometer (≥ depart), Sumber Sampah* select, Volume (optional m³), Catatan.
- **Disposal + Weighbridge (`DisposalForm`):** Tare kg (prefilled, editable) + Gross kg → **Net weight auto-computed read-only** (`Gross − Tare`, shown in a green panel). **Gate:** Gross must be ≥ Tare or Save is disabled + danger alert. Plus Volume m³, actual time, odometer.
- **Refuel (`RefuelForm`):** Jenis BBM (filtered by vehicle), Jumlah Diminta L, Jumlah Disetujui L (**disabled unless the role has approval rights**), actual time, odometer. **Gate:** Disetujui ≤ Diminta.
- **Verify (`VerifyForm`):** a **DescriptionList** of target→actual (time +delta, odometer, tare, gross, net in green, volume, recorded-by) + readiness alert + rejection note textarea. Buttons: **Tolak** / **Terverifikasi**.
- **Reconcile (`ReconcileForm`):** two sections (Berangkat / Kembali), each time + odometer with target labels. **Validation:** actual ≥ target; on return, the vehicle's odometer is updated.

### 13. Pengguna / Users (`screens-users.jsx → UsersScreen`)
- **Table:** Nama (avatar + name), Username (mono `@`), Peran badge, Status pill. Row menu: Ubah / Reset paksa kata sandi / Hapus.
- **Form (`UserForm`):** Nama*, Nama pengguna*, Peran* select. **No password field** — new users are auto `mustChangePassword`; admin shares a temp password out-of-band (info alert states this). Delete = soft-delete (deactivate).

### 14. Hak Akses / RBAC (`RolesScreen`)
- **Layout:** master-detail. Left: role list (`320px`, each row = shield icon + name + "{n} izin", active = primary tint + left border). Right: detail card — role name + description + grouped **permission toggles** (switch per permission, showing label + mono permission key like `trip:verify`). "Simpan Izin" action. Info alert: saving permissions changes sidebar visibility for that role.

---

## Newly designed screens (this iteration)

### 15. Volume per Hari / Tonnage Monitoring (`screens-monitor.jsx → MonVolScreen`)
- **Read-only dashboard.** KPI grid (Tonase 7 hari, Bulan ini vs prev, Haul selesai, Rata-rata/haul) → 2-col row: **stacked column chart** (tonnage per day, segmented by waste source) + **donut** (source composition with legend rows) → **ranked table** (tonnage per TPS). Info alert documents the aggregation rule (DISPOSAL legs, DONE/VERIFIED, nightly TPA reconciliation, >5% = anomaly).

### 16. Konsumsi BBM / Fuel Monitoring (`MonFuelScreen`)
- **Read-only dashboard.** KPI grid (approved L, requested L, approval ratio %, avg/haul) → **grouped bar chart** (requested vs approved per vehicle; bar turns **red** when variance < −5%) → vehicle detail table with signed variance % and a status pill (Sesuai / Di bawah / Anomali).

### 17. Laporan / Reports (`ReportsScreen`)
- Card grid of report types (Tonase, Konsumsi BBM, Ringkasan Rute, Retribusi) each with period + format pills + "Hasilkan". **Generate dialog** (date range + format radio + async note). **History table** (report, format pill, size, by, time, status) — DONE rows get a download button, PROCESSING rows show a spinner.

### 18. Pengemudi / Drivers (`screens-master2.jsx → DriversScreen` + `DriverForm`)
- **List:** avatar+name, KTP (mono), employment pill (SATGAS/PNS/HONORER), pool, contact, SIM count, worst-license status pill. **Rows with expiring licenses are tinted yellow; expired tinted red.** A warning alert summarizes licenses needing attention.
- **Form (tabbed dialog, 640px):** **Data Pribadi** tab (KTP* 16-digit validated, Nama*, Status kepegawaian, Tanggal lahir, Pool*, Kontak*, alamat asal/sekarang, pelatihan K3) + **Lisensi (SIM)** tab (license sub-table with class/number/expiry/status, issue + revoke; empty state uses the `no-results` illustration).

### 19. Spot & Rute / Sites & Routes (`SitesScreen` + `SiteForm` + `RouteForm`)
- **Tabbed screen** (Lokasi / Rute). **Sites tab:** type icon + name, type pill (POOL/SPBU/TPS/TPA), address, coordinates. **Routes tab:** origin → destination, RouteCategory pill, distance. **Site form:** name, type segmented choice, address, optional lat/lng (both-or-neither rule) + map-picker dropzone. **Route form:** origin/destination/category/distance with the uniqueness + distinct-endpoints validation alert.

### 20. Sumber Sampah / Waste Sources (`WasteScreen`)
- Table: code chip (mono, primary-tinted), name, notes, assigned-vehicle count. Simple add/edit dialog (code ≤5 unique, name, notes).

### 21. Pengisian Bahan Bakar / Refuel Log (`screens-txn2.jsx → RefuelScreen` + `RefuelLogForm`)
- KPI grid (count, total approved L, estimated cost Rp, flagged anomalies) → table (time, vehicle, driver, fuel, requested/approved L, cost = approved × price/L, SPBU, status pill; approved < requested shown in danger color). **Record dialog** auto-computes estimated cost in a primary panel and gates approved ≤ requested.

### 22. Pemeriksaan Kendaraan / Vehicle Inspection (`InspectScreen`)
- Table (date, vehicle, model, inspector, passed/total, result pill PASS/ATTENTION/FAIL) → **detail Sheet** with a pass-count panel + a 12-item checklist (each item: tick chip OK/Attention/Fail + label + status badge). **Create dialog** uses a switch per checklist item.

### 23. Perawatan / Maintenance (`MaintScreen`)
- KPI grid (total, running, monthly cost Rp, scheduled) → table (code mono, date, vehicle, type pill Servis/Perbaikan, work description, workshop, cost Rp, status pill Terjadwal/Berjalan/Selesai). **Record/edit dialog** (vehicle, date, type, odometer, workshop, cost, work description + documentation dropzone).

---

## Spot Illustrations (where they're used)

Flat-geometric SVGs in `assets/illustrations/` (brand emerald palette). The prototype resolves them via `window.__SWAT_ILL_BASE` (defaults to `illustrations/`; this bundle sets `assets/illustrations/`). A reusable `<Illustration name size/>` component renders them; `<EmptyState art="…">` swaps the old icon chip for an illustration.

| Illustration | Used on |
|---|---|
| `login.svg` | Login screen hero (above the lockup) |
| `empty.svg` | "Belum ada data" empty states (e.g. Kendaraan empty, driver licenses empty) |
| `no-results.svg` | Search returned nothing |
| `server-error.svg` | Table load-failure state ("Gagal memuat data" + retry) |
| `maintenance.svg` | Generic "Segera" / placeholder screen fallback |
| `success.svg`, `offline.svg`, `error.svg`, `no-access.svg`, `not-found.svg`, `loading.svg` | Reserved for confirmation, offline, error-boundary, 403, 404, and full-screen loading states — wire as needed |

**Rule:** illustrations are decorative (`aria-hidden`); the text label always carries the meaning. In dark mode a subtle filter keeps them from glowing.

---

## Status enums → pill mapping

Every status renders as a `Badge` (pill with a leading dot + label — **color is never the only signal**).

| Enum | Label (id-ID) | Pill class | Accent |
|---|---|---|---|
| `TripStatus.IN_PROGRESS` | Belum Selesai | `badge-amber` | warning |
| `TripStatus.DONE` | Selesai | `badge-blue` | info |
| `TripStatus.VERIFIED` | Terverifikasi | `badge-green` | success |
| `ACTIVE` | Berlaku | `badge-green` | success |
| `INACTIVE` | Tidak Berlaku | `badge-slate` | neutral |
| Vehicle `GOOD` | Baik | `badge-green` | success |
| Vehicle `MINOR` | Rusak Ringan | `badge-amber` | warning |
| Vehicle `MAJOR` | Rusak Berat | `badge-red` | danger |
| Vehicle `LOST` | Hilang | `badge-slate` | neutral |
| `PENDING_APPROVAL` | Belum Disetujui | `badge-amber` | warning |
| `APPROVED` | Disetujui | `badge-green` | success |
| User `MUST_CHANGE` | Wajib ganti sandi | `badge-amber` | warning |
| DayStatus `IN_PROGRESS` / `DONE` | Belum Selesai / Selesai | amber / blue | — |
| Inspection `PASS` / `ATTENTION` / `FAIL` | Lolos / Perlu Perhatian / Tidak Lolos | green / amber / red | — |
| Refuel `FLAGGED` | Ditandai | `badge-amber` | warning |
| Maintenance `SCHEDULED` / `IN_PROGRESS` / `DONE` | Terjadwal / Berjalan / Selesai | slate / amber / green | — |
| Driver emp `SATGAS` / `PNS` / `HONORER` | Satgas / PNS / Honorer | blue / green / slate | — |
| License `VALID` / `EXPIRING` / `EXPIRED` | Berlaku / Segera Habis / Kedaluwarsa | green / amber / red | — |
| Report `PROCESSING` | Diproses | `badge-amber` | warning |

---

## Interactions & Behavior

- **Navigation:** SPA routing; clicking sidebar/leaf or in-content links swaps the content area and resets scroll to top. Breadcrumbs reflect IA.
- **Dialogs:** centered modal over a `rgb(15 23 42 / .5)` scrim; Esc closes; click-outside closes (not for destructive `Confirm`). Enter animation: pop (`.16s cubic-bezier(.16,1,.3,1)`).
- **Right-side Sheet** (trip sheet): slides in from right (`.2s`).
- **Toasts:** bottom-right stack; success/info auto-dismiss `3s`, error `5s`; slide-in `.22s`. Variants: success / error / warning / info, each with matching icon + accent.
- **Menus:** click trigger to open, click-outside / Esc closes.
- **Forms:** validate on submit (set `touched`); disabled submit until valid; inline field errors with an alert-circle icon.
- **Theme toggle:** flips `.dark` on `<html>`, persists to `localStorage('swat-theme')`, updates `<meta theme-color>`. An inline `<head>` script applies the saved theme **before paint** to avoid flash.
- **Animations** are transform-only on entrance (never start at `opacity:0`) and are fully disabled under `prefers-reduced-motion: reduce`.

---

## Design Tokens

Port `swat-tokens.css` verbatim. Summary:

**Primary (emerald):** `50 #ecfdf5 · 100 #d1fae5 · 200 #a7f3d0 · 300 #6ee7b7 · 400 #34d399 · 500 #10b981 · 600 #059669 · 700 #047857 · 800 #065f46 · 900 #064e3b · 950 #022c22`. Primary action/fill = `600`; text-accent = `700`.

**Neutral (slate):** `0 #ffffff · 50 #f8fafc · 100 #f1f5f9 · 200 #e2e8f0 · 300 #cbd5e1 · 400 #94a3b8 · 500 #64748b · 600 #475569 · 700 #334155 · 800 #1e293b · 900 #0f172a · 950 #020617`.

**Semantic** (each has 50/100/500/600/700): success `#22c55e/16a34a/15803d`, warning `#f59e0b/d97706/b45309`, danger `#ef4444/dc2626/b91c1c`, info `#3b82f6/2563eb/1d4ed8`.

**Typography:** sans = **Plus Jakarta Sans** (fallback Inter, system-ui); mono = **JetBrains Mono** (plates, codes, IDs, timestamps, numeric cells). Scale: h1 `32/1.25` · h2 `24/1.33` · h3 `20/1.4` · body-lg `18/1.5` · body `16/1.5` · body-sm `14/1.43` · label `14` · tiny `12`. Weights 400/500/600/700.

**Spacing (8px grid):** xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48.

**Radius:** sm 4 · base 6 · lg 8 · full 9999.

**Elevation:** subtle / sm / base / lg (deeper opacities in dark — see token file).

**Z-index:** base 0 · raised 10 · sticky 100 · fixed 200 · overlay 1000 · modal 1010 · popover 1020 · toast 1030 · tooltip 1040.

**Focus ring:** keyboard-only (`:focus-visible`) double ring — `0 0 0 2px var(--ring-offset), 0 0 0 4px var(--ring)`; `--ring = primary-600` (light) / `primary-500` (dark).

**shadcn aliases:** the token file already exposes the shadcn HSL channel variables (`--background`, `--foreground`, `--card`, `--primary`, `--ring`, `--radius`, …) for both themes — drop them straight into a shadcn `globals.css`.

---

## Assets & Icons

- **Brand mark:** emerald rounded-square with a white leaf glyph. SVGs in `assets/` (`swat-mark.svg`, `swat-mark-dark.svg`, `swat-mark-mono.svg`).
- **Icons:** lucide-style 24×24 stroke icons (stroke-width 2). The prototype hand-rolls a small set in `components.jsx`; in the real app **use `lucide-react`** (or the codebase's icon lib) — names map directly (dashboard→`LayoutDashboard`, truck→`Truck`, fuel→`Fuel`, scale→`Scale`, shield→`Shield`, etc.).
- **Spot illustrations:** `assets/illustrations/` (login, empty, loading, error, no-results, no-access, offline, success, server-error, not-found, maintenance) — use for empty/error full-screen states.
- **No raster images** in the UI; everything is tokens + SVG.

---

## Files in this bundle

```
design_handoff_swat_webapp/
├─ README.md                  ← this file
├─ swat-tokens.css            ← design tokens (PORT VERBATIM)
├─ swat-components.css        ← reference component styles
├─ hifi-web.html              ← runnable prototype entry (open in a browser)
├─ prototype_src/             ← all prototype JS/JSX (design reference)
│   ├─ data.js  data2.js  components.jsx  charts.jsx  app.jsx  mobile.jsx  library.jsx
│   └─ screens-auth.jsx  screens-master.jsx  screens-master2.jsx  screens-sched.jsx
│       screens-txn.jsx  screens-monitor.jsx  screens-txn2.jsx  screens-users.jsx
├─ assets/
│   ├─ swat-mark.svg  swat-mark-dark.svg  swat-mark-mono.svg
│   └─ illustrations/*.svg
├─ screenshots/              ← rendered reference images (light + dark, desktop + mobile)
└─ design-system.md           ← full written design-system spec
```

**To run the prototype:** open `hifi-web.html` in a browser (it loads CDN React + Babel). Use it as the behavioral reference while you reimplement screens in the target stack.

---

## Implementation suggestions (non-binding)

- **Stack:** React + TypeScript + Tailwind + shadcn/ui + lucide-react + TanStack Query/Table; React Router; React Hook Form + Zod for the validation rules above.
- Build the **token layer + app shell + Badge/Button/Field/Dialog/Toast** first, then screens in IA order. The transaction module (Haul Board + recording/verify dialogs) is the highest-value, highest-complexity area — budget accordingly.
- Wire the status enums and `id-ID` formatters (`data.js`) early; they're used everywhere.
- Keep the prototype's modes (gallery / viewport toggle) **out** of the product — they exist only to preview the design.
