import { expect, test } from '@playwright/test';

import { ADMIN_PASS, ADMIN_USER, login } from './helpers';

test.describe('Auth', () => {
  test('rejects bad credentials with a generic message', async ({ page }) => {
    await page.goto('/id-ID/login');
    await page.getByLabel(/nama pengguna|username/i).fill('admin');
    await page.getByLabel(/kata sandi|password/i).fill('wrong-password');
    await page.getByRole('button', { name: /masuk/i }).click();
    await expect(page.getByText(/kredensial tidak valid/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in and lands on the dashboard or forced change-password', async ({ page }) => {
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page).toHaveURL(/\/(dasbor|ubah-kata-sandi)/);
  });

  test('guards an app route when unauthenticated', async ({ page }) => {
    await page.goto('/id-ID/kendaraan');
    await expect(page).toHaveURL(/\/login/);
  });
});
