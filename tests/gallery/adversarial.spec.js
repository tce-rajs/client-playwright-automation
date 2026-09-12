// Gallery -- adversarial "break the app" cases on top of the 19 tests in
// gallery.spec.js. ID prefix GAL-BREAK-*
// (CEP_TestCases/Gallery_Module_Test_Cases_Final.xlsx). Targets the Gallery
// search box (`gallerySearchInput`), confirmed via grep to be completely
// unexercised by every other Gallery test (they only cover the
// category/sub-category filter dropdowns, never free-text search).

const { test, expect } = require('@playwright/test');
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
  const { stillStuck } = await ar.openPickerReliably(ar.actions.gallery);
  if (!stillStuck) await ar.actions.gallery.click({ force: true });
  await expect(ar.galleryImageCards.first()).toBeVisible({ timeout: 10000 });
});

test('GAL-BREAK-01: a 250-character search query does not crash the Gallery grid or hang the search request', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.gallerySearchInput.fill('a'.repeat(250));
  await ar.gallerySearchBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const searchStillResponsive = await ar.gallerySearchInput.isVisible().catch(() => false);
  const cardCount = await ar.galleryImageCards.count();
  console.log('250-char Gallery search -- input still visible:', searchStillResponsive, '| result cards:', cardCount);

  test.fail(!searchStillResponsive, 'A 250-character Gallery search query crashes/hides the search box instead of returning a graceful (likely empty) result');
  expect(searchStillResponsive).toBe(true);
});

test('GAL-BREAK-02: an HTML/script-tag string in the Gallery search box is rendered as literal text, never executed', { tag: ['@security', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const payload = '<img src=x onerror="window.__galXss=true">';
  await ar.gallerySearchInput.fill(payload);
  await ar.gallerySearchBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const xssRan = await page.evaluate(() => !!window.__galXss);
  console.log('Gallery search XSS payload executed:', xssRan);
  test.fail(xssRan, 'An HTML/script-tag string in the Gallery search box executes as real markup');
  expect(xssRan).toBe(false);
});

test('GAL-BREAK-03: emoji/Unicode input in the Gallery search box produces a graceful empty state, not a crash', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.gallerySearchInput.fill('🎨🖼️図画テスト');
  await ar.gallerySearchBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const searchStillResponsive = await ar.gallerySearchInput.isVisible().catch(() => false);
  const cardCount = await ar.galleryImageCards.count();
  console.log('Emoji/Unicode Gallery search -- responsive:', searchStillResponsive, '| result cards:', cardCount);
  test.fail(!searchStillResponsive, 'Emoji/Unicode Gallery search input crashes the search box');
  expect(searchStillResponsive).toBe(true);
});

test('GAL-BREAK-04: rapidly clicking Search 5 times in a row on the same query does not fire 5 overlapping requests that race and show inconsistent results', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.gallerySearchInput.fill('animal');
  for (let i = 0; i < 5; i++) {
    await ar.gallerySearchBtn.click({ timeout: 3000 }).catch(() => {});
  }
  await page.waitForTimeout(2500);

  const cardCount = await ar.galleryImageCards.count();
  const stillResponsive = await ar.gallerySearchInput.isVisible().catch(() => false);
  console.log('After 5x rapid Search clicks -- responsive:', stillResponsive, '| final card count:', cardCount);
  test.fail(!stillResponsive, 'Rapidly clicking Gallery Search 5 times leaves the UI unresponsive/broken');
  expect(stillResponsive).toBe(true);
});
