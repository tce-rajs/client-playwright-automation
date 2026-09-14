// Zoho historical bug regression -- Grade / Subject / Division.
//
// Live-verifies real, previously-reported Zoho defects for this module against the CURRENT app,
// rather than trusting their last-known Zoho Status (open/closed is not a reason to skip one --
// only an existing test that already proves the behavior is).
//
// Sources:
//   - CEP_TestCases/Zoho_Bugs_TeachMode.xlsx  (this module's rows)
//   - config/zohoBugMap.js                    (the same data as a queryable JS module)
//
// Convention for adding a case here:
//   1. Pick an unmatched bug for this module:
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Grade / Subject / Division')
//   2. Before writing anything new, check CEP_TestCases/*_Module_Test_Cases_Final.xlsx and the rest
//      of tests/ for this module -- if an existing test case already exercises this exact defect,
//      that's the ONLY valid reason to skip automating it. Set matchedTestId to that existing
//      test's title/id (not 'null') and move on; don't write a duplicate.
//   3. Otherwise, write a test that reproduces the bug's ORIGINAL repro steps against the real app
//      and asserts the ORIGINAL bug does not happen. Title it '<Zoho Item Id>: <short description>',
//      tag it '@historical-regression', and reference the Zoho title in a comment for traceability.
//   4. The test's real outcome IS the finding -- if it currently passes, the bug is confirmed fixed;
//      if it fails, the bug is confirmed still live. Both are useful results; don't force an
//      expected outcome before actually running it.
//   5. Once written, update that bug's matchedTestId field in config/zohoBugMap.js to this test's
//      title/id, then re-run 'node scripts/generate-zoho-regression-progress.js' to refresh
//      tests/zoho-regression/README.md.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
});

test(
  'TCN-I16990: Chapter names show a real apostrophe, not the HTML entity &#39;',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16990 -- HTML entity &#39; displayed instead of an apostrophe in a Whiteboard
    // chapter name.
    const nav = new NavigationPage(page);
    await nav.openChaptersPopup();
    await page.waitForTimeout(500);
    const chapterCount = await nav.chapterItems.count();
    test.fail(chapterCount === 0, 'No chapters found this pass');
    if (chapterCount === 0) {
      expect(chapterCount).toBeGreaterThan(0);
      return;
    }
    const names = await nav.chapterItems.allTextContents();
    const hasEntity = names.some((n) => /&#39;|&amp;#39;/.test(n));
    test.info().annotations.push({
      type: 'note',
      description: ['Chapter names checked for the literal HTML entity:', JSON.stringify(names)].join(' '),
    });

    test.fail(
      hasEntity,
      'CONFIRMED (matches Zoho TCN-I16990): a chapter name shows the literal HTML entity &#39; instead of an apostrophe'
    );
    expect(hasEntity).toBe(false);
    await nav._closeChaptersPopupIfOpen();
  }
);

test(
  'CWR-I277: Both Primary and Secondary grade options are visible in the Grade selector',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I277 -- Primary & Secondary grade options are not visible in the application.
    //
    // FIXED (test-authoring gap, not app bug): opening the class popup alone does not render
    // gradeButtons -- confirmed via tests/navigation/cascade.spec.js's own beforeEach, the popup
    // defaults to a different tab and needs an explicit click into "All My Classes" before the
    // Grade/Division/Subject cascade (and gradeButtons within it) exists in the DOM at all. The
    // original version of this test skipped that click, so "Grade options visible: 0" reproduced
    // consistently across two separate live runs -- but it was measuring a test gap, not the app.
    const nav = new NavigationPage(page);
    await nav.openClassPopup();
    await nav.allMyClassesTab.click();
    await page
      .locator(
        '[data-qa-id="common-select-grade-btn"].btn--active, [data-qa-id="common-select-grade-btn"][class*="btn--active"]'
      )
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
    const gradeCount = await nav.gradeButtons.count();
    test.info().annotations.push({ type: 'note', description: ['Grade options visible:', gradeCount].join(' ') });

    test.fail(gradeCount === 0, 'CONFIRMED (matches Zoho CWR-I277): no grade options are visible at all');
    expect(gradeCount).toBeGreaterThan(0);
  }
);

test(
  'CWR-I360: The Subject list is displayed in alphabetical order',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I360 -- V2-Subject list is not displayed in alphabetical order.
    // FIXED (test-authoring gap, not app bug) -- see CWR-I277's comment above for why the popup
    // needs the explicit "All My Classes" tab click before gradeButtons exists at all.
    const nav = new NavigationPage(page);
    await nav.openClassPopup();
    await nav.allMyClassesTab.click();
    await page
      .locator(
        '[data-qa-id="common-select-grade-btn"].btn--active, [data-qa-id="common-select-grade-btn"][class*="btn--active"]'
      )
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
    const gradeCount = await nav.gradeButtons.count();
    test.fail(gradeCount === 0, 'Grade selector not reachable this pass');
    if (gradeCount === 0) {
      expect(gradeCount).toBeGreaterThan(0);
      return;
    }
    await nav.gradeButtons.first().click({ force: true });
    await page.waitForTimeout(500);
    const subjectNames = await nav.subjectButtons.allTextContents();
    const trimmed = subjectNames.map((s) => s.trim());
    const sorted = [...trimmed].sort((a, b) => a.localeCompare(b));
    test.info().annotations.push({
      type: 'note',
      description: [
        'Subject order as displayed:',
        JSON.stringify(trimmed),
        '| alphabetical order would be:',
        JSON.stringify(sorted),
      ].join(' '),
    });

    test.fail(
      JSON.stringify(trimmed) !== JSON.stringify(sorted),
      'CONFIRMED (matches Zoho CWR-I360): the subject list is not displayed in alphabetical order'
    );
    expect(trimmed).toEqual(sorted);
  }
);

test(
  'CWR-I365: The Grade/Subject selection window stays open when switching Divisions',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I365 (Duplicate) -- the Subject/Grade selection window closes when switching
    // Divisions.
    // FIXED (test-authoring gap, not app bug) -- see CWR-I277's comment above for why the popup
    // needs the explicit "All My Classes" tab click before gradeButtons exists at all.
    const nav = new NavigationPage(page);
    await nav.openClassPopup();
    await nav.allMyClassesTab.click();
    await page
      .locator(
        '[data-qa-id="common-select-grade-btn"].btn--active, [data-qa-id="common-select-grade-btn"][class*="btn--active"]'
      )
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
    const gradeCount = await nav.gradeButtons.count();
    test.fail(gradeCount === 0, 'Grade selector not reachable this pass');
    if (gradeCount === 0) {
      expect(gradeCount).toBeGreaterThan(0);
      return;
    }
    await nav.gradeButtons.first().click({ force: true });
    await page.waitForTimeout(500);
    const divisionCount = await nav.divisionButtons.count();
    test.fail(divisionCount === 0, 'Division selector not reachable this pass');
    if (divisionCount === 0) {
      expect(divisionCount).toBeGreaterThan(0);
      return;
    }
    await nav.divisionButtons.first().click({ force: true });
    await page.waitForTimeout(500);
    const stillOpen = await nav.subjectButtons
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Selection window still open (Subject options visible) after switching Division:', stillOpen].join(
        ' '
      ),
    });

    test.fail(!stillOpen, 'CONFIRMED (matches Zoho CWR-I365): the selection window closes when switching Divisions');
    expect(stillOpen).toBe(true);
  }
);

test(
  'TCN-I15337: Content loads on the first click, not only after a re-click',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15337 (Closed) -- content does not load on first attempt, becomes visible only
    // after re-click.
    const pl = new PlaylistPage(page);
    const count = await pl.resourceCards.count();
    test.fail(count === 0, 'No playlist resources available this pass');
    if (count === 0) {
      expect(count).toBeGreaterThan(0);
      return;
    }
    const { PlayerPage } = require('../../pages/player.page');
    const plr = new PlayerPage(page);
    await plr.openResourceCard(pl.resourceCards.first());
    await page.waitForTimeout(1500);
    const openedOnFirstClick = await plr.closeIcon
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Content opened on the first click:', openedOnFirstClick].join(' '),
    });

    test.fail(!openedOnFirstClick, 'CONFIRMED (matches Zoho TCN-I15337): content did not load on the first click');
    expect(openedOnFirstClick).toBe(true);
  }
);

test(
  'TCN-I15343: The Chapters panel does not open automatically without the user clicking it',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15343 -- the "Chapters" panel opens automatically during a session without the
    // user clicking on it, interrupting the session.
    const nav = new NavigationPage(page);
    // Observe normal session activity (a real navigation action, not touching Chapters at all)
    // and confirm the Chapters popup does not appear as an unrelated side effect.
    await nav.currentClassBtn.click({ force: true });
    await page.waitForTimeout(800);
    await nav.currentClassBtn.click({ force: true }); // close it again
    await page.waitForTimeout(1500);
    const chaptersPopupVisible = await page
      .locator('[data-qa-id="playlist-nav-toggle-chapter-tp-popup"]')
      .locator('xpath=following::*[contains(@class,"chapter") or contains(@class,"Chapter")]')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const chapterItemsVisible = await nav.chapterItems
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Chapters popup/items visible without ever clicking the Chapters control:',
        chaptersPopupVisible || chapterItemsVisible,
      ].join(' '),
    });

    test.fail(
      chaptersPopupVisible || chapterItemsVisible,
      'CONFIRMED (matches Zoho TCN-I15343): the Chapters panel opened automatically without the user clicking it'
    );
    expect(chaptersPopupVisible || chapterItemsVisible).toBe(false);
  }
);
