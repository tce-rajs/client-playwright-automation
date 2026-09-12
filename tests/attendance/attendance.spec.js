// Attendance.
// Source: CEP_TestCases/Attendance_Module_Test_Cases_Final.xlsx, cases
// ATT-ACCESS-01, ATT-PLAN-01..08, plus an "Extended coverage" section
// (formerly gap-analysis.spec.js) for ATT-ACCESS-02, ATT-SEL-01,
// ATT-BUS-01..03, ATT-BUG-01, ATT-CLOSE-01, ATT-DBL-01, ATT-SEC-01..02,
// ATT-QUIRK-01, ATT-GAP-01, ATT-PANEL-01, ATT-SUMM-01, ATT-BDAY-01,
// ATT-PASTDATE-01, ATT-DRAG-01, ATT-PLAY-01, ATT-EXP-01..05.
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

test.describe('Core (ATT-ACCESS-01, ATT-PLAN-01..08)', () => {
  test('ATT-ENTRY-01: Attendance is reachable via the Magnet tool (corrects the earlier "entry point not located" finding)', { tag: '@positive' }, async ({ page }) => {
    const att = new AttendancePage(page);
    await att.openMagnetSubmenu();
    await expect(att.magnetAttendanceItem).toBeVisible();
    await att.magnetAttendanceItem.click({ force: true });
    await page.waitForTimeout(1500);
    await expect(att.container).toBeVisible();
  });

  test('ATT-ACCESS-01: Opening Attendance eventually shows real content, not an indefinite loading spinner', { tag: ['@positive', '@bug'] }, async ({ page }) => {
    test.setTimeout(45000); // the 15s content-wait itself needs headroom beyond the default 30s
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att, 15000);
    const spinnerStillShowing = await att.loaderSpinner.isVisible().catch(() => false);
    console.log('Real content appeared:', contentAppeared, '| spinner still showing after 15s:', spinnerStillShowing);

    test.fail(!contentAppeared, 'Attendance never progresses past its loading spinner -- confirmed reproducible across 2 subjects (Physics, Mathematics) in Class 12A, waited up to 50s in manual exploration, no JS error thrown');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-PLAN-01: Opening Attendance shows the class roster for marking', { tag: ['@positive', '@bug'] }, async ({ page }) => {
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

  test('ATT-PLAN-02: An empty class roster is handled gracefully', { tag: ['@negative', '@bug'] }, async ({ page }) => {
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

  test('ATT-PLAN-03: Refreshing before Submit does not silently lose marked attendance', { tag: ['@state-persistence', '@bug'] }, async ({ page }) => {
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

  test('ATT-PLAN-04: Navigating away (class switch) before Submit does not silently lose marked attendance', { tag: ['@state-persistence', '@bug'] }, async ({ page }) => {
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

  test('ATT-PLAN-05: Closing Attendance with unsaved marks triggers a confirmation (or auto-saves)', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
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

  test('ATT-PLAN-06: Submitting attendance persists correctly and is reflected on reopen', { tag: ['@positive', '@bug'] }, async ({ page }) => {
    // Not executed against a real Submit: per the reference project's own
    // documented account scoping, this shared VALID_PIN account is mark-only
    // and never permitted to Submit (a separate, dedicated Class 11A account
    // exists for that in the reference project, deliberately not reused here
    // per this project's own instruction to defer the Submit-flow decision).
    test.fail(true, 'This account is mark-only and cannot Submit attendance (confirmed via the reference project); Submit-flow coverage was deliberately deferred pending a decision on which account to use for it');
    expect(true).toBe(false);
  });

  test('ATT-PLAN-07: Submitting attendance twice (double-click) does not create duplicate records', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    test.fail(true, 'Same limitation as ATT-PLAN-06 -- this account cannot Submit attendance to test double-submission against');
    expect(true).toBe(false);
  });

  test('ATT-PLAN-08: Attendance data is scoped to the correct class and never leaks to/from another class', { tag: ['@security', '@bug'] }, async ({ page }) => {
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
});

test.describe('Extended coverage (gap-analysis pass)', () => {
  test('ATT-PANEL-01: CRITICAL -- the Attendance panel hangs indefinitely on a loading spinner with no way to exit', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    test.setTimeout(45000);
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att, 15000);
    const spinnerStillShowing = await att.loaderSpinner.isVisible().catch(() => false);
    const anyCloseControlVisible = await att.innerCloseBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Content ever appeared:', contentAppeared, '| spinner still showing:', spinnerStillShowing, '| any Close control reachable:', anyCloseControlVisible);

    test.fail(!contentAppeared, 'CRITICAL, confirmed reproducible: the Attendance panel hangs on its loading spinner indefinitely, with no way to exit back to the whiteboard from inside the panel');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-ACCESS-02: The Magnet gate is per-account, not per-class (regression re-check on this account)', { tag: '@cross-cutting' }, async ({ page }) => {
    const att = new AttendancePage(page);
    await att.openMagnetSubmenu();
    const attendanceItemVisible = await att.magnetAttendanceItem.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Attendance item visible in Magnet menu for this account/class:', attendanceItemVisible);
    expect(attendanceItemVisible).toBe(true);
  });

  test('ATT-SEL-01: The confirmed plain-CSS selector map is reachable at least at the container level', { tag: '@ui-state' }, async ({ page }) => {
    const att = new AttendancePage(page);
    await att.open();
    await expect(att.container).toBeVisible({ timeout: 10000 });
    // The deeper selectors in this map (.grid-cell, .attendance-summary-table,
    // etc.) are only reachable once ATT-PANEL-01 is fixed -- documented there,
    // not re-asserted here as a duplicate finding.
  });

  test('ATT-BUS-01: Marking a student creates a real, persistent draft for today', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach the roster to mark anything');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-BUS-02: A tap toggles present<->absent only, with no way back to unmarked', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach the roster to tap a student cell');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-BUS-03: Once submitted, buttons swap to Edit/Submit (locked view) and Edit re-seeds previous marks', { tag: ['@positive', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach Submit to test the locked/Edit state');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-BUG-01: Close discards in-progress unsaved marks', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot mark anything to test Close-discard behavior against');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-CLOSE-01: No Close control exists while the panel is stuck loading', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    await att.open();
    await page.waitForTimeout(3000);
    const spinnerShowing = await att.loaderSpinner.isVisible().catch(() => false);
    const closeControlVisible = await att.innerCloseBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Spinner showing:', spinnerShowing, '| Close control reachable while stuck:', closeControlVisible);
    test.fail(spinnerShowing && closeControlVisible === false, 'CONFIRMED: while stuck on the loading spinner, no Close control exists inside the panel -- the only way out is navigating away entirely (e.g. switching class)');
    expect(closeControlVisible).toBe(true);
  });

  test('ATT-DBL-01: Submitting attendance twice in quick succession does not create duplicate records', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach Submit to test double-submission against');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-SEC-01: Attendance data is scoped to the correct class and never leaks to/from another class', { tag: ['@security', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach a roster under either class to compare');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-SEC-02: A teacher cannot submit attendance for a class they are not assigned to teach', { tag: ['@security', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach Submit at all on any class to test authorization against');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-QUIRK-01: A tap on a roll-number cell occasionally does not register', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach the roster to tap a cell');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-GAP-01: Submit\'s real network request is unreachable to network-interception tooling (confirmed tooling gap, not a defect)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    let sawAnyRequest = false;
    page.on('request', (req) => {
      if (/attendance/i.test(req.url())) sawAnyRequest = true;
    });
    await openAndWaitForContent(att);
    await page.waitForTimeout(1500);
    console.log('Any attendance-related HTTP request observed by Playwright (even just opening the panel):', sawAnyRequest);
    // Documenting the tooling gap directly rather than re-deriving it --
    // consistent with the workbook's own "confirmed tooling gap, not a
    // defect" framing (cross-repo confirmed via a mature Cypress suite).
    test.fail(true, 'Confirmed cross-repo: the attendance micro-frontend\'s real Submit call uses a postMessage-style internal event bus, not a normal fetch/XHR Playwright/Cypress network interception can capture -- this blocks any network-failure-simulation test for Submit specifically');
    expect(true).toBe(false);
  });

  test('ATT-SUMM-01: The Total row in the summary table shows only ONE number, not a Present/Absent/Total triple', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach the summary table to inspect its Total row');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-BDAY-01: A student\'s birthday triggers a birthday popup during Play Attendance', { tag: ['@positive', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach Play Attendance\'s calling-marks flow');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-PASTDATE-01: Viewing a past date\'s attendance is view-only and cannot be re-edited', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach the Play screen\'s date-nav controls');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-DRAG-01: Drag-to-mark-all-present gesture works as an alternative to individually tapping', { tag: ['@positive', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach the roster to perform the drag gesture');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-PLAY-01: Play Attendance\'s own calling-marks carousel functions correctly', { tag: ['@positive', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach Play Attendance\'s .btn-start control');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-EXP-01: The panel\'s behavior on a class where attendance was ALREADY marked today (not "Pending")', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const nav = new NavigationPage(page);
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    await att.openMagnetSubmenu();
    const badgeText = (await page.locator('text=/Pending|Submitted|Marked/i').first().textContent().catch(() => '')) || '';
    console.log('This class/subject\'s Attendance badge state:', badgeText || '(not found)');
    await page.keyboard.press('Escape');

    // Search a few other real class/subject combos for a non-"Pending" badge.
    const combos = [['Class 12', 'A', 'Mathematics'], ['Class 11', 'A', 'Accountancy'], ['Class 9', 'A', 'Hindi Language']];
    let foundNonPending = false;
    try {
      for (const [grade, division, subject] of combos) {
        await nav.resetToClass(grade, division, subject).catch(() => {});
        await att.openMagnetSubmenu();
        const attendanceMenuItem = att.magnetAttendanceItem;
        const itemText = await attendanceMenuItem.textContent().catch(() => '');
        console.log(`${grade} ${division} ${subject} -- Attendance menu item text:`, itemText);
        if (itemText && !/pending/i.test(itemText)) foundNonPending = true;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    } catch (err) {
      if (page.isClosed()) pageCrashed = true;
      else throw err;
    }

    // CONFIRMED LIVE: repeatedly opening the Magnet submenu across several
    // class switches in succession reliably crashes the page (reproduced).
    // Left as a genuine failure rather than test.fail() -- see NAV-NET-02's
    // comment elsewhere in this suite for why a real crash can't be tracked
    // softly.
    console.log('Page crashed while checking Attendance badge state across multiple classes:', pageCrashed);
    expect(pageCrashed, 'Repeatedly opening the Magnet submenu across several class switches should not crash the page').toBe(false);
    if (pageCrashed) return;

    test.fail(!foundNonPending, 'Every class/subject combination tried this pass still shows a "Pending" Attendance badge -- no already-marked-today state was found to test against');
    expect(foundNonPending).toBe(true);
  });

  test('ATT-EXP-02: A large-roster class (30+ students) does not degrade Attendance panel performance', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach any roster to measure scroll/mark performance against, regardless of class size');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-EXP-03: Rapidly double-clicking Attendance in the Magnet menu does not open two conflicting loading attempts', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    await att.openMagnetSubmenu();
    await expect(att.magnetAttendanceItem).toBeVisible();
    await att.magnetAttendanceItem.click({ force: true });
    await att.magnetAttendanceItem.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);

    const containerCount = await att.container.count();
    console.log('Attendance container instances mounted after a rapid double-click:', containerCount);
    test.fail(containerCount > 1, 'A rapid double-click on Attendance mounts more than one attendance-container instance instead of exactly one');
    expect(containerCount).toBeLessThanOrEqual(1);
  });

  test('ATT-EXP-04: Marking every student Absent (all-zero-present boundary) is accepted and reflected correctly', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const att = new AttendancePage(page);
    const contentAppeared = await openAndWaitForContent(att);
    test.fail(!contentAppeared, 'Blocked by ATT-PANEL-01 (stuck loading spinner) -- cannot reach the roster to mark every student Absent');
    expect(contentAppeared).toBe(true);
  });

  test('ATT-EXP-05: A teacher cannot submit attendance for a class by directly manipulating the request\'s class ID', { tag: ['@security', '@bug'] }, async ({ page }) => {
    // Same blocker class as NAV-SEC-01/EXP-06/AR-CYP-08 -- needs the real
    // attendance POST request's exact shape plus a known unauthorized class
    // ID, neither available without a second reference account, and
    // additionally blocked by ATT-GAP-01's own confirmed finding that this
    // endpoint isn't a normal interceptable fetch/XHR in the first place.
    test.fail(true, 'Blocked by both the same forging-tooling gap as NAV-SEC-01/EXP-06, and ATT-GAP-01\'s own confirmed finding that this endpoint is not a normal interceptable fetch/XHR request');
    expect(true).toBe(false);
  });
});
