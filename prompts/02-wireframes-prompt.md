# Prompt 2 — SWAT Wireframes (after the design system)

> Run this **after** the design system (Prompt 1) is done and approved.
> Scope: **wireframes only** — structure/layout, not final visual styling. That's hi-fi (Prompt 3).

```
You are creating WIREFRAMES for SWAT — a back-office PWA for DLH Kota Surabaya (the city
Environment Agency) to manage solid-waste-transportation operations. The design system already
exists; use its layout foundations and components. This task is WIREFRAMES only — structure,
hierarchy, and interaction. Do NOT apply final colors/visual polish (that is the hi-fi step).

READ FIRST (in this order):
1. specs/13-design/01-design-system.md  — SOURCE OF TRUTH for layout foundations, page templates,
   and components. Use these component names; do not invent new ones.
2. specs/13-design/00-design-brief.md   — users, devices, tone, accessibility.
3. specs/13-design/02-wireframes.md     — existing low-fi wireframes; refine/extend these.
4. specs/08-frontend-spec.md            — the screen list, information architecture, and navigation.
5. specs/01-glossary.md                 — all UI labels are INDONESIAN; use exact terms.
For per-screen content (fields, actions, rules), read the relevant module spec under specs/09-modules/
(esp. transactions.md, auth.md, master-fleet.md, scheduling.md).

HARD CONSTRAINTS:
- Desktop-first, responsive (operators work on desktops / weighbridge terminals). WCAG 2.1 AA.
- Indonesian labels throughout (Kendaraan, Pengemudi, Lokasi/Spot, Rute, Jatah Kitir, Hari
  Transaksi, Pengambilan Sampah, Pembuangan Sampah, Berat Kotor/Kosong/Bersih, etc.).
- Reuse the design system's app shell (sidebar + topbar) and page templates (list, form,
  detail/board, dashboard). Annotate which components are used (Button, DataTable, Dialog, etc.).

SCREENS TO WIREFRAME (Phase 1) — for each: layout, content blocks, primary/secondary actions,
empty/loading/error states, validation behavior, and key interactions:
- Auth: Login; Change Password (forced first login); Profile.
- App shell: sidebar nav (role-driven) + topbar (user menu, locale) — annotated reference.
- Dashboard / home.
- Master-data REUSABLE PATTERN: define ONCE — List page (search, filter, column toggle, sortable
  table, pagination, row actions) + Create/Edit form + Delete confirm. Instantiate it concretely
  for KENDARAAN (vehicles) as the example, and list the ~12 entities that reuse it.
- Scheduling: Crew schedules, Trip templates, Fuel Quota (Jatah Kitir).
- Transactions: Hari Transaksi list + "Inisiasi Hari" action; the per-day HAUL BOARD; Record
  Pengambilan (pickup); Record Pembuangan + Timbangan (disposal + weighing) showing auto-computed
  Berat Bersih = Berat Kotor - Berat Kosong; Record Bahan Bakar (fuel); Trip verification (Checker).
- Users & Roles (RBAC) management.

DELIVERABLES:
- A wireframe for each screen above (low/mid-fi: boxes, labels, real Indonesian copy, annotations).
  Mark reused patterns once and reference them.
- A screen inventory table mapping each wireframe to its module spec and the API endpoints it uses
  (from specs/07-api-spec.md), plus the permission(s) that gate it.
- Interaction notes: validation, disabled/loading states, confirmations, and navigation flow.

OUTPUT: update specs/13-design/02-wireframes.md as the single source of truth. Keep it skimmable and
keyed to specs/08-frontend-spec.md's screen list. Do NOT apply final visual styling, color, or
imagery — leave that for the hi-fi step.
```

---

**Next:** once wireframes are approved, run [`03-hifi-mockup-prompt.md`](./03-hifi-mockup-prompt.md).
