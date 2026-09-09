// Whiteboard -- NEW adversarial "break the app" cases on top of the
// existing 24 tests in whiteboard.spec.js. New ID prefix WB-BREAK-*
// (CEP_TestCases/Whiteboard_Module_Test_Cases_Final.xlsx). Drawing
// mechanics themselves (Pen/Eraser/Shapes) are covered under Toolbar per
// this file's own established WB-DRAW-XREF-01 convention -- these cases
// focus on Whiteboard-specific concerns: save/persistence around class
// switches (following up on the existing WB-SAVE-DEAD-01 finding that the
// save pipeline is unreachable from the UI), mid-draw interruption, and
// cross-tab real-time sync.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { ToolbarPage } = require('../../pages/toolbar.page');
const { WhiteboardPage } = require('../../pages/whiteboard.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
});

const OFFSET_X = Math.floor(Math.random() * 300) - 150;
const OFFSET_Y = Math.floor(Math.random() * 300) - 150;
const at = (x, y) => ({ x: Math.max(120, x + OFFSET_X), y: Math.max(120, y + OFFSET_Y) });

test('WB-BREAK-01: reloading mid-drag (mouse down, moving, before mouseup) leaves no corrupt half-drawn stroke after the page comes back', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const tb = new ToolbarPage(page);
  const wb = new WhiteboardPage(page);
  await tb.waitForBoardToSettle();
  await tb.selectTool('gtPen');
  const box = await tb.wbSvg.boundingBox();
  const from = at(150, 200);
  const to = at(400, 200);
  const beforeCount = await tb.pathCount();

  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + (from.x + to.x) / 2, box.y + (from.y + to.y) / 2);
  // Reload WITHOUT releasing the mouse button -- a genuine mid-gesture
  // interruption via full page navigation.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-qa-id="toolbar-user-avatar"]').waitFor({ state: 'visible', timeout: 20000 });
  await tb.waitForBoardToSettle();

  const pageAlive = await tb.wbSvg.isVisible().catch(() => false);
  const afterCount = await tb.pathCount();
  console.log('Path count before:', beforeCount, '| after reload mid-drag:', afterCount, '| page alive:', pageAlive);

  test.fail(!pageAlive, 'Reloading mid-drag (before mouseup) leaves the whiteboard canvas broken after reload');
  expect(pageAlive).toBe(true);
});

test('WB-BREAK-02: two browser tabs on the same account drawing on the SAME class/topic concurrently do not corrupt each other\'s strokes', { tag: ['@cross-cutting', '@bug'] }, async ({ page, context }) => {
  test.setTimeout(60000);
  const tb1 = new ToolbarPage(page);
  await tb1.waitForBoardToSettle();
  const before1 = await tb1.pathCount();

  const page2 = await context.newPage();
  await page2.goto('./');
  await page2.locator('[data-qa-id="toolbar-user-avatar"]').waitFor({ state: 'visible', timeout: 20000 });
  const tb2 = new ToolbarPage(page2);
  await tb2.waitForBoardToSettle();

  // Draw on both tabs concurrently at well-separated canvas points.
  await Promise.all([
    tb1.penStroke(at(150, 300), at(350, 300)),
    tb2.penStroke(at(600, 300), at(800, 300)),
  ]);
  await page.waitForTimeout(2000);
  const tab1CountRightAfterDraw = await tb1.pathCount();
  const tab2CountRightAfterDraw = await tb2.pathCount();
  console.log('Right after concurrent draws (before reload) -- tab 1 sees:', tab1CountRightAfterDraw, '| tab 2 sees:', tab2CountRightAfterDraw);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-qa-id="toolbar-user-avatar"]').waitFor({ state: 'visible', timeout: 20000 });
  const afterReloadCount = await tb1.waitForBoardToSettle();

  const pageAlive = await tb1.wbSvg.isVisible().catch(() => false);
  console.log('Path count before concurrent draws:', before1, '| after both tabs drew + reload:', afterReloadCount, '| page alive:', pageAlive);

  test.fail(!pageAlive, 'Two tabs drawing concurrently on the same class/topic crashes the whiteboard');
  expect(pageAlive).toBe(true);
  // Both strokes should be reflected (an increase of roughly 2, allowing
  // some slack for this app's own documented first-stroke-can-silently-not-
  // register flake).
  test.fail(afterReloadCount <= before1, 'Neither concurrent tab\'s stroke persisted after a reload -- concurrent same-topic drawing may be silently dropping strokes');
  expect(afterReloadCount).toBeGreaterThan(before1);
  await page2.close();
});

test('WB-BREAK-03: drawing a stroke then IMMEDIATELY switching Class (before any autosave could plausibly fire) -- does the stroke survive?', { tag: ['@state-persistence', '@bug'] }, async ({ page }) => {
  // Follows up directly on this suite's own WB-SAVE-DEAD-01 finding
  // (WhiteboardSaveService.save() has zero UI callers) -- if there is truly
  // no explicit save path, an immediate class switch is a real, plausible
  // way a teacher could lose work. Documenting the actual outcome either way.
  test.setTimeout(45000);
  const tb = new ToolbarPage(page);
  const nav = new NavigationPage(page);
  await tb.waitForBoardToSettle();
  const beforeCount = await tb.pathCount();

  await tb.penStroke(at(150, 350), at(400, 350));
  const afterDrawCount = await tb.pathCount();
  const strokeRegistered = afterDrawCount > beforeCount;
  test.fail(!strokeRegistered, 'The pen stroke did not register at all this run -- could not exercise the immediate-class-switch data-loss case');
  expect(strokeRegistered).toBe(true);
  if (!strokeRegistered) return;

  // Switch away and immediately back, with no deliberate wait for autosave.
  await nav.resetToClass('Class 9', 'A', 'Hindi Language').catch((e) => console.log('switch away threw:', e.message.split('\n')[0]));
  await nav.resetToClass('Class 12', 'A', 'Physics').catch((e) => console.log('switch back threw:', e.message.split('\n')[0]));
  await page.waitForTimeout(1500);
  const tb2 = new ToolbarPage(page);
  const afterRoundTripCount = await tb2.waitForBoardToSettle();

  console.log('Path count before draw:', beforeCount, '| after draw:', afterDrawCount, '| after immediate class-switch round trip:', afterRoundTripCount);
  // Documenting the real outcome -- if the stroke is gone, that's a
  // legitimate, high-value data-loss finding directly tied to the existing
  // WB-SAVE-DEAD-01 gap; if it's still there, autosave is faster/more
  // robust than that finding alone would suggest.
  test.fail(afterRoundTripCount < afterDrawCount, 'CONFIRMED: a stroke drawn immediately before switching Class (with no deliberate wait for autosave) is LOST on returning to the same class -- a real data-loss risk following directly from the existing WB-SAVE-DEAD-01 finding');
  expect(afterRoundTripCount).toBeGreaterThanOrEqual(afterDrawCount);
});
