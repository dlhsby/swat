import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

// Ported from specs/13-design/01-design-system.md §5.1 (SWAT design system).
// Token values are the source of truth; the CSS variable layer lives in
// src/app/globals.css (ported verbatim from designs/.../swat-tokens.css).
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Color ramps read the CSS variables from globals.css so the `.dark`
        // overrides flip every `bg-/text-/border-*` utility. (Tailwind opacity
        // modifiers like `/50` can't apply alpha to a hex var() — the only such
        // usages are modal scrims, which use the dedicated `--scrim` token.)
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          950: 'var(--primary-950)',
          // shadcn alias — default fills use primary-700 for AA contrast.
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        neutral: {
          0: 'var(--neutral-0)',
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
          950: 'var(--neutral-950)',
        },
        success: {
          50: 'var(--success-50)',
          100: 'var(--success-100)',
          500: 'var(--success-500)',
          600: 'var(--success-600)',
          700: 'var(--success-700)',
        },
        warning: {
          50: 'var(--warning-50)',
          100: 'var(--warning-100)',
          500: 'var(--warning-500)',
          600: 'var(--warning-600)',
          700: 'var(--warning-700)',
        },
        danger: {
          50: 'var(--danger-50)',
          100: 'var(--danger-100)',
          500: 'var(--danger-500)',
          600: 'var(--danger-600)',
          700: 'var(--danger-700)',
        },
        info: {
          50: 'var(--info-50)',
          100: 'var(--info-100)',
          500: 'var(--info-500)',
          600: 'var(--info-600)',
          700: 'var(--info-700)',
        },
        // Modal/sheet scrim — explicit rgba (alpha can't be applied to hex var()).
        scrim: 'var(--scrim)',
        // shadcn semantic aliases (read from CSS vars, see globals.css)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        h1: ['32px', { lineHeight: '1.25', fontWeight: '700', letterSpacing: '-0.02em' }],
        h2: ['24px', { lineHeight: '1.33', fontWeight: '700', letterSpacing: '-0.01em' }],
        h3: ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.5' }],
        body: ['16px', { lineHeight: '1.5' }],
        'body-sm': ['14px', { lineHeight: '1.43' }],
        label: ['14px', { lineHeight: '1.43', fontWeight: '500' }],
        tiny: ['12px', { lineHeight: '1.5', fontWeight: '500' }],
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
        sm: 'calc(var(--radius) - 2px)',
        base: 'var(--radius)',
        lg: 'calc(var(--radius) + 2px)',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgb(0 0 0 / .05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)',
        base: '0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)',
      },
      zIndex: {
        raised: '10',
        sticky: '100',
        fixed: '200',
        overlay: '1000',
        modal: '1010',
        popover: '1020',
        toast: '1030',
        tooltip: '1040',
      },
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    },
  },
  plugins: [animate],
} satisfies Config;
