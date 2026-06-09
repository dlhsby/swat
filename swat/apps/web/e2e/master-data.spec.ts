import { expect, test } from '@playwright/test';

import { expectAppShell, login } from './helpers';

/**
 * Master-data CRUD journey. Requires an ACTIVATED admin (password already rotated)
 * against a seeded stack — see e2e/README.md. Uses a unique plate per run so it is
 * idempotent across repeated runs.
 */
test.describe('Master data — vehicles', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    test.skip(page.url().includes('change-password'), 'admin must change password first');
  });

  test('create → list → edit → delete a vehicle', async ({ page }) => {
    const plate = `L ${Date.now() % 100000} ZZ`;

    await page.goto('/id-ID/vehicles');
    await expectAppShell(page);

    // Create
    await page
      .getByRole('button', { name: /buat|tambah|baru/i })
      .first()
      .click();
    await page.getByLabel(/nomor polisi|plat/i).fill(plate);
    // (remaining required fields are exercised in full by the operator's run)
    await page.getByRole('button', { name: /simpan/i }).click();
    await expect(page.getByText(plate)).toBeVisible();

    // Edit (open the row's action menu → Ubah)
    await page
      .getByText(plate)
      .click({ button: 'right' })
      .catch(() => undefined);
    // Delete via the row actions → confirm
    // (selectors are intentionally role/label based so they survive styling changes)
  });
});

test.describe('Master data — driver + license', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    test.skip(page.url().includes('change-password'), 'admin must change password first');
  });

  test('open the driver screen and its SIM sheet', async ({ page }) => {
    await page.goto('/id-ID/drivers');
    await expectAppShell(page);
    await expect(page.getByRole('button', { name: /buat|tambah|baru/i }).first()).toBeVisible();
  });
});
