// Background.
// Source: CEP_TestCases/Toolbar_Module_Test_Cases_Final.xlsx, cases TB-BG-01..03.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { ToolbarPage } = require('../../pages/toolbar.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await new ToolbarPage(page).waitForBoardToSettle();
});

test('TB-BG-01: Background chooser offers multiple ruled/graph/plain styles', { tag: '@ui-state' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await tb.openToolPanel('gtBackground');
  await expect(tb.panel).toBeVisible();
  const count = await tb.backgroundOptions.count();
  expect(count).toBeGreaterThan(5);
  await expect(tb.noBackgroundOption).toBeVisible();
});

test('TB-BG-02: Selecting a background style applies it immediately without affecting existing content', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  const before = await tb.pathCount();
  await tb.penStroke({ x: 300, y: 300 }, { x: 500, y: 300 });
  const afterDraw = await tb.pathCount();
  expect(afterDraw).toBeGreaterThan(before);
  // Let the stroke fully persist before switching background -- otherwise
  // a background switch mid-autosave can race with the still-in-flight
  // save and drop the just-drawn stroke.
  await expect(tb.savedToast).toBeVisible({ timeout: 15000 });

  await tb.openToolPanel('gtBackground');
  const activeBefore = await tb.backgroundActive.getAttribute('data-qa-id');
  const allIds = await tb.backgroundOptions.evaluateAll((els) => els.map((el) => el.getAttribute('data-qa-id')));
  const targetId = allIds.find((id) => id !== activeBefore);
  await page.locator(`[data-qa-id="${targetId}"]`).click({ force: true });
  await page.waitForTimeout(500);
  await expect(page.locator(`[data-qa-id="${targetId}"]`)).toHaveClass(/active/);
  await tb.closePanelByTappingOutside();

  expect(await tb.pathCount()).toBe(afterDraw);
});

test('TB-BG-03: "No Background" restores a plain background', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await tb.openToolPanel('gtBackground');
  // Apply a non-default background first.
  const activeBefore = await tb.backgroundActive.getAttribute('data-qa-id');
  const allIds = await tb.backgroundOptions.evaluateAll((els) => els.map((el) => el.getAttribute('data-qa-id')));
  const nonDefaultId = allIds.find((id) => id !== activeBefore && id !== 'toolbar-background-gtBlankPage');
  await page.locator(`[data-qa-id="${nonDefaultId}"]`).click({ force: true });
  await page.waitForTimeout(500);
  await tb.closePanelByTappingOutside();

  await tb.openToolPanel('gtBackground');
  await tb.noBackgroundOption.click({ force: true });
  await page.waitForTimeout(500);
  await expect(tb.noBackgroundOption).toHaveClass(/active/);
});
