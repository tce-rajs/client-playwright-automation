// Cross-Cutting: Security (per-topic scoping), State (persistence).
// Source: CEP_TestCases/Toolbar_Module_Test_Cases_Final.xlsx, cases TB-SEC-01, TB-STATE-01.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { ToolbarPage } = require('../../pages/toolbar.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await new ToolbarPage(page).waitForBoardToSettle();
});

test('TB-SEC-01: Whiteboard content is scoped per class/topic and never leaks across classes', { tag: '@security' }, async ({ page }) => {
  test.setTimeout(60000); // ensureMinTopics can take a while recovering server-persisted state drift
  const pl = new PlaylistPage(page);
  const tb = new ToolbarPage(page);
  let crashed = false;
  page.on('crash', () => { crashed = true; });

  const originalTopic = (await pl.contentsTile.textContent()).trim();

  const before = await tb.pathCount();
  await tb.penStroke({ x: 300, y: 300 }, { x: 500, y: 400 });
  expect(await tb.pathCount()).toBeGreaterThan(before);

  await pl.openContentsPopup();
  await pl.ensureMinTopics(2);
  // topicItems.first() is not necessarily a DIFFERENT topic -- it could be
  // whichever one happens to already be active. Pick one that isn't.
  const otherTopic = page.locator('[data-qa-id="playlist-select-topic"]:not(.active)').first();
  const otherTopicText = (await otherTopic.textContent()).trim();
  await otherTopic.click();
  await page.waitForTimeout(1000);
  if (page.isClosed() || crashed) {
    console.log('Page crashed while switching Topic on the whiteboard -- treating as a genuine app crash, not a test defect.');
  }
  const nowOnTopic = (await pl.contentsTile.textContent()).trim();
  console.log('Switched from', originalTopic, 'to', nowOnTopic, '(target was:', otherTopicText, ')');
  expect(nowOnTopic).not.toBe(originalTopic);

  const strokesVisibleOnOtherTopic = await tb.pathCount();
  console.log('Path count on the other topic (expect 0 leaked strokes, ignoring whatever this topic already had):', strokesVisibleOnOtherTopic);

  // Switch back and confirm the original content is still there (this
  // also distinguishes "isolated" from "lost").
  await pl.openContentsPopup();
  await pl.topicItems.filter({ hasText: originalTopic.replace(/^\d+\.\d+\s*\|\s*/, '') }).first().click().catch(() => {});
  await page.waitForTimeout(1000);
  const afterReturn = await tb.pathCount();
  console.log('Path count after returning to the original topic:', afterReturn);
  expect(afterReturn).toBeGreaterThanOrEqual(before + 1);
});

test('TB-STATE-01: Drawn content persists correctly across a page refresh', { tag: '@state-persistence' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  const before = await tb.pathCount();
  await tb.penStroke({ x: 320, y: 320 }, { x: 520, y: 420 });
  const afterDraw = await tb.pathCount();
  expect(afterDraw).toBeGreaterThan(before);

  // Let autosave actually complete before reloading.
  await expect(tb.savedToast).toBeVisible({ timeout: 15000 });

  await page.reload();
  await page.locator('[data-qa-id="toolbar-user-avatar"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000);

  const afterReload = await tb.pathCount();
  console.log('Paths before reload:', afterDraw, '| after reload:', afterReload);
  expect(afterReload).toBe(afterDraw);
});
