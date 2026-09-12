// Core Playlist UI.
// Source: CEP_TestCases/Playlist_Module_Test_Cases_Final.xlsx, cases PL-CORE-01..07.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
});

test('PL-CORE-01: Playlist strip visible with E-Books, Contents, and resource cards', { tag: '@ui-state' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await expect(pl.eBooksTile).toBeVisible();
  await expect(pl.contentsTile).toBeVisible();
  await expect(pl.resourceCards.first()).toBeVisible();
});

test('PL-CORE-02: Contents tile shows the current chapter/topic position badge', { tag: '@ui-state' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const contentsText = await pl.contentsTile.textContent();
  console.log('Contents tile text:', contentsText);
  expect(contentsText).toMatch(/\d+\.\d+/);
});

test('PL-CORE-03: Resource cards show a type-specific badge/icon', { tag: '@ui-state' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const firstCard = pl.resourceCards.first();
  await expect(firstCard).toBeVisible();
  const hasIcon = await firstCard.locator('img, mat-icon, [class*="icon"], [class*="badge"]').count();
  expect(hasIcon).toBeGreaterThan(0);
});

test('PL-CORE-04: The "..." control opens the Playlist Options menu', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.openOptionsMenu();
  await expect(pl.filterOptions.first()).toBeVisible();
  await expect(pl.filterEditBtn).toBeVisible();
  await expect(pl.filterResetBtn).toBeVisible();
});

test('PL-CORE-05: Left/right chevrons are present beside the Playlist Options control', { tag: '@ui-state' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await expect(pl.leftScrollBtn).toBeVisible();
  await expect(pl.rightScrollBtn).toBeVisible();
});

test('PL-CORE-06: Pin/anchor icon toggles visual state on click', { tag: '@ui-state' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const before = await pl.pinBtn.getAttribute('class');
  await pl.pinBtn.click();
  await page.waitForTimeout(500);
  const after = await pl.pinBtn.getAttribute('class');
  console.log('Pin button class before:', before, '| after:', after);
  expect(after).not.toBe(before);
});

test('PL-CORE-07: Floating "+" button opens the Add Resources picker', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.openAddResourcesPicker();
  await expect(pl.addResourcesActions.create).toBeVisible();
  await expect(pl.addResourcesActions.library).toBeVisible();
  await expect(pl.addResourcesActions.gallery).toBeVisible();
  await expect(pl.addResourcesActions.dropit).toBeVisible();
  await expect(pl.addResourcesActions.aiAssist).toBeVisible();
  await expect(pl.addResourcesActions.whiteboard).toBeVisible();
});
