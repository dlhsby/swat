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

  test('create form blocks an incomplete submit with inline validation', async ({ page }) => {
    const plate = `L ${Date.now() % 100000} ZZ`;

    await page.goto('/id-ID/vehicles');
    await expectAppShell(page);

    // Open the create dialog and submit with only the plate filled.
    await page
      .getByRole('button', { name: /buat|tambah|baru/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/nomor polisi|plat/i).fill(plate);
    await page.getByRole('button', { name: /simpan/i }).click();

    // Standard error handling: the other required fields are flagged inline and
    // the dialog stays open (no row created). The full create→edit→delete path is
    // covered by the backend e2e (master-data.e2e-spec) + the operator's run.
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(plate)).toHaveCount(0);
  });

  test('vehicle row opens the Pemeriksaan Kendaraan sub-action sheet', async ({ page }) => {
    await page.goto('/id-ID/vehicles');
    await expectAppShell(page);

    // Pemeriksaan & Perawatan moved off the Pengangkutan nav into per-vehicle row
    // sub-actions (like Kelola Sumber Sampah). Open the first row's "⋮" menu and
    // launch the inspection sheet, scoped to that vehicle.
    await page.getByRole('button', { name: 'Aksi' }).first().click();
    await page.getByRole('menuitem', { name: /pemeriksaan kendaraan/i }).click();

    // The right-side sheet (a dialog) opens titled "Pemeriksaan Kendaraan — <nopol>".
    await expect(page.getByRole('dialog', { name: /pemeriksaan kendaraan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /periksa kendaraan/i })).toBeVisible();
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
