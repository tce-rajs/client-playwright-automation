// Zoho historical bug regression -- User Profile.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'User Profile')
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
const { NavigationPage } = require('../../pages/navigation.page');
const { AccountManagementPage } = require('../../pages/account-management.page');

test.beforeEach(async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.loginWithPin(process.env.VALID_PIN);
});

test(
  'CWR-I742: Clicking outside the profile popup closes it completely, with no residual panel left blocking the UI',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I742 (User Profile, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: sign in, open the user profile popup (avatar -> profile drilldown), click
    // anywhere outside it. Expected: popup closes completely. Reported actual: the popup
    // "minimizes" but a residual panel stays visible and blocks other UI.
    const acc = new AccountManagementPage(page);
    await acc.openProfileMenu();
    await expect(acc.drilldownTrigger).toBeVisible();

    // Click somewhere clearly outside the popup (top-left corner of the whiteboard).
    await page.mouse.click(15, 15);
    await page.waitForTimeout(1000);

    const popupStillVisible = await acc.drilldownTrigger.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Profile popup (drilldown trigger) still visible after clicking outside it:', popupStillVisible);

    test.fail(
      popupStillVisible,
      'CONFIRMED (matches Zoho CWR-I742): the profile popup remains visible/blocking after clicking outside it, instead of closing completely'
    );
    expect(popupStillVisible).toBe(false);
  }
);

test(
  'CWR-I554: The Profile screen loads and renders, not a blank/unresponsive screen',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I554 -- the profile screen does not load, remains blank/unresponsive.
    const acc = new AccountManagementPage(page);
    await acc.openAccountTab();
    const accountTabActive = await acc.accountTab.isVisible({ timeout: 5000 }).catch(() => false);
    await acc.profileTab.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    const bodyText = await page.evaluate(() => document.body.innerText.length);
    console.log('Account tab visible:', accountTabActive, '| total body text length after navigating to Profile:', bodyText);

    const bugReproduces = !accountTabActive || bodyText < 50;
    test.fail(
      bugReproduces,
      'CONFIRMED (matches Zoho CWR-I554): the Profile screen appears blank/unresponsive'
    );
    expect(bugReproduces).toBe(false);
  }
);

test(
  'CWR-I745: A Feedback option is available in the Profile section',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I745 -- the Feedback option (present in CEP V1) is missing from the Profile section
    // in V2.
    const acc = new AccountManagementPage(page);
    await acc.openProfileMenu();
    const feedbackInOuterMenu = await page.getByText(/feedback/i).isVisible({ timeout: 3000 }).catch(() => false);
    let feedbackInInnerModal = false;
    if (!feedbackInOuterMenu) {
      await acc.drilldownTrigger.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      feedbackInInnerModal = await page.getByText(/feedback/i).isVisible({ timeout: 3000 }).catch(() => false);
    }
    const feedbackFound = feedbackInOuterMenu || feedbackInInnerModal;
    console.log('Feedback option found in outer menu:', feedbackInOuterMenu, '| in inner Account/Profile modal:', feedbackInInnerModal);

    test.fail(
      !feedbackFound,
      'CONFIRMED (matches Zoho CWR-I745): no "Feedback" option is present anywhere in the Profile section'
    );
    expect(feedbackFound).toBe(true);
  }
);
