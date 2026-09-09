// Autosave.
// Source: CEP_TestCases/Toolbar_Module_Test_Cases_Final.xlsx, cases TB-SAVE-01..03.
//
// CONFIRMED LIVE: after an edit, a "Saving whiteboard E:x / N:y in Zs" toast
// counts down, then becomes "Whiteboard Saved! N stroke(s)".

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { ToolbarPage } = require('../../pages/toolbar.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await new ToolbarPage(page).waitForBoardToSettle();
});

test('TB-SAVE-01: The whiteboard autosaves with a visible debounced status toast', { tag: '@ui-state' }, async ({ page }) => {
  const tb = new ToolbarPage(page);
  await tb.penStroke({ x: 300, y: 300 }, { x: 500, y: 400 });
  // The countdown toast can already be mid-flight or have finished by the
  // time control returns here (the pen-stroke retry check itself takes a
  // moment) -- accept catching either state rather than racing the exact
  // "Saving" -> "Saved" transition.
  const sawEither = await Promise.race([
    tb.savingToast.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'saving'),
    tb.savedToast.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'saved'),
  ]).catch(() => null);
  expect(sawEither).not.toBeNull();
  await expect(tb.savedToast).toBeVisible({ timeout: 15000 });
});

test('TB-SAVE-02: Autosave reflects a running stroke count', { tag: '@positive' }, async ({ page }) => {
  test.setTimeout(60000); // two full save cycles (up to ~15s each) exceed the default 30s
  const tb = new ToolbarPage(page);
  await tb.penStroke({ x: 300, y: 250 }, { x: 500, y: 250 });
  await expect(tb.savedToast).toBeVisible({ timeout: 20000 });
  const firstSaveText = (await tb.savedToast.textContent()).trim();

  await tb.penStroke({ x: 300, y: 350 }, { x: 500, y: 350 });
  await expect(tb.savingToast).toBeVisible({ timeout: 3000 });
  await expect(tb.savedToast).toBeVisible({ timeout: 15000 });
  const secondSaveText = (await tb.savedToast.textContent()).trim();

  console.log('First save toast:', firstSaveText, '| second save toast:', secondSaveText);
  const firstCount = parseInt(firstSaveText.match(/(\d+)/)?.[1] || '0', 10);
  const secondCount = parseInt(secondSaveText.match(/(\d+)/)?.[1] || '0', 10);
  expect(secondCount).toBeGreaterThan(firstCount);
});

test('TB-SAVE-03: A failed autosave shows an explicit error, not a false success', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000); // needs the full ~15s countdown window to observe the (non-)outcome
  // Real autosave endpoint confirmed live: POST **/serve/wb/delta.
  const tb = new ToolbarPage(page);
  await page.route('**/serve/wb/delta', (route) => route.fulfill({ status: 500, body: '{}' }));

  await tb.penStroke({ x: 300, y: 300 }, { x: 500, y: 400 });
  await expect(tb.savingToast).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(15000);

  const savedToastShown = await tb.savedToast.isVisible().catch(() => false);
  const errorShown = await page.getByText(/error|failed|not saved|try again/i).isVisible().catch(() => false);
  console.log('"Whiteboard Saved!" shown despite the save request failing:', savedToastShown, '| error indicator shown:', errorShown);

  test.fail(savedToastShown && !errorShown, 'A failed autosave request still shows the confident "Whiteboard Saved!" success toast, with no error indicator');
  expect(savedToastShown && !errorShown).toBe(false);
});
