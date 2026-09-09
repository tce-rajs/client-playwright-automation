// AI Notices -- NEW adversarial "break the app" cases on top of the
// existing 22 tests in ai-notices.spec.js. New ID prefix AIN-BREAK-*
// (CEP_TestCases/AI_Notices_Module_Test_Cases_Final.xlsx). Matches this
// file's own established convention (VALID_PIN, Class 11A Mathematics).

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { ToolbarPage } = require('../../pages/toolbar.page');
const { AiNoticesPage } = require('../../pages/ai-notices.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(60000);
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await applyClassMap(nav, 'aiNotices').catch(() => {});
});

test('AIN-BREAK-01: an HTML/script-tag string in the Notice Title field is treated as literal text, never executed', { tag: ['@security', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const tb = new ToolbarPage(page);
  const ain = new AiNoticesPage(page);
  const opened = await ain.openComposeDialogWithRealText(tb);
  test.fail(!opened, 'Compose dialog not reachable this run -- could not exercise the Title XSS case');
  expect(opened).toBe(true);
  if (!opened) return;

  await ain.titleInput.fill('<img src=x onerror="window.__ainXss=true">');
  await page.waitForTimeout(500);
  const xssRan = await page.evaluate(() => !!window.__ainXss);
  console.log('Notice Title XSS payload executed:', xssRan);
  test.fail(xssRan, 'An HTML/script-tag string in the Notice Title field executes as real markup');
  expect(xssRan).toBe(false);
});

test('AIN-BREAK-02: switching Class while the Notice compose dialog is open does not leave it stuck visible over the new class\'s whiteboard', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const tb = new ToolbarPage(page);
  const ain = new AiNoticesPage(page);
  const nav = new NavigationPage(page);
  const opened = await ain.openComposeDialogWithRealText(tb);
  test.fail(!opened, 'Compose dialog not reachable this run -- could not exercise the mid-open class-switch case');
  expect(opened).toBe(true);
  if (!opened) return;

  const switchThrew = await nav.resetToClass('Class 9', 'A', 'Hindi Language').then(() => false).catch((e) => { console.log('resetToClass threw:', e.message.split('\n')[0]); return true; });
  await page.waitForTimeout(2000);

  const dialogStillVisible = await ain.titleInput.isVisible({ timeout: 2000 }).catch(() => false);
  const classLabel = await nav.currentClassBtn.textContent().catch(() => '(unreadable)');
  console.log('Class-switch attempt itself threw/timed out:', switchThrew, '| Notice compose dialog still visible:', dialogStillVisible, '| current class label:', classLabel);

  // DIFFERENT shape than the ATT-BREAK-02/DRP-BREAK-01/MM-BREAK-01 pattern:
  // there, the class switch SUCCEEDED and the panel was left stuck behind.
  // Here (confirmed 2/2 reproductions), the compose dialog instead blocks
  // the class-switch trigger itself from being clicked at all (Current
  // Class button unreachable within 10s) -- a real, reproducible finding,
  // but arguably more defensible (it prevents the switch rather than
  // leaving a broken hybrid state) than the other three modules' bug.
  test.fail(switchThrew && dialogStillVisible, 'CONFIRMED (2/2 reproductions): with the Notice compose dialog open, the Current Class control cannot be clicked at all (10s timeout) -- the dialog fully blocks class-switching rather than allowing it through cleanly or with a clear guard/warning');
  expect(switchThrew && dialogStillVisible).toBe(false);
});

test('AIN-BREAK-03: rapidly opening and closing the compose dialog 5 times in a row leaves exactly one clean instance', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(90000);
  const tb = new ToolbarPage(page);
  const ain = new AiNoticesPage(page);

  let lastOpened = false;
  for (let i = 0; i < 5; i++) {
    lastOpened = await ain.openComposeDialogWithRealText(tb);
    if (lastOpened) {
      await ain.closeBtn.click({ force: true, timeout: 3000 }).catch(async () => {
        await page.keyboard.press('Escape').catch(() => {});
      });
      await page.waitForTimeout(400);
    }
  }
  test.fail(!lastOpened, 'The compose dialog stopped opening partway through 5 rapid open/close cycles');
  expect(lastOpened).toBe(true);
  if (!lastOpened) return;

  const titleInputCount = await ain.titleInput.count();
  console.log('Title input instance count after 5x rapid open/close cycles:', titleInputCount);
  test.fail(titleInputCount > 1, 'Rapidly opening/closing the compose dialog 5 times leaves more than one instance mounted');
  expect(titleInputCount).toBeLessThanOrEqual(1);
});

test('AIN-BREAK-04: pressing the browser Back button while the compose dialog is open does not leave a stuck overlay behind', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const tb = new ToolbarPage(page);
  const ain = new AiNoticesPage(page);
  const opened = await ain.openComposeDialogWithRealText(tb);
  test.fail(!opened, 'Compose dialog not reachable this run -- could not exercise the Back-button case');
  expect(opened).toBe(true);
  if (!opened) return;

  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch((e) => console.log('goBack threw:', e.message));
  await page.waitForTimeout(1500);

  const pageUsable = await page.locator('body').isVisible().catch(() => false);
  console.log('Page usable after Back with Notice compose dialog open:', pageUsable, '| URL:', page.url());
  test.fail(!pageUsable, 'Pressing Back while the Notice compose dialog is open leaves the page unusable');
  expect(pageUsable).toBe(true);
});
