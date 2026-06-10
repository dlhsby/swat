import { expect, test } from '@playwright/test';

import { ADMIN_PASS, ADMIN_USER, login } from './helpers';

test.describe('Auth', () => {
  test('rejects bad credentials with a generic message', async ({ page }) => {
    await page.goto('/id-ID/login');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('wrong-password');
    await page.getByRole('button', { name: /masuk/i }).click();
    // Submit-level errors surface as a toast (generic, no field disclosure).
    await expect(page.getByText(/salah|tidak valid/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in and lands on the dashboard or forced change-password', async ({ page }) => {
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page).toHaveURL(/\/(dashboard|change-password)/);
  });

  test('guards an app route when unauthenticated', async ({ page }) => {
    await page.goto('/id-ID/vehicles');
    await expect(page).toHaveURL(/\/login/);
  });
});
