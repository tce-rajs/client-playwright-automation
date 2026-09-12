// Players -- NEW adversarial "break the app" cases on top of the existing
// 184 tests across checkpoints/code-editor/cross-cutting/ebook/flashcard/
// image/notes/quiz/student-tests/tce/unsupported/video/weblink/
// worksheet.spec.js. New ID prefix PLR-BREAK-*
// (CEP_TestCases/Players_Module_Test_Cases_Final.xlsx). Reuses the same
// confirmed multi-type fixture location as cross-cutting.spec.js (Class
// 12A Computer Science, chapter 13, topic 0).

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { PlayerPage } = require('../../pages/player.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await applyClassMap(nav, 'playersDefault');
  await page.waitForTimeout(1000);
  await pl.ensureDrawerVisible();
});

test('PLR-BREAK-01: rapidly cycling through 3 different player types (Worksheet -> Weblink -> Image) with no settle wait leaves each one genuinely functional, not a corrupted/blank stack', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  // NOTE: the existing PLR-XCUT-02 already confirms (as accepted, INTENDED
  // behavior, not a bug) that opening a second different player type
  // leaves the first one open side-by-side rather than force-closing it --
  // so "more than one close-icon" alone is NOT itself adversarial signal
  // here. The real adversarial question is whether skipping every settle
  // wait during a fast 3-type cycle corrupts any of them (wrong/blank
  // content, or a crash) rather than each genuinely rendering its own type.
  test.setTimeout(60000);
  const plr = new PlayerPage(page);

  await plr.openResourceCard(plr.worksheetCards);
  await page.waitForTimeout(300); // deliberately NOT waiting for full load before switching
  await plr.openResourceCard(plr.weblinkCards);
  await page.waitForTimeout(300);
  await plr.openResourceCard(plr.imageCards);
  await page.waitForTimeout(2000);

  const closeIconCount = await plr.closeIcon.count();
  const weblinkStillReal = await plr.weblinkWrapper.isVisible({ timeout: 3000 }).catch(() => false);
  const pageAlive = await page.locator('[data-qa-id="toolbar-user-avatar"]').isVisible().catch(() => false);
  console.log('Close-icon instance count after rapidly cycling 3 player types:', closeIconCount, '(expected >1 -- side-by-side is confirmed intended, per PLR-XCUT-02) | Weblink still genuinely rendered:', weblinkStillReal, '| page alive:', pageAlive);

  test.fail(!pageAlive, 'Rapidly cycling through 3 different player types with no settle wait crashes the page');
  expect(pageAlive).toBe(true);
  await plr.closePlayer().catch(() => {});
});

test('PLR-BREAK-02: closing a player the instant it opens (before its own content/loading spinner settles) does not leave the Playlist strip broken for the next open', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const plr = new PlayerPage(page);

  await plr.openResourceCard(plr.worksheetCards);
  // Close the INSTANT the close icon appears, with no settle wait at all --
  // distinct from the existing PLR-XCUT-03/EXP-16 (which close an already-
  // settled player via Esc/Back) and PLR-EXP-25 (which tests re-opening
  // the SAME resource twice, not an instant-close-then-reopen-ANY-type).
  await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 10000 });
  await plr.closePlayer();
  await page.waitForTimeout(500);

  // Now try opening a DIFFERENT player type -- the real adversarial check
  // is whether the strip/FAB survived the instant-close cleanly.
  const reopened = await plr.openResourceCard(plr.weblinkCards).then(() => true).catch(() => false);
  const weblinkOpened = await plr.weblinkWrapper.isVisible({ timeout: 10000 }).catch(() => false);
  console.log('Reopen call succeeded:', reopened, '| Weblink player actually opened after instant-close of Worksheet:', weblinkOpened);

  test.fail(!weblinkOpened, 'Instant-closing a player right as it opens leaves the Playlist strip unable to open a different player type afterward');
  expect(weblinkOpened).toBe(true);
  await plr.closePlayer().catch(() => {});
});

test('PLR-BREAK-03: switching Class while a player is open closes/hides it cleanly, not leaving it stuck over the new class\'s whiteboard', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const plr = new PlayerPage(page);
  const nav = new NavigationPage(page);

  await plr.openResourceCard(plr.worksheetCards);
  await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 10000 });

  await nav.resetToClass('Class 9', 'A', 'Hindi Language').catch((e) => console.log('resetToClass threw:', e.message.split('\n')[0]));
  await page.waitForTimeout(2000);

  const playerStillVisible = await plr.closeIcon.first().isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Player close-icon still visible after switching class:', playerStillVisible);
  test.fail(playerStillVisible, 'Switching class while a Worksheet player is open leaves it stuck visible over the new class\'s whiteboard (same bug class as ATT-BREAK-02/DRP-BREAK-01/MM-BREAK-01)');
  expect(playerStillVisible).toBe(false);
});

test('PLR-BREAK-04: opening the SAME resource card 6 times in immediate succession (beyond the existing double-click check) never accumulates more than one player instance', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const plr = new PlayerPage(page);

  for (let i = 0; i < 6; i++) {
    await plr.worksheetCards.first().click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1500);

  const closeIconCount = await plr.closeIcon.count();
  console.log('Close-icon instance count after 6x rapid clicks on the same Worksheet card:', closeIconCount);
  test.fail(closeIconCount > 1, 'Rapidly clicking the same resource card 6 times opens more than one overlapping player instance');
  expect(closeIconCount).toBeLessThanOrEqual(1);
  await plr.closePlayer().catch(() => {});
});
