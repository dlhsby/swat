# `designs/` — Canonical Design Source

This folder is the **single source of truth for the SWAT visual design**: tokens, components, and the
21 hi‑fi screens. It was exported from Claude Design (claude.ai/design) as a handoff bundle and
vendored here verbatim.

## What's here

| Path | What it is | How to use |
|------|------------|------------|
| `README.md` | Bundle "read me first" (from Claude Design) | Read first for intent. |
| `chats/chat1–5.md` | The user↔design‑assistant transcripts | Where the design intent/history lives. |
| `design_handoff_swat_webapp/README.md` | **Hi‑fi handoff spec** — 21‑screen catalog, app shell, IA, status→pill map, interactions | The authoritative screen/behavior reference. |
| `design_handoff_swat_webapp/design-system.md` | **Full written design‑system spec** — tokens + 28 components | Authoritative; mirrored into `specs/13-design/01-design-system.md`. |
| `design_handoff_swat_webapp/swat-tokens.css` | Token variable layer (light + `.dark`) | **Port verbatim** into `apps/web/src/app/globals.css`. |
| `design_handoff_swat_webapp/swat-components.css` | Reference component styles built on the tokens | Reference for the shadcn/ui component layer. |
| `design_handoff_swat_webapp/assets/` | Brand marks (`swat-mark*.svg`) + 11 spot illustrations | Copy into `apps/web/public/{brand,illustrations}/`. |
| `design_handoff_swat_webapp/screenshots/` | 12 rendered references (light/dark, desktop/mobile) | Visual cross‑check only. |
| `design_handoff_swat_webapp/hifi-web.html` + `prototype_src/` | Runnable React prototype + its source | **Reference only — see below.** |

## Additional reference extras (from the re-pulled bundle)

The latest pull added these standalone reference files at the `designs/` root. The core handoff
files above are **byte-identical** to the previous pull — these extras are net-new viewing aids.

| Path | What it is |
|------|------------|
| `design-system.html` + `design-system/` (`guide.js`, `swat-tokens.css`, `swat-components.css`) | Rendered, browsable design-system guide. |
| `illustrations.html` + `illustrations/` | Gallery of the 11 spot illustrations. |
| `wireframe-web.html` + `wireframe/` | Low-fi wireframe prototype (predates the hi-fi). |
| `hifi-web.html` | Top-level entry to the hi-fi prototype. |
| `index.html`, `logo.html` | Bundle landing page + logo/brand-mark showcase. |
| `brand/` | Brand marks (`swat-mark*.svg`) at the bundle root. |
| `specs/13-design/` | The bundle's own mirror of the design-system + hi-fi specs. |

## Important — prototype is reference, not production code

- `hifi-web.html` and everything under `prototype_src/` are **design references created in
  HTML/React‑via‑Babel**. **Do not copy them into the product.** Recreate each screen in the real
  stack (Next.js + Tailwind + shadcn/ui) using the tokens and component contracts.
- The prototype's runtime modes are **scaffolding only — do NOT build them into the product**:
  the **Gallery / "Pustaka Layar"** index, the **Desktop/Mobile viewport toggle**, and the
  **Browse vs Demo** switch.
- The floating dev pill in some screenshots is the prototype toolbar — **not** part of the product.

## Relationship to `specs/`

`designs/` is the visual source of truth; `specs/13-design/` is the engineering‑facing narrative that
**mirrors** it and binds it to the glossary (`specs/01-glossary.md`), the data model
(`specs/03-data-model.md`), and the phased plan (`specs/11-development-plan/`). **On any conflict
between the specs and this bundle, the bundle wins** — update the spec to match.
