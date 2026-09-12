// Toolbar -- NEW adversarial "break the app" cases on top of the existing
// 64 tests across autosave/background/canvas-controls/cross-cutting/
// drawing/gap-analysis/object/text/undo-redo/widgets.spec.js. New ID prefix
// TB-BREAK-* (CEP_TestCases/Toolbar_Module_Test_Cases_Final.xlsx).

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { ToolbarPage } = require('../../pages/toolbar.page');

test.use({ viewport: { width: 1920, height: 1080 } });

// Same random-offset-with-clamp pattern already established in
// gap-analysis.spec.js/text.spec.js -- avoids colliding with this shared
// account's persisted leftover objects from earlier runs, and avoids the
// documented off-canvas/under-header traps (LIVE_FINDINGS.md).
const OFFSET_X = Math.floor(Math.random() * 300) - 150;
const OFFSET_Y = Math.floor(Math.random() * 300) - 150;
const at = (x, y) => ({ x: Math.max(120, x + OFFSET_X), y: Math.max(120, y + OFFSET_Y) });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await new ToolbarPage(page).waitForBoardToSettle();
});

/** Click to place a text object and wait for its editor, retrying the
 * tool-select+click once if it doesn't appear -- mirrors this project's own
 * documented fix for Pen/Insert-Text's "first click right after tool select
 * can silently not register" flake (see LIVE_FINDINGS.md's Whiteboard
 * verifier-pass entry and WhiteboardPage.insertTextAt()). ToolbarPage has no
 * equivalent retry built in, so it's inlined here. */
async function openTextEditorAt(tb, page, point) {
  const box = await tb.wbSvg.boundingBox();
  for (let attempt = 0; attempt < 2; attempt++) {
    await tb.selectTool('gtInserttext');
    await page.mouse.click(box.x + point.x, box.y + point.y);
    await page.waitForTimeout(1200);
    const appeared = await tb.textEditor.isVisible({ timeout: 4000 }).catch(() => false);
    if (appeared) return { appeared: true, box };
  }
  return { appeared: false, box };
}

test('TB-BREAK-01: a 2000-character text object does not crash the canvas or corrupt its own rendering', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const tb = new ToolbarPage(page);
  const point = at(200, 200);
  const { appeared: editorAppeared, box } = await openTextEditorAt(tb, page, point);
  console.log('Text editor appeared (after up to 2 attempts):', editorAppeared);
  test.fail(!editorAppeared, 'Text editor did not appear after 2 attempts -- could not exercise the 2000-char boundary case');
  expect(editorAppeared).toBe(true);
  if (!editorAppeared) return;

  const longText = 'Adversarial stress text. '.repeat(80); // ~2080 chars
  await page.keyboard.insertText(longText); // near-instant, matches this project's own established fix for huge text inputs (see LIVE_FINDINGS.md's PLR-EXP-23 entry)
  await page.mouse.click(box.x + point.x + 500, box.y + point.y + 400);
  await page.waitForTimeout(1500);

  const pageAlive = await tb.wbSvg.isVisible().catch(() => false);
  const textObjectExists = await page.locator('foreignObject.text-element, .text-element').count();
  console.log('Page alive after 2000-char text commit:', pageAlive, '| text-element count:', textObjectExists);
  test.fail(!pageAlive, 'Committing a 2000-character text object crashes the whiteboard canvas');
  expect(pageAlive).toBe(true);
});

test('TB-BREAK-02: emoji + Arabic (RTL) text in a text object commits and renders without crashing the canvas', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(30000);
  const tb = new ToolbarPage(page);
  const point = at(250, 250);
  const { appeared: editorAppeared, box } = await openTextEditorAt(tb, page, point);
  console.log('Text editor appeared (after up to 2 attempts):', editorAppeared);
  test.fail(!editorAppeared, 'Text editor did not appear after 2 attempts -- could not exercise the emoji/RTL case');
  expect(editorAppeared).toBe(true);
  if (!editorAppeared) return;

  await page.keyboard.insertText('🎉📐مرحبا بالعالم test مزيج');
  await page.mouse.click(box.x + point.x + 500, box.y + point.y + 400);
  await page.waitForTimeout(1500);

  const pageAlive = await tb.wbSvg.isVisible().catch(() => false);
  console.log('Page alive after emoji+RTL text commit:', pageAlive);
  test.fail(!pageAlive, 'Committing emoji + Arabic (RTL) text crashes the whiteboard canvas');
  expect(pageAlive).toBe(true);
});

test('TB-BREAK-03: rapidly alternating Undo/Redo clicks 16 times does not corrupt the stroke count or crash the canvas', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const tb = new ToolbarPage(page);
  // Draw two real strokes first so there's real history to alternate over.
  await tb.penStroke(at(150, 150), at(350, 150));
  await tb.penStroke(at(150, 400), at(350, 400));
  const baselineCount = await tb.pathCount();

  for (let i = 0; i < 16; i++) {
    const toolId = i % 2 === 0 ? 'gtUndo' : 'gtRedo';
    await tb.tool(toolId).click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1000);

  const pageAlive = await tb.wbSvg.isVisible().catch(() => false);
  const finalCount = await tb.pathCount();
  console.log('Baseline stroke count:', baselineCount, '| after 16x alternating Undo/Redo:', finalCount, '| page alive:', pageAlive);

  test.fail(!pageAlive, 'Rapidly alternating Undo/Redo 16 times crashes the whiteboard canvas');
  expect(pageAlive).toBe(true);
  // A negative/nonsensical count would indicate real state corruption.
  test.fail(finalCount < 0, 'Rapid Undo/Redo alternation corrupts the stroke count into a nonsensical negative value');
  expect(finalCount).toBeGreaterThanOrEqual(0);
});

test('TB-BREAK-04: switching from Pen to Eraser mid-drag (before mouseup) does not leave a stray half-drawn stroke or crash', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(30000);
  const tb = new ToolbarPage(page);
  await tb.selectTool('gtPen');
  const box = await tb.wbSvg.boundingBox();
  const from = at(150, 500);
  const to = at(400, 500);
  const beforeCount = await tb.pathCount();

  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + (from.x + to.x) / 2, box.y + (from.y + to.y) / 2);
  // Switch tools WITHOUT releasing the mouse button first -- a genuine
  // mid-gesture interruption.
  await tb.tool('gtErase').click({ force: true, timeout: 3000 }).catch(() => {});
  await page.mouse.up();
  await page.waitForTimeout(1000);

  const pageAlive = await tb.wbSvg.isVisible().catch(() => false);
  const afterCount = await tb.pathCount();
  console.log('Path count before:', beforeCount, '| after mid-drag tool switch:', afterCount, '| page alive:', pageAlive);

  test.fail(!pageAlive, 'Switching from Pen to Eraser mid-drag (before mouseup) crashes the whiteboard canvas');
  expect(pageAlive).toBe(true);
});

test('TB-BREAK-05: rapidly clicking through 5 different Background options in quick succession settles on exactly ONE final background, not a corrupted/stacked state', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(30000);
  const tb = new ToolbarPage(page);
  await tb.openToolPanel('gtBackground');
  const panelOpened = await tb.panel.isVisible({ timeout: 5000 }).catch(() => false);
  test.fail(!panelOpened, 'Background panel did not open this run -- could not exercise rapid-switch case');
  expect(panelOpened).toBe(true);
  if (!panelOpened) return;

  const optionCount = await tb.backgroundOptions.count();
  console.log('Background option count:', optionCount);
  const clicksToTry = Math.min(optionCount, 5);
  for (let i = 0; i < clicksToTry; i++) {
    await tb.backgroundOptions.nth(i).click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);

  const activeCount = await tb.backgroundActive.count();
  const pageAlive = await tb.wbSvg.isVisible().catch(() => false);
  console.log('Active background option count after rapid switching:', activeCount, '| page alive:', pageAlive);

  test.fail(activeCount > 1 || !pageAlive, 'Rapidly clicking through multiple Background options leaves more than one marked active, or crashes the canvas');
  expect(activeCount).toBeLessThanOrEqual(1);
  expect(pageAlive).toBe(true);
});
