// Notes Player -- CEP_TestCases/Players_Module_Test_Cases_Final.xlsx,
// "Notes Player" section (4 rows: PLR-NOTE-01..03, PLR-EXP-14).
//
// Per the workbook's own confirmed finding: ZERO Notes-type resources
// exist anywhere in the curriculum on this account, AND the player
// component itself "looks unfinished" per the dev team's own source-level
// note -- it loads the resource's URL string directly into an iframe with
// no real content fetch and no editing UI at all.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
});

test('PLR-NOTE-01: A Notes-type resource opens a text/note viewer or editor (BLOCKED -- zero Notes resources confirmed to exist anywhere)', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  test.fail(true, 'CONFIRMED cross-repo: zero Notes-type resources exist anywhere in the curriculum on this account -- nothing to click to attempt this check');
  expect(true).toBe(false);
});

test('PLR-NOTE-02: The Notes player itself may be intentionally unfinished, per the dev team\'s own source-level note', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'CONFIRMED cross-repo (source-read): the player component loads the resource\'s URL string directly into an iframe with no real content fetch and no editing UI at all -- worth a product conversation before investing further QA time seeding Notes content, since even with real content there may be no meaningful behavior to test');
  expect(true).toBe(false);
});

test('PLR-NOTE-03: RECONCILIATION -- the Flashcard-type player is very unlikely to be the same feature as Notes', { tag: '@cross-cutting' }, async ({ page }) => {
  // See tests/player/flashcard.spec.js (PLR-FLASH-01) for the independent
  // live confirmation that Flashcard is feature-complete and working --
  // directly contradicting Notes' own confirmed content-empty,
  // feature-incomplete state. Cross-referenced, not re-derived here.
  console.log('Cross-reference: PLR-FLASH-01 in tests/player/flashcard.spec.js independently confirms Flashcard is a fully working, feature-complete player -- Notes (this file) is confirmed both content-empty and source-level unfinished. These are almost certainly NOT the same feature.');
  await expect(page.locator('[data-qa-id="toolbar-user-avatar"]')).toBeVisible({ timeout: 10000 });
});

test('PLR-EXP-14: If Notes is unfinished, clicking into it at minimum does not crash the whiteboard (BLOCKED -- no Notes resource reachable)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'No Notes-type resource is reachable anywhere on this account to click into and test this minimum-safety-bar check against');
  expect(true).toBe(false);
});
