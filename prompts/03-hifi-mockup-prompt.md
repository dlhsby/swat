# Prompt 3 — SWAT Hi-Fi Mockups (after the wireframes)

> Run this **after** the design system (Prompt 1) and wireframes (Prompt 2) are done and approved.
> Scope: elevate the wireframes into **production hi-fi mockups** using the design system.

```
You are creating HI-FI MOCKUPS for SWAT — a back-office PWA for DLH Kota Surabaya (the city
Environment Agency) to manage solid-waste-transportation operations. The design system and
wireframes already exist. This task turns each approved wireframe into a polished, production-ready
hi-fi mockup by applying the design system. Do NOT invent new screens or restructure layouts —
elevate what the wireframes already define.

READ FIRST (in this order):
1. specs/13-design/01-design-system.md  — SOURCE OF TRUTH: tokens (color incl. STATUS colors,
   typography, spacing, radius, elevation) and component specs. Apply these exactly.
2. specs/13-design/02-wireframes.md     — the approved wireframes; these are the structural basis.
3. specs/13-design/03-hifi-spec.md      — the hi-fi brief + deliverables checklist; follow it.
4. specs/13-design/00-design-brief.md   — branding, tone, accessibility.
5. specs/01-glossary.md                 — Indonesian microcopy; use exact labels.

HARD CONSTRAINTS:
- Apply ONLY design-system tokens and components. If something is genuinely missing, extend the
  design system and RECORD the addition back into specs/13-design/01-design-system.md (do not add
  one-off styles in a mockup).
- Indonesian UI; desktop-first, responsive; WCAG 2.1 AA (contrast, focus rings, semantic structure).
- Number/date/currency: IDR integer rupiah with thousands separators, kg/km/L units, WIB
  (Asia/Jakarta) for times.

PRODUCE — for every Phase-1 screen in the wireframes:
- A hi-fi mockup with real Indonesian copy, applying color/typography/spacing/elevation tokens and
  status pills mapped to the domain enums (TripStatus, DayStatus, FuelQuotaStatus, VehicleStatus,
  MaintenanceStatus).
- All meaningful STATES per screen: default, empty, loading/skeleton, error, and (for forms)
  validation-error and success.
- Responsive notes (desktop primary; tablet fallback) and the PWA install + offline-shell states.
- Export/print affordances where the screen has them.
- Microcopy guidance in Indonesian (buttons, confirmations, toasts, empty states).

DELIVERABLES:
- One hi-fi mockup per screen + a light component-library page showing the styled components.
- A deliverables checklist (which screens, in which states) keyed to specs/13-design/03-hifi-spec.md
  and the screen inventory in specs/13-design/02-wireframes.md.
- Light theme required; dark theme optional.

OUTPUT: produce the hi-fi mockups and update specs/13-design/03-hifi-spec.md so each screen's final
direction (tokens used, states, annotations) is captured as the source of truth. Keep every choice
consistent with the design system — flag and record any system changes you had to make.
```

---

This is the last of the three sequenced design prompts:
1. [`01-design-system-prompt.md`](./01-design-system-prompt.md)
2. [`02-wireframes-prompt.md`](./02-wireframes-prompt.md)
3. **`03-hifi-mockup-prompt.md`** (this file)
