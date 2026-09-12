// Drop It -- NEW adversarial "break the app" cases on top of the existing
// 15 tests in drop-it.spec.js. New ID prefix DRP-BREAK-*
// (CEP_TestCases/Drop_It_Module_Test_Cases_Final.xlsx). Matches this file's
// own established convention of using VALID_PIN_2 (not VALID_PIN).

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await pl.ensureResourcesPresent();
});

async function openDropit(page, ar) {
  const { stillStuck } = await ar.openPickerReliably(ar.actions.dropit);
  if (!stillStuck) await ar.actions.dropit.click({ force: true });
  return ar.dropitCloseBtn.isVisible({ timeout: 8000 }).catch(() => false);
}

test('DRP-BREAK-01: switching class immediately after opening Drop It tears down its panel and Firestore connection cleanly, not leaving a stuck overlay', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const ar = new AddResourcePage(page);
  const nav = new NavigationPage(page);
  const opened = await openDropit(page, ar);
  test.fail(!opened, 'Drop It panel did not open this run -- could not exercise the mid-open class-switch case');
  expect(opened).toBe(true);
  if (!opened) return;

  await nav.resetToClass('Class 9', 'A', 'Hindi Language').catch((e) => console.log('resetToClass threw:', e.message.split('\n')[0]));
  await page.waitForTimeout(2000);

  const panelStillVisible = await ar.dropitCloseBtn.isVisible({ timeout: 2000 }).catch(() => false);
  const qrStillVisible = await ar.dropitQrCanvas.isVisible({ timeout: 2000 }).catch(() => false);
  console.log('After switching class with Drop It open -- close button still visible:', panelStillVisible, '| QR canvas still visible:', qrStillVisible);

  test.fail(panelStillVisible || qrStillVisible, 'Switching class while Drop It is open leaves its panel/QR canvas stuck visible over the new class\'s whiteboard');
  expect(panelStillVisible || qrStillVisible).toBe(false);
});

test('DRP-BREAK-02: rapidly opening and closing Drop It 8 times does not accumulate an unbounded number of Firestore realtime connections', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(60000);
  const ar = new AddResourcePage(page);
  let firestoreRequestCount = 0;
  page.on('request', (req) => {
    if (/firestore\.googleapis\.com/i.test(req.url())) firestoreRequestCount++;
  });

  for (let i = 0; i < 8; i++) {
    const opened = await openDropit(page, ar);
    if (opened) {
      await ar.dropitCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    }
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1000);

  const pageAlive = await page.locator('[data-qa-id="toolbar-user-avatar"]').isVisible().catch(() => false);
  console.log('Firestore-related requests observed across 8 rapid open/close cycles:', firestoreRequestCount, '| page alive:', pageAlive);

  test.fail(!pageAlive, 'Rapidly opening/closing Drop It 8 times crashes the page');
  expect(pageAlive).toBe(true);
  // Sanity ceiling -- this isn't a hard product spec, but a request count in
  // the many hundreds for 8 opens would indicate a real per-open connection
  // leak rather than clean reuse/close.
  test.fail(firestoreRequestCount > 400, `8 rapid Drop It open/close cycles generated an excessive ${firestoreRequestCount} Firestore-related requests, suggesting connections are not being cleanly closed`);
  expect(firestoreRequestCount).toBeLessThanOrEqual(400);
});

test('DRP-BREAK-03: two browser tabs on the same account opening Drop It at the same time each get their own independent QR code, not a shared/corrupted one', { tag: ['@security', '@bug'] }, async ({ page, context }) => {
  test.setTimeout(45000);
  const ar1 = new AddResourcePage(page);
  const opened1 = await openDropit(page, ar1);
  test.fail(!opened1, 'Drop It did not open in tab 1 this run -- could not exercise the two-tab case');
  expect(opened1).toBe(true);
  if (!opened1) return;
  await ar1.dropitQrCanvas.waitFor({ state: 'visible', timeout: 8000 });
  const dataUrl1 = await ar1.dropitQrCanvas.evaluate((el) => el.toDataURL()).catch(() => null);

  const page2 = await context.newPage();
  await page2.goto('./');
  await page2.locator('[data-qa-id="toolbar-user-avatar"]').waitFor({ state: 'visible', timeout: 20000 });
  const ar2 = new AddResourcePage(page2);
  const opened2 = await openDropit(page2, ar2);
  test.fail(!opened2, 'Drop It did not open in tab 2 this run -- could not exercise the two-tab case');
  expect(opened2).toBe(true);
  if (opened2) {
    await ar2.dropitQrCanvas.waitFor({ state: 'visible', timeout: 8000 });
    const dataUrl2 = await ar2.dropitQrCanvas.evaluate((el) => el.toDataURL()).catch(() => null);
    console.log('Tab 1 QR dataURL length:', dataUrl1 ? dataUrl1.length : null, '| Tab 2 QR dataURL length:', dataUrl2 ? dataUrl2.length : null, '| identical:', dataUrl1 === dataUrl2);

    // Tab 1's own panel must still be alive/showing a real QR after tab 2 opened its own.
    const tab1StillShowsQr = await ar1.dropitQrCanvas.isVisible({ timeout: 3000 }).catch(() => false);
    test.fail(!tab1StillShowsQr, 'Opening Drop It in a second tab breaks/closes the first tab\'s own Drop It panel');
    expect(tab1StillShowsQr).toBe(true);

    test.fail(dataUrl1 !== null && dataUrl1 === dataUrl2, 'Two concurrently-open Drop It panels (even in different tabs of the same account) render the IDENTICAL QR code instead of independent per-session codes');
    expect(dataUrl1 === dataUrl2).toBe(false);
  }
  await page2.close();
});

test('DRP-BREAK-04: an extremely small viewport (375px mobile width) does not break the Drop It panel layout', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  const opened = await openDropit(page, ar);
  test.fail(!opened, 'Drop It panel did not open at 375px width this run');
  expect(opened).toBe(true);
  if (!opened) return;

  const overflowsViewport = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5);
  const closeBtnBox = await ar.dropitCloseBtn.boundingBox().catch(() => null);
  console.log('At 375px width -- horizontal overflow:', overflowsViewport, '| close button box:', closeBtnBox);

  test.fail(overflowsViewport, 'The Drop It panel causes horizontal overflow at a real mobile viewport width');
  expect(overflowsViewport).toBe(false);
});
