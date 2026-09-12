// Undo/Redo.
// Source: CEP_TestCases/Toolbar_Module_Test_Cases_Final.xlsx, cases TB-UNDO-01..03.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { ToolbarPage } = require('../../pages/toolbar.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await new ToolbarPage(page).waitForBoardToSettle();
});

test('TB-UNDO-01: Undo reverses the most recent action', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  const before = await tb.pathCount();
  await tb.penStroke({ x: 300, y: 300 }, { x: 500, y: 300 });
  expect(await tb.pathCount()).toBeGreaterThan(before);

  await tb.selectTool('gtUndo');
  await page.waitForTimeout(900);
  expect(await tb.pathCount()).toBe(before);
});

test('TB-UNDO-02: Redo re-applies an undone action', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  const before = await tb.pathCount();
  await tb.penStroke({ x: 300, y: 300 }, { x: 500, y: 300 });
  const afterDraw = await tb.pathCount();

  await tb.selectTool('gtUndo');
  await page.waitForTimeout(900);
  expect(await tb.pathCount()).toBe(before);

  await tb.selectTool('gtRedo');
  await page.waitForTimeout(900);
  expect(await tb.pathCount()).toBe(afterDraw);
});

test('TB-UNDO-03: Undo/Redo history depth', { tag: '@boundary' }, async ({ page }) => {
  test.setTimeout(60000); // 12 strokes + up to 14 undo iterations exceeds the default 30s
  const tb = new ToolbarPage(page);
  const before = await tb.pathCount();
  const strokeCount = 12;
  for (let i = 0; i < strokeCount; i++) {
    await tb.penStroke({ x: 300 + i * 5, y: 250 }, { x: 400 + i * 5, y: 250 });
  }
  const afterAll = await tb.pathCount();
  expect(afterAll).toBe(before + strokeCount);

  let undoSteps = 0;
  let current = afterAll;
  for (let i = 0; i < strokeCount + 2; i++) {
    await tb.selectTool('gtUndo');
    await page.waitForTimeout(700);
    const now = await tb.pathCount();
    if (now === current) break; // Undo stopped having an effect -- history exhausted
    undoSteps++;
    current = now;
  }

  console.log(`Undo history depth: ${undoSteps} step(s) back out of ${strokeCount} actions performed (ended at ${current} paths, started at ${before}).`);
  expect(undoSteps).toBeGreaterThan(0);
});
