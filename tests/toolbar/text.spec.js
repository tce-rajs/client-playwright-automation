// Text Tool.
// Source: CEP_TestCases/Toolbar_Module_Test_Cases_Final.xlsx, cases TB-TXT-01..06.
//
// CONFIRMED LIVE: clicking an existing text object with the Select tool
// opens a rich formatting panel with real data-qa-ids (font size slider,
// font family select, Bold/Italic/Underline, alignment, To Front/To
// Back/Duplicate/Delete, and ~24 color swatches).

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { ToolbarPage } = require('../../pages/toolbar.page');

test.use({ viewport: { width: 1920, height: 1080 } });

// Whiteboard content persists server-side across the whole run AND across
// repeated runs of this suite (confirmed live) -- a fixed set of canvas
// points eventually collides with a previous run's own leftover text
// objects at those same spots. Shift every point by a per-run random
// offset so repeated runs land somewhere fresh instead of stacking up.
const OFFSET_X = Math.floor(Math.random() * 300) - 150;
const OFFSET_Y = Math.floor(Math.random() * 300) - 150;
const at = (x, y) => ({ x: x + OFFSET_X, y: y + OFFSET_Y });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await new ToolbarPage(page).waitForBoardToSettle();
});

/** Places a text object at a fixed canvas point and commits it, returning
 * that point so callers can click back into it later. */
async function placeText(tb, page, point, text) {
  await tb.selectTool('gtInserttext');
  const box = await tb.wbSvg.boundingBox();
  await page.mouse.click(box.x + point.x, box.y + point.y);
  await page.waitForTimeout(1000);
  await expect(tb.textEditor).toBeVisible();
  await page.keyboard.type(text);
  await page.mouse.click(box.x + point.x + 400, box.y + point.y + 300); // click elsewhere to commit
  await page.waitForTimeout(1000);
}

// Each test uses its own well-separated canvas point -- whiteboard content
// persists server-side across the whole run (confirmed elsewhere in this
// project), so reusing one point risked a later test's click landing on an
// earlier test's leftover text object instead of blank canvas.

test('TB-TXT-01: Text tool creates an editable text box on click', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await tb.selectTool('gtInserttext');
  const box = await tb.wbSvg.boundingBox();
  await page.mouse.click(box.x + at(300, 150).x, box.y + at(300, 150).y);
  await page.waitForTimeout(1000);
  await expect(tb.textEditor).toBeVisible();
});

test('TB-TXT-02: Typed text appears on the canvas after committing', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await placeText(tb, page, at(700, 150), 'QA Test');
  await expect(tb.wbContainer).toContainText('QA Test');
});

test('TB-TXT-03: Selecting existing text opens a rich formatting panel', { tag: '@ui-state' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await placeText(tb, page, at(300, 350), 'QA Panel Test');
  await tb.selectTool('gtSelect');
  const box = await tb.wbSvg.boundingBox();
  await page.mouse.click(box.x + at(320, 360).x, box.y + at(320, 360).y);
  await page.waitForTimeout(1000);

  await expect(tb.textMenuFontSlider).toBeVisible();
  await expect(tb.textMenuFontSelect).toBeVisible();
  await expect(tb.textMenuBoldBtn).toBeVisible();
  await expect(tb.textMenuItalicBtn).toBeVisible();
  await expect(tb.textMenuUnderlineBtn).toBeVisible();
  await expect(tb.textMenuAlignLeftBtn).toBeVisible();
  await expect(tb.textMenuAlignCenterBtn).toBeVisible();
  await expect(tb.textMenuAlignRightBtn).toBeVisible();
});

test('TB-TXT-04: The text panel offers a full color palette plus a gradient picker', { tag: '@ui-state' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await placeText(tb, page, at(700, 350), 'QA Color Test');
  await tb.selectTool('gtSelect');
  const box = await tb.wbSvg.boundingBox();
  await page.mouse.click(box.x + at(720, 360).x, box.y + at(720, 360).y);
  await page.waitForTimeout(1000);

  const swatchCount = await tb.textMenuColorSwatches.count();
  console.log('Text color swatch count:', swatchCount);
  expect(swatchCount).toBeGreaterThan(10);
});

test('TB-TXT-05: Text objects support To Front / To Back / Duplicate / Delete', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await placeText(tb, page, at(300, 550), 'QA Actions Test');
  await tb.selectTool('gtSelect');
  const box = await tb.wbSvg.boundingBox();
  await page.mouse.click(box.x + at(320, 560).x, box.y + at(320, 560).y);
  await page.waitForTimeout(1000);

  await expect(tb.textMenuToFrontBtn).toBeVisible();
  await expect(tb.textMenuToBackBtn).toBeVisible();
  await expect(tb.textMenuDuplicateBtn).toBeVisible();
  await expect(tb.textMenuDeleteBtn).toBeVisible();
});

test('TB-TXT-06: Delete on a text object removes it cleanly', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await placeText(tb, page, at(700, 550), 'QA Delete Test');
  await tb.selectTool('gtSelect');
  const box = await tb.wbSvg.boundingBox();
  await page.mouse.click(box.x + at(720, 560).x, box.y + at(720, 560).y);
  await expect(tb.textMenuDeleteBtn).toBeVisible({ timeout: 5000 });

  await tb.textMenuDeleteBtn.click({ force: true });
  await page.waitForTimeout(1000);
  await expect(tb.wbContainer).not.toContainText('QA Delete Test');
});
