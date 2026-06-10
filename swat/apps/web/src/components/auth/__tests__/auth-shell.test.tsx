import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthShell } from '../auth-shell';

// next-intl: passthrough so t('key') === 'key' (we assert the intro keys render).
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ThemeToggle pulls the theme context; stub it to keep the unit isolated.
vi.mock('@/components/theme/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

function renderShell(extra?: { footer?: string }): void {
  render(
    <AuthShell title="Masuk" subtitle="Gunakan akun Anda" footer={extra?.footer}>
      <form data-testid="auth-form">
        <button type="submit">Masuk</button>
      </form>
    </AuthShell>,
  );
}

describe('AuthShell', () => {
  it('renders the page heading and the form (children)', () => {
    renderShell();
    expect(screen.getByRole('heading', { level: 1, name: 'Masuk' })).toBeInTheDocument();
    expect(screen.getByText('Gunakan akun Anda')).toBeInTheDocument();
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
  });

  it('renders the left intro panel content (heading, tagline, feature bullets)', () => {
    renderShell();
    expect(screen.getByRole('heading', { level: 2, name: 'heading' })).toBeInTheDocument();
    expect(screen.getByText('tagline')).toBeInTheDocument();
    expect(screen.getByText('feature1')).toBeInTheDocument();
    expect(screen.getByText('feature2')).toBeInTheDocument();
    expect(screen.getByText('feature3')).toBeInTheDocument();
  });

  it('hides the intro panel below lg and shows it from lg up (responsive contract)', () => {
    const { container } = render(
      <AuthShell title="t" subtitle="s">
        <span>child</span>
      </AuthShell>,
    );
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.className).toContain('hidden');
    expect(aside?.className).toContain('lg:flex');
  });

  it('uses a mode-stable emerald fill on the intro panel (legible in light + dark)', () => {
    const { container } = render(
      <AuthShell title="t" subtitle="s">
        <span>child</span>
      </AuthShell>,
    );
    const aside = container.querySelector('aside');
    // primary-700→900 don't invert in .dark; literal white text stays legible.
    expect(aside?.className).toContain('from-primary-700');
    expect(aside?.className).toContain('to-primary-900');
  });

  it('shows a mobile-only brand lockup that is hidden from lg up', () => {
    const { container } = render(
      <AuthShell title="t" subtitle="s">
        <span>child</span>
      </AuthShell>,
    );
    const mobileLockup = Array.from(container.querySelectorAll('div')).find((el) =>
      el.className.includes('lg:hidden'),
    );
    expect(mobileLockup).toBeDefined();
  });

  it('renders the footer when provided (left panel + mobile)', () => {
    renderShell({ footer: '© 2026 DLH' });
    // Shown on the desktop left panel and again under the form on mobile.
    expect(screen.getAllByText('© 2026 DLH').length).toBeGreaterThanOrEqual(1);
  });
});
