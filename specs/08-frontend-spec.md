# 08 — Frontend Specification

## 1. Technology Stack

**Framework & UI:**
- Next.js App Router (React 18+) with Server Components for data reads
- React Query (TanStack Query v4+) for client-state mutations and cache management
- react-hook-form + zod for form validation (schemas shared from `packages/schemas`)
- Tailwind CSS + shadcn/ui for components, extended by the **SWAT design system** (see
  [`13-design/01-design-system.md`](./13-design/01-design-system.md) and the canonical
  [`../designs/`](../designs/) bundle). All UI is built from a **reusable token-driven component
  library** in `apps/web/src/components/ui` (28 components) — no one-off styling.
- **Design tokens** ported verbatim from `designs/design_handoff_swat_webapp/swat-tokens.css` into
  `src/app/globals.css` (light + `.dark`); `tailwind.config.ts` from the design system.
- **Dark mode:** `darkMode: ['class']`; toggle persists to `localStorage('swat-theme')`, follows
  `prefers-color-scheme`, applied pre-paint via an inline `<head>` script (no flash). Light is the
  Phase-1 baseline; dark visual QA is Phase 2.
- **Icons:** `lucide-react` (24×24 stroke). **Spot illustrations:** 11 brand SVGs in
  `public/illustrations/` via an `<Illustration>` component (decorative/`aria-hidden`).
- **Charts (Phase 2):** **Recharts** using the prototype's data shapes; the dependency-free SVG charts
  in the design bundle are the visual contract, not the implementation.
- TanStack Table (React Table) for data grids
- next-intl v9+ for i18n (default & only locale: **Indonesian** `id-ID`)

**Build & dev:** npm/pnpm, TypeScript, ESLint, Prettier (configured via hooks)

**PWA:** Next.js manifest, service worker (app-shell caching, Phase 1), web app icons, theme color

**Desktop-first responsive:** operators use desktops and weighbridge terminals; responsive design secondary.

---

## 2. Information Architecture & Navigation

### Role-driven sidebar navigation

Menu visibility derives from user permissions (fetched via `GET /api/current-user`). Structure mirrors module hierarchy:

| Menu group | Subitem | UI label | Permission key |
|-----------|---------|----------|-----------------|
| Dashboard | — | Dasbor | `dashboard:read` |
| Monitoring | TonnageDashboard | Volume per Hari | `monitoring:read` (Phase 2) |
| | FuelDashboard | Konsumsi BBM | `monitoring:read` (Phase 2) |
| | Reports | Laporan | `report:read` (Phase 3) |
| Master Data | Vehicle | Kendaraan | `vehicle:read` |
| | VehicleModel | Model Kendaraan | `vehicle-model:read` |
| | VehicleApplication | Aplikasi | `vehicle-application:read` |
| | Fuel | Bahan Bakar | `fuel:read` |
| | Driver | Pengemudi | `driver:read` |
| | DriverLicense | SIM | `license:read` |
| | Site | Lokasi / Spot | `site:read` |
| | Route | Rute | `route:read` |
| | WasteSource | Sumber Sampah | `waste-source:read` |
| Scheduling | CrewSchedule | Jadwal Kru | `crew-schedule:read` |
| | TripTemplate | Template Trayek | `trip-template:read` |
| | DisposalPermit | Jatah Kitir | `disposal-permit:read` |
| Master Data | VehicleApplication | Aplikasi Kendaraan | `vehicle-application:read` |
| | WasteSource | Sumber Sampah | `waste-source:read` |
| Scheduling | DisposalPermit | Jatah Kitir | `disposal-permit:read` |
| Transactions | TransactionDay | Hari Transaksi (→ Haul Board → Trip Sheet) | `transaction-day:read` |
| | RefuelLog | Pengisian Bahan Bakar | `trip:record-fuel` |
| | VehicleInspection | Pemeriksaan Kendaraan | `inspection:read` |
| | MaintenanceRecord | Perawatan | `maintenance:read` |
| Users & Access | User | Pengguna | `user:read` |
| | Role | Hak Akses | `role:read` |

> Pickup / Disposal / Refuel / Verify / Reconcile are **dialogs/sheets within the Haul Board + Trip
> Sheet** (not separate sidebar items); their permission keys remain `trip:record-pickup`,
> `trip:record-disposal`, `trip:record-fuel`, `trip:verify`. Model Kendaraan / Aplikasi Kendaraan /
> Bahan Bakar are reference-master items (parity G1–G3; see `09-modules/master-fleet.md` & `…/master-waste-fuel.md`).

Example: sidebar collapses on mobile; sticky on desktop. Indonesian labels pulled from glossary.
Sidebar items the user's role lacks `:read` on are **hidden** (not disabled).

### Screen → Module → Phase traceability (full coverage; no orphan, no silent drop)

Every designed screen (`13-design/03-hifi-spec.md`) and every legacy feature maps to a module + build
phase. This is the parity contract.

| Screen (id-ID) | Module spec | Legacy origin | Phase |
|---|---|---|---|
| Login · Ubah Kata Sandi · Profil | `auth.md` | `welcome`,`profil`,`home` | 1 |
| Dasbor | `auth.md`/`monitoring.md` | `home` | 1 |
| Kendaraan (list+form) | `master-fleet.md` | `kendaraan` | 1 |
| Model Kendaraan · Aplikasi Kendaraan · Bahan Bakar *(G1–G3)* | `master-fleet.md` / `master-waste-fuel.md` | `kategorikendaraan`,`aplikasikendaraan`,`bahanbakar` | 1 |
| Pengemudi (+ SIM tab) | `master-personnel.md` | `pengemudi`,`sim`,`kepemilikansim` | 1 |
| Spot & Rute | `master-geography.md` | `spot`,`rute`,`kategori*` | 1 |
| Sumber Sampah | `master-waste-fuel.md` | `kategorisumbersampah*` | 1 |
| Jadwal Kru · Template Trayek | `scheduling.md` | `masterdetailtransaksi`,`mastertrayek` | 1 |
| Jatah Kitir (+ Impor Massal) *(G6,G8)* | `disposal-permits.md` | `jatahkitir`,`importexcel` | 1 |
| Hari Transaksi · Haul Board · Trip Sheet · Pickup/Disposal/Refuel/Verify/Reconcile | `transactions.md` | `transaksi/*`,`inisiasi*`,`monitoringpengangkutan*` | 1 |
| Pengisian Bahan Bakar (log) *(G7)* | `transactions.md` | `pengisianbahanbakar` | 1 |
| Pemeriksaan Kendaraan *(G4)* | `inspection.md` | `pemeriksaankendaraan` | 1 |
| Perawatan *(G5)* | `maintenance.md` | `riwayatperawatan` | 1 |
| Pengguna · Hak Akses (RBAC) | `auth.md` | `pengguna`,`hakakses`,`menu`(superseded) | 1 |
| Volume per Hari (+ Total/Dinas/Swasta) *(G9)* · Konsumsi BBM | `monitoring.md` | `monitoring/tonase*`,`bahanbakar`,`rute*` | 2 |
| Laporan (Tonase/BBM/Rute/Retribusi) · Retribusi/Levy CRUD *(G11,G12)* | `reports.md` | `laporan/*`,`retribusi`,`rekapitulasi` | 3 |
| Weighbridge (no UI; REST API) · Excel weighing upload *(G13,G14)* | `integration-weighbridge.md` | `Soapservers.php`,`importexcel`,`konversi_si_swat` | 4 |
| Aktivitas Pool *(G10)* | covered by Haul Board + reconcile (no separate screen) | `aktivitaspool` | 1 (covered) |
| Menu / Hak Akses Menu / status-enum CRUDs *(G15)* | superseded by permission RBAC + Prisma enums | `menu`,`hakaksesmenu`,`status*` | — (doc-only) |

---

## 3. Master Data CRUD Template

**~12 entities** (Vehicle, Driver, Site, Route, Fuel, WasteSource, VehicleModel, VehicleApplication, FuelCategory, LicenseClass, CrewSchedule, TripTemplate) follow the same pattern:

### List page (`/master-data/{entity}`)

- **Server-fetched table** (Next.js Server Component or Server Action):
  - Columns: configurable (user preference in localStorage)
  - Search: full-text (entity-specific fields)
  - Filter: status, type, date range (entity-specific)
  - Sort: any column (e.g., name, createdAt, status)
  - Pagination: 25/50/100 rows per page (URL param `?page=1&limit=25`)
  - Row actions: Edit, View, Delete (with confirm), Soft/hard delete toggle
  - Empty state: "Belum ada data" with create button
  - Loading: skeleton 10 rows
  - Error state: toast + "Gagal memuat data"

- **Bulk actions:** (Phase 2) select checkbox, export CSV, bulk status change

### Create/Edit form

- **Modal** (most entities) or **dedicated `/edit/{id}` route** (Haul, Trip — complex multi-step)
- **Fields:** per-entity, validated by zod schema
- **Optimistic update:** React Query mutation optimistically updates list; revert on error
- **Success:** toast "Berhasil ditambahkan" / "Berhasil diperbarui", close modal, refetch list
- **Error:** toast "Gagal: {error.message}" (no sensitive data)
- **Submit:** button disabled during loading

### Delete confirmation

- Inline confirmation dialog or modal: "Yakin ingin menghapus {name}?"
- Action: soft-delete (set `deletedAt`); hard-delete only for audit roles
- Optimistic delete (remove from list), revert on error

### Form validation UX

- Real-time validation (onChange, debounced 300ms)
- Inline error messages below field (red text, icon)
- Required field asterisk (*) next to label
- zod schemas from `packages/schemas` (NestJS backend mirrors these)

### Number / date / currency formatting

- **Dates:** `dd/MM/yyyy` (e.g., 15/03/2026) in forms; display `d MMM yyyy` with Indonesian month names in tables (e.g., 15 Juni 2026)
- **Timestamps:** `HH:mm:ss` (24-hour, WIB implied; no timezone picker)
- **Currencies:** `Rp {amount.toLocaleString('id-ID')}` (e.g., Rp 8.500.000) — always show Rp prefix
- **Distance:** `km` suffix (e.g., 15 km)
- **Weight:** `kg` suffix
- **Fuel:** `L` suffix (e.g., 50 L)

---

## 4. Transaction Flow Screens

### 4.1 Transaction Day Management

**List page:** `/transaksi/transaction-days`
- Table: Tanggal (date), Status (Belum Selesai / Selesai), Kendaraan (vehicle/haul count), Tonase (total tonnage), Aksi (actions)
- Action: "Inisiasi Hari" button (POST `/api/transaction-days` with date, creates TransactionDay + seeds Hauls & HaulAssignments from CrewSchedules)
- Idempotent: POST same date = fetch existing day (no duplicate)
- On success: navigate to haul board (`/transaksi/transaction-days/{date}`)

### 4.2 Daily Haul Board

**Route:** `/transaksi/transaction-days/{date}`
- Server-rendered grid: one row per vehicle assignment (haul) that day
- Columns: vehicle plate (Nopol), driver name (Pengemudi), depart time (target/actual), return time (target/actual), trip count (Ritase), status, actions
- Actions: "Edit" (depart/return reconciliation via HaulAssignment), "View trips"
- Trip verification badge: progress count "3/5 Terverifikasi"

### 4.3 Record Pickup (Pengambilan)

**Form:** Modal from haul board or standalone `/transaksi/pengambilan/{haulId}`
- **Step 1 — Select Trip:** choose from `PICKUP` trips on the haul; show target route, time
- **Step 2 — Record actuals:**
  - Actual time (timestamp picker, default now)
  - Actual odometer (integer km, >= depart odometer)
  - Waste source (dropdown, from VehicleWasteSource)
  - Notes (textarea)
- **Submit:** PATCH `/api/trips/{tripId}` with `actualTime`, `actualOdometer`, set status → `DONE`
- Optimistic update, success toast

### 4.4 Record Disposal & Weighing (Pembuangan + Timbangan)

**Form:** Modal from haul board or `/transaksi/pembuangan/{haulId}`
- **Step 1 — Select Trip:** choose from `DISPOSAL` trips in the haul
- **Step 2 — Record weighing:**
  - Berat Kosong / Tare weight (kg, pre-filled from vehicle's `currentTareWeight`, editable; maps to `tareWeight`)
  - Berat Kotor / Gross weight (kg, required, number input; maps to `grossWeight`)
  - Berat Bersih / Net weight (kg, **auto-computed client-side: `grossWeight - tareWeight`**, displayed read-only; show inline validation error if `grossWeight < tareWeight`)
  - Volume Sampah / Waste volume (m³, optional; maps to `wasteVolume`)
  - Waktu Aktual / Actual time, Odometer Aktual / Actual odometer (as pickup form)
  - Catatan / Notes (optional)
- **Validation:** `grossWeight >= tareWeight` enforced on form (disable [Simpan] button if invalid, display red inline error "Berat Kotor harus >= Berat Kosong")
- **Submit:** PATCH `/api/trips/{tripId}` with all fields; server recomputes `netWeight` (never trust client value)
- Success: trip status → `DONE`, vehicle `currentTareWeight` updated to entered tare value, toast "Berhasil dicatat"

### 4.5 Record Fuel (Pengisian Bahan Bakar)

**Form:** Modal from haul board or `/transaksi/fuels/{haulId}`
- **Step 1 — Select Trip:** `REFUEL` trips only
- **Step 2 — Record fuel:**
  - Jenis Bahan Bakar / Fuel product (dropdown, filtered by vehicle model's compatible fuel)
  - Jumlah Diminta / Requested liters (decimal, 2 decimals, required; maps to `fuelRequestedLiters`)
  - Jumlah Disetujui / Approved liters (decimal, default = requested; editable only if user has approval role (e.g., DataAdmin); otherwise disabled/gray background/`cursor: not-allowed`; maps to `fuelApprovedLiters`)
  - Waktu Aktual / Actual time, Odometer Aktual / Actual odometer (as pickup)
  - Catatan / Notes (optional)
- **Validation:** `fuelApprovedLiters <= fuelRequestedLiters` enforced on form submit; if invalid, disable [Simpan] button, show inline red error message "Jumlah Disetujui harus <= Jumlah Diminta"
- **Submit:** PATCH `/api/trips/{tripId}` → status `DONE`, toast "Berhasil dicatat"

### 4.6 Trip Verification (Checker role)

**Route:** `/transaksi/verifikasi/{tripId}` or modal from haul board
- **Checker sees (read-only):** trip summary card showing route, recorded time & odometer, weights/fuel data, recorded-by user name, recorded-at timestamp
- **Actions:** [Tolak] (reject, returns trip to `DONE` with optional notes) or [Terverifikasi] (verify, locks trip in `VERIFIED` state)
- **Verify:** PATCH `/api/trips/{tripId}` with status → `VERIFIED`, set `verifiedById` (checker user ID), `verifiedAt` (timestamp)
- **Reject:** PATCH status → back to `DONE`, save optional `notes` (reason for rejection); trip can be re-recorded and re-verified
- **Locked:** verified trips are read-only in UI (Edit/Delete actions hidden/disabled, tooltip "Sudah terverifikasi") unless supervisor override

### 4.7 Depart/Return Reconciliation

**Modal:** from haul board, HaulAssignment reconciliation
- **Depart:** record actual odometer & time when crew leaves pool
- **Return:** record actual odometer & time when crew returns (updates vehicle `currentOdometer`)
- PATCH `/api/haul-assignments/{id}` with `departActualOdometer`, `departActualTime`, etc.
- Validate: `actual >= target` odometer

---

## 5. Auth Screens

### Login (`/login`)
- **Form:** username, password
- **Password field:** uses the shared `PasswordInput` (eye icon toggles masked/plain; `aria-pressed`)
- **Submit:** POST `/api/auth/login`, set httpOnly session cookie
- **On success:** redirect to `/dashboard` (or referrer)
- **On error:** show inline error "Username atau password salah"
- **Forgot password:** the link goes to `/forgot-password` (no self-service recovery).
- **MFA / second factor:** deferred (Phase 2)

### Forgot Password (`/forgot-password`)
Information-only page — SWAT has no self-service reset. Lists the admin contact channels (WhatsApp / Email / Phone) as deep links (`wa.me` / `mailto:` / `tel:`), configured via `NEXT_PUBLIC_SUPPORT_*` env (`lib/support-contact.ts`); a blank channel is hidden. Plus a "back to sign in" link.

### Change Password (forced on first login)
- **Route:** `/change-password` (automatic redirect if `mustChangePassword = true`)
- **Form:** new password (strength indicator) + confirm — both `PasswordInput`. The **current-password field is shown only for a voluntary change**; on a forced first-login change it is hidden and not sent (the password was just entered at login — see `06-auth-rbac.md §1.4`).
- **Submit:** PATCH `/auth/change-password`; set `mustChangePassword = false` on user
- **Redirect:** post-change, go to dashboard
- **Escape hatch:** the forced screen offers Sign-out (back to `/login`) so a stale/forced session is never trapped

### Profile page (`/profile`)
- **Display:** user name, username, role. Avatar is an initials chip (`UserAvatar`) whose background + ring colour are derived deterministically from the role (`lib/avatar-tone.ts`) — no photo upload.
- **Actions:** change password (always allowed, links to `/change-password`), logout
- **Edit:** PATCH `/api/users/me` (authenticated endpoint)

### Settings page (`/settings`)
Account-level preferences, reachable from the topbar avatar menu (which holds **Profil · Pengaturan · Keluar** — change-password is *not* duplicated here; it lives under Profile). No permission gate.
- **Tampilan (Appearance):** System / Light / Dark via a reusable `SegmentedControl`. "System" clears the stored override and follows the OS; persisted through `theme.ts` (`setThemePreference`).
- **Bahasa (Language):** id-ID / en-US — switches the active locale via `router.replace(pathname, { locale })`, preserving the current route.
- **Tentang (About):** app name, organisation, version (`APP_VERSION`).

---

## 6. PWA Configuration

### Manifest & icons
- `public/manifest.json`: name "SWAT DLH Surabaya", display "standalone", theme color `#0f172a` (slate-900)
- Icons: 192×192, 512×512 PNG (in `public/icons/`)
- Screenshot: 540×720 PNG (optional, for install prompt)

### Service Worker (Phase 1 — app-shell only)
- Cache app shell (HTML, CSS, JS) on install
- Serve cached shell on network offline (show "Anda offline" banner)
- Network-first for API calls (fall back to stale cache if offline)
- Deferral: fleet GPS tracking → Phase 7; true offline data capture + sync → native app (RFC-0003)

### Install prompt
- Auto-prompt after 30s on supported browsers
- Button "Install" in header (Android/Chrome)
- Desktop: show manual "Add to home screen" instructions

---

## 7. Data Fetching & Error Handling

### Server Components (read-only)
- Fetch once at render time via Prisma (backend API route or direct DB in server component)
- Example: list page fetches via `GET /api/vehicles` in Server Component, passes data to `<VehicleList>` Client Component

### Client mutations (React Query)
- All mutations: `useMutation` from `@tanstack/react-query`
- Optimistic updates: `onMutate` update cache, `onError` rollback
- Retry: 2 attempts on network error (exponential backoff)
- Stale time: 5 minutes (refetch if older)

### Error handling
- **Network error:** toast "Koneksi gagal, coba lagi"
- **4xx:** toast + inline form error (e.g., "Nomor polisi sudah ada")
- **5xx:** toast "Terjadi kesalahan server"
- **401:** redirect to login
- **403:** toast "Anda tidak memiliki akses"
- **No sensitive data in error messages** (never expose "foreign key violation" — map to user-friendly text)

### Loading states
- List: skeleton loader (10 placeholder rows)
- Form: submit button shows spinner, disabled
- Polling: `refetchInterval` 30s for live data (Phase 2 dashboards)

### Empty states
- "Belum ada data" + create button
- Icon + clear call-to-action

---

## 8. Folder Structure (`apps/web/`)

```
apps/web/
├── public/
│   ├── icons/ (192, 512)
│   ├── manifest.json
│   └── sw.js (service worker)
├── src/
│   ├── app/ (Next.js App Router)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── change-password/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── master-data/
│   │   │   │   ├── vehicles/page.tsx (list)
│   │   │   │   ├── vehicles/edit/[id]/page.tsx
│   │   │   │   ├── drivers/page.tsx
│   │   │   │   └── ... (other entities)
│   │   │   ├── transaksi/
│   │   │   │   ├── hari-transaksi/page.tsx (list)
│   │   │   │   ├── hari-transaksi/[date]/page.tsx (board)
│   │   │   │   ├── pengambilan/[haulId]/page.tsx
│   │   │   │   ├── pembuangan/[haulId]/page.tsx
│   │   │   │   └── bahan-bakar/[haulId]/page.tsx
│   │   │   ├── pengguna/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── settings/page.tsx (appearance · language · about)
│   │   │   ├── layout.tsx (sidebar, nav)
│   │   │   └── error.tsx, not-found.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   └── change-password/route.ts
│   │   │   ├── current-user/route.ts (permissions)
│   │   │   └── proxy endpoints (forward to backend)
│   │   ├── layout.tsx (root)
│   │   └── page.tsx (redirect to /dashboard)
│   ├── app/
│   │   └── globals.css (design tokens ported VERBATIM from swat-tokens.css: :root + .dark + shadcn HSL)
│   ├── components/
│   │   ├── ui/ (the SWAT design system — 28 reusable shadcn/ui extensions, token-driven)
│   │   │   ├── button.tsx, input.tsx, textarea.tsx, select.tsx, combobox.tsx
│   │   │   ├── checkbox.tsx, radio-group.tsx, switch.tsx, number-input.tsx
│   │   │   ├── date-picker.tsx, time-picker.tsx, form.tsx (FormField)
│   │   │   ├── table.tsx (DataTable), pagination.tsx, dialog.tsx, alert-dialog.tsx (Confirm)
│   │   │   ├── sheet.tsx, tabs.tsx, card.tsx, badge.tsx (status pill), toast.tsx, alert.tsx
│   │   │   ├── breadcrumb.tsx, tooltip.tsx, avatar.tsx, dropdown-menu.tsx
│   │   │   ├── stepper.tsx, dropzone.tsx, progress.tsx, description-list.tsx
│   │   │   ├── skeleton.tsx, empty-state.tsx (illustration-aware)
│   │   │   ├── password-input.tsx (Input + show/hide eye toggle)
│   │   │   └── (matches 13-design/01-design-system.md §3 exactly)
│   │   ├── settings/ (SegmentedControl, AppearanceControl, LanguageControl)
│   │   ├── charts/ (Phase 2 — Recharts: StackedColumns, GroupedColumns, AreaTrend, Donut, KpiCard)
│   │   ├── illustrations/ (Illustration.tsx + Icon.tsx wrapping lucide-react)
│   │   ├── forms/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── VehicleForm.tsx
│   │   │   ├── DriverForm.tsx
│   │   │   ├── PickupForm.tsx
│   │   │   └── ... (entity-specific)
│   │   ├── tables/
│   │   │   ├── VehicleTable.tsx (TanStack Table setup)
│   │   │   ├── DriverTable.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── AuthLayout.tsx
│   │   ├── common/
│   │   │   ├── PermissionGate.tsx (show if has permission)
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Loader.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── modals/
│   │       ├── DeleteConfirmDialog.tsx
│   │       └── (entity modals opened via state/context)
│   ├── hooks/
│   │   ├── useAuth.ts (context)
│   │   ├── useQuery*.ts (React Query wrappers)
│   │   ├── useMutation*.ts
│   │   └── useLocalStorage.ts
│   ├── lib/
│   │   ├── api.ts (fetch helper, error handling)
│   │   ├── auth.ts (session check)
│   │   ├── format.ts (IDR, date, km formatting)
│   │   └── cn.ts (clsx/classnames)
│   ├── schemas/ (symlink or direct import from packages/schemas)
│   │   └── index.ts (zod schemas)
│   ├── types/
│   │   └── index.ts (TypeScript interfaces from API)
│   ├── middleware.ts (next-intl, auth redirect)
│   ├── i18n.ts (next-intl config, id-ID only)
│   └── env.ts (zod validation for env vars)
├── next.config.js (PWA plugin, i18n)
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 9. Accessibility (WCAG AA)

- All form inputs have `<label>` (not placeholder-only)
- Color contrast: 4.5:1 for text (check with Axe)
- Keyboard navigation: Tab order sensible, focus visible, dialogs trap focus
- ARIA: `role="alert"` for toasts, `aria-label` for icon buttons, `aria-disabled` for disabled state
- Screen reader: skip-to-main link, semantic HTML (`<button>`, `<a>` not `<div onclick>`)

---

## 10. Browser Support

- Chrome/Edge 90+ (desktop)
- Safari 14+ (desktop)
- Firefox 88+ (desktop)
- Mobile: secondary (responsive CSS, but primary is desktop kiosk/weighbridge terminal)

---

## 11. Data Validation & UI Conventions

- **Input masking:** numeric fields use `type="number"`; date fields use `type="date"` (browser native)
- **Placeholder text:** never used for labels; used for examples ("e.g., 08:30")
- **Disabled state:** gray background, cursor not-allowed
- **Required fields:** asterisk (*) + `required` attribute
- **Min/max:** native HTML validation + zod server-side validation
- **Tooltips:** hover over question mark icon for field help (Tooltip component from shadcn)

---

## 12. Form Submission & Optimistic Updates

Example flow (React Query + optimistic):

```typescript
const mutation = useMutation({
  mutationFn: (data) => api.post('/api/vehicles', data),
  onMutate: (newVehicle) => {
    // Optimistically add to list
    queryClient.setQueryData(['vehicles'], (old) => [
      ...old, newVehicle
    ])
  },
  onError: (error, vars, context) => {
    // Rollback
    queryClient.invalidateQueries(['vehicles'])
    toast.error('Gagal menambahkan kendaraan')
  },
  onSuccess: () => {
    toast.success('Berhasil ditambahkan')
    closeModal()
    // Refetch to sync
    queryClient.invalidateQueries(['vehicles'])
  }
})
```

All code is English; UI labels are Indonesian (pulled from glossary at build time or runtime via `useTranslations()` from next-intl).
