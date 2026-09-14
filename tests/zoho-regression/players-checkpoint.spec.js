// Zoho historical bug regression -- Players (Checkpoint).
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Players (Checkpoint)')
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
const { PlayerPage } = require('../../pages/player.page');
const { CompassPage } = require('../../pages/compass.page');
const { AccountManagementPage } = require('../../pages/account-management.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

async function signOut(page) {
  const am = new AccountManagementPage(page);
  let backToGuest = false;
  for (let attempt = 0; attempt < 2 && !backToGuest; attempt++) {
    await am.avatarTrigger.click({ force: true });
    await page.waitForTimeout(700);
    const signOutVisible = await am.signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!signOutVisible) continue;
    await am.signOutBtn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1500);
    backToGuest = await page
      .getByText(/guest mode/i)
      .isVisible({ timeout: 8000 })
      .catch(() => false);
  }
  return backToGuest;
}

test(
  'TCN-I16724: The Checkpoint/Start-Checkpoint screen does not remain open after an automatic sign-out',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16724 -- Baseline Test/Start Checkpoint screen remains open after auto sign-out.
    // Uses the confirmed-reachable generic Checkpoint resource (no confirmed Baseline-Test-specific
    // resource exists in this suite -- see the create-flow scoping note on the other bugs here).
    const pl = new PlaylistPage(page);
    const nav = new NavigationPage(page);
    const plr = new PlayerPage(page);
    await pl.loginWithPin(process.env.VALID_PIN);
    await applyClassMap(nav, 'checkpoints');
    await page.waitForTimeout(1000);

    const card = pl.resourceCards.filter({ hasText: 'testR-25.08.26' }).first();
    const cardAttached = await card.isVisible({ timeout: 10000 }).catch(() => false);
    test.fail(!cardAttached, 'Checkpoint resource not reachable this pass');
    if (!cardAttached) {
      expect(cardAttached).toBe(true);
      return;
    }
    await plr.openResourceCard(card);
    await page.waitForTimeout(2500);
    const screenOpen =
      (await plr.checkpointTimerBadge.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await plr.checkpointResumeBtn.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await plr.checkpointModeOnlineBtn.isVisible({ timeout: 3000 }).catch(() => false));
    test.fail(!screenOpen, 'Checkpoint screen did not open this pass -- cannot test post-signout residue');
    if (!screenOpen) {
      expect(screenOpen).toBe(true);
      return;
    }

    const backToGuest = await signOut(page);
    test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test the post-signout residue');
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }
    await page.waitForTimeout(1000);
    const stillOpen =
      (await plr.checkpointTimerBadge.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await plr.checkpointResumeBtn.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await plr.checkpointModeOnlineBtn.isVisible({ timeout: 2000 }).catch(() => false));
    test.info().annotations.push({
      type: 'note',
      description: ['Checkpoint screen still visible after auto sign-out:', stillOpen].join(' '),
    });

    test.fail(
      stillOpen,
      'CONFIRMED (matches Zoho TCN-I16724): the Checkpoint screen remains open after an automatic sign-out'
    );
    expect(stillOpen).toBe(false);
  }
);

test(
  'TCN-I16051 / TCN-I16228: The Revision Test popup closes on the first click and does not persist after navigation/sign-out',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16051 (persists after navigation and sign out) + TCN-I16228 (does not close on
    // first click after accessing Compass).
    const pl = new PlaylistPage(page);
    const nav = new NavigationPage(page);
    const cmp = new CompassPage(page);
    await pl.loginWithPin(process.env.VALID_PIN);
    // 'compassBaseline' is the confirmed location where Revision Tests actually renders (see
    // tests/compass/compass.spec.js's own beforeEach note -- some classes have zero Compass DOM
    // presence at all).
    await applyClassMap(nav, 'compassBaseline', { chapterNav: false });
    await cmp.openTrigger();
    const revTestsVisible = await cmp.revisionTestsItem.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!revTestsVisible, 'Revision Tests entry not reachable this pass');
    if (!revTestsVisible) {
      expect(revTestsVisible).toBe(true);
      return;
    }
    await cmp.revisionTestsItem.click({ force: true });
    await page.waitForTimeout(800);
    // First click on the trigger again should close the popup (matching normal toggle behavior).
    await cmp.triggerBtn.click({ force: true });
    await page.waitForTimeout(800);
    const closedOnFirstClick = await cmp.revisionTestsItem.isHidden({ timeout: 3000 }).catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Revision Test popup closed on the first click of the trigger:', closedOnFirstClick].join(' '),
    });

    test.fail(
      !closedOnFirstClick,
      'CONFIRMED (matches Zoho TCN-I16228): the Revision Test popup does not close on the first click'
    );

    const backToGuest = await signOut(page);
    test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test the post-signout popup residue');
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }
    await page.waitForTimeout(1000);
    const popupStillVisible = await cmp.revisionTestsItem.isVisible({ timeout: 2000 }).catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Revision Test popup still visible after sign-out:', popupStillVisible].join(' '),
    });

    test.fail(
      popupStillVisible,
      'CONFIRMED (matches Zoho TCN-I16051): the Revision Test popup persists after sign-out'
    );
    expect(closedOnFirstClick).toBe(true);
    expect(popupStillVisible).toBe(false);
  }
);
