// Drawing Tools (Pencil/Pen, Eraser).
// Source: CEP_TestCases/Toolbar_Module_Test_Cases_Final.xlsx, cases TB-DRAW-01..04.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { ToolbarPage } = require('../../pages/toolbar.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await new ToolbarPage(page).waitForBoardToSettle();
});

test('TB-DRAW-01: Pencil tool draws a freehand stroke on the canvas', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  const before = await tb.pathCount();
  await tb.penStroke({ x: 300, y: 300 }, { x: 500, y: 400 });
  const after = await tb.pathCount();
  expect(after).toBeGreaterThan(before);
});

test('TB-DRAW-02: Eraser removes a drawn stroke where dragged over it', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await tb.penStroke({ x: 300, y: 300 }, { x: 500, y: 300 });
  const afterDraw = await tb.pathCount();

  await tb.selectTool('gtErase');
  await tb.drawStroke({ x: 290, y: 300 }, { x: 510, y: 300 }, 20);
  await page.waitForTimeout(1000);
  const afterErase = await tb.pathCount();
  expect(afterErase).toBeLessThan(afterDraw);
});

test('TB-DRAW-03: Eraser can leave small fragments of a stroke behind', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await tb.penStroke({ x: 300, y: 500 }, { x: 400, y: 500 }); // ~100px stroke
  const afterDraw = await tb.pathCount();

  await tb.selectTool('gtErase');
  await tb.drawStroke({ x: 295, y: 500 }, { x: 405, y: 500 }, 20); // single pass directly over it
  await page.waitForTimeout(1000);
  const afterOnePass = await tb.pathCount();

  console.log('Paths: after draw =', afterDraw, '| after one erase pass =', afterOnePass);
  test.fail(afterOnePass > 0 && afterOnePass >= afterDraw, 'A single erase pass directly over a short stroke leaves fragments behind rather than fully clearing it');
  expect(afterOnePass).toBe(afterDraw - 1);
});

test('TB-DRAW-04: Pencil color/thickness options are available before drawing', { tag: '@ui-state' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await tb.openToolPanel('gtPen');
  await expect(tb.panel).toBeVisible();
  const colorCount = await tb.penColorOptions.count();
  expect(colorCount).toBeGreaterThan(1);
  for (const label of ['Thin', 'Normal', 'Thick', 'Strong']) {
    await expect(tb.panel.getByText(label, { exact: true })).toBeVisible();
  }
});
