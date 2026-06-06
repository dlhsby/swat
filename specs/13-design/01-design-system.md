# 01 — Design System

Source of truth for design tokens, layout patterns, and component inventory. Mapped to **Tailwind CSS** + **shadcn/ui (Radix)** for seamless frontend build.

---

## 1. Design Tokens

### 1.1 Color Palette

#### Primary
| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| primary-50 | emerald-50 | #f0fdf4 | light backgrounds, hover states |
| primary-100 | emerald-100 | #dcfce7 | badge backgrounds (light) |
| primary-200 | emerald-200 | #bbf7d0 | subtle dividers |
| primary-500 | emerald-500 | #10b981 | interactive elements, badges (medium) |
| primary-600 | emerald-600 | #059669 | **main brand, buttons, links** |
| primary-700 | emerald-700 | #047857 | hover, active states |
| primary-900 | emerald-900 | #064e3b | headings, dark text |

#### Neutral grays
| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| neutral-0 | white | #ffffff | page background, card backgrounds |
| neutral-50 | slate-50 | #f8fafc | subtle background divisions |
| neutral-100 | slate-100 | #f1f5f9 | input backgrounds, alternate rows |
| neutral-200 | slate-200 | #e2e8f0 | borders, dividers |
| neutral-400 | slate-400 | #94a3b8 | disabled text, muted labels |
| neutral-500 | slate-500 | #64748b | secondary text |
| neutral-600 | slate-600 | #475569 | body text, form labels |
| neutral-700 | slate-700 | #334155 | strong text, sub-headings |
| neutral-900 | slate-900 | #0f172a | main text, headings |

#### Semantic colors
| Token | Value | Hex | Purpose |
|-------|-------|-----|---------|
| success-50 | green-50 | #f0fdf4 | success badge background |
| success-500 | green-500 | #22c55e | success status, checkmarks |
| success-600 | green-600 | #16a34a | success button variant |
| success-700 | green-700 | #15803d | success hover/active |
| warning-50 | amber-50 | #fffbeb | warning badge background |
| warning-500 | amber-500 | #f59e0b | warning status, icons |
| warning-600 | amber-600 | #d97706 | warning button variant |
| warning-700 | amber-700 | #b45309 | warning hover/active |
| danger-50 | red-50 | #fef2f2 | error badge background |
| danger-500 | red-500 | #ef4444 | error status, delete |
| danger-600 | red-600 | #dc2626 | danger button variant |
| danger-700 | red-700 | #b91c1c | danger hover/active |
| info-50 | blue-50 | #eff6ff | info badge background |
| info-500 | blue-500 | #3b82f6 | info status, hints |
| info-600 | blue-600 | #2563eb | info button variant |
| info-700 | blue-700 | #1d4ed8 | info hover/active |

#### Status-specific (domain enums)
| Status | Badge background | Text color | Tailwind class | UI label |
|--------|------------------|-----------|-----------------|----------|
| `TripStatus.IN_PROGRESS` | amber-100 | amber-700 | `bg-amber-100 text-amber-700` | Belum Selesai |
| `TripStatus.DONE` | blue-100 | blue-700 | `bg-blue-100 text-blue-700` | Selesai |
| `TripStatus.VERIFIED` | green-100 | green-700 | `bg-green-100 text-green-700` | Terverifikasi |
| `VehicleStatus.GOOD` | green-100 | green-700 | `bg-green-100 text-green-700` | Baik |
| `VehicleStatus.MINOR_DAMAGE` | amber-100 | amber-700 | `bg-amber-100 text-amber-700` | Rusak Ringan |
| `VehicleStatus.MAJOR_DAMAGE` | red-100 | red-700 | `bg-red-100 text-red-700` | Rusak Berat |
| `VehicleStatus.LOST` | slate-100 | slate-700 | `bg-slate-100 text-slate-700` | Hilang |
| `FuelQuotaStatus.ACTIVE` | green-100 | green-700 | `bg-green-100 text-green-700` | Berlaku |
| `FuelQuotaStatus.INACTIVE` | slate-100 | slate-700 | `bg-slate-100 text-slate-700` | Tidak Berlaku |
| `DayStatus.IN_PROGRESS` | amber-100 | amber-700 | `bg-amber-100 text-amber-700` | Belum Selesai |
| `DayStatus.DONE` | blue-100 | blue-700 | `bg-blue-100 text-blue-700` | Selesai |

### 1.2 Typography

#### Font family
- **Primary:** Inter or Plus Jakarta Sans (system font fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
- **Monospace:** "SF Mono", Monaco, "Cascadia Code", monospace (code blocks, IDs)

#### Type scale (px / line-height)

| Scale | px | line-height | weight | Usage |
|-------|----|----|--------|-------|
| h1 | 32 | 1.25 | 700 | Page title (`<h1>`) |
| h2 | 24 | 1.33 | 700 | Section heading (`<h2>`) |
| h3 | 20 | 1.4 | 600 | Subsection (`<h3>`) |
| body-lg | 18 | 1.5 | 400 | large body text |
| body | 16 | 1.5 | 400 | **default body**, form field values |
| body-sm | 14 | 1.43 | 400 | secondary text, captions |
| label | 14 | 1.43 | 500 | form labels, small headings |
| tiny | 12 | 1.5 | 400 | badges, helper text |

**Font weights:** 400 (regular), 500 (medium, labels), 600 (semibold), 700 (bold)

### 1.3 Spacing (8px grid)

| Token | px | Usage |
|-------|----|----|
| xs | 4 | micro gaps (icon margins) |
| sm | 8 | form field margins, tight groupings |
| md | 12 | button padding, input padding |
| lg | 16 | card padding, section margins |
| xl | 24 | major section gaps, card gaps |
| 2xl | 32 | page padding top/bottom |
| 3xl | 48 | hero sections (deferred) |

### 1.4 Border radius

| Token | px | Usage |
|-------|----|----|
| sm | 4 | small elements (badges, tiny buttons) |
| base | 6 | **default**, inputs, buttons, cards, modals |
| lg | 8 | large cards, dialog boxes |
| full | 9999 | circles, avatars |

### 1.5 Shadows / Elevation

| Token | CSS | Usage |
|-------|-----|--------|
| none | none | flat UI (default) |
| subtle | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | input border, soft focus |
| sm | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | card subtle |
| base | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | dropdown, modal |
| lg | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | modal high-z |

### 1.6 Breakpoints (mobile-first)

| Token | px | Usage |
|-------|----|----|
| sm | 640 | tablet (secondary) |
| md | 768 | tablet landscape |
| lg | 1024 | desktop (primary) |
| xl | 1280 | wide desktop |
| 2xl | 1536 | extra-wide (rare) |

**Primary design target:** 1440px desktop; responsive down to 1024px; mobile is best-effort.

---

## 2. Layout & Grid

### 2.1 App shell

```
┌─────────────────────────────────────────────────────────────┐
│ Topbar: Logo | Title | User menu (avatar) | Locale | Logout │
├──────────┬──────────────────────────────────────────────────┤
│ Sidebar  │ Content area                                      │
│ (collapse)│ (max-width 1400px, padding 2xl)                  │
│          │                                                    │
│          │                                                    │
└──────────┴──────────────────────────────────────────────────┘
```

#### Sidebar (left)
- Width: 256px (desktop), collapsible on tablet/mobile
- Background: `neutral-50` (slate-50)
- Border right: 1px `neutral-200`
- Navigation items: role-based (derive from permissions)
- Item styling:
  - Default: `neutral-600` text, 16px, padding 12px 16px
  - Hover: `neutral-700` text, background `neutral-100`
  - Active: `primary-600` text, background `primary-50`, left border 3px primary-600
  - Disabled (no permission): hidden
- Icons: 20px, left margin 8px
- Submenu (nested): indent 16px, smaller font (14px)
- Collapse on mobile (hamburger icon in topbar)

#### Topbar (top)
- Height: 64px
- Background: `white`, border bottom 1px `neutral-200`
- Sticky: `position: sticky; top: 0; z-index: 100`
- Left section: logo (24px) + title (h2, `neutral-900`)
- Right section: user avatar (40px circle), dropdown menu, logout button
- Responsive: hamburger icon toggles sidebar on < 1024px

#### Content area
- Max-width: 1400px (container)
- Padding: 32px (2xl) top/bottom, 24px (xl) left/right
- Background: `white` or `neutral-50` (see page type)
- Vertical rhythm: sections separated by 24–32px (xl)

### 2.2 Page templates

#### Dashboard / Overview
- Hero section (minimal Phase 1): welcome message + quick stats (cards)
- Cards: 3–4 columns on desktop, 1 column on mobile
- Card layout: title (bold), metric (large number), trend (optional, Phase 2)

#### Master Data list page
- Breadcrumb (optional)
- Page title (h1)
- Action bar: "Create" button (primary), search field, filter dropdown, column toggle button
- DataTable (below): with sorting, pagination, row actions
- Pagination: "Page 1 of 10 (25 rows per page)" + dropdown to change limit
- Empty state: centered icon + "Belum ada data" + create button

#### Master Data form page (create/edit)
- Breadcrumb (path to entity)
- Page title (h1)
- Form sections (cards or fieldsets): group related fields
- Field layout: label (bold, required `*` if needed), input/select, help text (small, gray), error (small, red)
- Submit bar (sticky bottom on desktop): "Simpan" (primary), "Batal" (secondary) buttons
- Form state: disabled while loading, show spinner on submit button

#### Transaction / Dashboard board
- Title (h2) + date label
- Grid layout: one row per vehicle/haul
- Row styling: card-like, light border, padding 16px
- Actions in row: buttons (small) or dropdown menu
- Trip progress badge (e.g., "3/5 terverifikasi")
- Empty state: "Belum ada kendaraan hari ini"

#### Modal / Dialog form
- Title (h3, modal header)
- Form fields (1 column typical)
- Footer: "Simpan" (primary), "Batal" (secondary) buttons
- Backdrop: dark overlay, `background: rgba(0, 0, 0, 0.5)`
- Z-index: 1000+, focus trap

#### Toast / Notification
- Position: bottom-right, 16px margin from corner
- Auto-dismiss: 3–4 seconds (success), 5+ seconds (error)
- Styling: colored left border (4px), background neutral, icon + message + close button

---

## 3. Component Inventory (shadcn/ui mapped)

All components are built from shadcn/ui primitives + Tailwind, enabling frontend to code-generate or hand-code directly.

### 3.1 Button

**Variants:**
- `primary`: bg emerald-600, text white, hover emerald-700
- `secondary`: bg slate-200, text slate-900, hover slate-300
- `ghost`: bg transparent, text emerald-600, hover bg emerald-50
- `destructive`: bg red-600, text white, hover red-700
- `outline`: border 1px slate-200, text slate-900, hover bg slate-50

**Sizes:**
- `sm`: padding 8px 12px, font 14px, radius 4px
- `md`: padding 10px 16px, font 16px, radius 6px (default)
- `lg`: padding 12px 20px, font 16px, radius 6px

**States:**
- Hover: darker shade + 1px shadow (subtle)
- Active: darkest shade
- Disabled: opacity 50%, cursor not-allowed
- Loading: spinner icon, text hidden or "Memuat..."

**Usage:**
- CTA: use primary
- Secondary actions: use secondary or ghost
- Delete/reject: use destructive
- Links: use ghost

### 3.2 Input (text, email, number, date, time)

**Styling:**
- Border: 1px `neutral-200`, radius 6px
- Padding: 10px 12px (vertical/horizontal)
- Background: `white`, hover `neutral-50`
- Focus: border `primary-600`, shadow subtle
- Disabled: background `neutral-100`, text `neutral-400`

**Input types:**
- `text`, `email`: text input with placeholder
- `number`: numeric input, consider spinner vs no-spinner (use native for now)
- `password`: text with eye toggle (optional Phase 2)
- `date`: native date picker (format `yyyy-MM-dd`, display as `dd/MM/yyyy`)
- `time`: native time picker (24-hour, format `HH:mm:ss`)
- `tel`: numeric with masking (optional)

**States:**
- Default: border `neutral-200`
- Hover: border `neutral-300`
- Focus: border `primary-600`, box-shadow `0 0 0 3px rgba(16, 185, 129, 0.1)` (emerald-600 10%)
- Error: border `red-500`, shadow red variant
- Disabled: bg `neutral-100`, cursor not-allowed

**Helper text:**
- Below input, font 12px, color `neutral-500`
- Margin top 4px

### 3.3 Select / Combobox

**Select (native or shadcn):**
- Border/padding/focus: same as Input
- Dropdown: max-height 300px, scroll if overflow, shadow `base`
- Option hover: bg `neutral-100`, text `neutral-900`
- Option selected: bg `primary-100`, text `primary-900`, checkmark (optional)

**Combobox (searchable Select):**
- Input + dropdown (combined)
- Type to filter options (case-insensitive)
- Keyboard: Arrow Up/Down to navigate, Enter to select, Escape to close
- Empty option list: "Tidak ada opsi"

**Styling same as Input; dropdown floats below.**

### 3.4 DatePicker / TimePicker

**DatePicker:**
- Format: `dd/MM/yyyy` (e.g., 15/03/2026)
- Input + calendar icon button
- On click: open calendar picker (or native `<input type="date">` if acceptable)
- Calendar styling: grid 7×6, current date highlighted (primary-600), selected bg primary-100
- Keyboard: Arrow keys navigate dates, Enter select, Escape close

**TimePicker:**
- Format: `HH:mm:ss` (24-hour)
- Input + clock icon
- On click: open time picker (or native `<input type="time">`)
- Manual entry: allow typing (e.g., "08:30")
- Preset buttons: "Sekarang" (now), "08:00", "12:00", "16:00"

### 3.5 NumberInput

- Input with type="number"
- Optional step indicator (± buttons), default hidden or subtle
- Min/max constraints enforced (disable submit if invalid)
- Decimal support (e.g., fuel liters 45.50)
- Formatting on blur: pad to 2 decimals (45 → 45.00)

### 3.6 Form field (composite)

**Structure:**
```
┌────────────────────────────────┐
│ Label * <Tooltip icon>         │
│ ┌──────────────────────────────┐
│ │ Input / Select / etc         │
│ └──────────────────────────────┘
│ Help text (gray, small)        │
│ Error message (red, small)     │
└────────────────────────────────┘
```

**Components:**
- Label: font-weight 500, color `neutral-900`, margin-bottom 8px
- Required asterisk: `*` in primary-600, no space before input
- Tooltip: small `?` icon (gray), hover → tooltip (Popover component)
- Input/Select: full width of form
- Help text: font 12px, color `neutral-500`, margin-top 4px
- Error message: font 12px, color `danger-600`, margin-top 4px, icon (optional)

**Form component:**
- `<form>` or `<Form>` (react-hook-form wrapper)
- Field array (multiple fields)
- Submit handler: prevent default, call mutation
- Show loading spinner on submit button while pending

### 3.7 DataTable (TanStack Table / React Table)

**Columns:**
- Configurable (user can show/hide via column toggle button)
- Header: bold text, sortable (click to sort, ↑/↓ icon)
- Cell padding: 12px (vertical/horizontal)
- Alternating row background (optional): odd rows `neutral-50`, even `white`
- Row hover: background `neutral-50`

**Toolbar (above table):**
- Search box: text input, placeholder "Cari... (misal: nomor polisi)", debounced 300ms
- Filter dropdown: entity-specific (e.g., status, date range) — opens as Popover/Sheet
- Column toggle button: icon, opens Popover with checkboxes for each column
- Action buttons (optional): export CSV (Phase 2), bulk delete (Phase 2)

**Row actions:**
- Last column (fixed width ~80px): dropdown menu or action buttons
  - Edit (pencil icon), View (eye icon), Delete (trash icon)
  - Destructive actions (delete) show confirmation dialog

**Pagination (below table):**
- Style: flex center, gap 12px
- Components:
  - "Sebelumnya" / "Selanjutnya" buttons (disabled if at edge)
  - Page indicator: "Halaman 1 dari 10"
  - Results count (right-aligned): "Menampilkan 1–25 dari 100" (en-dash)
  - Rows-per-page dropdown: 25 / 50 / 100 (default 25)
- Responsive: vertical stack on mobile

**Empty state:**
- Centered, full-width row
- Icon (document or inbox)
- Message: "Belum ada data" (or "Tidak ada hasil pencarian")
- Create button: "Buat Baru" (primary variant)

**Loading state:**
- Show 10 skeleton rows (gray placeholder bars, staggered animation)
- Skeleton height: match regular row height

**Error state:**
- Full-width row, centered
- Error icon (red)
- Message: "Gagal memuat data"
- Retry button: "Coba Lagi" (secondary)

### 3.8 Dialog / Modal

**Styles:**
- Overlay: dark, `bg-black bg-opacity-50`, full-screen
- Dialog box: `white`, border radius 6px, shadow `lg`
- Width: max 90vw, max 500px (responsive)
- Padding: 24px

**Header:**
- Title (h3), bold
- Close button (✕ icon, gray, top-right) — optional if footer has Batal

**Body:**
- Content / form fields
- Padding: 16px 0 (between header + footer)

**Footer:**
- Button group: right-aligned
- Primary action (e.g., "Simpan"), Secondary (e.g., "Batal")
- Margin top: 24px
- Border top: 1px `neutral-200` (optional)

**Interaction:**
- Escape key closes (if no unsaved state)
- Click overlay closes (optional, disallow if form dirty)
- Focus trap: Tab cycles through footer buttons only (not body content)

### 3.9 Sheet (side panel, variant of modal)

**For heavy forms or complex flows** (e.g., trip details view):
- Slides in from right (on desktop) or bottom (on mobile)
- Width: 400–500px (desktop), full-width (mobile)
- Same header/footer/body structure as modal
- Smooth slide-in animation (200ms)

### 3.10 Tabs

**Structure:**
- Tab list: horizontal, sticky/scrollable if many tabs
- Tab button: padding 12px 16px, border-bottom 2px transparent (default)
- Active tab: text primary-600, border-bottom primary-600, font-weight 500
- Tab panel: content area, padding 16px 0

**Usage:** trip verification steps, form multi-step (optional)

### 3.11 Card

**Styling:**
- Background: `white`
- Border: 1px `neutral-200`, radius 6px
- Padding: 16px
- Shadow: none (flat) or subtle on hover

**Variants:**
- Default: plain card
- Clickable: cursor pointer, hover shadow/bg
- Outlined: thicker border, no shadow
- Elevated: shadow `base` (for modals, dropdowns)

**Usage:** dashboard metrics, form sections, list items (alt to table)

### 3.12 Badge / Status pill

**Styling:**
- Border-radius: 20px (full)
- Padding: 4px 12px
- Font: 12px, bold
- Background + text: mapped from domain enum (see status colors above)

**Variants:**
- Filled: solid background
- Outline: border only, transparent background (optional)

**Usage:**
- Trip status: "Belum Selesai", "Selesai", "Terverifikasi"
- Vehicle status: "Baik", "Rusak Ringan", etc.
- Fuel quota: "Berlaku", "Tidak Berlaku"

### 3.13 Toast / Notification

**Positioning:** bottom-right, 16px from edge

**Styling:**
- Background: `white`, border-left 4px (color varies)
- Border radius: 6px
- Padding: 12px 16px
- Shadow: `base`
- Font: 14px

**Variants:**
- Success: border-left `success-500`, title "Berhasil"
- Error: border-left `danger-500`, title "Gagal"
- Warning: border-left `warning-500`, title "Peringatan"
- Info: border-left `info-500`, title "Informasi"

**Content:**
- Icon (left), message (center), close button (right)
- Message: plain text, no HTML
- Auto-dismiss: success 3s, error 5s (allow manual close)

**Usage:** form submission feedback, action confirmation

### 3.14 Breadcrumb

**Styling:**
- Separators: `/` (gray, `neutral-400`)
- Links: text `primary-600`, underline on hover
- Current page (last): text `neutral-600`, no link

**Usage:** master data edit page, transaction detail pages

### 3.15 Tooltip

**Trigger:** hover or focus on icon (?) 

**Content:**
- Small box, bg `neutral-900`, text `white`, padding 8px
- Max-width 200px, font 12px
- Arrow pointing at trigger
- Shadow `base`
- Auto-dismiss on blur/mouseleave

**Usage:** help text for complex fields, unit hints

### 3.16 Pagination

*(covered under DataTable above; standalone rarely used)*

### 3.17 Avatar

**Usage:** user profile (top-right menu)

**Styling:**
- Circle, width/height 40px
- Background: primary-100
- Text: initials (first letter of first & last name, uppercase)
- Border: 1px `neutral-200`
- Fallback: icon if no initials
- On hover: tooltip showing name

### 3.18 Alert

**Box alert (banner style):**
- Padding: 12px 16px
- Border-left: 3px (color depends on severity)
- Background: light tint (e.g., `danger-50` for error)
- Icon + message + optional close button
- Usage: top of page (offline banner, warnings, important notices)

**Inline alert (form field level):**
- Small red text + icon below input
- Margin top 4px

---

## 4. Component State Matrix

### Button states
| State | Background | Border | Text | Cursor | Shadow |
|-------|-----------|--------|------|--------|--------|
| default | primary-600 | none | white | pointer | none |
| hover | primary-700 | none | white | pointer | subtle |
| active | primary-800 | none | white | pointer | subtle |
| disabled | neutral-200 | none | neutral-400 | not-allowed | none |
| loading | primary-600 | none | white | not-allowed | subtle |

### Input states
| State | Border | Background | Text | Placeholder |
|-------|--------|-----------|------|-------------|
| default | neutral-200 | white | neutral-900 | neutral-400 |
| hover | neutral-300 | white | neutral-900 | neutral-400 |
| focus | primary-600 | white | neutral-900 | neutral-400 |
| error | danger-500 | white | danger-700 | neutral-400 |
| disabled | neutral-200 | neutral-100 | neutral-400 | neutral-400 |

---

## 5. Tailwind Configuration Example

```typescript
export const config = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#10b981',
          600: '#059669', // primary brand
          700: '#047857',
          900: '#064e3b',
        },
        neutral: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          // ... rest
        },
        success: { /* ... */ },
        warning: { /* ... */ },
        danger: { /* ... */ },
        info: { /* ... */ },
      },
      fontSize: {
        h1: ['32px', { lineHeight: '1.25' }],
        h2: ['24px', { lineHeight: '1.33' }],
        h3: ['20px', { lineHeight: '1.4' }],
        'body-lg': ['18px', { lineHeight: '1.5' }],
        body: ['16px', { lineHeight: '1.5' }],
        'body-sm': ['14px', { lineHeight: '1.43' }],
        label: ['14px', { lineHeight: '1.43', fontWeight: '500' }],
        tiny: ['12px', { lineHeight: '1.5' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        sm: '4px',
        base: '6px',
        lg: '8px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
}
```

---

## 6. Responsive Design

- **Desktop-first:** design for 1440px, then add media queries for smaller
- **Key breakpoints:** 1440px (primary), 1024px (tablet), 768px (mobile)
- **Data tables:** horizontal scroll on ≤1024px; consider sticky left column (plate #, date)
- **Sidebar:** collapse on <1024px (toggle via hamburger in topbar)
- **Forms:** single column on all sizes; full width inputs
- **Spacing:** reduce margins/padding on mobile (e.g., 2xl → xl, lg → md)

**Example media queries (Tailwind):**
```typescript
// Desktop-first (default in CSS)
.card { padding: 1.5rem; } // xl (24px)

// Tablet
@media (max-width: 1024px) {
  .card { padding: 1rem; } // lg (16px)
}

// Mobile
@media (max-width: 640px) {
  .card { padding: 0.75rem; } // md (12px)
}
```

---

## 7. Dark Mode (Optional, Phase 2+)

If dark theme is added:
- Toggle in user menu
- Store preference in localStorage
- Use Tailwind `dark:` prefix for dark variants
- Color adjustments: inverses for backgrounds, slight opacity for text

*Not required Phase 1; light theme only.*

---

## CSS Variables (for runtime customization)

Frontend can expose these as CSS variables for easy theming:

```css
:root {
  --color-primary-600: #059669;
  --color-neutral-900: #0f172a;
  --color-danger-500: #ef4444;
  --font-family-base: 'Inter', sans-serif;
  --font-size-body: 16px;
  --line-height-body: 1.5;
  --spacing-lg: 16px;
  --radius-base: 6px;
  --shadow-base: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

All components reference these variables; redesigning the system becomes a global token update.

