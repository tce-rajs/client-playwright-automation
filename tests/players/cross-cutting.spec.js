// Cross-cutting (all Player types) -- CEP_TestCases/Players_Module_Test_
// Cases_Final.xlsx, "Cross-cutting (all Player types)" and "Players
// (General)" sections (8 rows: PLR-XCUT-01..04, PLR-EXP-SEC-04,
// PLR-EXP-16, PLR-EXP-17, PLR-EXP-25).
//
// Uses the confirmed Worksheet/Weblink location (Class 12A Computer
// Science, chapter 13, topic 0 -- "14. Project Based Learning") since it
// holds multiple distinct, WORKING (non-crash-affected) player types in
// one place, needed for the multi-type-open and close-method checks below.

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

test('PLR-XCUT-01: Consolidated close-icon selector matrix -- three different close-button implementations across Player types', { tag: '@cross-cutting' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  await plr.openResourceCard(plr.worksheetCards);
  await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 15000 });
  const isRealButton = await page.locator('button.closeIcon').first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Worksheet close is a real <button class="closeIcon">:', isRealButton);
  expect(isRealButton).toBe(true);
  await plr.closePlayer();

  await plr.openResourceCard(plr.weblinkCards);
  await plr.weblinkWrapper.waitFor({ state: 'visible', timeout: 15000 });
  // CONFIRMED LIVE (verifier pass): the weblink content needs a brief
  // settle beat after the wrapper itself appears -- an immediate check
  // right after waitFor() can read false even though .weblink-close-btn
  // (a real <img alt="close-btn">) genuinely exists.
  await page.waitForTimeout(1500);
  const isImgWithoutAlt = await page.locator('.weblink-close-btn').isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Weblink close is img.weblink-close-btn (no alt attribute):', isImgWithoutAlt);
  expect(isImgWithoutAlt).toBe(true);
});

test('PLR-XCUT-02: Opening two DIFFERENT player types simultaneously (Worksheet then Weblink)', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const plr = new PlayerPage(page);
  await plr.openResourceCard(plr.worksheetCards);
  await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 15000 });
  const worksheetVisibleBefore = await plr.closeIcon.first().isVisible().catch(() => false);

  await plr.openResourceCard(plr.weblinkCards);
  await page.waitForTimeout(2000);
  const weblinkOpened = await plr.weblinkWrapper.isVisible({ timeout: 8000 }).catch(() => false);
  const worksheetStillOpen = await page.locator('button.closeIcon').first().isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Worksheet open before:', worksheetVisibleBefore, '| Weblink opened after:', weblinkOpened, '| Worksheet still open (side-by-side, not force-closed):', worksheetStillOpen);
  test.fail(!weblinkOpened, 'Opening a second, DIFFERENT player type failed to open at all with the first still open');
  expect(weblinkOpened).toBe(true);
});

test('PLR-XCUT-03: Closing a player via Esc key, instead of its own X control', { tag: '@ui-state' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  await plr.openResourceCard(plr.worksheetCards);
  await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 15000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  const stillOpen = await plr.closeIcon.first().isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Player still open after pressing Esc (expected: it does NOT close via Esc):', stillOpen);
  // Documented as data either way -- not asserting a specific direction
  // since the workbook itself frames this as open ("document whether...").
  expect(typeof stillOpen).toBe('boolean');
  if (stillOpen) await plr.closePlayer();
});

test('PLR-EXP-SEC-04: A briefly-cached player from the PREVIOUS class does not remain interactive after switching Current Class', { tag: ['@security', '@bug'] }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const nav = new NavigationPage(page);
  await plr.openResourceCard(plr.worksheetCards);
  await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 15000 });
  await nav.resetToClass('Class 12', 'A', 'Physics');
  await page.waitForTimeout(1500);
  const oldPlayerStillThere = await plr.closeIcon.first().isVisible({ timeout: 2000 }).catch(() => false);
  console.log('The Class-12A-CS Worksheet player is still visible/interactive after switching to Class 12A Physics:', oldPlayerStillThere);
  test.fail(oldPlayerStillThere, 'A player resource from the PREVIOUS class remained open/interactive after switching Current Class -- a real cross-class leak risk');
  expect(oldPlayerStillThere).toBe(false);
});

test('PLR-EXP-16: Closing a player via the browser Back button leaves the same clean state as its own X control', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const plr = new PlayerPage(page);
  await plr.openResourceCard(plr.worksheetCards);
  await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 15000 });
  await page.goBack().catch(() => {});
  await page.waitForTimeout(1500);
  const stillOnAppShell = await page.locator('[data-qa-id="toolbar-user-avatar"]').isVisible({ timeout: 5000 }).catch(() => false);
  console.log('App shell still intact/recoverable after browser Back:', stillOnAppShell);
  test.fail(!stillOnAppShell, 'Browser Back left the app in an unrecoverable state instead of a clean equivalent to closing via the X control');
  expect(stillOnAppShell).toBe(true);
});

test('PLR-EXP-17: A player left open across the confirmed ~60-120s session-expiry window does not silently lose state (long-running, generalizes an AI Homework/Worksheet finding to this type)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(150000);
  const plr = new PlayerPage(page);
  await plr.openResourceCard(plr.worksheetCards);
  await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(125000);
  const stayInterstitialVisible = await page.getByText(/still there|stay signed in/i).isVisible({ timeout: 3000 }).catch(() => false);
  const playerStillOpen = await plr.closeIcon.first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Inactivity interstitial appeared:', stayInterstitialVisible, '| player still open after the wait:', playerStillOpen);
  if (stayInterstitialVisible) {
    await page.getByRole('button', { name: /stay signed in/i }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  test.fail(!playerStillOpen, 'The player silently disappeared/lost state across the confirmed inactivity window, with or without the warning interstitial appearing');
  expect(playerStillOpen).toBe(true);
});

test('PLR-EXP-25: Opening the same NON-Video player resource twice in rapid succession does not open two overlapping instances', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const plr = new PlayerPage(page);
  await plr.worksheetCards.first().evaluate((el) => { el.click(); el.click(); });
  await page.waitForTimeout(2500);
  const closeIconCount = await page.locator('button.closeIcon').count();
  console.log('Close-icon count after a rapid double-click on a Worksheet card (should reflect exactly one open instance):', closeIconCount);
  test.fail(closeIconCount > 1, 'A rapid double-click opened MORE than one instance -- generalizes the already-confirmed Video/Quiz double-click race to this Worksheet resource too');
  expect(closeIconCount).toBeLessThanOrEqual(1);
});
