import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config (T-162). The suite runs against a **running** SWAT stack
 * (docker-compose + a seeded DB) — it is the operator's on-prem step, not part of
 * the unit gates. To run:
 *   pnpm --filter @swat/web exec playwright install chromium
 *   PLAYWRIGHT_BASE_URL=http://localhost:8088 pnpm --filter @swat/web test:e2e
 *
 * BASE_URL should point at the Nginx origin (same-origin: web + /api) so the
 * httpOnly session cookie flows exactly as in production.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8088';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'id-ID',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
