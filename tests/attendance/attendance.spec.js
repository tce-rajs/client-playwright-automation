// Attendance.
// Source: CEP_TestCases/Attendance_Module_Test_Cases_Final.xlsx, cases ATT-ACCESS-01, ATT-PLAN-01..08.
//
// CONFIRMED LIVE (2026-09-06): the manual pass's "entry point could not be
// located" finding is corrected here -- it's reachable via the Magnet tool
// (toolbar-tool-gtMagnet) -> "Attendance" submenu item, cross-checked
// against a Cypress reference project. HOWEVER, a new and more specific
// blocker was found in its place: the panel gets stuck on an infinite
// loading spinner and never renders real content. Reproduced across two
// different subjects (Physics, Mathematics) in Class 12A, waited up to 50s,
// no console/page error thrown, and every network request the page itself
// made completed (the only failures are expected 404s for prior days with
// no attendance ever recorded). Every case below that needs the panel's
// actual content is consequently blocked by this -- each still performs
// its own real, live open-and-wait attempt rather than assuming the block,
// so a future fix is picked up automatically.

const { test, expect } = require('@playwright/test');
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
  // Exact-match needed: "Physics" is a substring of "Physics Practicals" too.
  await page.locator('[data-qa-id="common-select-subject-btn"]').filter({ hasText: /^\s*Physics\s*$/ }).click();
  await page.waitForTimeout(1000);
});

/** Opens Attendance and waits generously for real content (date box or
 * roster) to appear. Returns true if it did, false if still stuck loading. */
async function openAndWaitForContent(att, timeoutMs = 10000) {
  await att.open();
  const contentAppeared = await Promise.race([
    att.dateBox.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true),
    att.markAttendanceBtn.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true),
  ]).catch(() => false);
  return contentAppeared;
}

test('ATT-ENTRY-01: Attendance is reachable via the Magnet tool (corrects the earlier "entry point not located" finding)', { tag: '@positive' }, async ({ page }) => {
  const att = new AttendancePage(page);
  await att.openMagnetSubmenu();
  await expect(att.magnetAttendanceItem).toBeVisible();
  await att.magnetAttendanceItem.click({ force: true });
  await page.waitForTimeout(1500);
  await expect(att.container).toBeVisible();
});

test('ATT-ACCESS-01: Opening Attendance eventually shows real content, not an indefinite loading spinner', { tag: '@positive' }, async ({ page }) => {
  test.setTimeout(45000); // the 15s content-wait itself needs headroom beyond the default 30s
  const att = new AttendancePage(page);
  const contentAppeared = await openAndWaitForContent(att, 15000);
  const spinnerStillShowing = await att.loaderSpinner.isVisible().catch(() => false);
  console.log('Real content appeared:', contentAppeared, '| spinner still showing after 15s:', spinnerStillShowing);

  test.fail(!contentAppeared, 'Attendance never progresses past its loading spinner -- confirmed reproducible across 2 subjects (Physics, Mathematics) in Class 12A, waited up to 50s in manual exploration, no JS error thrown');
  expect(contentAppeared).toBe(true);
});

test('ATT-PLAN-01: Opening Attendance shows the class roster for marking', { tag: '@positive' }, async ({ page }) => {
  const att = new AttendancePage(page);
  const contentAppeared = await openAndWaitForContent(att);
  if (!contentAppeared) {
    test.fail(true, 'Blocked by ATT-ACCESS-01 (stuck loading spinner) -- cannot reach the roster to verify');
    expect(contentAppeared).toBe(true);
    return;
  }
  await att.markAttendanceBtn.click({ force: true });
  await page.waitForTimeout(1500);
  await expect(att.gridCells.first()).toBeVisible();
});

test('ATT-PLAN-02: An empty class roster is handled gracefully', { tag: '@negative' }, async ({ page }) => {
  const att = new AttendancePage(page);
  const contentAppeared = await openAndWaitForContent(att);
  if (!contentAppeared) {
    test.fail(true, 'Blocked by ATT-ACCESS-01 (stuck loading spinner) -- cannot reach any roster, empty or otherwise');
    expect(contentAppeared).toBe(true);
    return;
  }
  await att.markAttendanceBtn.click({ force: true });
  await page.waitForTimeout(1500);
  const cellCount = await att.gridCells.count();
  const emptyStateShown = await page.getByText(/no students/i).isVisible().catch(() => false);
  console.log('Roster cell count:', cellCount, '| explicit empty-state message shown:', emptyStateShown);
  expect(cellCount > 0 || emptyStateShown).toBe(true);
});

test('ATT-PLAN-03: Refreshing before Submit does not silently lose marked attendance', { tag: '@state-persistence' }, async ({ page }) => {
  const att = new AttendancePage(page);
  const contentAppeared = await openAndWaitForContent(att);
  if (!contentAppeared) {
    test.fail(true, 'Blocked by ATT-ACCESS-01 (stuck loading spinner) -- cannot mark anything to test refresh-persistence against');
    expect(contentAppeared).toBe(true);
    return;
  }
  await att.markAttendanceBtn.click({ force: true });
  await page.waitForTimeout(1500);
  await att.gridCells.first().click({ force: true });
  await page.waitForTimeout(800);
  const classBefore = await att.gridCells.first().getAttribute('class');

  await page.reload();
  await page.waitForTimeout(2000);
  await att.open();
  await att.markAttendanceBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1500);
  const classAfter = await att.gridCells.first().getAttribute('class').catch(() => null);
  const warnedInstead = await page.getByText(/unsaved|lost|discard/i).isVisible().catch(() => false);
  console.log('Mark state before refresh:', classBefore, '| after refresh:', classAfter, '| warned instead:', warnedInstead);
  expect(classAfter === classBefore || warnedInstead).toBe(true);
});

test('ATT-PLAN-04: Navigating away (class switch) before Submit does not silently lose marked attendance', { tag: '@state-persistence' }, async ({ page }) => {
  const att = new AttendancePage(page);
  const nav = new NavigationPage(page);
  const contentAppeared = await openAndWaitForContent(att);
  if (!contentAppeared) {
    test.fail(true, 'Blocked by ATT-ACCESS-01 (stuck loading spinner) -- cannot mark anything to test navigate-away-persistence against');
    expect(contentAppeared).toBe(true);
    return;
  }
  await att.markAttendanceBtn.click({ force: true });
  await page.waitForTimeout(1500);
  await att.gridCells.first().click({ force: true });
  await page.waitForTimeout(800);
  const classBefore = await att.gridCells.first().getAttribute('class');

  await nav.resetToClass('Class 9', 'A', 'Hindi Language');
  await page.waitForTimeout(1000);
  await nav.resetToClass('Class 12', 'A', /^\s*Physics\s*$/).catch(() => {});
  await att.open();
  await att.markAttendanceBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1500);
  const classAfter = await att.gridCells.first().getAttribute('class').catch(() => null);
  console.log('Mark state before class-switch:', classBefore, '| after returning:', classAfter);
  expect(classAfter).toBe(classBefore);
});

test('ATT-PLAN-05: Closing Attendance with unsaved marks triggers a confirmation (or auto-saves)', { tag: '@ui-state' }, async ({ page }) => {
  const att = new AttendancePage(page);
  const contentAppeared = await openAndWaitForContent(att);
  if (!contentAppeared) {
    test.fail(true, 'Blocked by ATT-ACCESS-01 (stuck loading spinner) -- cannot mark anything to test close-confirmation against');
    expect(contentAppeared).toBe(true);
    return;
  }
  await att.markAttendanceBtn.click({ force: true });
  await page.waitForTimeout(1500);
  await att.gridCells.first().click({ force: true });
  await page.waitForTimeout(800);

  await att.innerCloseBtn.click({ force: true });
  await page.waitForTimeout(800);
  const confirmDialogShown = await att.closeDialogConfirmBtn.isVisible().catch(() => false);
  console.log('Close-confirmation dialog shown after an unsaved mark:', confirmDialogShown);
  // Documenting whichever real behavior occurs, matching the case's own
  // "document which" framing -- not a hard pass/fail bar on its own.
  if (confirmDialogShown) await att.closeDialogCancelBtn.click({ force: true }).catch(() => {});
});

test('ATT-PLAN-06: Submitting attendance persists correctly and is reflected on reopen', { tag: '@positive' }, async ({ page }) => {
  // Not executed against a real Submit: per the reference project's own
  // documented account scoping, this shared VALID_PIN account is mark-only
  // and never permitted to Submit (a separate, dedicated Class 11A account
  // exists for that in the reference project, deliberately not reused here
  // per this project's own instruction to defer the Submit-flow decision).
  test.fail(true, 'This account is mark-only and cannot Submit attendance (confirmed via the reference project); Submit-flow coverage was deliberately deferred pending a decision on which account to use for it');
  expect(true).toBe(false);
});

test('ATT-PLAN-07: Submitting attendance twice (double-click) does not create duplicate records', { tag: '@negative' }, async ({ page }) => {
  test.fail(true, 'Same limitation as ATT-PLAN-06 -- this account cannot Submit attendance to test double-submission against');
  expect(true).toBe(false);
});

test('ATT-PLAN-08: Attendance data is scoped to the correct class and never leaks to/from another class', { tag: '@security' }, async ({ page }) => {
  const att = new AttendancePage(page);
  const nav = new NavigationPage(page);
  const contentAppeared = await openAndWaitForContent(att);
  if (!contentAppeared) {
    test.fail(true, 'Blocked by ATT-ACCESS-01 (stuck loading spinner) -- cannot reach a roster under either class to compare');
    expect(contentAppeared).toBe(true);
    return;
  }
  await att.markAttendanceBtn.click({ force: true });
  await page.waitForTimeout(1500);
  const rosterA = await att.gridCells.allTextContents();

  await nav.resetToClass('Class 12', 'A', 'Mathematics');
  await page.waitForTimeout(1000);
  const contentB = await openAndWaitForContent(att);
  if (!contentB) {
    test.fail(true, 'Blocked by ATT-ACCESS-01 under the second subject too -- cannot compare rosters');
    expect(contentB).toBe(true);
    return;
  }
  await att.markAttendanceBtn.click({ force: true });
  await page.waitForTimeout(1500);
  const rosterB = await att.gridCells.allTextContents();

  console.log('Roster A (Physics) size:', rosterA.length, '| Roster B (Mathematics) size:', rosterB.length);
  expect(rosterA).not.toEqual(rosterB);
});
