# 00 — Design Brief

## Product Context

**SWAT** (Solid Waste Administration Tracking) is a back-office web application (PWA) for **DLH Kota Surabaya** (Dinas Lingkungan Hidup — City Environment Agency) to modernize municipal solid-waste-transportation operations. The app replaces a legacy PHP/CodeIgniter system with a secure, testable, modern stack while preserving the proven business process.

The rebuilt system is written in **NestJS (backend) + Next.js (frontend)**, UI in **Tailwind CSS + shadcn/ui (Radix)**, and targets **English code / Indonesian UI**.

---

## Users & Usage Context

### Primary operators (desktop, high data-entry density)
- **Administrasi Data:** daily transaction entry (pickup, disposal, fuel recording)
- **Checker:** trip verification & validation
- **Operator Pool:** vehicle/driver readiness, depart/return logging
- **Petugas TPA:** weighbridge terminal (separate desktop app — Phase 4)

### Secondary (dashboards, oversight)
- **Supervisors/Management:** monitoring, tonnage/fuel reports
- **IT maintainers:** system administration

### Devices & interaction patterns
- **Desktop-first:** operators use office desktops + weighbridge kiosks
- **Responsive secondary:** accommodate 13" to 27" displays; mobile is not a priority
- **Keyboard-driven:** fast, dense data entry with minimal mouse use
- **Fast & focused:** transactions happen throughout the day; UI must not slow operators down

---

## Jobs to be done (user stories)

1. **Initiate a transaction day** quickly, auto-seeded from crew schedules
2. **Record pickup transactions** (time, odometer, waste source) with minimal friction
3. **Record disposal + weighing** (tare/gross/net weight, auto-computed) with validation
4. **Record fuel** (requested/approved liters) with approval workflow
5. **Verify trips** (checker: confirm actuals, sign off)
6. **Manage master data** (vehicles, drivers, sites, routes, schedules) with bulk operations
7. **Access role-based screens** — hide menu items and actions for unauthorized users

---

## Design Principles

### Clarity over decoration
- No gradients, animations, or ornamental graphics
- Functional UI that speaks for itself
- Labels in Indonesian; every button and field is clear
- Minimize cognitive load: dense information on desktop, breathing room on mobile

### Density with breathing room
- Data grids show 25–100 rows per page (configurable)
- Forms section content into logical groups (cards/fieldsets)
- Vertical rhythm: consistent spacing (8px grid) between sections
- Whitespace around key actions (buttons, alerts)

### Fast keyboard-driven entry
- All interactive elements accessible via Tab
- Numeric inputs support direct entry (no step arrows if possible)
- Dropdown/combobox fields searchable; autocomplete where sensible
- Submit button keyboard-accessible; Enter to submit when sensible
- Date/time pickers user-friendly but not flashy

### Error prevention & recovery
- Required fields marked with `*`; validation real-time (debounced)
- Confirmation dialogs for destructive actions ("Yakin ingin menghapus?")
- Inline error messages below fields (red text, error icon)
- Toast notifications for success/failure (auto-dismiss)
- Form state preserved on browser back/forward

### Accessibility (WCAG AA minimum)
- Color contrast ≥4.5:1 for all text
- All form inputs have associated labels (not placeholder-only)
- Keyboard focus visible (outline or underline)
- Semantic HTML: `<button>`, `<a>`, `<nav>`, `<form>` (not `<div onclick>`)
- ARIA: `role="alert"` on toasts, `aria-label` on icon buttons, `aria-disabled` for states
- Skip-to-main-content link on all pages

---

## Tone & Voice (Indonesian UX)

- **Trustworthy & official:** government-appropriate language; no slang or informality
- **Efficient:** short imperative labels ("Simpan", "Hapus", "Terverifikasi")
- **Clear:** avoid technical jargon; use operational/domain terms from glossary
- **Supportive:** error messages help users fix problems ("Nomor polisi sudah ada" not "FK violation")
- **Consistent:** every entity uses the same term (e.g., "Kendaraan", not "Mobil" or "Unit")

**Localization:**
- Language: **Indonesian (id-ID)** only
- Date format: `dd/MM/yyyy` in forms (e.g., 15/03/2026); display in tables as `d MMM yyyy` with Indonesian month names (e.g., 15 Juni 2026)
- Timestamps: `HH:mm:ss` (24-hour, WIB timezone implied; no timezone picker)
- Currency: `Rp {amount.toLocaleString('id-ID')}` (e.g., Rp 8.500.000)
- Units: `kg` (weight), `km` (distance), `L` (fuel liters)

---

## Branding & Visual Identity

### Color palette strategy
- **Primary green:** aligned to DLH (environmental stewardship) + Pemkot Surabaya government identity
  - Reference: `pemkotsby.ico` shows blue-based government branding
  - **Committed:** the **emerald** ramp `50 #ecfdf5 … 950 #022c22` with cool slate neutrals.
    `primary-600 #059669` is the brand reference, focus-ring, and tint source; **white-on-green fills,
    links, and primary text use `primary-700 #047857` (AA 5.49:1)** — `primary-600` fails AA for text.
  - Avoid: bright neons, pastels, low-contrast combos
  - Full token table: [`01-design-system.md`](./01-design-system.md); CSS source of truth:
    `designs/design_handoff_swat_webapp/swat-tokens.css`.

- **Neutral grays:** for typography, backgrounds, borders
  - Text: `slate-900` on light; `slate-50` on dark
  - Backgrounds: `white`, `slate-50` (light), `slate-100` (subtle divisions)
  - Borders: `slate-200`
  - Disabled/muted: `slate-400`–`slate-500`

- **Semantic colors:**
  - **Success:** `green-500` (✓ trip verified, transaction complete)
  - **Warning:** `amber-500` (⚠ validation, pending approval)
  - **Danger/Error:** `red-500` (✗ reject, delete, critical alerts)
  - **Info:** `blue-500` (ℹ hints, secondary info)

- **Status badge colors** (map domain state to color):
  - `TripStatus.IN_PROGRESS` → `amber-100` / `amber-700` text
  - `TripStatus.DONE` → `blue-100` / `blue-700` text
  - `TripStatus.VERIFIED` → `green-100` / `green-700` text
  - `VehicleStatus.GOOD` → green, `MINOR_DAMAGE` → amber, `MAJOR_DAMAGE` → red, `LOST` → gray
  - `FuelQuotaStatus.ACTIVE` → green, `INACTIVE` → gray

### Typography
- **Font family (committed):** **Plus Jakarta Sans** (UI; fallback Inter, system-ui) +
  **JetBrains Mono** (plate numbers, kitir codes, IDs, timestamps, numeric cells; `tabular-nums`)
- **Scale:**
  - Headline 1 (H1): 32px / 1.25 (page title)
  - Headline 2 (H2): 24px / 1.33 (section title)
  - Headline 3 (H3): 20px / 1.4 (subsection)
  - Body: 16px / 1.5 (default)
  - Small: 14px / 1.43 (secondary text, table captions)
  - Tiny: 12px / 1.5 (labels, badges)
- **Font weights:** 400 (regular), 500 (medium, labels), 600 (semibold, headings), 700 (bold, emphasis)

### Spacing & rhythm
- **Base unit:** 8px (all spacing multiples of 8: 4, 8, 12, 16, 24, 32, 48, 64)
- **Padding:** sections 24px; cards 16px; form fields 12px inside
- **Margins:** between sections 24–32px; between fields 16px
- **Gaps:** form field to label 8px; table cell padding 12px

### Radius & elevation
- **Border radius:** 6px (inputs, buttons, cards), 4px (small elements)
- **Shadows (elevation):**
  - **None:** most UI (flat design)
  - **Subtle (1):** card borders, input focus (1px shadow or 2px blur)
  - **Medium (2):** modal/dialog backdrop, dropdown menus (4px blur)
  - **Strong (3):** deferred (not needed Phase 1)

### Responsive breakpoints
- **Desktop (default):** 1920px, 1440px, 1024px
- **Tablet:** 768px (secondary, responsive CSS)
- **Mobile:** 375px (minimal, not primary)
- **Data tables:** horizontal scroll on ≤1024px; sticky left column (plate number, date) on smaller screens

### PWA & dark mode
- **Theme color:** `#0f172a` (slate-900, used in manifest, status bar)
- **Install prompt:** show after 30s on supported browsers (Chrome/Edge/Safari)
- **Dark mode (in scope):** the dark **token layer ships in Phase 1** (ported verbatim from
  `swat-tokens.css` `.dark`), so components flip correctly via CSS variables; dedicated dark-mode
  visual QA/sign-off is a **Phase 2** gate. Light theme is the Phase-1 baseline. Toggle persists to
  `localStorage('swat-theme')` and follows `prefers-color-scheme`.

---

## Accessibility & Localization Compliance

- **WCAG AA:** all interactive elements keyboard-navigable, color not sole indicator, labels present
- **Language:** Indonesian (id-ID); no English except in error codes/debug info
- **Devices:** desktop/tablet screens; no mobile-optimized separate design (responsive CSS only)
- **RTL:** not needed (Indonesian is LTR)
- **Dyslexia-friendly font:** consider optional in Phase 2

---

## Deliverables from Designer

The designer will produce:

1. **Design System** (delivered — see `designs/` + `01-design-system.md`): tokens (light + **dark**),
   28 components, brand marks, and **11 spot illustrations** (`assets/illustrations/`: login, empty,
   no-results, server-error, maintenance, success, offline, error, no-access, not-found, loading).
   - Atomic components: Button (variants/sizes/states), Input, Textarea, Select, Combobox, DatePicker,
     TimePicker, NumberInput, Checkbox, Radio, Switch
   - Composite: Form field (label/help/error), DataTable (toolbar, pagination, empty/loading/error),
     Dialog, Confirm, Sheet, Tabs, Stepper, Dropzone, Progress, Description List, Dropdown Menu
   - Patterns: card, badge/status-pill, toast, breadcrumb, avatar, alert, tooltip
   - All are **reusable shadcn/ui extensions** built from the token layer (no one-off styling)

2. **Wireframes** (low-fi, ASCII/box-drawing, functional):
   - Login, Change Password (forced)
   - Dashboard/home (minimal Phase 1)
   - App shell (sidebar nav, topbar, content area)
   - Master Data list & form (reusable template, ~12 entities)
   - Transaction flow: Hari Transaksi list, daily board, pickup/disposal/fuel forms
   - Trip verification screen
   - Empty/loading/error states

3. **Hi-fi mockups** (Figma, light theme; responsive notes):
   - All screens from wireframes in visual detail
   - Annotated with Tailwind token names, colors, spacing, typography
   - Responsive behavior at 1440px, 1024px, 768px breakpoints
   - Export-ready for frontend (Figma plugin or PNG + specs)

4. **Component specifications** (per shadcn component):
   - Button: primary/secondary/ghost/destructive variants; sizes sm/md/lg; loading/disabled states
   - Form field: label required indicator, help text, error message positioning
   - DataTable: column sorting, filtering UI, pagination controls, row actions, empty state
   - Select/Combobox: search behavior, keyboard navigation, placeholder
   - DatePicker/TimePicker: format (`dd/MM/yyyy`, `HH:mm:ss`), default behavior, validation
   - Status badge: color mapping (domain enums → Tailwind colors)

5. **Documentation**:
   - Tone & voice examples (button labels, error messages in Indonesian)
   - Accessibility checklist (color contrast, focus states, keyboard nav)
   - Figma design file export instructions (components, tokens, CSS variable mapping)

---

## Success Criteria

- Designers can build the UI without ambiguity from specs
- Frontend engineers can map Figma → shadcn/ui → Tailwind in < 1 week per screen
- All screens are keyboard-navigable and WCAG AA compliant
- Indonesian labels consistent with glossary (not invented synonyms)
- Branding aligns with Pemkot Surabaya government identity (green + trusted neutrals)
- Density supports 25–100 row tables without horizontal scroll on 1440px desktop
