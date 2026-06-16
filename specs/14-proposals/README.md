# 14 — Proposals (RFCs) & Backlog

This folder is the home for **future features that are not yet committed to a phase** — ideas,
revamps, and integrations under consideration. Each is a lightweight **RFC** (Request for Comments)
so it can be discussed, sized, and either scheduled or shelved without disturbing the committed
specs.

## Where does a future feature go? (decision guide)

```
Is the feature decided AND assigned to a phase?
├── YES → it is committed work:
│         1. Add/extend a functional spec in `09-modules/<name>.md` (mark the target phase 🔜)
│         2. Add the phase/epic to `11-development-plan/README.md`
│         3. Update any impacted core specs (03-data-model, 07-api-spec, etc.)
│
└── NO (idea / proposal / needs design) → write an RFC here:
          `14-proposals/RFC-NNNN-<slug>.md`  (status: Draft → Under Review → Accepted/Deferred/Rejected)
          When Accepted + scheduled, it GRADUATES: create the module spec + phase entry,
          then set the RFC status to "Accepted → see 09-modules/<name>.md (Phase N)".
```

Rule of thumb:
- **Tweaks to an existing module** (a new field, a new report) → just edit that module spec; no RFC needed.
- **New capability, revamp, or external integration** (new entities, new infra, cross-cutting) → RFC first.

## Two levels of detail (this answers "where do the details go?")

An RFC has two shapes depending on how much planning it needs:

1. **One-pager** — `RFC-NNNN-<slug>.md`. The pitch + decision. Enough to discuss and size. Use this
   until the idea needs real design work. (e.g. [RFC-0001](./RFC-0001-monitoring-revamp.md))

2. **Feature folder** — when you want a **dedicated planning session / deep design**, *promote* the
   one-pager into a folder of the same name:
   ```
   RFC-NNNN-<slug>/
     README.md     ← the RFC (the pitch/decision summary — was the one-pager)
     design.md     ← the DETAILED design; grows during planning (architecture, data model, API,
                     algorithm, scale, security, rollout, alternatives, open decisions)
     sessions/     ← one note per planning session: YYYY-MM-DD-<topic>.md
   ```
   This keeps **everything for that feature in one place** while it's still a proposal.
   Example: [RFC-0002](./RFC-0002-gps-route-deviation-alerts/) (GPS deviation alerts) is already a
   folder — open its [`design.md`](./RFC-0002-gps-route-deviation-alerts/design.md) to plan it, and
   record each session under [`sessions/`](./RFC-0002-gps-route-deviation-alerts/sessions/).

When the RFC is **Accepted + Scheduled**, the committed *functional* spec graduates to
`../09-modules/<name>.md` + a phase/epic in `../11-development-plan/README.md`; the proposal folder stays as
design history. So: **idea → RFC one-pager → (needs planning?) folder + design.md + sessions →
committed → 09-modules + phase.**

## Lifecycle / status values

| Status | Meaning |
|--------|---------|
| `Draft` | Being written; not ready for review |
| `Under Review` | Open for comments/decision |
| `Accepted` | Approved; will be scheduled (assign a phase) |
| `Scheduled` | Accepted **and** placed in `../11-development-plan/README.md` (note the phase) |
| `Implemented` | Built; graduated to a `../09-modules/` spec (RFC kept as history) |
| `Deferred` | Good idea, not now |
| `Rejected` | Will not do (record why) |

## Index

| RFC | Title | Status | Target phase |
|-----|-------|--------|--------------|
| [RFC-0001](./RFC-0001-monitoring-revamp.md) | Monitoring revamp: live dashboards, configurable widgets, threshold alerts | Draft | Phase 2+ (follow-on to base monitoring) |
| [RFC-0002](./RFC-0002-gps-route-deviation-alerts/) | Vehicle GPS + route-schedule deviation alerts | Draft | Phase 8+ / Phase 9 (TBD in planning) |

## RFC template

Copy this for a new proposal (`RFC-NNNN-<slug>.md`):

```markdown
# RFC-NNNN — <Title>

- **Status:** Draft
- **Author:** <name>
- **Created:** <YYYY-MM-DD>
- **Target phase:** <e.g. extends Phase 2 / new Phase 9 / TBD>
- **Supersedes / relates to:** <links to module specs or other RFCs>

## 1. Summary
One paragraph: what and why.

## 2. Motivation / problem
What's missing or painful today; who is affected.

## 3. Proposed solution
The approach. Diagrams/flows welcome.

## 4. Scope
- In scope: …
- Out of scope: …

## 5. Impact on existing specs
- Data model (03): new/changed entities …
- API (07): new endpoints …
- Architecture (05) / Scalability (12): new infra, jobs, storage …
- Auth (06): new permissions …
- Frontend (08) / Design (13): new screens …

## 6. Dependencies & risks
Prerequisites, third parties, hardware, data-quality, performance, privacy.

## 7. Rough sizing
S / M / L / XL, and any phasing.

## 8. Open questions
Things to decide before accepting.
```
