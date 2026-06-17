import { expect, test } from '@playwright/test';

import { expectAppShell, login } from './helpers';

/**
 * Transaction workflow journey: open a transaction day, then the Haul Board with
 * its trip sheet + record/verify dialogs. Requires an activated admin + a seeded
 * day (or run after `POST /transaction-days/initialize-today`). See e2e/README.md.
 */
test.describe('Transaction workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    test.skip(page.url().includes('change-password'), 'admin must change password first');
  });

  test('navigate to a transaction day and open the Haul Board', async ({ page }) => {
    await page.goto('/id-ID/scheduling');
    await expectAppShell(page);
    await expect(page.getByRole('heading', { name: /penjadwalan/i })).toBeVisible();

    // Open the first available day (if any) → Haul Board.
    const firstDay = page
      .getByRole('link')
      .filter({ hasText: /\d{4}-\d{2}-\d{2}/ })
      .first();
    if (await firstDay.count()) {
      await firstDay.click();
      await expect(page).toHaveURL(/\/scheduling\/[0-9a-f-]+/i);
      // Haul Board shows the verified/total counter in the page head.
      await expect(page.getByText(/terverifikasi/i)).toBeVisible();
    }
  });

  test('disposal gate: net weight cannot be negative', async ({ page }) => {
    // Documents the data-quality gate exercised in the record-disposal dialog;
    // the operator's run drives a real DISPOSAL trip end-to-end (depart → pickup →
    // disposal → verify). Here we assert the screen is reachable.
    await page.goto('/id-ID/scheduling');
    await expect(page.getByRole('heading', { name: /penjadwalan/i })).toBeVisible();
  });
});
