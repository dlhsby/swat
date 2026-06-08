# 01 — Design System

Single **source of truth** for design tokens, layout foundations, and the component inventory for
**SWAT** (Solid Waste Administration Tracking, DLH Kota Surabaya). Everything here maps 1:1 to
**Tailwind CSS** theme tokens + CSS variables and **shadcn/ui (Radix)** components — no bespoke
framework. Light theme is the required baseline; dark mode ships as a token layer in Phase 1 and is
visually QA'd in Phase 2.

> **English in code, Indonesian in the UI.** All visible labels are Indonesian and must match
> `specs/01-glossary.md` exactly. Never invent a synonym.

> **Token CSS source of truth:** this document mirrors the vendored design bundle. The variable layer
> lives in **`designs/design_handoff_swat_webapp/swat-tokens.css`** — **port it verbatim** into
> `apps/web/src/app/globals.css`. Reference component styles are in
> **`designs/design_handoff_swat_webapp/swat-components.css`**, and the runnable prototype +
> screenshots are under `designs/design_handoff_swat_webapp/`. On any conflict, the bundle wins.

---

## 0. What changed in this revision (refinements over the draft)

These are corrections required to **complete** the system and meet the **WCAG 2.1 AA** hard
constraint. They refine — they do not reverse — the original intent.

1. **Primary ramp completed 50→950** and standardized on the **emerald** scale (the draft mislabelled
   `primary-50` with the `green-50` hex). Brand hue is unchanged.
2. **AA contrast fix for interactive primary.** White text on `primary-600` (#059669) is only
   **3.78:1** — it fails AA for normal text. **Primary fills with white text and primary text/links
   now use `primary-700` (#047857 = 5.49:1).** `primary-600` remains the brand reference color,
   the focus-ring color, and the source for tints (`primary-50`/`-100`) and the sidebar-active
   accent. Hover deepens to `primary-800`.
3. **Font committed:** **Plus Jakarta Sans** (UI) + **JetBrains Mono** (codes, plate numbers,
   kitir, IDs). The draft offered "Inter or Plus Jakarta Sans"; we pick one for stable tokens.
4. **Added components** the build needs: **Textarea, Checkbox, Radio, Switch, Confirm dialog**,
   Combobox, DatePicker/TimePicker, NumberInput, Sheet, Stepper, File Upload/Dropzone, Progress,
   Description List, Dropdown Menu.
5. **Added status mapping for `MaintenanceStatus`** (Belum Disetujui / Disetujui) and the inspection,
   license, refuel, and employment enums.
6. **Added** a formal **z-index scale**, **focus-ring spec**, **shadcn semantic variable layer**,
   a **dark-theme token block**, and a **number / date / currency conventions** section.

---

## 1. Design Tokens

### 1.1 Color — Primary (emerald ramp)

Brand green for DLH / environmental identity. Buttons, links, nav-active, focus.

| Token | Tailwind | Hex | Usage |
|-------|----------|-----|-------|
| `primary-50`  | emerald-50  | `#ecfdf5` | hover/selected backgrounds, nav-active fill |
| `primary-100` | emerald-100 | `#d1fae5` | tints, subtle fills |
| `primary-200` | emerald-200 | `#a7f3d0` | dividers on green surfaces |
| `primary-300` | emerald-300 | `#6ee7b7` | decorative, charts |
| `primary-400` | emerald-400 | `#34d399` | decorative, charts |
| `primary-500` | emerald-500 | `#10b981` | medium accents, large decorative fills |
| `primary-600` | emerald-600 | `#059669` | **brand reference**, focus ring, icon accents |
| `primary-700` | emerald-700 | `#047857` | **primary button fill, links, primary text (AA)** |
| `primary-800` | emerald-800 | `#065f46` | button hover, active |
| `primary-900` | emerald-900 | `#064e3b` | strong headings on light, deepest accent |
| `primary-950` | emerald-950 | `#022c22` | rare; high-contrast text on green tints |

> **Rule:** any white-on-green surface (buttons, badges-filled, active states) uses **`primary-700`
> or darker**. Reserve `primary-600` for non-text accents (icons, 2px borders, focus ring).

### 1.2 Color — Neutral (slate ramp)

Text, surfaces, borders.

| Token | Tailwind | Hex | Usage |
|-------|----------|-----|-------|
| `neutral-0`   | white    | `#ffffff` | page & card background |
| `neutral-50`  | slate-50 | `#f8fafc` | app canvas, zebra rows, sidebar bg |
| `neutral-100` | slate-100| `#f1f5f9` | input/hover bg, alternate rows |
| `neutral-200` | slate-200| `#e2e8f0` | **borders, dividers** |
| `neutral-300` | slate-300| `#cbd5e1` | input hover border, stronger dividers |
| `neutral-400` | slate-400| `#94a3b8` | placeholder, disabled text, muted icons |
| `neutral-500` | slate-500| `#64748b` | secondary text, helper text |
| `neutral-600` | slate-600| `#475569` | body text, form labels |
| `neutral-700` | slate-700| `#334155` | strong text, sub-headings |
| `neutral-800` | slate-800| `#1e293b` | headings, status-pill text (neutral) |
| `neutral-900` | slate-900| `#0f172a` | **primary text, H1**, PWA theme color |
| `neutral-950` | slate-950| `#020617` | max-contrast text (rare) |

### 1.3 Color — Semantic

Standard Tailwind palettes so every value maps to a real class.

| Family | 50 | 100 | 500 | 600 | 700 | Use |
|--------|----|-----|-----|-----|-----|-----|
| **success** (green)  | `#f0fdf4` | `#dcfce7` | `#22c55e` | `#16a34a` | `#15803d` | confirm, verified, done-positive |
| **warning** (amber)  | `#fffbeb` | `#fef3c7` | `#f59e0b` | `#d97706` | `#b45309` | pending, validation, caution |
| **danger** (red)     | `#fef2f2` | `#fee2e2` | `#ef4444` | `#dc2626` | `#b91c1c` | delete, reject, critical |
| **info** (blue)      | `#eff6ff` | `#dbeafe` | `#3b82f6` | `#2563eb` | `#1d4ed8` | hints, done-neutral |

> Success (green) is intentionally distinct from brand primary (emerald): brand = action surfaces,
> success = state confirmation. Use `-600`/`-700` for solid fills with white text (all ≥4.5:1),
> `-500` for icons on light, `-50`/`-100` for tinted banners/badges.

### 1.4 Status tokens → domain enums (1:1)

Pill style: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-tiny font-semibold`,
background `-100`, text `-700` (neutral statuses use slate). All combinations verified **≥4.5:1**.
A leading dot (`-500`) or icon reinforces state so **color is never the sole indicator**.

| Enum value | UI label (id-ID) | Pill bg → text | Tailwind |
|-----------|------------------|----------------|----------|
| `TripStatus.IN_PROGRESS` | Belum Selesai | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |
| `TripStatus.DONE` | Selesai | blue-100 → blue-700 | `bg-blue-100 text-blue-700` |
| `TripStatus.VERIFIED` | Terverifikasi | green-100 → green-700 | `bg-green-100 text-green-700` |
| `DayStatus.IN_PROGRESS` | Belum Selesai | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |
| `DayStatus.DONE` | Selesai | blue-100 → blue-700 | `bg-blue-100 text-blue-700` |
| `FuelQuotaStatus.ACTIVE` | Berlaku | green-100 → green-700 | `bg-green-100 text-green-700` |
| `FuelQuotaStatus.INACTIVE` | Tidak Berlaku | slate-100 → slate-700 | `bg-slate-100 text-slate-700` |
| `VehicleStatus.GOOD` | Baik | green-100 → green-700 | `bg-green-100 text-green-700` |
| `VehicleStatus.MINOR_DAMAGE` | Rusak Ringan | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |
| `VehicleStatus.MAJOR_DAMAGE` | Rusak Berat | red-100 → red-700 | `bg-red-100 text-red-700` |
| `VehicleStatus.LOST` | Hilang | slate-100 → slate-700 | `bg-slate-100 text-slate-700` |
| `MaintenanceStatus.PENDING_APPROVAL` | Belum Disetujui | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |
| `MaintenanceStatus.APPROVED` | Disetujui | green-100 → green-700 | `bg-green-100 text-green-700` |
| `MaintenanceType.SERVICE` | Servis | blue-100 → blue-700 | `bg-blue-100 text-blue-700` |
| `MaintenanceType.REPAIR` | Perbaikan | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |
| `InspectionResult.PASS` | Lolos | green-100 → green-700 | `bg-green-100 text-green-700` |
| `InspectionResult.ATTENTION` | Perlu Perhatian | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |
| `InspectionResult.FAIL` | Tidak Lolos | red-100 → red-700 | `bg-red-100 text-red-700` |
| `EmploymentStatus.SATGAS` | Satgas | blue-100 → blue-700 | `bg-blue-100 text-blue-700` |
| `EmploymentStatus.PNS` | PNS | green-100 → green-700 | `bg-green-100 text-green-700` |
| `EmploymentStatus.HONORER` | Honorer | slate-100 → slate-700 | `bg-slate-100 text-slate-700` |
| `LicenseStatus.VALID` | Berlaku | green-100 → green-700 | `bg-green-100 text-green-700` |
| `LicenseStatus.EXPIRING` | Segera Habis | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |
| `LicenseStatus.EXPIRED` | Kedaluwarsa | red-100 → red-700 | `bg-red-100 text-red-700` |
| `RefuelStatus.FLAGGED` | Ditandai | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |
| `ReportStatus.PROCESSING` | Diproses | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |
| `UserStatus.MUST_CHANGE` | Wajib ganti sandi | amber-100 → amber-700 | `bg-amber-100 text-amber-700` |

**Semantic grouping** (keeps the visual language learnable):
`amber` = in-progress / pending · `blue` = done (awaiting verification) / service · `green` = verified /
good / approved / active · `red` = damaged-critical / expired · `slate` = inactive / lost / archived.

### 1.5 Typography

**Families**
- **UI:** `'Plus Jakarta Sans'`, fallback `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Mono:** `'JetBrains Mono'`, fallback `ui-monospace, 'SF Mono', 'Cascadia Code', monospace` —
  plate numbers (`L 1234 AB`), kitir codes, IDs, timestamps in dense cells.
- **Numeric columns:** enable `font-variant-numeric: tabular-nums` so figures align.

**Type scale** (px / line-height / weight)

| Token | px | line-height | weight | Usage |
|-------|----|----|--------|-------|
| `h1` | 32 | 1.25 | 700 | page title |
| `h2` | 24 | 1.33 | 700 | section heading |
| `h3` | 20 | 1.40 | 600 | subsection / modal title |
| `body-lg` | 18 | 1.50 | 400 | lead paragraph |
| `body` | 16 | 1.50 | 400 | **default**, field values |
| `body-sm` | 14 | 1.43 | 400 | secondary text, table cells |
| `label` | 14 | 1.43 | 500 | form labels, table headers |
| `tiny` | 12 | 1.50 | 500 | badges, helper/error text, captions |

**Weights:** 400 regular · 500 medium (labels) · 600 semibold (headings, buttons) · 700 bold (H1/H2).

### 1.6 Spacing (8px grid)

| Token | px | rem | Usage |
|-------|----|----|----|
| `space-xs`  | 4  | .25  | icon gaps, badge padding |
| `space-sm`  | 8  | .5   | tight groupings, label→field |
| `space-md`  | 12 | .75  | input padding, button padding-x |
| `space-lg`  | 16 | 1    | card padding, field→field |
| `space-xl`  | 24 | 1.5  | section gaps, content gutter |
| `space-2xl` | 32 | 2    | page padding top/bottom |
| `space-3xl` | 48 | 3    | major separations (rare) |

### 1.7 Border radius

| Token | px | Usage |
|-------|----|----|
| `radius-sm`   | 4    | badges, tags, checkbox |
| `radius-base` | 6    | **default** — inputs, buttons, cards, menus |
| `radius-lg`   | 8    | dialogs, sheets, large cards |
| `radius-full` | 9999 | pills, avatars, switch |

### 1.8 Shadows / elevation

Flat by default; elevation only signals floating layers. (Dark mode deepens opacities — see §1.12.)

| Token | CSS | Usage |
|-------|-----|--------|
| `shadow-none`   | none | flat UI (default) |
| `shadow-subtle` | `0 1px 2px 0 rgb(0 0 0 / .05)` | resting cards, input focus halo base |
| `shadow-sm`     | `0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)` | hover cards |
| `shadow-base`   | `0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)` | dropdowns, popovers, toasts |
| `shadow-lg`     | `0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)` | dialogs, sheets |

### 1.9 Z-index scale

| Token | value | Layer |
|-------|-------|-------|
| `z-base`    | 0    | document flow |
| `z-raised`  | 10   | sticky table header, raised cards |
| `z-sticky`  | 100  | topbar |
| `z-fixed`   | 200  | sidebar / mobile drawer |
| `z-overlay` | 1000 | dialog & sheet backdrop |
| `z-modal`   | 1010 | dialog & sheet panel |
| `z-popover` | 1020 | select, combobox, dropdown, datepicker, popover |
| `z-toast`   | 1030 | toast stack |
| `z-tooltip` | 1040 | tooltip (always on top) |

### 1.10 Focus ring (WCAG 2.1 AA, 2.4.7)

One ring for everything; always visible on keyboard focus.

```css
/* applied via :focus-visible only — never on mouse click */
--ring: #059669;                 /* primary-600 (primary-500 in dark) */
--ring-offset: #ffffff;          /* page bg; use surface color on tinted areas */
:where(button,a,input,select,textarea,[role="button"],[tabindex]):focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ring-offset), 0 0 0 4px var(--ring);
  border-radius: var(--radius-base);
}
```
On `danger` controls, swap `--ring` to `danger-600`. Focus ring contrast vs. white ≥ 3:1 (passes).

### 1.11 Breakpoints (desktop-first targets, mobile-first CSS)

| Token | px | Target |
|-------|----|----|
| `sm` | 640  | large phone |
| `md` | 768  | tablet (secondary) |
| `lg` | 1024 | desktop (sidebar persists ≥ this) |
| `xl` | 1280 | **primary design target band** |
| `2xl`| 1536 | wide desktop / kiosk |

Primary canvas: **1440px**. Data tables must show 25 rows without horizontal scroll at ≥1280px.

### 1.12 Dark theme (token layer ships Phase 1; visual QA Phase 2)

Applied via `.dark` on `<html>`. The neutral ramp is re-tuned for dark surfaces so every existing
`var(--neutral-*)` usage flips correctly (`neutral-0` = card surface … `neutral-900` = near-white
text). Brand & semantic hues are unchanged; the `50/100` steps become deep low-chroma fills and the
`700` steps brighten so badge/alert/icon text stays legible; interactive accents brighten in the
component layer; elevation opacities deepen. **Port the exact values from
`designs/design_handoff_swat_webapp/swat-tokens.css` (`.dark { … }`)** — do not hand-tune.

---

## 2. Layout Foundations

### 2.1 App shell

```
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR  h76  ·  ☰  logo  "SWAT · DLH Surabaya"   ☼  🔔  avatar▾  │ z-sticky
├──────────────┬───────────────────────────────────────────────────┤
│ SIDEBAR w256 │ CONTENT  (recessed canvas)                         │
│ slate-50     │ ┌ breadcrumb ─────────────────────────────────┐   │
│ groups:      │ │ H1 page title              [primary action] │   │
│ • Dasbor     │ ├──────────────────────────────────────────────┤  │
│ • Monitoring │ │ toolbar / cards / table / form               │  │
│ • Master Data│ │ container max-w 1400 · pad 2xl y / xl x       │  │
│ • Penjadwalan│ │                                              │   │
│ • Transaksi  │ └──────────────────────────────────────────────┘  │
│ • Pengguna   │                                                    │
└──────────────┴───────────────────────────────────────────────────┘
    z-fixed         canvas: neutral-100 (light) / neutral-50 (dark)
```

**Topbar** — h `76`, bg `neutral-0`, border-bottom `1px neutral-200`, subtle drop shadow,
`position: sticky; top:0`, `z-sticky`. Left: hamburger (mobile/collapse) + brand mark (40×40,
radius 10) + "SWAT · DLH Surabaya". Right: theme toggle (sun/moon), notification bell (red-dot
indicator), user menu (avatar 38px + name + role → dropdown: Profil / Ubah Kata Sandi / Keluar).

**Content canvas** is intentionally **recessed** relative to the topbar for contrast: `neutral-100`
in light, `neutral-50` in dark. Inner container `max-width 1400`, padding `32px` (2xl) block /
`24px` (xl) inline (`24px` < 1280px wide).

**Sidebar** — w `256` (collapses to a `64px` icon rail or off-canvas drawer < `lg`), bg `neutral-50`,
border-right `1px neutral-200`, `z-fixed`. Nav groups from the `08-frontend-spec` IA, filtered by
permission (items the user lacks `:read` on are **hidden**, not disabled).
- group label: uppercase `10.5px`, letter-spacing `.07em`, `neutral-400`, padding `12px 16px 4px`
- leaf link: `13px`, `neutral-600`, padding `8px 16px`, gap `8px`, 20px icon
- hover: bg `neutral-100`, text `neutral-900`
- **active:** bg `primary-50`, text `primary-700`, left border `3px primary-600`, weight 600
- not-yet-built items show a "Segera" pill.

### 2.2 Grid

12-column fluid grid, gutter `24px` (xl), inside the 1400 container. Forms use a single column (max
`640` readable width) or 2-col field rows on `≥ lg`; dashboard cards 4-up on `xl`, 2-up on `md`,
1-up on `sm`.

### 2.3 Page templates (structure & spacing only)

**A. List** (master-data & transaction lists)
`breadcrumb → H1 + [Buat Baru] → toolbar(search · filter · column-toggle) → DataTable → pagination`.
Empty / loading(skeleton ×10) / no-results / error states per §3.11. Toolbar–table gap `16px`;
table–pagination `16px`.

**B. Form** (create/edit)
`breadcrumb → H1 → Card section(s) of FormFields → sticky footer [Batal][Simpan]`. Fieldsets grouped
in cards (pad `16px`, gap `24px` between cards); field→field `16px`; sticky footer border-top
`1px neutral-200`, bg `neutral-0`, pad `16px 24px`. Modal variant for simple entities (§3.12).

**C. Detail / Board** (Daily Haul Board)
`H2 + date label + DayStatus pill → one Card row per haul`. Row: plate(mono) · driver · verification
badge · target/actual times · Ritase · row actions. Verification progress "3/5 Terverifikasi". Row
pad `16px`, gap `12px`. Empty: "Belum ada kendaraan hari ini".

**D. Dashboard**
`H1 greeting → metric Card grid (4-up xl / 2-up md / 1-up sm) → 2-col content row`. Metric card: icon
chip (36px), `label` title, `h1`-size value (tabular-nums) + unit suffix, optional delta line
(up = success-700, down = danger-600).

---

## 3. Component Inventory (shadcn/ui mapped)

All components are **reusable shadcn/ui extensions** built from the token layer (no one-off styling).
Each entry: **purpose · variants · sizes · states · rules**. States referenced everywhere:
`default · hover · focus(-visible) · active · disabled · loading · error`. Disabled = `opacity .5`,
`cursor: not-allowed`, `aria-disabled`. Loading = spinner + `aria-busy`, control non-interactive.

### 3.1 Button — `<Button>`
- **Purpose:** trigger actions; one primary per view region.
- **Variants:** `primary` (bg `primary-700`, text white, hover `primary-800`, active `primary-900`) ·
  `secondary` (bg `neutral-100`, text `neutral-900`, border `neutral-200`, hover `neutral-200`) ·
  `outline` (border `neutral-300`, text `neutral-700`, hover bg `neutral-50`) ·
  `ghost` (transparent, text `primary-700`, hover bg `primary-50`) ·
  `destructive` (bg `danger-600`, text white, hover `danger-700`, focus ring `danger-600`) ·
  `link` (text `primary-700`, underline on hover, no padding).
- **Sizes:** `sm` 32h / `text-body-sm` / pad `8px 12px` / radius 4 · `md` 40h / `text-body` / pad
  `10px 16px` / radius 6 (default) · `lg` 44h / pad `12px 20px` / radius 6 · `icon` 40×40 square.
  44px min touch target on the weighbridge kiosk / coarse pointers.
- **States:** loading shows leading spinner, keeps width, label → "Memuat…" optional; disabled per
  above. Icon+label gap `8px`; icon-only requires `aria-label`.
- **Rules:** CTA = primary · cancel/back = secondary or ghost · delete/reject = destructive ·
  navigation = link/ghost. Indonesian imperatives: "Simpan", "Batal", "Hapus", "Terverifikasi".

### 3.2 Input — `<Input>` (text · email · number · tel)
- Border `1px neutral-200`, radius 6, pad `10px 12px`, `text-body`, bg `neutral-0`, h `40`.
- **States:** hover border `neutral-300` · focus border `primary-600` + focus halo · error border
  `danger-500` + ring `danger` · disabled bg `neutral-100` text `neutral-400`.
- Leading/trailing slot for icon or unit suffix (km, kg, L) rendered in `neutral-500`.
- Always paired with a real `<label>` (no placeholder-only). Placeholder = example only ("mis. 08:30").

### 3.3 Textarea — `<Textarea>`
- Same border/focus/error tokens as Input; `min-height 88px` (≈3 rows), `resize: vertical`,
  line-height 1.5. Used for "Catatan". Optional char counter (`tiny`, `neutral-400`, bottom-right).

### 3.4 Select — `<Select>` (Radix)
- Trigger styled as Input (chevron `neutral-400`). Content: bg `neutral-0`, radius 6, `shadow-base`,
  `z-popover`, max-h `300`, scroll on overflow.
- Item: pad `8px 12px`, hover bg `neutral-100`; selected bg `primary-50` text `primary-700` + check.
- Keyboard: type-ahead, ↑/↓, Enter, Esc. Placeholder ("Pilih…") in `neutral-400`.

### 3.5 Combobox (searchable) — `<Command>` in `<Popover>`
- Input + filterable list (case-insensitive, debounce 150ms). Keyboard ↑/↓ / Enter / Esc.
- Empty: "Tidak ada opsi". Used for vehicle/driver/site/route pickers (large option sets).

### 3.6 DatePicker — `<Popover>` + `<Calendar>`
- Display & entry **`dd/MM/yyyy`** (e.g. `15/03/2026`); stored ISO. Trigger = Input + calendar icon.
- Calendar grid 7×6; today ring `primary-600`; selected bg `primary-700` text white; range tint
  `primary-50`. Keyboard arrows navigate, Enter selects, Esc closes. Indonesian month/day names.
- Native `<input type="date">` is an acceptable fallback on kiosks.

### 3.7 TimePicker — Input (`HH:mm` / `HH:mm:ss`, 24-hour, WIB)
- Masked text entry + clock icon; quick presets "Sekarang", "08:00", "12:00", "16:00".
- Default value = now for actual-time fields. Native `<input type="time">` acceptable.

### 3.8 NumberInput — `<Input type="number">`
- Tabular figures; no spinner by default (keyboard entry). Optional ± stepper (`icon-sm` buttons).
- `min`/`max`/`step` enforced (HTML + zod). Unit suffix slot (kg/km/L). Format on blur where useful
  (fuel `45` → `45,00`). Right-align numeric values in tables.

### 3.9 Form Field — `<FormField>` (label · control · help · error)
```
Label *  (?)        ← label 500 neutral-900, asterisk primary-700, tooltip ? neutral-400
[ control ]         ← full width
Help text           ← tiny neutral-500, 4px top
⚠ Error message     ← tiny danger-600, 4px top, role replaces help when present
```
- Required `*` immediately after label text. `aria-describedby` links help/error to the control;
  error sets `aria-invalid`. Validation onChange debounced 300ms. Reserve vertical space for error
  to avoid layout shift. react-hook-form + zod; schemas from `packages/schemas`.

### 3.10 Checkbox · Radio · Switch
- **Checkbox** (`<Checkbox>`): 16×16, radius 4, border `neutral-300`; checked bg `primary-700` +
  white check; focus ring; supports indeterminate (column "select all"). Label clickable, gap `8px`.
- **Radio** (`<RadioGroup>`): 16×16 circle; selected = `primary-700` dot. One choice per group;
  group has `<legend>`/`aria-label`.
- **Switch** (`<Switch>`): track 36×20 radius-full; off `neutral-300`, on `primary-700`; 16px thumb,
  `200ms` ease. For instant boolean settings (e.g. status Active/Inactive, RBAC permission toggles);
  destructive toggles still confirm.

### 3.11 DataTable — TanStack Table + shadcn `<Table>`
- **Toolbar:** search Input ("Cari… (mis. nomor polisi)", debounce 300ms) · Filter (Popover:
  status / type / date-range) · Column-toggle (Popover of checkboxes) · optional bulk actions (P2).
- **Header:** `label`, `neutral-600`, bg `neutral-50`, sticky (`z-raised`); sortable cells show ↕ /
  ↑ / ↓ and toggle on click/Enter (`aria-sort`).
- **Body:** cell pad `12px`; `body-sm`; row hover bg `neutral-50`; optional zebra (`neutral-50`);
  numeric right-aligned tabular; codes in mono. Selectable rows via leading checkbox.
- **Row actions:** trailing fixed ~80px column — icon buttons (Lihat / Ubah / Hapus) or "⋮" menu;
  destructive opens Confirm dialog (§3.13).
- **Pagination:** "Menampilkan 1–25 dari 100" (left) · ‹ Sebelumnya · "Halaman 1 dari 10" ·
  Selanjutnya › · rows-per-page Select 25/50/100 (default 25, right). Stacks on `< md`.
- **Empty:** centered `empty` illustration + "Belum ada data" + [Buat Baru].
- **No-results:** `no-results` illustration + "Tidak ada hasil pencarian".
- **Loading:** 10 skeleton rows (shimmer bars at row height).
- **Error:** `server-error` illustration + "Gagal memuat data" + [Coba Lagi] (secondary).
- **< md:** collapses to stacked **table-cards** (label→value rows) per `swat-components.css` `.tcards`.

### 3.12 Dialog / Modal — `<Dialog>`
- Backdrop `rgb(15 23 42 / .5)` `z-overlay`; panel `neutral-0`, radius 8, `shadow-lg`, `z-modal`,
  width `min(90vw, 520px)`, pad `24px`. Header `h3` + close ✕ (`aria-label="Tutup"`). Footer
  right-aligned [Batal][Simpan], margin-top `24px`. Focus trapped; Esc closes (block if form dirty);
  overlay click optional. Enter animation: pop (`.16s cubic-bezier(.16,1,.3,1)`).
  `role="dialog" aria-modal="true"`, labelled by title. **< sm:** becomes a bottom sheet (slide-up).

### 3.13 Confirm dialog — `<AlertDialog>`
- Purpose: gate destructive/irreversible actions. Width `min(90vw, 420px)`. Title states the action
  ("Hapus kendaraan?"), body names the target ("Yakin ingin menghapus **L 1234 AB**? Tindakan ini
  tidak dapat dibatalkan."). Footer [Batal] (secondary, autofocus) + [Hapus] (destructive). No close
  ✕ — an explicit choice is required. `role="alertdialog"`.

### 3.14 Sheet — `<Sheet>`
- Side panel for heavy/contextual flows (Trip Sheet, inspection detail, multi-field reconciliation).
  Slides from right (desktop) / bottom (mobile), width `420–520`, `shadow-lg`, `z-modal`, `200ms`
  ease. Same header/body/footer contract as Dialog.

### 3.15 Tabs — `<Tabs>`
- Horizontal list; trigger pad `10px 16px`, border-bottom `2px transparent`; active text
  `primary-700` + border-bottom `primary-600`, weight 600; hover text `neutral-900`. `role="tablist"`,
  arrow-key roving focus. Panel pad `16px 0`. Use for driver Data Pribadi/SIM, Spot/Rute, report types.

### 3.16 Card — `<Card>`
- bg `neutral-0`, border `1px neutral-200`, radius 6/8, pad `16px`. Variants: default · clickable
  (hover `shadow-sm`, cursor pointer) · outlined (no shadow) · elevated (`shadow-base`). Optional
  header (title `label`/`h3` + actions), body, footer. Used for form sections, metrics, haul rows.

### 3.17 Badge / Status Pill — `<Badge>`
- See §1.4 for the enum→token map. Base: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5
  text-tiny font-semibold`. Variants: `solid` (status tints, default) · `outline` (border + tinted
  text, transparent bg) · `count` (neutral, numeric e.g. "3/5"). Always include text or an icon/dot —
  never color alone.

### 3.18 Toast — `<Toaster>` (sonner / Radix)
- Bottom-right, `16px` inset, `z-toast`, stack newest-on-top. bg `neutral-0`, border-left `4px`
  (variant color), radius 6, `shadow-base`, pad `12px 16px`, `body-sm`, icon + message + close.
- Variants: success ("Berhasil", green) · error ("Gagal", red) · warning ("Peringatan", amber) ·
  info ("Informasi", blue). Auto-dismiss success/info 3s / error 5s (manual close allowed).
  `role="status"` (success/info) or `role="alert"` (error/warning). Slide-in `.22s`.

### 3.19 Alert (banner) — `<Alert>`
- In-page notice. Pad `12px 16px`, radius 6, border-left `3px`, bg variant `-50`, icon + title +
  message + optional close. Variants success/warning/danger/info. Used for offline banner
  ("Anda sedang offline"), validation summaries, important notices. Inline field error is the
  Form Field error (§3.9), not this.

### 3.20 Breadcrumb — `<Breadcrumb>`
- `body-sm`; links `primary-700` (underline on hover); separator `/` `neutral-400`; current page
  `neutral-600`, `aria-current="page"`. e.g. `Master Data / Kendaraan / Ubah`.

### 3.21 Tooltip — `<Tooltip>`
- Trigger hover/focus on `?`/icon. bg `neutral-900`, text white, `tiny`, pad `6px 8px`, radius 6,
  max-w `220`, arrow, `shadow-base`, `z-tooltip`. `role="tooltip"`; never the only place critical
  info lives. ~150ms open delay.

### 3.22 Pagination — `<Pagination>`
- Standalone variant of the DataTable footer controls (§3.11) for non-table lists. Prev/next +
  numbered pages (current = `primary-700` filled), disabled at edges (`aria-disabled`).

### 3.23 Avatar — `<Avatar>`
- 40px circle (32px in dense menus), bg `primary-100`, text `primary-800` initials (semibold),
  border `1px neutral-200`. Fallback user icon. Tooltip = full name. Topbar user menu trigger.

### 3.24 Dropdown Menu — `<DropdownMenu>` (Radix)
- **Purpose:** contextual action lists — DataTable row "⋮" actions, topbar user menu.
- Content: bg `neutral-0`, border `neutral-200`, radius 6, `shadow-base`, `z-popover`, pad 6.
  Item pad `8px 10px`, radius 4, hover bg `neutral-100`; leading icon slot (`neutral-400`).
  Group label (`tiny`, `neutral-400`, uppercase); separator 1px `neutral-200`; destructive item
  `danger-600` text + `danger-50` hover. Keyboard ↑/↓ / Enter / Esc, roving focus.

### 3.25 Stepper / Steps
- **Purpose:** multi-step transaction forms (Pickup / Disposal / Fuel: "Pilih Trayek → Catat →
  Konfirmasi"). Horizontal node + connector. **done** = `primary-700` filled + check; **active** =
  `primary-50` fill, `2px primary-600` ring, `primary-700` label; **upcoming** = `neutral-100` fill,
  `neutral-400` text. Connector 2px, `primary-600` once the prior step is done. Expose `aria-current`
  on the active step; on mobile, collapse to "Langkah 2 dari 3".

### 3.26 File Upload / Dropzone
- **Purpose:** documentation photos (weighing, vehicle, maintenance, inspection — `Photo` relations).
- Dropzone: `2px dashed neutral-300`, radius 8, bg `neutral-50`, centered icon + prompt; hover →
  `primary-500` border + `primary-50` bg. Accept JPG/PNG, state max size in help text. Uploaded
  file row: thumbnail + name + **Progress** bar + percent; remove (✕) + retry on error. Validate
  type/size client-side; never trust client. (Dark mode uses `neutral-100` surface — do not put a
  themed-variable `background` inside a CSS `transition`; it can leave a stale color on theme switch.)

### 3.27 Progress — `<Progress>`
- Track `neutral-200`, radius full, height 8; fill `primary-600`. Determinate (upload %, fuel-quota
  usage, password strength) or indeterminate (animated sweep). Pair with a numeric/text label for
  screen readers (`role="progressbar"` + `aria-valuenow`).

### 3.28 Description List — `<dl>`
- **Purpose:** read-only key→value detail, especially the **Checker verification summary** (route,
  recorded time/odometer, weights, recorded-by). Two-column grid: term `neutral-500` left, value
  `neutral-900` medium right-aligned, `1px neutral-100` row dividers. Numeric values tabular; codes
  mono. The canonical read-only counterpart to the Form Field.

> **Supporting primitives** (also token-driven, in `swat-components.css`): **Skeleton** (shimmer
> loading bars), **EmptyState** (illustration-aware), **Illustration** (`<Illustration name size/>`,
> decorative/`aria-hidden`), **Icon** (lucide-react), **Charts** (Phase 2 — see §3.11 + `08-frontend-spec`).

---

## 4. State Matrices

**Button**
| State | bg | border | text | shadow |
|------|----|--------|------|--------|
| default | primary-700 | none | white | none |
| hover | primary-800 | none | white | subtle |
| active | primary-900 | none | white | subtle |
| focus-visible | primary-700 | — | white | ring (primary-600) |
| disabled | neutral-100 | neutral-200 | neutral-400 | none |
| loading | primary-700 | none | white + spinner | subtle |

**Input**
| State | border | bg | text |
|------|--------|----|----|
| default | neutral-200 | neutral-0 | neutral-900 |
| hover | neutral-300 | neutral-0 | neutral-900 |
| focus | primary-600 + halo | neutral-0 | neutral-900 |
| error | danger-500 + danger ring | neutral-0 | neutral-900 |
| disabled | neutral-200 | neutral-100 | neutral-400 |

---

## 5. Token integration

### 5.1 Tailwind theme extension (`tailwind.config.ts`)

```ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',
          500:'#10b981',600:'#059669',700:'#047857',800:'#065f46',900:'#064e3b',950:'#022c22' },
        neutral: { 0:'#ffffff',50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',
          400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a',950:'#020617' },
        success: { 50:'#f0fdf4',100:'#dcfce7',500:'#22c55e',600:'#16a34a',700:'#15803d' },
        warning: { 50:'#fffbeb',100:'#fef3c7',500:'#f59e0b',600:'#d97706',700:'#b45309' },
        danger:  { 50:'#fef2f2',100:'#fee2e2',500:'#ef4444',600:'#dc2626',700:'#b91c1c' },
        info:    { 50:'#eff6ff',100:'#dbeafe',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8' },
        // shadcn semantic aliases (read from CSS vars, see 5.2)
        border:'hsl(var(--border))', input:'hsl(var(--input))', ring:'hsl(var(--ring))',
        background:'hsl(var(--background))', foreground:'hsl(var(--foreground))',
        muted:{ DEFAULT:'hsl(var(--muted))', foreground:'hsl(var(--muted-foreground))' },
        card:{ DEFAULT:'hsl(var(--card))', foreground:'hsl(var(--card-foreground))' },
        popover:{ DEFAULT:'hsl(var(--popover))', foreground:'hsl(var(--popover-foreground))' },
        destructive:{ DEFAULT:'hsl(var(--destructive))', foreground:'hsl(var(--destructive-foreground))' },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans','Inter','system-ui','sans-serif'],
        mono: ['JetBrains Mono','ui-monospace','monospace'],
      },
      fontSize: {
        h1:['32px',{lineHeight:'1.25',fontWeight:'700'}],
        h2:['24px',{lineHeight:'1.33',fontWeight:'700'}],
        h3:['20px',{lineHeight:'1.4',fontWeight:'600'}],
        'body-lg':['18px',{lineHeight:'1.5'}],
        body:['16px',{lineHeight:'1.5'}],
        'body-sm':['14px',{lineHeight:'1.43'}],
        label:['14px',{lineHeight:'1.43',fontWeight:'500'}],
        tiny:['12px',{lineHeight:'1.5',fontWeight:'500'}],
      },
      spacing: { xs:'4px', sm:'8px', md:'12px', lg:'16px', xl:'24px', '2xl':'32px', '3xl':'48px' },
      borderRadius: { sm:'4px', base:'6px', lg:'8px' },
      boxShadow: {
        subtle:'0 1px 2px 0 rgb(0 0 0 / .05)',
        sm:'0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)',
        base:'0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)',
        lg:'0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)',
      },
      zIndex: { raised:'10', sticky:'100', fixed:'200', overlay:'1000', modal:'1010',
        popover:'1020', toast:'1030', tooltip:'1040' },
      screens: { sm:'640px', md:'768px', lg:'1024px', xl:'1280px', '2xl':'1536px' },
    },
  },
} satisfies Config
```

### 5.2 shadcn semantic variable layer (`:root`, light theme)

shadcn reads HSL channel values. Primary maps to **`primary-700`** so default button/link text on
primary passes AA. Port `:root` **and** `.dark` exactly from `swat-tokens.css`.

```css
:root {
  --background: 0 0% 100%;          /* neutral-0  */
  --foreground: 222 47% 11%;        /* neutral-900 */
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  --muted: 210 40% 96%;             /* neutral-100 */
  --muted-foreground: 215 16% 47%;  /* neutral-500 */
  --border: 214 32% 91%;            /* neutral-200 */
  --input: 214 32% 91%;
  --ring: 160 84% 31%;              /* primary-600  (focus) */
  --primary: 162 94% 24%;           /* primary-700  (#047857) */
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96%;         /* neutral-100 */
  --secondary-foreground: 222 47% 11%;
  --accent: 152 76% 96%;            /* primary-50  */
  --accent-foreground: 162 94% 24%;
  --destructive: 0 72% 51%;         /* danger-600 */
  --destructive-foreground: 0 0% 100%;
  --radius: 0.375rem;               /* radius-base 6px */
}
/* .dark { … } — invert background/foreground, lift primary to primary-500/600 for contrast on dark
   surfaces; re-tune neutral ramp + semantic 50/100/700 + elevation. Port from swat-tokens.css. */
```

---

## 6. Responsive & PWA

**Strategy: desktop-first, mobile-ready.** Primary target is 1280–1440px (office desktops &
weighbridge terminals); every screen stays fully operable on tablet and phone, and installs as a
**PWA**. The *same* components adapt across the §1.11 breakpoints — never a separate mobile design.

**Component adaptation by breakpoint**

| Component | `≥ lg` (1024+) | `md`–`lg` | `< sm` (640) |
|-----------|----------------|-----------|--------------|
| App shell sidebar | persistent 256px | off-canvas **drawer** (hamburger) | drawer |
| Primary navigation | sidebar | sidebar/drawer | **bottom-nav** (tab bar, ≤5 items) |
| DataTable | full table, 25 rows | horizontal scroll + sticky 1st col | **stacked cards** (label→value rows) |
| Form | 1–2 col, sticky footer | 1 col | 1 col, footer → full-width **action bar** |
| Dialog | centered modal | centered | **bottom sheet** (full-width, slide-up) |
| Sheet | right, 420–520px | right | bottom, full-width |
| Content gutter | 32px | 24px | 16px |
| Toolbar | inline row | inline row | wraps / overflow menu |

**Touch.** On `pointer: coarse` every interactive control is **≥ 44×44px**. Keep keyboard parity.
**Safe areas.** Sticky topbar, bottom-nav, and action bars respect `env(safe-area-inset-*)`.
**Reusable responsive classes** (in `swat-components.css`): `.bottom-nav`, `.drawer`/`.drawer-scrim`,
`.tcards`/`.tcard`, `.action-bar`, `.app-banner`, plus `@media (pointer:coarse)` touch sizing and
`@media (max-width:640px)` dialog→sheet.

**PWA configuration**
| Field | Value |
|-------|-------|
| `name` | `SWAT — DLH Surabaya` · `short_name` `SWAT` |
| `display` | `standalone` |
| `theme_color` | `#0f172a` (slate-900 — status bar) |
| `background_color` | `#f8fafc` |
| `icons` | 192 · 512 · **maskable** (leaf mark on emerald tile) |
| `orientation` | `any` |
- **Service worker:** app-shell cache (Phase 1); API requests `network-first` with stale fallback.
- **Offline:** persistent `.app-banner` ("Anda sedang offline — perubahan disinkronkan saat daring").
- **Install:** auto-prompt after ~30s on supported browsers; manual "Pasang" affordance in header.
- **Dark mode:** follows `prefers-color-scheme` + the user's stored choice (`localStorage('swat-theme')`).

---

## 7. How to apply

**Theme.** Light theme is the required baseline; build everything light-first. The dark token layer
ships in Phase 1 (so components "just work" via the variables); dedicated dark-mode visual QA/sign-off
is a Phase 2 gate. Use the `dark:` variant / `.dark` class — do not block Phase 1 on dark QA.

**Focus.** Every interactive element shows the §1.10 ring on `:focus-visible` (keyboard), suppressed
on mouse. Never remove outlines without a replacement. Dialogs/sheets trap focus; menus use roving
tabindex.

**Color is never the only signal.** Pair every status color with text and/or an icon/dot (§1.4).
All text/!-on-fill combinations in this doc are verified **≥ 4.5:1** (normal) — that's why primary
fills use `-700`.

**Number / date / currency conventions (id-ID, Asia/Jakarta — WIB):**
| Kind | Format | Example |
|------|--------|---------|
| Currency | `Rp ` + `toLocaleString('id-ID')`, **integer rupiah** (no decimals) | `Rp 8.500.000` |
| Date (form input) | `dd/MM/yyyy` | `15/03/2026` |
| Date (table/display) | `d MMM yyyy`, Indonesian months | `15 Mar 2026` |
| Time | `HH:mm:ss` (24-hour, WIB implied, no tz picker) | `08:30:00` |
| Weight | integer + ` kg` | `4.250 kg` |
| Distance | integer + ` km` | `128.430 km` |
| Fuel | 2 decimals + ` L` | `45,50 L` |
| Tonnage | `toLocaleString` + ` ton` | `12,75 ton` |
| Codes / plate | mono, as stored | `L 1234 AB`, kitir `KTR-2026-0042` |

Thousands separator `.` and decimal `,` (id-ID). Numeric table columns right-aligned with
`tabular-nums`. Timestamps are stored UTC, displayed WIB.

**Accessibility checklist (per screen).** real `<label>` per input · visible focus · keyboard-only
operable (Tab order, dialog focus-trap, Esc) · `role="alert"`/`status` on toasts · `aria-label` on
icon-only buttons · `aria-invalid` + `aria-describedby` on errored fields · skip-to-content link ·
contrast ≥ 4.5:1 text / ≥ 3:1 UI · color never sole indicator · semantic elements
(`<button>`/`<a>`/`<nav>`/`<form>`), not `<div onclick>`.

**Voice (id-ID).** Official, efficient, supportive. Imperative buttons ("Simpan", "Hapus",
"Terverifikasi"). Human errors ("Nomor polisi sudah ada", not "FK violation"). One term per entity,
always from the glossary.
