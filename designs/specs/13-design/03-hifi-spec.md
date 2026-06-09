# 03 — Hi-Fi Spec (Web) · Final Direction & Deliverables

Records the final hi-fi direction for the **web back-office** mockup, built as a single interactive
prototype: **`hifi-web.html`**. It opens on a **Screen Library (Pustaka Layar)** — a gallery/dictionary
of every screen that you can jump into directly **without logging in** — plus a **Desktop / Mobile**
viewport toggle. The full **login -> forced-password -> app** demo is still one click away ("Jalankan
Demo Lengkap").

Loads `design-system/swat-tokens.css` + `swat-components.css` as the source of truth, plus
`hifi/hifi.css` for app-shell + gallery + phone-frame layout only. All visuals are token-driven.

## Entry modes
- **Gallery (default):** card grid grouped by area (Autentikasi, Kerangka, Master Data, Penjadwalan,
  Transaksi, Pengguna & Akses). Each card opens that screen directly in the chosen viewport.
- **Browse:** screen opened from the gallery; auth bypassed. A floating **dock** (bottom-left) gives
  "Galeri" (back) + a Desktop/Mobile switch from anywhere.
- **Demo:** full login flow (login -> wajib ganti sandi -> app), reachable from the gallery CTA.
- **Viewport:** Desktop (app shell) or **Mobile** — renders any screen inside a 390px phone frame with
  status bar, top bar, off-canvas drawer nav, bottom tab bar, and bottom-sheet dialogs.

> Light theme baseline (required). Desktop-first (target 1280–1440), responsive to tablet drawer.
> Indonesian UI; numbers/dates/currency id-ID, times WIB. WCAG 2.1 AA (focus rings, semantic
> structure, color never the sole status signal — every pill carries a dot + label).

## System applied
- **Type:** Plus Jakarta Sans (UI) + JetBrains Mono (plates, codes, IDs, timestamps, numeric cells).
- **Color:** emerald primary (fills/links `primary-700`, focus ring `primary-600`); slate neutrals;
  status families amber/blue/green/red/slate mapped 1:1 to domain enums (§1.4 of design system).
- **Spacing/radius/elevation:** 8px grid, `radius-base` 6 / `radius-lg` 8, flat-by-default elevation.
- **Icons:** lucide-style 24×24 stroke set (replaces wireframe glyph placeholders). No hand-drawn art.
- **Shell:** sticky topbar (h64) + collapsible sidebar (256, drawer < lg) + 1400 content container.

## Screens & states delivered
| # | Screen | Route | States covered |
|---|--------|-------|----------------|
| 01 | Login | `login` | default · validation-error · loading ("Memuat…") |
| 02 | Ubah Kata Sandi (paksa) | `forcepw` | warning banner · strength meter · match-error · success toast |
| 03 | Profil | `profile` | default · save success · logout confirm |
| 04 | Dasbor | `dashboard` | metric grid · recent-days table · attention alerts |
| 05 | Kendaraan — Daftar | `vehicles` | default · loading(skeleton) · empty · no-results · error · status pills |
| 06 | Kendaraan — Form (Dialog) | — | create/edit · inline validation · duplicate-plate error · success |
| 07 | Jadwal Kru | `crew` | list · row → detail |
| 08 | Template Trayek | `template` | legs table · schedule times · reorder affordance |
| 09 | Jatah Kitir | `quota` | list (3,3 jt) · Terbitkan dialog (radio status, validation) · success |
| 10 | Hari Transaksi | `days` | list · Inisiasi-Hari dialog (idempotent note) · success |
| 11 | Haul Board | `board` | day header + DayStatus · haul rows · verification progress badges |
| 12 | Trip Sheet | (sheet) | per-haul trip list · contextual Catat/Verifikasi actions |
| 13 | Pengambilan (Pickup) | (dialog) | stepper · context · validation |
| 14 | Pembuangan + Timbangan | (dialog) | live net-weight calc (read-only) · gross≥tare gate · disabled save |
| 15 | Bahan Bakar (Refuel) | (dialog) | approved-disabled-by-role · approved≤requested gate |
| 16 | Verifikasi Trayek | (dialog) | DescriptionList target→actual · approve/reject |
| 17 | Rekalibrasi Berangkat/Kembali | (dialog) | two sections · target labels · validation note |
| 18 | Pengguna | `users` | list+avatars · create/edit dialog · force-reset · delete confirm |
| 19 | Hak Akses (RBAC) | `roles` | master-detail · permission switches · role-driven visibility note |
| — | Offline shell · install banner | global | dismissible offline banner; theme-color slate-900 |
| — | "Segera" placeholders | `soon` | IA-complete stubs for not-yet-built menu items |

Empty/loading/error are demonstrable live on the Kendaraan list via the **"Pratinjau status"** menu.

## Microcopy (id-ID)
Buttons imperative: Simpan · Batal · Hapus · Terverifikasi · Tolak · Buat Baru · Inisiasi Hari.
Toasts: "Berhasil" / "Gagal" / "Peringatan" / "Informasi". Human errors ("Nomor polisi sudah ada").
Empty: "Belum ada data" · "Tidak ada hasil pencarian". Glossary terms used verbatim.

## Design-system changes recorded
None required — the existing tokens + component classes covered every screen. The hi-fi adds only
**layout scaffolding** (`hifi/hifi.css`: app-shell grid, page header, toolbar, haul-board grid,
overlays, toast stack, metric cards) and a **stroke-icon set**, both built entirely from existing
tokens. Entrance animations are transform-only (content never hidden if a frame is frozen) and are
disabled under `prefers-reduced-motion`.

## Responsive
≥ lg: persistent sidebar, full tables, centered dialogs, right-side sheets. < lg: off-canvas drawer
(hamburger), scrim. Forms collapse to single column. Touch targets ≥ 44px on coarse pointers
(inherited from `swat-components.css`).
