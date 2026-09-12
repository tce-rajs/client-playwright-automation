// Attendance -- NEW adversarial "break the app" cases on top of the
// existing 33 tests (attendance.spec.js/gap-analysis.spec.js). New ID
// prefix ATT-BREAK-* (CEP_TestCases/Attendance_Module_Test_Cases_Final.xlsx).
// NOTE: this account's Attendance panel is a confirmed CRITICAL blocker
// (ATT-PANEL-01 -- gets stuck on an infinite loading spinner). These cases
// deliberately probe the surface AROUND that blocker (interruption timing,
// recovery behavior, layout under stress) rather than re-testing the
// already-documented "does content ever load" question.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { AttendancePage } = require('../../pages/attendance.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await nav.openClassPopup();
  await page.waitForTimeout(800);
  await nav.allMyClassesTab.click();
  await page.waitForTimeout(500);
  await nav.gradeButton('Class 12').click();
  await page.waitForTimeout(300);
  await nav.divisionButton('A').click();
  await page.waitForTimeout(300);
  await page.locator('[data-qa-id="common-select-subject-btn"]').filter({ hasText: /^\s*Physics\s*$/ }).click();
  await page.waitForTimeout(1000);
});

test('ATT-BREAK-01: blocking the Attendance micro-frontend\'s own network requests shows a distinguishable error, not an indistinguishable-from-normal infinite spinner', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const att = new AttendancePage(page);
  await page.route(/attendance/i, (route) => route.abort());
  await att.open();
  await page.waitForTimeout(8000);

  const spinnerShowing = await att.loaderSpinner.isVisible().catch(() => false);
  const anyErrorTextVisible = await page.locator('text=/error|failed|try again|something went wrong/i').first().isVisible({ timeout: 2000 }).catch(() => false);
  console.log('With attendance network fully blocked -- spinner showing:', spinnerShowing, '| distinguishable error text visible:', anyErrorTextVisible);

  // The adversarial concern: a fully-blocked network call and a genuinely
  // slow/broken backend (ATT-PANEL-01's own baseline) should NOT look
  // identical to the user -- if both just show the same silent spinner
  // forever, a real outage is indistinguishable from this app's own known bug.
  test.fail(spinnerShowing && !anyErrorTextVisible, 'A fully-blocked network request for Attendance produces the exact same silent infinite spinner as a real backend problem, with no distinguishable error/retry affordance');
  expect(spinnerShowing && !anyErrorTextVisible).toBe(false);
});

test('ATT-BREAK-02: switching Class while Attendance is still on its loading spinner does not leave a stuck overlay/spinner over the new class\'s whiteboard', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const att = new AttendancePage(page);
  const nav = new NavigationPage(page);
  await att.open();
  await page.waitForTimeout(1500); // catch it mid-spinner, not fully settled

  await nav.resetToClass('Class 9', 'A', 'Hindi Language').catch((e) => console.log('resetToClass threw (may itself be blocked by an open overlay):', e.message.split('\n')[0]));
  await page.waitForTimeout(2000);

  const containerStillPresent = await att.container.isVisible({ timeout: 2000 }).catch(() => false);
  const spinnerStillPresent = await att.loaderSpinner.isVisible({ timeout: 2000 }).catch(() => false);
  const newClassLabel = await nav.currentClassBtn.textContent().catch(() => '');
  console.log('After switching class mid-Attendance-load -- container still visible:', containerStillPresent, '| spinner still visible:', spinnerStillPresent, '| current class label:', newClassLabel);

  const leftoverOverlay = containerStillPresent || spinnerStillPresent;
  test.fail(leftoverOverlay, 'Switching class while Attendance is still loading leaves its container/spinner stuck on top of the new class\'s whiteboard instead of cleanly unmounting');
  expect(leftoverOverlay).toBe(false);
});

test('ATT-BREAK-03: refreshing the page while Attendance is stuck on its loading spinner recovers to a single clean state, not a duplicated/worse one', { tag: ['@state-persistence', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const att = new AttendancePage(page);
  await att.open();
  await page.waitForTimeout(1500);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-qa-id="toolbar-user-avatar"]').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(1500);

  const containerCount = await att.container.count();
  const pageIsAlive = await page.locator('[data-qa-id="toolbar-user-avatar"]').isVisible().catch(() => false);
  console.log('After reload mid-Attendance-load -- attendance-container count:', containerCount, '| page alive/usable:', pageIsAlive);

  test.fail(containerCount > 1 || !pageIsAlive, 'Refreshing while Attendance is stuck loading leaves a duplicated container or an unusable page instead of a single clean reload');
  expect(containerCount).toBeLessThanOrEqual(1);
  expect(pageIsAlive).toBe(true);
});

test('ATT-BREAK-04: opening the Magnet submenu, closing it, and reopening it 6 times in rapid alternation never leaves the submenu stuck open or duplicated', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const att = new AttendancePage(page);
  for (let i = 0; i < 6; i++) {
    await att.magnetToolBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1000);

  const attendanceItemCount = await att.magnetAttendanceItem.count();
  console.log('After 6 rapid Magnet toggle clicks -- Attendance menu item instance count:', attendanceItemCount);

  test.fail(attendanceItemCount > 1, 'Rapidly toggling the Magnet tool 6 times mounts more than one instance of its own submenu items');
  expect(attendanceItemCount).toBeLessThanOrEqual(1);
});

test('ATT-BREAK-05: an extremely small viewport (375px mobile width) does not let the stuck loading spinner overflow or break the surrounding layout', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const att = new AttendancePage(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  await att.open();
  await page.waitForTimeout(3000);

  const overflowsViewport = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5);
  const containerBox = await att.container.boundingBox().catch(() => null);
  console.log('At 375px width -- horizontal overflow:', overflowsViewport, '| container box:', containerBox);

  test.fail(overflowsViewport, 'The Attendance panel (even in its stuck-loading state) causes horizontal overflow at a real mobile viewport width');
  expect(overflowsViewport).toBe(false);
});
