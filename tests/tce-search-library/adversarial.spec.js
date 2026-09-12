// TCE Search Library -- adversarial "break the app" cases on top of the 29
// tests in tce-search-library.spec.js. ID prefix TCE-BREAK-*
// (CEP_TestCases/TCE_Search_Library_Module_Test_Cases_Final.xlsx).
// TCE-BOUND-01/02 already cover 1-2 char queries and one script-like
// payload -- these target a genuinely long query, a real character-by-
// character fast-typing race (distinct from LIB-AUTOSEARCH-RACE-01's
// "manual vs. autosearch on open" race), and rapid clear/retype cycling.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.beforeEach(async ({ page }, testInfo) => {
  // Uses AddResourcePage.openPickerReliably() -- see LIVE_FINDINGS.md and
  // drop-it.spec.js's own header comment for the confirmed real bug it
  // works around (the Add Resources picker can render with
  // pointer-events:none across its whole popup subtree on a
  // non-deterministic fraction of fresh logins, ~30-50% observed).
  testInfo.setTimeout(60000);
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await pl.ensureResourcesPresent();
  const { stillStuck } = await ar.openPickerReliably(ar.actions.library);
  if (!stillStuck) await ar.actions.library.click({ force: true });
  await expect(ar.libraryPopup).toBeVisible({ timeout: 10000 });
});

test('TCE-BREAK-01: a 500-character search query does not crash or hang the Library results panel', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.librarySearchInput.fill('a'.repeat(500));
  await ar.librarySearchBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const stillResponsive = await ar.librarySearchInput.isVisible().catch(() => false);
  const resultCount = await ar.libraryResults.count();
  console.log('500-char Library search -- responsive:', stillResponsive, '| results:', resultCount);
  test.fail(!stillResponsive, 'A 500-character Library search query crashes/hides the search UI');
  expect(stillResponsive).toBe(true);
});

test('TCE-BREAK-02: typing a real query character-by-character with minimal delay settles on the FULL query\'s results, not a stale partial-substring response', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.librarySearchInput.fill('');
  const fullQuery = 'photosynthesis';
  // Type with a tiny per-character delay -- fast enough that a naive
  // debounce/race in the app could serve a stale in-flight response for an
  // earlier partial substring instead of the final complete query.
  await ar.librarySearchInput.pressSequentially(fullQuery, { delay: 30 });
  await ar.librarySearchBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const finalInputValue = await ar.librarySearchInput.inputValue();
  const resultCount = await ar.libraryResults.count();
  console.log('Input value after fast character-by-character typing:', finalInputValue, '| result count:', resultCount);

  test.fail(finalInputValue !== fullQuery, 'Fast character-by-character typing leaves the search box holding a truncated/stale value instead of the fully-typed query');
  expect(finalInputValue).toBe(fullQuery);
});

test('TCE-BREAK-03: rapidly filling then clearing then refilling the search box 4 times in a row leaves the UI in a consistent, non-stuck final state', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const queries = ['algebra', '', 'geometry', '', 'trigonometry', '', 'calculus', ''];
  for (const q of queries) {
    await ar.librarySearchInput.fill(q);
    await page.waitForTimeout(80);
  }
  await ar.librarySearchInput.fill('calculus');
  await ar.librarySearchBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const stillResponsive = await ar.librarySearchInput.isVisible().catch(() => false);
  const finalValue = await ar.librarySearchInput.inputValue();
  console.log('After rapid fill/clear cycling -- responsive:', stillResponsive, '| final input value:', finalValue);

  test.fail(!stillResponsive || finalValue !== 'calculus', 'Rapid fill/clear/refill cycling on the Library search box leaves it in a stuck or stale-value state');
  expect(stillResponsive).toBe(true);
  expect(finalValue).toBe('calculus');
});
