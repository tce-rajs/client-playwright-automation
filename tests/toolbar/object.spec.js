// Object Manipulation.
// Source: CEP_TestCases/Toolbar_Module_Test_Cases_Final.xlsx, cases TB-OBJ-01..02.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { ToolbarPage } = require('../../pages/toolbar.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await new ToolbarPage(page).waitForBoardToSettle();
});

test('TB-OBJ-01: Clicking an inserted shape selects it with manipulation controls', { tag: '@positive' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await tb.openToolPanel('gtShapes');
  await expect(tb.panel).toBeVisible();
  await tb.panel.locator('img, svg, button').first().click({ force: true });
  await page.waitForTimeout(600);
  await tb.closePanelByTappingOutside();
  await tb.drawStroke({ x: 350, y: 300 }, { x: 520, y: 440 });

  await tb.selectTool('gtSelect');
  const box = await tb.wbSvg.boundingBox();
  await page.mouse.click(box.x + 430, box.y + 370);
  await page.waitForTimeout(1000);

  await expect(tb.pathMenuToFrontBtn).toBeVisible();
  await expect(tb.pathMenuToBackBtn).toBeVisible();
  await expect(tb.pathMenuDuplicateBtn).toBeVisible();
  await expect(tb.pathMenuDeleteBtn).toBeVisible();
});

test('TB-OBJ-02: Deleting a canvas object has no confirmation step', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  const before = await tb.pathCount();
  await tb.penStroke({ x: 300, y: 300 }, { x: 500, y: 400 });
  const afterDraw = await tb.pathCount();
  expect(afterDraw).toBeGreaterThan(before);

  await tb.selectTool('gtSelect');
  const box = await tb.wbSvg.boundingBox();
  await page.mouse.click(box.x + 400, box.y + 350);
  await expect(tb.pathMenuDeleteBtn).toBeVisible({ timeout: 5000 });

  await tb.pathMenuDeleteBtn.click({ force: true });
  await page.waitForTimeout(500);
  // CONFIRMED LIVE FINDING: no "Are you sure?" dialog appears at all --
  // unlike removing a Playlist resource, which does ask for confirmation.
  const confirmDialogAppeared = await page.getByText(/are you sure/i).isVisible().catch(() => false);
  const afterDelete = await tb.pathCount();
  console.log('Confirmation dialog appeared:', confirmDialogAppeared, '| paths after delete:', afterDelete, '(was', afterDraw, ')');
  test.fail(!confirmDialogAppeared && afterDelete < afterDraw, 'Deleting a canvas object removes it immediately with no confirmation dialog -- a single misclick permanently removes content, recoverable only via Undo');
  expect(confirmDialogAppeared).toBe(true);
});
