// Canvas Controls (Zoom, toolbar-position toggle).
// Source: CEP_TestCases/Toolbar_Module_Test_Cases_Final.xlsx, cases TB-ZOOM-01, TB-TOGGLE-01.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { ToolbarPage } = require('../../pages/toolbar.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await new ToolbarPage(page).waitForBoardToSettle();
});

test('TB-ZOOM-01: The zoom control changes the canvas zoom level', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await tb.openToolPanel('gtZoom');
  await expect(tb.panel).toBeVisible();
  const before = await tb.zoomSlider.getAttribute('aria-valuetext');
  await tb.zoomInBtn.click({ force: true });
  await page.waitForTimeout(500);
  const after = await tb.zoomSlider.getAttribute('aria-valuetext');
  console.log('Zoom before:', before, '| after Zoom In:', after);
  expect(Number(after)).toBeGreaterThan(Number(before));

  await tb.zoomResetBtn.click({ force: true });
  await page.waitForTimeout(500);
  await expect(tb.zoomSlider).toHaveAttribute('aria-valuetext', '100');
});

test('TB-TOGGLE-01: The toolbar-position toggle moves the toolbar to the opposite side of the screen', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  const sideClassBefore = (await tb.container.getAttribute('class')) || '';
  console.log('Toolbar container class before:', sideClassBefore);

  // No confirmed data-qa-id or selector for this toggle exists (neither
  // this pass's own live search nor a Cypress reference project's e2e
  // suite -- which explicitly skipped its own equivalent case -- found one).
  test.fail(true, 'No confirmed selector exists for the toolbar-position toggle control (also unresolved in a Cypress reference project\'s own test suite)');
  expect(true).toBe(false);
});
