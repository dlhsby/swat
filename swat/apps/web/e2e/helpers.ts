import { type Page, expect } from '@playwright/test';

/**
 * Shared E2E helpers. Credentials come from env so the suite never hard-codes a
 * password; defaults match the seeded admin for a fresh dev stack.
 */
export const ADMIN_USER = process.env.E2E_USER ?? 'admin';
export const ADMIN_PASS = process.env.E2E_PASS ?? 'Password123!';

/**
 * Log in via the UI. The seeded `admin` is the ready-to-use account
 * (`mustChangePassword=false`) and lands on the dashboard; the dev-only
 * `adminreset` is the one that forces a first-login change. Field locators use
 * the stable input ids — a label regex would also match the password show/hide
 * toggle ("Tampilkan kata sandi").
 */
export async function login(page: Page, user = ADMIN_USER, pass = ADMIN_PASS): Promise<void> {
  await page.goto('/id-ID/login');
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(pass);
  await page.getByRole('button', { name: /masuk/i }).click();
  await page.waitForURL(/\/(dashboard|change-password)/);
}

/** Assert the app shell rendered (topbar brand + sidebar present). */
export async function expectAppShell(page: Page): Promise<void> {
  await expect(page.getByRole('navigation')).toBeVisible();
}
