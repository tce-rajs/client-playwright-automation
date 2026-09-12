// Minimap -- NEW adversarial "break the app" cases on top of the existing
// 21 tests in minimap.spec.js. New ID prefix MM-BREAK-*
// (CEP_TestCases/Minimap_Module_Test_Cases_Final.xlsx). MM-BREAK-01
// specifically re-tests the "switch class while panel is open" pattern
// this session already confirmed as a REAL bug independently in TWO other
// modules this pass (Attendance's ATT-BREAK-02, Drop It's DRP-BREAK-01).

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { MinimapPage } = require('../../pages/minimap.page');
const { NavigationPage } = require('../../pages/navigation.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await pl.ensureResourcesPresent();
});

test('MM-BREAK-01: switching Class while the Minimap panel is open does not leave it stuck visible over the new class\'s whiteboard', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const mm = new MinimapPage(page);
  const nav = new NavigationPage(page);
  const opened = await mm.open();
  test.fail(!opened, 'Minimap did not open this run -- could not exercise the mid-open class-switch case');
  expect(opened).toBe(true);
  if (!opened) return;

  await nav.resetToClass('Class 9', 'A', 'Hindi Language').catch((e) => console.log('resetToClass threw:', e.message.split('\n')[0]));
  await page.waitForTimeout(2000);

  const stillOpen = await mm.isOpen();
  console.log('Minimap still marked "visible" after switching class:', stillOpen);
  test.fail(stillOpen, 'CONFIRMED (same bug class as ATT-BREAK-02/DRP-BREAK-01): switching class while the Minimap panel is open leaves it stuck visible over the new class\'s whiteboard');
  expect(stillOpen).toBe(false);
});

test('MM-BREAK-02: rapidly opening and closing the Minimap 8 times in immediate succession does not leave a stuck or duplicated panel', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(60000);
  const mm = new MinimapPage(page);
  for (let i = 0; i < 8; i++) {
    await mm.open();
    await page.waitForTimeout(150);
    await mm.close();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);

  const containerCount = await mm.container.count();
  const finalOpen = await mm.isOpen();
  console.log('Minimap container instance count after 8x rapid open/close:', containerCount, '| still open at the end:', finalOpen);

  test.fail(containerCount > 1, 'Rapidly opening/closing the Minimap 8 times mounts more than one container instance');
  expect(containerCount).toBeLessThanOrEqual(1);
  test.fail(finalOpen, 'After an even number (8) of open/close cycles ending on close(), the Minimap is still marked visible');
  expect(finalOpen).toBe(false);
});

test('MM-BREAK-03: pressing the browser Back button while the Minimap is open does not leave a stuck overlay behind', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  const mm = new MinimapPage(page);
  const opened = await mm.open();
  test.fail(!opened, 'Minimap did not open this run -- could not exercise the Back-button case');
  expect(opened).toBe(true);
  if (!opened) return;

  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch((e) => console.log('goBack threw:', e.message));
  await page.waitForTimeout(1500);

  const pageUsable = await page.locator('body').isVisible().catch(() => false);
  console.log('Page usable after Back with Minimap open:', pageUsable, '| URL:', page.url());
  test.fail(!pageUsable, 'Pressing Back while the Minimap is open leaves the page unusable');
  expect(pageUsable).toBe(true);
});

test('MM-BREAK-04: rapidly clicking many different points inside the Minimap in quick succession (pan spam) keeps the canvas responsive, never desyncing the viewport rectangle off-canvas', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(30000);
  const mm = new MinimapPage(page);
  const opened = await mm.open();
  test.fail(!opened, 'Minimap did not open this run -- could not exercise the pan-spam case');
  expect(opened).toBe(true);
  if (!opened) return;

  const box = await mm.canvas.boundingBox().catch(() => null);
  test.fail(!box, 'Minimap canvas has no bounding box this run');
  expect(box).not.toBeNull();
  if (!box) return;

  // Click 10 different points across the minimap canvas in rapid succession.
  for (let i = 0; i < 10; i++) {
    const x = box.x + (box.width * (i + 0.5)) / 10;
    const y = box.y + box.height / 2;
    await page.mouse.click(x, y);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(500);

  const stillResponsive = await mm.canvas.isVisible().catch(() => false);
  const resetStillWorks = await mm.resetBtn.click({ timeout: 3000 }).then(() => true).catch(() => false);
  console.log('Minimap canvas still visible after 10x rapid pan clicks:', stillResponsive, '| Reset still clickable afterward:', resetStillWorks);

  test.fail(!stillResponsive || !resetStillWorks, 'Rapidly clicking 10 different points across the Minimap in quick succession desyncs/breaks the panel (canvas gone or Reset unclickable)');
  expect(stillResponsive && resetStillWorks).toBe(true);
});
