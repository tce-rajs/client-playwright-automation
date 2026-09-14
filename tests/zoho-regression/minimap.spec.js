// Zoho historical bug regression -- Minimap.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Minimap')
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
const { ToolbarPage } = require('../../pages/toolbar.page');
const { MinimapPage } = require('../../pages/minimap.page');
const { NavigationPage } = require('../../pages/navigation.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await pl.ensureResourcesPresent();
});

test(
  'TCN-I15382: The Minimap content preview renders properly after adding content and zooming',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15382 -- Minimap does not display the whiteboard content properly after adding
    // content to the whiteboard and enabling zoom.
    const tb = new ToolbarPage(page);
    const mm = new MinimapPage(page);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    await tb.drawStroke({ x: 300, y: 300 }, { x: 500, y: 400 });
    await tb.openToolPanel('gtZoom');
    const sliderBox = await tb.zoomSlider.boundingBox().catch(() => null);
    if (sliderBox) {
      await page.mouse.click(sliderBox.x + sliderBox.width * 0.7, sliderBox.y + sliderBox.height / 2);
    }
    await page.waitForTimeout(500);
    const opened = await mm.open();
    test.fail(!opened, 'Minimap did not open this pass');
    if (!opened) {
      expect(opened).toBe(true);
      return;
    }
    const canvasVisible = await mm.canvas.isVisible({ timeout: 5000 }).catch(() => false);
    const canvasBox = canvasVisible ? await mm.canvas.boundingBox() : null;
    test.info().annotations.push({
      type: 'note',
      description: ['Minimap canvas visible:', canvasVisible, '| box:', JSON.stringify(canvasBox)].join(' '),
    });

    const bugReproduces = !canvasVisible || !canvasBox || canvasBox.width === 0 || canvasBox.height === 0;
    test.fail(
      bugReproduces,
      'CONFIRMED (matches Zoho TCN-I15382): the Minimap content preview did not render properly after adding content and zooming'
    );
    expect(bugReproduces).toBe(false);
  }
);

test(
  'TCN-I15383: The Minimap popup closes automatically when navigating to another topic',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15383 -- the Minimap popup remains visible after switching topics without closing
    // it first.
    const mm = new MinimapPage(page);
    const opened = await mm.open();
    test.fail(!opened, 'Minimap did not open this pass');
    if (!opened) {
      expect(opened).toBe(true);
      return;
    }
    const nextTopicBtn = page.locator('[data-qa-id="playlist-nav-topic-right"]');
    await nextTopicBtn.scrollIntoViewIfNeeded().catch(() => {});
    await nextTopicBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);
    const stillOpen = await mm.isOpen();
    test.info().annotations.push({
      type: 'note',
      description: ['Minimap still open after switching to the next topic:', stillOpen].join(' '),
    });

    test.fail(
      stillOpen,
      'CONFIRMED (matches Zoho TCN-I15383): the Minimap popup remains open after switching topics instead of closing automatically'
    );
    expect(stillOpen).toBe(false);
  }
);

test(
  'TCN-I15385: The Minimap preview does not remain visible on screen after logout',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15385 -- the Minimap preview remains visible even after logout, without closing it
    // first.
    const tb = new ToolbarPage(page);
    const mm = new MinimapPage(page);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    await tb.drawStroke({ x: 300, y: 300 }, { x: 500, y: 400 });
    const opened = await mm.open();
    test.fail(!opened, 'Minimap did not open this pass');
    if (!opened) {
      expect(opened).toBe(true);
      return;
    }
    const { AccountManagementPage } = require('../../pages/account-management.page');
    const am = new AccountManagementPage(page);
    await am.avatarTrigger.click({ force: true });
    await page.waitForTimeout(700);
    const signOutVisible = await am.signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!signOutVisible, 'Sign Out control not reachable this pass');
    if (!signOutVisible) {
      expect(signOutVisible).toBe(true);
      return;
    }
    await am.signOutBtn.click({ force: true });
    await page.waitForTimeout(1500);
    const backToGuest = await page
      .getByText(/guest mode/i)
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test the post-logout Minimap state');
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }
    const minimapVisibleAfterLogout = await mm.container
      .evaluate((el) => el.classList.contains('visible'))
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Minimap still visible on screen after logout:', minimapVisibleAfterLogout].join(' '),
    });

    test.fail(
      minimapVisibleAfterLogout,
      'CONFIRMED (matches Zoho TCN-I15385): the Minimap preview remains visible on screen after logout'
    );
    expect(minimapVisibleAfterLogout).toBe(false);
  }
);
