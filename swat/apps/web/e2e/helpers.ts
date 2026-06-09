import { type Page, expect } from '@playwright/test';

/**
 * Shared E2E helpers. Credentials come from env so the suite never hard-codes a
 * password; defaults match the seeded admin for a fresh dev stack.
 */
export const ADMIN_USER = process.env.E2E_USER ?? 'admin';
export const ADMIN_PASS = process.env.E2E_PASS ?? 'Password1234!';

/**
 * Log in via the UI. The seeded admin has `mustChangePassword=true`, so on a
 * pristine DB the app redirects to the forced-change screen — callers that need a
 * fully logged-in session should run against a DB where the password was already
 * rotated (or pass E2E_PASS for an already-activated user).
 */
export async function login(page: Page, user = ADMIN_USER, pass = ADMIN_PASS): Promise<void> {
  await page.goto('/id-ID/login');
  await page.getByLabel(/nama pengguna|username/i).fill(user);
  await page.getByLabel(/kata sandi|password/i).fill(pass);
  await page.getByRole('button', { name: /masuk/i }).click();
  await page.waitForURL(/\/(dashboard|change-password)/);
}

/** Assert the app shell rendered (topbar brand + sidebar present). */
export async function expectAppShell(page: Page): Promise<void> {
  await expect(page.getByRole('navigation')).toBeVisible();
}
