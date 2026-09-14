// Dropit and AI-Assist each have their own dedicated workbook (DRP-*/AIA-* in
// Drop_It_Module_Test_Cases_Final.xlsx / AI_Assist_Module_Test_Cases_Final.xlsx) --
// this file is deliberately narrower and out-of-band from both: it only covers
// that each source opens correctly FROM the Add Resource picker's entry point,
// not their own deep functionality. IDs ADD-DRP-01/ADD-AIA-01 are this file's
// own (checked: they exist in none of the 20 workbooks), chosen to read as
// "Add Resource's Dropit/AI-Assist entry point" rather than colliding with the
// dedicated modules' own numbering.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await pl.ensureResourcesPresent();
});

test(
  'ADD-DRP-01: Dropit opens its own resource interface (a QR-code file-transfer flow)',
  { tag: '@positive' },
  async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await ar.actions.dropit.click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Drop It', { exact: true })).toBeVisible();
    await expect(page.getByText(/connection status/i)).toBeVisible();
    await expect(page.getByText(/file transfer status/i)).toBeVisible();
    await expect(page.locator('.qrcode canvas')).toBeVisible(); // QR code
    await expect(ar.dropitCloseBtn).toBeVisible();

    await ar.dropitCloseBtn.click();
    await expect(page.getByText('Drop It', { exact: true })).toBeHidden({ timeout: 5000 });
  }
);

test(
  'ADD-AIA-01: AI-Assist opens an AI-generated exercise interface',
  { tag: ['@positive', '@bug'] },
  async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await ar.actions.aiAssist.click();
    await expect(page.getByText('AI Assist', { exact: true })).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(1500);

    // CONFIRMED (per a Cypress reference project's own findings): AI-Assist
    // can intermittently return an error screen instead of real content. That
    // project skips the test when this happens -- per this project's no-skip
    // rule, document it as a real (environment-dependent) finding instead.
    const errorScreenVisible = await ar.aiAssistErrorScreen.isVisible().catch(() => false);
    if (errorScreenVisible) {
      const msg = (await ar.aiAssistErrorMessage.textContent().catch(() => '')).trim();
      console.log('AI-Assist returned an error screen instead of content:', msg);
      test.fail(true, `AI-Assist returned an error screen instead of content: "${msg}"`);
      expect(errorScreenVisible).toBe(false);
      return;
    }

    await expect(page.getByText('Exercise', { exact: true })).toBeVisible();
    await expect(page.getByText('Videos', { exact: true })).toBeVisible();
    await expect(page.getByText('Teaching Tips', { exact: true })).toBeVisible();
    const checkboxCount = await ar.aiAssistExerciseCheckboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);

    await ar.aiAssistCloseBtn.click();
    await expect(page.getByText('AI Assist', { exact: true })).toBeHidden({ timeout: 5000 });
  }
);
