# 03 — Hi-Fi Specification

## Overview

This document provides detailed design direction for all Phase-1 screens to production hi-fi mockups (Figma). Each screen references the design system tokens (colors, typography, spacing) and component inventory from `01-design-system.md`. Wireframe layouts from `02-wireframes.md` are the visual foundation. **Screen numbering:** "SN" in this document maps to "Screen N" in wireframes (e.g., S1 = Screen 1 Login, S8 = Screen 8 Haul Board).

**Scope:** Light theme, desktop-first (1440px primary), responsive annotations for 1024px and 768px breakpoints. All labels in Indonesian per glossary.

---

## Design Principles for Hi-Fi Build

1. **Direct mapping to Tailwind + shadcn/ui:** Every color, font size, spacing, radius, and component must be expressible as Tailwind classes or CSS variables. No pixel-perfect only; precision through tokens.
2. **Consistency across screens:** use the same button styles, form field patterns, table layouts across all pages. No one-off variations.
3. **Accessibility baked in:** WCAG AA compliance (color contrast, focus states, semantic HTML). Annotate focus rings, disabled states, error states in each component.
4. **Indonesian UX:** microcopy, labels, and tone follow glossary and brief. No English except in code/debug.
5. **Density with clarity:** use whitespace and visual hierarchy to guide attention; no clutter.

---

## Global Styles

### Typography
- **Page titles (h1):** 32px bold, `text-neutral-900`, margin-bottom 24px
- **Section headings (h2):** 24px semibold, `text-neutral-900`, margin-bottom 16px
- **Subsection (h3):** 20px semibold, `text-neutral-700`, margin-bottom 12px
- **Body text:** 16px regular, `text-neutral-600`, line-height 1.5
- **Labels:** 14px medium, `text-neutral-900`, margin-bottom 8px
- **Helper/secondary:** 12px regular, `text-neutral-500`
- **Input values:** 16px regular, `text-neutral-900`

### Spacing grid
- All spacing uses 8px increments: 4, 8, 12, 16, 24, 32, 48
- Page padding: 32px (2xl) top/bottom, 24px (xl) left/right on desktop
- Reduce to 16px padding on tablets, 12px on mobile
- Section gaps: 24–32px (xl–2xl)
- Field-to-label gap: 8px (sm)
- Between form fields: 16px (lg)

### Focus and keyboard navigation
- All interactive elements have visible focus: 2px outline in primary-600 (emerald-600), radius 2px (inherit from element radius)
- Outline offset: 2px (outside element boundary)
- Focus visible on Tab navigation (`:focus-visible` or `:focus-within`)
- Tab order logical: left-to-right, top-to-bottom
- Disabled elements: no focus ring, cursor not-allowed

### Color and contrast
- Body text on white: `text-neutral-900` (✓ WCAG AAA, >7:1)
- Secondary text: `text-neutral-600` (✓ WCAG AA, 4.5:1)
- Disabled text: `text-neutral-400` (✓ meets AA with white background)
- All interactive elements: text color must contrast ≥4.5:1 against background

---

## Screen-by-screen specifications

### S1. Login (`/login`)

**Layout:**
- Centered single-column form (400px desktop, full-width mobile)
- Background: `bg-white`
- Form card: `bg-white`, border 1px `border-neutral-200`, radius 6px, shadow base, padding 32px
- Header: centered logo (24px) + app title (h2, "SWAT"), subtitle (14px gray, "Dinas Lingkungan Hidup Kota Surabaya")

**Form fields:**
1. **Username**
   - Label: "Nama pengguna *"
   - Input: `input-base` styling (see 01-design-system.md)
   - Width: 100%
   - Margin-bottom: 16px

2. **Password**
   - Label: "Kata sandi *"
   - Input: type="password", same styling
   - Eye toggle (optional Phase 2)
   - Margin-bottom: 16px

**Button:**
- "Masuk" button: `btn-primary` (bg emerald-600, text white, 10px 16px padding)
- Width: 100%
- Margin-bottom: 16px
- On hover: bg emerald-700, shadow subtle

**Error handling:**
- Below form: alert box (height 40px, padding 12px, bg danger-50, border-left 3px danger-500, text danger-700)
- Message: "Nama pengguna atau kata sandi salah"
- Show only on error (initially hidden, display via JS)

**Footer:**
- Centered: "© Dinas Lingkungan Hidup Kota Surabaya", font 12px, `text-neutral-500`
- Margin-top: 32px

**Responsive:**
- Mobile (<640px): remove left/right padding from form card, expand to edge-to-edge

**States:**
- Default: all fields empty, focus ring on first field on page load
- Submitting: button shows spinner icon + "Memuat...", disabled
- Error: error message visible, input border turns danger-500, focus on username field
- Accessibility: all inputs have `aria-label`, form has `role="form"`

---

### S2. Change Password (`/auth/change-password`)

**Layout:**
- Page header: h1 "Ubah Kata Sandi"
- Alert box (top): bg warning-50, border-left warning-500, text warning-700, message "Anda harus mengubah kata sandi untuk melanjutkan"
- Form card: `bg-white`, border 1px `border-neutral-200`, padding 24px, max-width 500px

**Form fields:**
1. **Current Password** (required)
   - Label: "Kata sandi saat ini *"
   - Input: type="password"
   - Margin-bottom: 16px

2. **New Password** (required)
   - Label: "Kata sandi baru *"
   - Input: type="password"
   - Below input: password strength meter (visual bar, 4px height)
     - 0–3 chars: red, "Lemah"
     - 4–7 chars: amber, "Sedang"
     - 8+: green, "Kuat"
   - Font: 12px, gray
   - Margin-bottom: 16px

3. **Confirm New Password** (required)
   - Label: "Konfirmasi kata sandi baru *"
   - Input: type="password"
   - Margin-bottom: 24px

**Validation:**
- Real-time: on blur or onChange (debounced 300ms)
- Error below field (red text, 12px) if:
  - Passwords don't match: "Kata sandi tidak cocok"
  - New password too short: "Minimal 8 karakter"
  - Requirements not met: show inline help

**Buttons (sticky bottom):**
- [Ubah] (primary, emerald-600), [Batal] (secondary, gray)
- Margin-top: 24px, gap 8px, right-aligned on desktop, stacked on mobile
- [Ubah] disabled if form invalid

**On success:**
- Toast: "Berhasil" (green, auto-dismiss 3s)
- Redirect to `/dashboard` after 1s delay

---

### S3. Dashboard / Home (`/dashboard`)

**Layout:**
- Page title: h1 "Dasbor"
- Welcome message: "Selamat datang, {Nama Pengguna}", font body-lg, color neutral-700
- Metric cards grid: 4 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Card gap: 16px (lg)

**Metric cards (4 total, Phase 1):**
Each card: `bg-white`, border 1px `border-neutral-200`, padding 16px, radius 6px, hover shadow subtle

1. **Kendaraan** (Vehicles)
   - Icon: 📦 (or SVG, 32px, emerald-600)
   - Label: "Kendaraan", font 12px, text-neutral-600
   - Value: "142 unit", font 28px bold, text-neutral-900
   - Metadata: "-5 bulan lalu" (optional, gray, 12px)

2. **Haul Hari Ini** (Today's hauls)
   - Icon: 🚚 (32px, blue-600)
   - Label: "Haul Hari Ini", font 12px, text-neutral-600
   - Value: "28 aktif", font 28px bold
   - Metadata: trend arrow (optional Phase 2)

3. **BBM Hari Ini** (Fuel today)
   - Icon: ⛽ (32px, amber-600)
   - Label: "BBM Hari Ini", font 12px
   - Value: "1,245 L", font 28px bold
   - Currency format: right-aligned

4. **Tonase Hari Ini** (Tonnage today)
   - Icon: 📊 (32px, green-600)
   - Label: "Tonase Hari Ini", font 12px
   - Value: "87.5 ton", font 28px bold
   - Unit: "ton"

**Responsive:**
- Desktop 1440px: 4 columns, full width
- Tablet 1024px: 2 columns, full width
- Mobile 768px: 1 column, stacked

**Accessibility:**
- Each metric card is a semantic `<article>` or `<section>`
- Value is the main content; icon is decorative (no `alt` if SVG icon, or `aria-hidden="true"`)

---

### S4. App Shell (Layout reference)

**Topbar:**
- Height: 64px
- Background: `bg-white`, border-bottom 1px `border-neutral-200`
- Sticky: `position: sticky; top: 0; z-index: 100`
- Content: flex, space-between
  - Left: logo (24×24px) + app title (h3, "SWAT DLH")
  - Right: user avatar (40px circle) + dropdown menu + locale (optional) + logout
- Padding: 12px 24px (vertical/horizontal)
- Topbar logo: click → navigate to `/dashboard`

**Sidebar (left):**
- Width: 256px (desktop), hidden/hamburger toggle on <1024px
- Background: `bg-neutral-50`
- Border-right: 1px `border-neutral-200`
- Position: fixed or sticky, height 100vh, overflow-y scroll
- Padding: 16px 0 (top/bottom)

**Navigation items:**
- Font: 14px regular, padding 12px 16px (vertical/horizontal)
- Icon: 20px, margin-right 8px
- State variants:
  - Default: `text-neutral-600`, hover `bg-neutral-100`
  - Active: `text-primary-600`, background `bg-primary-50`, left border 3px primary-600, font-weight 500
  - Disabled (no permission): hidden (not gray-out)
- Nested items: indent 16px, smaller font 12px

**Main content area:**
- Margin-left: 256px (desktop), 0 (mobile)
- Max-width: 1400px
- Padding: 32px top/bottom, 24px left/right
- Background: `bg-white` (or `bg-neutral-50` for list pages)

**Mobile responsive (<1024px):**
- Sidebar: slide in from left (hamburger toggle in topbar)
- Topbar: add hamburger menu button (3 horizontal lines, 24px)
- Content area: full width, no left margin
- Sidebar overlay: dark backdrop `bg-black/50`, dismiss on click outside

---

### S5. Master Data — List page (example: Kendaraan)

**Page structure:**
- Breadcrumb (optional): "Master Data > Kendaraan"
- Page title (h1): "Kendaraan"
- Action bar (below title):
  - Left: [Buat Baru] button (primary, emerald-600, 10px 16px)
  - Center: Search input (width 300px, placeholder "Cari..."), margin-left 16px
  - Right: [Filter ▼] (secondary button), [Kolom ▼] (ghost button), margin-left 12px between each
- Margin-bottom: 24px

**DataTable:**
- Border: 1px `border-neutral-200`, radius 6px
- Headers:
  - Background: `bg-neutral-50`
  - Font: 12px bold, `text-neutral-900`
  - Padding: 12px (vertical/horizontal)
  - Sortable: click to sort, icon (↑/↓) appears right of label
  - Cursor: pointer, hover `bg-neutral-100`
- Body rows:
  - Height: 48px
  - Alternating: odd `bg-white`, even `bg-neutral-50` (optional, subtle)
  - Hover: `bg-neutral-50`
  - Padding: 12px
  - Font: 14px, `text-neutral-700`
  - Last column (Actions): width 80px, text-right
    - Row menu (⋮ icon, 20px, gray)
    - On click: dropdown menu (Popcorn/Popover)
      - Items: "Edit" (pencil icon), "View" (eye icon), "Delete" (trash icon, red text)
      - Item padding: 8px 12px, font 14px
      - Item hover: bg light gray
- Pagination (below table):
  - Style: flex, justify-center, gap 12px, padding 16px
  - Left: [Sebelumnya] button (secondary, disabled at page 1)
  - Center: "Halaman 1 dari 10"
  - Right: [Selanjutnya] button (secondary, disabled at last page)
  - Results count: "Tampil 1–25 dari 200" (en-dash, gray text, 14px, optional right-aligned)
  - Rows-per-page dropdown: [25 ▼] (options: 25, 50, 100)

**Empty state (if no data):**
- Full-width row, centered, padding 48px
- Icon: 📄 (48px, gray)
- Message: "Belum ada data", font 16px, `text-neutral-600`
- Button: [Buat Baru], primary, margin-top 16px

**Loading state:**
- Show 10 skeleton rows (gray bars, height 48px, staggered animation opacity pulse)

**Error state:**
- Full-width row, centered, padding 48px
- Icon: ⚠️ (48px, red)
- Message: "Gagal memuat data", font 16px, `text-danger-600`
- Button: [Coba Lagi], secondary, margin-top 16px

**Responsive:**
- Desktop 1440px: full table visible
- Tablet 1024px: table still visible, consider sticky left column (plate number) on horizontal scroll
- Mobile 768px: single-column card layout (optional, or horizontal scroll with sticky first column)

**Accessibility:**
- Table: `<table role="grid">` with `aria-label="Daftar Kendaraan"`
- Header cells: `<th scope="col">`
- Rows: `<tr role="row">`
- Row actions: keyboard accessible via dropdown (Tab to row, Enter to open menu, arrows to navigate items, Enter/Space to activate)

---

### S6. Master Data — Create/Edit Modal (example: Kendaraan)

**Modal structure:**
- Overlay: `bg-black/50`, full-screen
- Dialog box: `bg-white`, width max(90vw, 500px), border radius 6px, shadow lg
- Header: 24px padding, flex space-between
  - Title (h3): "Tambah Kendaraan" (create) or "Edit Kendaraan" (edit)
  - Close button: ✕ icon (20px, gray, hover red)
- Body: 24px padding, form fields
- Footer: 24px padding, border-top 1px `border-neutral-200`, flex justify-end, gap 8px
  - Buttons: [Batal] (secondary), [Simpan] (primary)

**Form sections (cards inside modal):**
- **Data Dasar** (Basic info)
  - Fields: Nopol (text), Merek (select), Aplikasi (select), Tahun Pembuatan (number)
  - Margin-bottom between sections: 16px

- **Dimensi Kendaraan** (Dimensions)
  - Fields: Berat Kosong Saat Ini (number), Odometer Saat Ini (number)

- **Berlaku Pajak** (Registration/tax)
  - Fields: Masa berlaku STNK (date picker), Masa berlaku Pajak STNK (date picker)

- **Catatan** (Notes)
  - Field: textarea, height 80px

**Form field styling:**
- Label: 14px medium, `text-neutral-900`, required `*` in primary-600
- Input: 16px regular, padding 10px 12px, border 1px `border-neutral-200`, radius 6px
- Focus: border `border-primary-600`, shadow `0 0 0 3px rgba(16, 185, 129, 0.1)`
- Error: border `border-danger-500`, message below (12px, `text-danger-600`)
- Help text: below input, 12px, `text-neutral-500`
- Hover: border `border-neutral-300`
- Disabled: bg `bg-neutral-100`, `cursor: not-allowed`

**Select/Dropdown:**
- Same border/padding as input
- Dropdown arrow: right-aligned, 16px icon
- Dropdown list:
  - Max-height 300px, scroll if overflow
  - Items: 40px height, padding 12px 16px
  - Hover: bg `bg-neutral-100`
  - Selected: bg `bg-primary-100`, text `text-primary-900`, checkmark (optional)

**Date picker:**
- Input + calendar icon button
- Format: `dd/MM/yyyy` display; internally `yyyy-MM-dd`
- On focus: native browser date picker or custom calendar (Figma: show both as options)

**Submit behavior:**
- [Batal]: close modal without saving
- [Simpan]: validate all fields, POST/PATCH to API
  - Disabled during mutation: gray, `cursor: not-allowed`
  - Loading: show spinner icon + "Memuat..."
- On success: toast "Berhasil ditambahkan", close modal, refetch list
- On error: toast "Gagal: {message}", stay in modal, field errors inline

**Validation example:**
- Nopol: required, unique (check on blur)
  - Error: "Nomor polisi sudah ada" (red below field)
- Tahun: required, number 1990–2030
  - Error: "Harus antara 1990 dan 2030"
- All required fields: asterisk, highlight on submit if empty

**Responsive:**
- Desktop 1440px: width 500px, centered
- Tablet 1024px: width 90vw, max 500px
- Mobile 768px: width 90vw, full height or bottom sheet

**Accessibility:**
- Dialog: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`
- Focus trap: Tab cycles through form fields + footer buttons only
- Close button: keyboard accessible (Tab, Space/Enter)
- Labels: `<label for="fieldId">` for each input
- Error messages: `aria-describedby="fieldId-error"` on inputs

---

### S7. Transaksi — Hari Transaksi List

**Page title:** "Hari Transaksi"
**Action bar:**
- [Inisiasi Hari] button (primary, emerald-600, 10px 16px, left-aligned)
  - On click: POST `/api/transaction-days` with date (typically today)
  - If already exists for that date: fetch existing (idempotent)
  - On success: navigate to `/transaksi/hari-transaksi/{date}` (haul board)
  - While loading: button disabled, shows spinner
- Search + Filter + Columns (same as master data list)

**Table:**
- Columns: Tanggal (date, sortable), Status (badge), Kendaraan (vehicle/haul count), Tonase (tonnage number), Aksi
- Status badge colors (DayStatus enum):
  - `IN_PROGRESS`: `bg-amber-100 text-amber-700` label "Belum Selesai"
  - `DONE`: `bg-blue-100 text-blue-700` label "Selesai"
- Tanggal format: `dd/MM/yyyy` (e.g., 05/06/2026)
- Tonase format: `X ton` (rounded to 1 decimal, e.g., 87.5 ton)

**Row actions:**
- [View] button: navigate to `/transaksi/hari-transaksi/{date}` (haul board)

**Responsive & a11y:** same as master data list

---

### S8. Transaksi — Haul Board (Daily)

**Page title:** "Haul Hari {date}" (e.g., "Haul Hari 05 Juni 2026")
**Subtitle:** "Status: Belum Selesai | {count} kendaraan aktif"

**Board layout:**
- Grid of haul cards (one per vehicle HaulAssignment for that day)
- Each card:
  - Background: `bg-white`, border 1px `border-neutral-200`, padding 16px, radius 6px, hover shadow subtle
  - Header: Nopol (bold, 16px) + Pengemudi name (gray, 14px)
  - Content rows:
    - "Berangkat: 06:00 (target) / 06:05 (aktual)" (from HaulAssignment depart times)
    - "Kembali: 14:00 (target) / — (aktual)" (from HaulAssignment return times, may be blank if not yet returned)
    - Trip progress badge: "3/5 Terverifikasi" (count of VERIFIED trips / total trips for haul)
  - Footer: buttons [Edit] (secondary), [Lihat Trayek] (ghost)

**Card styling:**
- Nopol: 16px bold, `text-neutral-900`, monospace-friendly (e.g., "AB 1234")
- Pengemudi: 14px, `text-neutral-600`
- Times: 14px, `text-neutral-700`, monospace font (HH:mm format)
- Badge: 12px bold, rounded pill (radius 20px), background + text per TripStatus enum
  - "3/5 Terverifikasi": `bg-green-100 text-green-700` if >75% verified
  - "2/5 Terverifikasi": `bg-amber-100 text-amber-700` if <75% verified

**Buttons:**
- [Edit]: secondary, padding 8px 12px, 14px font → opens "Rekalibrasi Berangkat/Kembali" modal (S13)
- [Lihat Trayek]: ghost (text only, primary-600 color), 8px 12px → navigates to trip list (Phase 2)

**Interactions:**
- [Edit]: opens modal for depart/return reconciliation (S13, HaulAssignment form)
- [Lihat Trayek]: placeholder for Phase 2 (navigate to `/transaksi/hari-transaksi/{date}/{haulId}/trips`)

**Responsive:**
- Desktop 1440px: 2–3 columns grid
- Tablet 1024px: 1–2 columns
- Mobile 768px: 1 column, full width

**Empty state:** "Belum ada kendaraan hari ini" + [Kembali] button to hari-transaksi list

---

### S9. Transaksi — Record Pengambilan Sampah (Pickup form)

**Modal:** centered, width 500px (desktop)

**Header:** "Catat Pengambilan Sampah"

**Body sections:**

1. **Pilih Trayek** (choose or create)
   - Card with trip info (route, target time)
   - Button: [Pilih] (secondary) to confirm selection
   - Or: [Tambah Trayek Baru] (ghost link) to create ad-hoc trip

2. **Waktu Aktual** (required)
   - Label: "Waktu Aktual *"
   - Input: time picker, format `HH:mm:ss`, default now
   - Button: [Sekarang] (ghost, small) to set to current time

3. **Odometer Aktual** (required)
   - Label: "Odometer Aktual (km) *"
   - Input: number, padding 10px 12px
   - Validation: >= last odometer (shown in help text)

4. **Sumber Sampah** (required)
   - Label: "Sumber Sampah *"
   - Select: dropdown, filtered from VehicleWasteSource
   - Options: Dinas, Rekanan, Pasar, Swasta, etc.

5. **Catatan** (optional)
   - Label: "Catatan"
   - Textarea: height 60px, resize vertical only

**Footer buttons:**
- [Batal] (secondary), [Simpan] (primary)
- Margin-top: 24px

**Validation:**
- Waktu: must be reasonable (not too far in past/future)
- Odometer: >= last, warn if not monotonicic
- Sumber Sampah: required (show error if empty on submit)

**On success:** toast "Berhasil dicatat", close modal, refresh haul board

**Accessibility:** form labels, inputs have `aria-label` or `aria-describedby`

---

### S10. Transaksi — Record Pembuangan Sampah (Disposal + Weighing)

**Modal:** width 500px (desktop), scrollable if needed

**Header:** "Catat Pembuangan Sampah"

**Body sections:**

1. **Trip selection** (same as pickup, S9)

2. **Data Timbangan** (weighing section, card-like background `bg-neutral-50`, padding 12px, radius 4px)
   - Subsection heading: "Data Timbangan" (14px medium, `text-neutral-900`)
   - Fields:
     - **Berat Kosong (kg)** — tare weight (required)
       - Label: "Berat Kosong (kg) *"
       - Input: decimal number input, pre-filled from `vehicle.currentTareWeight`, editable
       - Help text: "Dari data kendaraan, bisa diubah" (12px, `text-neutral-500`)
       - Validation: required, positive
     - **Berat Kotor (kg)** — gross weight (required)
       - Label: "Berat Kotor (kg) *"
       - Input: decimal number
       - Validation: required, positive
     - **Berat Bersih (kg)** — net weight (read-only, auto-computed)
       - Label: "Berat Bersih (kg)"
       - Display: "✓ {netWeight} kg" (computed as gross - tare), gray text (`text-neutral-600`), no input field, padding 10px 12px
       - Validation error (if gross < tare): red inline error message below all weight fields: "⚠️ Berat Kotor harus >= Berat Kosong" (12px, `text-danger-600`), disable [Simpan] button
       - Computed on blur of Berat Kotor input
     - **Volume Sampah (m³)** (optional)
       - Label: "Volume Sampah (m³)"
       - Input: decimal number input
       - Help: "(opsional)" (12px, `text-neutral-500`)

3. **Rekalibrasi Perjalanan** (journey reconciliation section, same layout as pickup)
   - Subsection heading: "Rekalibrasi Perjalanan" (14px medium)
   - Waktu Aktual (required), Odometer Aktual (required), Catatan (optional)

**Validation:**
- Berat Kosong & Kotor: required, positive numbers
- If Kotor < Kosong: show inline red error "Berat Kotor harus >= Berat Kosong", disable [Simpan] button
- Odometer Aktual: required, must be >= vehicle's last recorded odometer

**Visual distinction:** weighing section in separate lighter background card to highlight it

**On success:**
- Toast "Berhasil dicatat" (green, 3s auto-dismiss)
- Backend updates vehicle.currentTareWeight to entered tare value
- Trip status → DONE, `netWeight` computed server-side
- Close modal, refresh board (haul card trip badge updates)

---

### S11. Transaksi — Record Bahan Bakar (Fuel)

**Modal:** width 500px

**Header:** "Catat Pengisian Bahan Bakar"

**Body sections:**

1. **Trip selection** (S9, REFUEL trip card)

2. **Jenis Bahan Bakar** (required)
   - Label: "Jenis Bahan Bakar *"
   - Select: dropdown, options filtered by vehicle model's compatible fuels
   - Options: Solar, Premium, Pertamax, etc. (from Fuel master table)
   - Validation: required

3. **Jumlah Diminta (L)** (required)
   - Label: "Jumlah Diminta (L) *"
   - Input: decimal number, 2 decimals (e.g., 50.00)
   - Validation: > 0, <= vehicle fuel tank capacity (per VehicleModel)

4. **Jumlah Disetujui (L)** (required)
   - Label: "Jumlah Disetujui (L) *"
   - Input: decimal number, 2 decimals
   - Default value: auto-filled with Jumlah Diminta on form load
   - Behavior: editable only if user has approval permission (determined by role, e.g., DataAdmin); otherwise `disabled` (gray background, cursor not-allowed, no focus ring)
   - Help text: "Default = Diminta. Edit hanya jika ada approval" (12px, `text-neutral-500`)
   - Validation: must be <= Jumlah Diminta (if invalid, show red inline error "Jumlah Disetujui harus <= Jumlah Diminta", disable [Simpan] button)

5. **Rekalibrasi Perjalanan**
   - Waktu Aktual (required), Odometer Aktual (required), Catatan (optional)

**Validation summary:**
- All required fields must be filled
- Jumlah Disetujui <= Jumlah Diminta enforced before submit

**On submit:** PATCH `/api/trips/{tripId}` with all fuel fields, trip status → DONE, toast "Berhasil dicatat"

**Responsive & a11y:** same as prior forms; approval field state communicated via disabled attribute + help text

---

### S12. Transaksi — Trip Verification

**Modal** (Phase 1 assumes modal; dedicated page option for Phase 2+)

**Header:** "Verifikasi Trayek"

**Body:**
- Trip summary card (read-only display):
  - Card styling: `bg-neutral-50`, padding 16px, border 1px `border-neutral-200`, radius 6px
  - Font: 14px, `text-neutral-700`
  - Content rows (all read-only):
    - Jenis: "Pembuangan Sampah" (or other RouteCategory)
    - Lokasi: "TPS Ketintang → TPA Jabon" (origin site → destination site)
    - Waktu: "Target 08:45 | Aktual 08:50 (5 menit lebih)" (show delta if out of range)
    - Odometer: "Target 45500 | Aktual 45620 km (120 km)" (distance traveled)
    - Weights: "Berat Kosong 5200 kg | Berat Kotor 10850 kg | Berat Bersih 5650 kg" (for DISPOSAL only)
    - Volume: "5.2 m³" (for DISPOSAL only, if recorded)
    - Metadata: "Dicatat oleh: Administrasi Data (Ali) | 05/06/2026 08:52" (recorded user name + timestamp)

- **Catatan** (optional textarea, only shown if rejecting)
  - Label: "Catatan (opsional)" (only visible when [Tolak] is clicked, or pre-fill if rejecting)
  - Input: textarea, 60px height
  - Content: reason for rejection (stored on Trip.notes if rejecting)

- **Validation indicator:**
  - If all data logically valid (weights OK, odometer sensible): "✓ Data valid, siap untuk diverifikasi" (green text, 14px, `text-success-600`)
  - If invalid: show warning "⚠️ Data tidak valid" (red text)

**Footer buttons:**
- [Tolak] (secondary, red text)
  - On click: sets trip status → DONE (back to unverified, "Selesai" state)
  - Saves optional notes (rejection reason) to Trip.notes
  - Toast: "Berhasil" (green)
  - Close modal, refresh board
- [Terverifikasi] (primary, green, emerald-600)
  - On click: sets trip status → VERIFIED
  - Stores `verifiedById` (current checker user ID) + `verifiedAt` (current timestamp)
  - Locks trip for further editing (Edit/Delete actions hidden in list/board)
  - Toast: "Berhasil" (green)
  - Close modal, refresh board (haul card trip badge updates to show "5/5 Terverifikasi")

**Accessibility:**
- Read-only trip summary fields are not form inputs (no focus needed)
- [Tolak] and [Terverifikasi] buttons are keyboard-accessible (Tab, Space/Enter to activate)
- Modal has focus trap (Tab cycles through buttons only, unless Catatan textarea is shown)
- If Catatan textarea appears, Tab order: [Tolak] → [Terverifikasi] → Catatan (then back to [Tolak])

---

### S13. Depart/Return Reconciliation Modal

**Header:** "Rekalibrasi Berangkat/Kembali"

**Body sections:**

1. **Berangkat dari Pool** (Depart)
   - "Waktu Target: 06:00"
   - "Waktu Aktual *" (required)
     - Input: time picker, default now
   - "Odometer Target: 50000 km"
   - "Odometer Aktual (km) *" (required)
     - Input: number, validation >= target

2. **Kembali ke Pool** (Return)
   - "Waktu Target: 14:00"
   - "Waktu Aktual"
     - Input: time picker
   - "Odometer Target: 50350 km"
   - "Odometer Aktual (km)"
     - Input: number, validation >= depart actual

3. **Catatan** (optional)
   - Textarea, 60px

**Validation:**
- Depart Waktu Aktual: required
- Depart Odometer Aktual: required, >= 0
- Return Odometer Aktual: if filled, >= depart actual
- Warn if return time before depart time

**Footer buttons:**
- [Batal] (secondary), [Simpan] (primary)

**On success:**
- PATCH `/api/haul-assignments/{id}` with actuals
- Update vehicle.currentOdometer (on return odometer)
- Toast "Berhasil", close modal, refresh board

---

### S14. Profile Page (`/profile`)

**Page title:** "Profil Saya"

**Profile card:**
- Avatar: 80×80px circle, initials or photo
- Name: h3, `text-neutral-900`
- Username: 14px gray
- Role: "Administrasi Data" (gray)

**Edit section:**
- Editable fields:
  - Nama Lengkap (text input)
  - Photo (file upload, optional)
- Button: [Edit] (secondary) to enable edit mode
- On edit: fields become active, buttons [Batal] [Simpan] appear
- PATCH `/api/users/me` on save

**Change Password section:**
- Button: [Ubah Kata Sandi] (secondary)
- On click: navigate to `/auth/change-password` or open modal

**Logout section:**
- Button: [Keluar] (destructive, red)
- On click: confirmation dialog "Yakin ingin keluar?", POST `/api/auth/logout`

**Responsive:** single column, max-width 500px

---

## Export & Implementation Checklist

### Designer deliverables (Figma or equivalent)

- [ ] **Light theme mockups** for all screens below (hi-fi visual)
- [ ] **Component library page:** Button, Input, Select, Form field, DataTable, Modal, Toast, Badge, etc. (variants + states)
- [ ] **Color tokens page:** palette swatch grid with Tailwind class names
- [ ] **Typography page:** scale (h1–tiny) with examples
- [ ] **Grid/spacing page:** 8px grid, common spacing (xs–3xl)
- [ ] **Interactive states:** focus rings, disabled, hover, active (for Button, Input, Link)

### Screens to mock (in order)

**Phase 1 Priority (all these must be hi-fi):**
1. Login (S1) — light theme, desktop 1440px + responsive annotations
2. Change Password (S2) — light theme, desktop 1440px + responsive annotations
3. Dashboard (S3) — light theme, desktop 1440px + responsive annotations
4. App Shell (S4) — layout reference, topbar + sidebar + content area
5. Master Data List (S5 using Kendaraan example) — light theme, with all states (default, loading, empty, error)
6. Master Data Create/Edit Modal (S6 using Kendaraan) — light theme, with validation states
7. Hari Transaksi List (S7) — light theme
8. Haul Board (S8) — light theme
9. Pengambilan Sampah form (S9) — light theme, modal variant
10. Pembuangan Sampah form (S10) — light theme, modal variant with weighing section
11. Pengisian Bahan Bakar form (S11) — light theme, modal variant
12. Trip Verification (S12) — light theme, modal variant
13. Depart/Return Reconciliation (S13) — light theme, modal variant

**Optional (Phase 2 or reference):**
- Profile page (S14)
- Dark theme variants (toggle in user menu)

### Per-screen deliverables

For each hi-fi screen:
1. **Figma file** with component-based design (no detached instances)
2. **Layer names** matching component/pattern names (e.g., "Button–Primary", "Input–Text", "DataTable–Body–Row")
3. **Auto-layout enabled** for all groups (so responsive resizing works)
4. **Annotations:**
   - Color: label with Tailwind token name (e.g., "emerald-600", "neutral-900")
   - Font: size + weight (e.g., "16px / 400")
   - Spacing: margins/padding in 8px units (e.g., "p-lg" = 16px)
   - Radius: 6px, 4px, full (e.g., "radius-base", "radius-full")
   - Shadow: token name (e.g., "shadow-subtle", "shadow-base")
5. **Responsive breakpoints noted:** 1440px (primary), 1024px (tablet), 768px (mobile)
6. **Interactions documented:** hover, focus, disabled, loading, error (as separate frames or notes)

### CSS variable / Tailwind mapping

Frontend will convert Figma tokens to:
- Tailwind config (theme.colors, theme.fontSize, theme.spacing, theme.borderRadius, theme.boxShadow)
- CSS variables (`:root { --color-primary-600: #059669; ... }`)

Example mapping (from S1 login button):
```
Figma: Button "Masuk" → bg emerald-600, text white, padding 10px 16px, radius 6px
↓
Tailwind: <button className="bg-emerald-600 text-white px-4 py-2.5 rounded">Masuk</button>
↓
CSS vars: background-color: var(--color-primary-600);
```

---

## Microcopy & Tone (Indonesian)

### Button labels
- Create: "Buat Baru" (primary action)
- Save: "Simpan" (submit form)
- Cancel: "Batal" (dismiss modal)
- Delete: "Hapus" (destructive)
- Verify: "Terverifikasi" (trip verification)
- Login: "Masuk"
- Logout: "Keluar"
- Edit: "Edit" (row action)
- View: "Lihat" (row action)
- Previous: "Sebelumnya" (pagination)
- Next: "Selanjutnya" (pagination)

### Messages
- Success: "Berhasil ditambahkan", "Berhasil diperbarui", "Berhasil dihapus", "Berhasil dicatat", "Berhasil"
- Error: "Gagal: {message}" (e.g., "Gagal: Nomor polisi sudah ada")
- Warning: "Peringatan: {message}" (e.g., "Lisensi pengemudi sudah kedaluwarsa")
- Info: "Informasi" (general info toasts)
- Confirmation: "Yakin ingin menghapus {name}?"
- Empty: "Belum ada data"
- Loading: "Memuat..."
- No results: "Tidak ada hasil pencarian"

---

## Accessibility Checklist

For every screen, ensure:
- [ ] Color contrast ≥4.5:1 (WCAG AA) for all text
- [ ] All interactive elements have visible focus ring (2px outline, 2px offset)
- [ ] All form inputs have associated `<label>` (not placeholder-only)
- [ ] Required fields marked with `*` (visual + semantic)
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Modal/dialog has focus trap (Tab cycles through focusable elements)
- [ ] Close button on modal is keyboard-accessible (Tab, Space/Enter)
- [ ] Buttons use semantic `<button>` (not `<div onclick>`)
- [ ] Links use semantic `<a href>` (not `<span onclick>`)
- [ ] Skip-to-main link on top of page (optional but recommended)
- [ ] Disabled state has `aria-disabled="true"` or `disabled` attribute
- [ ] Tables use semantic `<th scope="col">` headers
- [ ] Toast notifications have `role="alert"` and `aria-live="polite"`

---

## Notes for Frontend Implementation

1. **Component reuse:** Design 15–20 atomic components (Button, Input, Select, etc.); compose larger components (forms, tables) from atoms.
2. **Responsive CSS:** Use Tailwind breakpoints (sm, md, lg, xl) to adapt layouts; desktop-first approach means no mobile-specific "hidden" classes unless necessary.
3. **Form state:** Use React Hook Form + Zod for validation; sync with design's inline error placement and async validation (e.g., "Nomor polisi sudah ada").
4. **Data table:** Use TanStack Table (React Table) with sorting, filtering, pagination; implement column visibility toggle via localStorage.
5. **Modal management:** Use Radix Dialog (via shadcn) with focus trap and backdrop dismiss.
6. **Icons:** Use Lucide React or Heroicons (20px or 24px sizes) for consistency.
7. **Animation:** minimal Phase 1 (no decorative transitions); consider fade-in on page load, slide-in for modals, if needed.
8. **Fonts:** load Inter or Plus Jakarta Sans via Google Fonts or self-hosted; set as `font-family: var(--font-family-base)` in CSS vars.

---

## Success Criteria

- Designer can produce mockups in < 1 week per screen
- Frontend can build from Figma in < 1 week per screen (using shadcn/ui components)
- WCAG AA compliance verified (Axe, Lighthouse, manual checks)
- All screens responsive at 1440px, 1024px, 768px
- Indonesian labels consistent across all screens (no synonyms)
- No ambiguity in spacing, colors, typography (all tokenized)

