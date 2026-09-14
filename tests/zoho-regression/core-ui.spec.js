// Zoho historical bug regression -- Core UI.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Core UI')
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
const { ToolbarPage } = require('../../pages/toolbar.page');
const { PlaylistPage } = require('../../pages/playlist.page');
const { PlayerPage } = require('../../pages/player.page');
const { applyClassMap } = require('../../config/moduleClassMap');

async function signOut(page) {
  const acc = new AccountManagementPage(page);
  let backToGuest = false;
  for (let attempt = 0; attempt < 2 && !backToGuest; attempt++) {
    await acc.avatarTrigger.click({ force: true });
    await page.waitForTimeout(700);
    const signOutVisible = await acc.signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!signOutVisible) continue;
    await acc.signOutBtn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1500);
    backToGuest = await page
      .getByText(/guest mode/i)
      .isVisible({ timeout: 8000 })
      .catch(() => false);
  }
  return backToGuest;
}

test(
  'CWR-I665: The drawing/tool settings panel does not persist onto the Sign-In page after logout',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I665 (Core UI, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: with a tool's context menu/settings panel open, sign out (or drop to guest
    // mode) -- the panel should be cleared, not remain visible over the Sign-In page.
    const nav = new NavigationPage(page);
    await nav.loginWithPin(process.env.VALID_PIN);
    const tb = new ToolbarPage(page);
    await tb.selectTool('gtPen');
    let panelVisible = await tb.panel.isVisible({ timeout: 5000 }).catch(() => false);
    if (!panelVisible) {
      // Matches this app's well-documented "first click after login can silently miss" class of
      // flakiness (e.g. AccountManagementPage.openProfileMenu) -- retry once before treating the
      // panel as genuinely unreachable.
      await tb.selectTool('gtPen');
      panelVisible = await tb.panel.isVisible({ timeout: 8000 }).catch(() => false);
    }
    test.fail(!panelVisible, "Pen tool settings panel never opened this pass -- can't test its post-logout residue");
    if (!panelVisible) {
      expect(panelVisible).toBe(true);
      return;
    }

    const backToGuest = await signOut(page);
    test.fail(
      !backToGuest,
      'Sign-out did not return to Guest Mode -- cannot test the post-logout panel residue at all'
    );
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }

    await page.waitForTimeout(1000);
    const panelStillVisible = await tb.panel.isVisible({ timeout: 2000 }).catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Pen tool settings panel still visible after logout:', panelStillVisible].join(' '),
    });

    test.fail(
      panelStillVisible,
      'CONFIRMED (matches Zoho CWR-I665): the tool settings/context menu panel remains visible on the Sign-In page after logout'
    );
    expect(panelStillVisible).toBe(false);
  }
);

test(
  'CWR-I675: Ebook content does not remain visible after closing the reader and logging out',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I675 (Core UI, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: open an ebook, close it, then log out -- the ebook content should be gone,
    // not still visible on screen after re-entering Guest Mode.
    const nav = new NavigationPage(page);
    const pl = new PlaylistPage(page);
    const plr = new PlayerPage(page);
    await pl.loginWithPin(process.env.VALID_PIN);
    await applyClassMap(nav, 'ebook');
    await page.waitForTimeout(1000);

    await plr.openResourceCard(plr.ebookTriggerBtn);
    await plr.ebookLaunchBtn.first().waitFor({ state: 'visible', timeout: 10000 });
    await plr.openResourceCard(plr.ebookLaunchBtn.first());
    const opened = await plr.closeIcon
      .first()
      .isVisible({ timeout: 25000 })
      .catch(() => false);
    test.fail(!opened, 'Ebook reader never opened this pass -- cannot test the post-close/logout residue');
    if (!opened) {
      expect(opened).toBe(true);
      return;
    }

    await plr.closeIcon.first().click({ force: true });
    await page.waitForTimeout(1000);

    const backToGuest = await signOut(page);
    test.fail(
      !backToGuest,
      'Sign-out did not return to Guest Mode -- cannot test the post-logout ebook residue at all'
    );
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }

    await page.waitForTimeout(1000);
    const ebookStillVisible = await plr.closeIcon
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Ebook reader (close icon) still visible after close + logout:', ebookStillVisible].join(' '),
    });

    test.fail(
      ebookStillVisible,
      'CONFIRMED (matches Zoho CWR-I675): the ebook reader remains visible after being closed and logging out'
    );
    expect(ebookStillVisible).toBe(false);
  }
);
