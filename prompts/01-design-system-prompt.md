# Prompt 1 — SWAT Design System (do this first)

> Paste everything in the fenced block below to Claude Design.
> Scope: **design system only** — no wireframes, no hi-fi screens yet.

```
You are creating the DESIGN SYSTEM for SWAT — a back-office PWA for DLH Kota Surabaya
(the city Environment Agency) to manage solid-waste-transportation operations. This task
is the design system ONLY. Do NOT design wireframes or hi-fi screens yet.

READ FIRST (in this order):
1. specs/13-design/00-design-brief.md   — product context, users, tone, branding, accessibility
2. specs/13-design/01-design-system.md  — the existing token/component definitions; this is the
   SOURCE OF TRUTH. Refine and complete it; do not contradict it.
3. specs/01-glossary.md                  — all UI text is INDONESIAN; use these exact labels and
   the domain status values (do not invent synonyms).
Skim only if needed: specs/08-frontend-spec.md (the stack/IA the system must support).

HARD CONSTRAINTS:
- Target stack: Tailwind CSS + shadcn/ui (Radix primitives). Everything must be expressible as
  Tailwind theme tokens + CSS variables and shadcn components. No bespoke framework.
- Language: Indonesian UI. Desktop-first, responsive. Accessibility: WCAG 2.1 AA (contrast,
  focus-visible, keyboard nav, semantic roles).
- Tone: government/utility — clear, dense, fast data entry, trustworthy. Green-forward
  environmental palette aligned to DLH / Pemkot Surabaya identity.
- Stable naming: token and component names become code; keep them consistent with
  specs/13-design/01-design-system.md so the frontend build can consume them directly.

DELIVER (design system only):
1. DESIGN TOKENS as tables (name -> value), ready to drop into tailwind.config + CSS variables:
   - Color: primary (green ramp 50-950) + neutral ramp + semantic (success/warning/danger/info).
   - STATUS colors mapped 1:1 to the domain enums, each with a badge/pill style:
       TripStatus: IN_PROGRESS / DONE / VERIFIED
       DayStatus: IN_PROGRESS / DONE
       FuelQuotaStatus: ACTIVE / INACTIVE
       VehicleStatus: GOOD / MINOR_DAMAGE / MAJOR_DAMAGE / LOST
       MaintenanceStatus: PENDING_APPROVAL / APPROVED
   - Typography scale (font family suited to Indonesian gov UI, e.g. Inter / Plus Jakarta Sans;
     sizes, line-heights, weights), spacing scale, radius, elevation/shadow, z-index, breakpoints.
   - Provide the actual tailwind.config theme extension + a :root CSS variables block.
2. LAYOUT FOUNDATIONS: app shell (collapsible sidebar + topbar + content), grid, and the page
   templates the system supports (list, form, detail/board, dashboard) — structure/spacing only.
3. COMPONENT SPEC — for each shadcn-based component: purpose, variants, sizes, states
   (default/hover/focus/active/disabled/loading/error), and usage rules. Cover at minimum:
   Button, Input, Textarea, Select, Combobox, DatePicker, TimePicker, NumberInput, Form Field
   (label/help/error), Checkbox/Radio/Switch, DataTable (toolbar: search/filter/column-toggle;
   sortable headers; pagination; row actions; empty/loading/skeleton/error states), Dialog/Modal,
   Sheet, Tabs, Card, Badge/Status Pill (using the status tokens above), Toast, Alert, Breadcrumb,
   Tooltip, Pagination, Avatar, Confirm dialog.
4. A short "how to apply" note: light theme required (dark optional), focus-ring spec, and the
   number/date/currency conventions (IDR integer rupiah, kg/km/L, WIB / Asia-Jakarta).

OUTPUT: update/extend specs/13-design/01-design-system.md as the single source of truth (token
tables + tailwind/CSS snippets + component specs). Keep it skimmable. Do NOT produce wireframes,
hi-fi screens, or per-page mockups in this task — those come next.
```

---

**Next:** once the design system is approved, run [`02-wireframes-prompt.md`](./02-wireframes-prompt.md).
