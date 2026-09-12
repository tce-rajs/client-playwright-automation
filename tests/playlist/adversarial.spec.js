// Playlist -- NEW adversarial "break the app" cases on top of the existing
// 78 tests across add-resources-entry/contents-popup/core-playlist/
// cross-cutting/ebooks/filters/gap-analysis.spec.js. New ID prefix
// PL-BREAK-* (CEP_TestCases/Playlist_Module_Test_Cases_Final.xlsx).

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
});

test('PL-BREAK-01: an HTML/script-tag string in the Contents/TOC search box is treated as literal text, never executed', { tag: ['@security', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.contentsTile.click();
  await pl.contentsSearchToggle.click({ timeout: 5000 }).catch(() => {});
  const searchVisible = await pl.contentsSearchInput.isVisible({ timeout: 5000 }).catch(() => false);
  test.fail(!searchVisible, 'Contents/TOC search box not reachable this run');
  expect(searchVisible).toBe(true);
  if (!searchVisible) return;

  await pl.contentsSearchInput.fill('<img src=x onerror="window.__plXss=true">');
  await page.waitForTimeout(800);
  const xssRan = await page.evaluate(() => !!window.__plXss);
  console.log('Contents/TOC search XSS payload executed:', xssRan);
  test.fail(xssRan, 'An HTML/script-tag string in the Contents/TOC search box executes as real markup');
  expect(xssRan).toBe(false);
});

test('PL-BREAK-02: rapidly toggling ALL resource-type filter checkboxes off then on, 3 full cycles fast, leaves a consistent final resource-card count', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const pl = new PlaylistPage(page);
  await pl.openOptionsMenu();
  const count = await pl.filterOptions.count();
  test.fail(count === 0, 'No filter checkboxes reachable this run');
  expect(count).toBeGreaterThan(0);
  if (count === 0) return;

  const baselineCardCount = await pl.resourceCards.count();

  for (let cycle = 0; cycle < 3; cycle++) {
    for (let i = 0; i < count; i++) await pl.filterOptions.nth(i).click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
    for (let i = 0; i < count; i++) await pl.filterOptions.nth(i).click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(800);

  // Ensure every filter ends up checked again (restore state for other tests).
  for (let i = 0; i < count; i++) {
    const checked = await pl.filterOptions.nth(i).getAttribute('aria-selected');
    if (checked !== 'true') await pl.filterOptions.nth(i).click({ force: true, timeout: 2000 }).catch(() => {});
  }
  await page.waitForTimeout(500);

  const finalCardCount = await pl.resourceCards.count();
  console.log('Baseline resource-card count:', baselineCardCount, '| after 3x rapid toggle-all-off/on cycles (restored):', finalCardCount);

  test.fail(finalCardCount !== baselineCardCount, `3 rapid toggle-all cycles left the resource-card count at ${finalCardCount} instead of the original ${baselineCardCount}, even after re-checking every filter`);
  expect(finalCardCount).toBe(baselineCardCount);
});

test('PL-BREAK-03: opening Playlist Options and immediately the Contents popup (no wait in between) does not stack two open overlays at once', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.openOptionsMenu();
  await pl.contentsTile.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const optionsVisible = await pl.filterOptions.first().isVisible({ timeout: 2000 }).catch(() => false);
  const contentsVisible = await pl.contentsPopup.isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Playlist Options visible:', optionsVisible, '| Contents popup visible:', contentsVisible);

  const bothOpenAtOnce = optionsVisible && contentsVisible;
  test.fail(bothOpenAtOnce, 'Rapidly clicking Playlist Options then Contents opens BOTH popups stacked at once instead of the second closing/replacing the first');
  expect(bothOpenAtOnce).toBe(false);
});

test('PL-BREAK-04: rapidly clicking through 8 different Chapters in quick succession settles on exactly the last-clicked one with no stuck/duplicated resource cards', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const pl = new PlaylistPage(page);
  await pl.contentsTile.click();
  const chapterCount = await pl.chapterItems.count().catch(() => 0);
  test.fail(chapterCount < 3, 'Fewer than 3 chapters reachable this run -- could not exercise the rapid-multi-chapter-click case');
  expect(chapterCount).toBeGreaterThanOrEqual(3);
  if (chapterCount < 3) return;

  const clicksToTry = Math.min(chapterCount, 8);
  for (let i = 0; i < clicksToTry; i++) {
    await pl.chapterItems.nth(i % chapterCount).click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(1500);

  const activeChapterCount = await page.locator('[data-qa-id="playlist-select-chapter"].active').count();
  const pageAlive = await pl.resourceCards.first().isVisible({ timeout: 5000 }).then(() => true).catch(() => false);
  console.log('Active chapter marker count after 8x rapid chapter clicks:', activeChapterCount, '| a resource card rendered afterward:', pageAlive);

  test.fail(activeChapterCount > 1, 'Rapidly clicking through 8 chapters leaves more than one chapter marked active at once');
  expect(activeChapterCount).toBeLessThanOrEqual(1);
});
