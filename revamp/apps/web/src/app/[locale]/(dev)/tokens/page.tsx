import { ThemeToggle } from '@/components/theme/ThemeToggle';

const PRIMARY_RAMP = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const SEMANTIC = ['success', 'warning', 'danger', 'info'] as const;
const TYPE_SCALE = ['h1', 'h2', 'h3', 'body-lg', 'body', 'body-sm', 'label', 'tiny'] as const;
const SHADOWS = ['subtle', 'sm', 'base', 'lg'] as const;

/**
 * Dev-only token smoke screen. Renders the emerald ramp, semantic colours, the
 * type scale, shadows, and a few primitives so the design tokens can be eyeballed
 * in light and dark. Not part of the production app surface.
 */
export default function TokensPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-2xl px-lg py-2xl">
      <header className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">SWAT — Design Tokens</h1>
        <ThemeToggle />
      </header>

      <section className="space-y-md">
        <h2 className="text-h3 text-foreground">Primary (emerald) ramp</h2>
        <div className="flex flex-wrap gap-xs">
          {PRIMARY_RAMP.map((step) => (
            <div key={step} className="text-center">
              <div
                className="h-12 w-16 rounded-base border border-border"
                style={{ backgroundColor: `var(--primary-${step})` }}
              />
              <span className="text-tiny text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-md">
        <h2 className="text-h3 text-foreground">Semantic</h2>
        <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
          {SEMANTIC.map((tone) => (
            <div
              key={tone}
              className="rounded-base p-md"
              style={{ backgroundColor: `var(--${tone}-100)`, color: `var(--${tone}-700)` }}
            >
              <span className="text-label capitalize">{tone}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-md">
        <h2 className="text-h3 text-foreground">Type scale</h2>
        <div className="space-y-xs">
          {TYPE_SCALE.map((token) => (
            <p key={token} className={`text-${token} text-foreground`}>
              {token} — Pengangkutan Sampah Terpadu
            </p>
          ))}
        </div>
      </section>

      <section className="space-y-md">
        <h2 className="text-h3 text-foreground">Mono &amp; tabular numerals</h2>
        <p className="mono tnum text-body text-foreground">
          L 1234 AB · KTR-2026-0042 · 12.345.678
        </p>
      </section>

      <section className="space-y-md">
        <h2 className="text-h3 text-foreground">Shadows</h2>
        <div className="grid grid-cols-2 gap-lg sm:grid-cols-4">
          {SHADOWS.map((shadow) => (
            <div
              key={shadow}
              className={`rounded-lg bg-card p-lg text-center text-label text-card-foreground shadow-${shadow}`}
            >
              shadow-{shadow}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-md">
        <h2 className="text-h3 text-foreground">Buttons &amp; focus ring</h2>
        <div className="flex flex-wrap gap-md">
          <button
            type="button"
            className="rounded-base bg-primary px-lg py-sm text-label text-primary-foreground hover:bg-primary-800"
          >
            Simpan
          </button>
          <button
            type="button"
            className="rounded-base border border-border bg-card px-lg py-sm text-label text-foreground hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="button"
            className="rounded-base bg-destructive px-lg py-sm text-label text-destructive-foreground"
          >
            Hapus
          </button>
        </div>
      </section>
    </main>
  );
}
