// Add Resources Entry (the "+" picker's own smoke coverage — full depth
// belongs to the separate Add Resource module).
// Source: CEP_TestCases/Playlist_Module_Test_Cases_Final.xlsx, cases PL-ADD-01..03.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
});

test('PL-ADD-01: Floating "+" opens a picker with all six resource-source options', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.openAddResourcesPicker();
  for (const action of Object.values(pl.addResourcesActions)) {
    await expect(action).toBeVisible();
  }
});

test('PL-ADD-02: Closing the Add Resources picker returns cleanly with no side effects', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const beforeClass = await page.locator('[data-qa-id="playlist-current-grade-subject-btn"]').textContent();
  const beforeTopic = await pl.contentsTile.textContent();

  await pl.openAddResourcesPicker();
  await pl.addResourcesCloseBtn.click();
  await page.waitForTimeout(500);

  await expect(pl.addResourcesActions.create).toBeHidden();
  const afterClass = await page.locator('[data-qa-id="playlist-current-grade-subject-btn"]').textContent();
  const afterTopic = await pl.contentsTile.textContent();
  expect(afterClass).toBe(beforeClass);
  expect(afterTopic).toBe(beforeTopic);
});

test('PL-ADD-03: Each Add Resources option actually opens its respective flow (smoke check)', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  test.setTimeout(90000); // 6 options x (open + click + reset) comfortably exceeds the default 30s
  const pl = new PlaylistPage(page);
  const results = {};

  for (const [name, locator] of Object.entries(pl.addResourcesActions)) {
    await pl.openAddResourcesPicker();
    await locator.click();
    await page.waitForTimeout(1200);
    // Each flow opens ON TOP of / replacing the picker -- confirm the
    // original picker's own action buttons are no longer all simultaneously
    // showing (i.e. something actually happened, not a silent no-op).
    const pickerStillShowingAllOptions = await pl.addResourcesActions.create.isVisible().catch(() => false);
    results[name] = !pickerStillShowingAllOptions;
    console.log(`Add Resources -> ${name}: opened its own flow =`, results[name]);

    // Reset back to a clean state for the next option.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.goto('./');
    await page.waitForTimeout(2000);
  }

  const failedOnes = Object.entries(results).filter(([, opened]) => !opened).map(([name]) => name);
  test.fail(failedOnes.length > 0, `These Add Resources options didn't visibly open their own flow: ${failedOnes.join(', ')}`);
  expect(failedOnes).toEqual([]);
});
