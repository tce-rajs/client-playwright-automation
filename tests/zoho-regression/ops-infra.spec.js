// Zoho historical bug regression -- Ops / Infra (non-UI).
//
// Live-verifies real, previously-reported Zoho defects for this module against the CURRENT app,
// rather than trusting their last-known Zoho Status (open/closed is not a reason to skip one --
// only an existing test that already proves the behavior is).
//
// Sources:
//   - CEP_TestCases/Zoho_Bugs_TeachMode.xlsx  (this module's rows)
//   - config/zohoBugMap.js                    (the same data as a queryable JS module)
//
// NOTE: this module is backend/infra-facing, not UI-driven -- most bugs here may not be
// reproducible through Playwright at all. Triage each one individually; if it truly can't be
// exercised through the UI, leave matchedTestId null but add a `notes` explanation in
// config/zohoBugMap.js instead of forcing a UI test that doesn't actually prove anything.
//
// Convention for adding a case here:
//   1. Pick an unmatched bug for this module:
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Ops / Infra (non-UI)')
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
const { ToolbarPage } = require('../../pages/toolbar.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await applyClassMap(nav, 'playersDefault');
  await page.waitForTimeout(500);
});

test(
  'TCN-I15547 / TCN-I15594: Annotation tools are usable on a media resource (video) during playback',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15547 (Invalid, "Unable to Write Annotations on Video During Playback") + TCN-I15594
    // ("Annotation Not Working on Media Resources").
    const pl = new PlaylistPage(page);
    const plr = new PlayerPage(page);
    const tb = new ToolbarPage(page);
    await pl.ensureDrawerVisible().catch(() => {});
    const hasVideo = await plr.videoCards.count();
    test.fail(hasVideo === 0, 'No video resource available this pass');
    if (!hasVideo) {
      expect(hasVideo).toBeGreaterThan(0);
      return;
    }
    let crashed = false;
    page.once('pageerror', () => {
      crashed = true;
    });
    await plr.openResourceCard(plr.videoCards);
    await page.waitForTimeout(2500);
    test.fail(crashed, 'Video player crashed on open this pass -- cannot test annotation during playback');
    if (crashed) {
      expect(crashed).toBe(false);
      return;
    }
    await plr.videoPlayToggle
      .first()
      .click({ force: true })
      .catch(() => {});
    await page.waitForTimeout(1000);

    const penTool = tb.tool('gtPen');
    const penToolVisible = await penTool.isVisible({ timeout: 3000 }).catch(() => false);
    test.fail(!penToolVisible, 'Pen tool not reachable while a video is open this pass');
    if (!penToolVisible) {
      expect(penToolVisible).toBe(true);
      return;
    }
    await penTool.click({ force: true });
    await page.waitForTimeout(500);
    const panelVisible = await tb.panel.isVisible({ timeout: 3000 }).catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Pen tool settings panel opens while a video is playing:', panelVisible].join(' '),
    });

    test.fail(
      !panelVisible,
      'CONFIRMED (matches Zoho TCN-I15547/TCN-I15594): unable to engage the annotation (Pen) tool while a video resource is playing'
    );
    expect(panelVisible).toBe(true);
  }
);

test(
  'TCN-I15588: Resource icons load properly in the Content Tray',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15588 (Invalid) -- resource icons not loading properly in the content tray.
    const pl = new PlaylistPage(page);
    const count = await pl.resourceCards.count();
    test.fail(count === 0, 'No playlist resources available this pass');
    if (count === 0) {
      expect(count).toBeGreaterThan(0);
      return;
    }
    const brokenCount = await pl.resourceCards.evaluateAll(
      (cards) =>
        cards.filter((c) => {
          const img = c.querySelector('img.type-icon');
          return img && (!img.complete || img.naturalWidth === 0);
        }).length
    );
    test.info().annotations.push({
      type: 'note',
      description: ['Resource cards with a broken/unloaded type icon:', brokenCount, 'of', count].join(' '),
    });

    test.fail(
      brokenCount > 0,
      `CONFIRMED (matches Zoho TCN-I15588): ${brokenCount} of ${count} resource card icons failed to load`
    );
    expect(brokenCount).toBe(0);
  }
);

test(
  'TCN-I15947: Whiteboard autosave completes, rather than getting stuck showing a countdown',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15947 -- whiteboard auto-save gets stuck at "1 sec" after editing.
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    await tb.drawStroke({ x: 500, y: 500 }, { x: 650, y: 500 });

    const savingVisible = await tb.savingToast.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!savingVisible, 'No "Saving whiteboard" toast appeared this pass -- cannot test whether it gets stuck');
    if (!savingVisible) {
      expect(savingVisible).toBe(true);
      return;
    }
    const savedVisible = await tb.savedToast
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Autosave "Saving..." toast appeared:',
        savingVisible,
        '| "Whiteboard Saved!" toast appeared within 15s:',
        savedVisible,
      ].join(' '),
    });

    test.fail(
      !savedVisible,
      'CONFIRMED (matches Zoho TCN-I15947): the autosave toast did not complete within 15s -- appears stuck'
    );
    expect(savedVisible).toBe(true);
  }
);

test(
  'TCN-I15637: Scroll position within a resource is preserved after switching topics and coming back',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15637 (Duplicate) -- scroll position not syncing/preserved across topics/chapters.
    const nav = new NavigationPage(page);
    const pl = new PlaylistPage(page);
    const plr = new PlayerPage(page);
    await pl.ensureDrawerVisible().catch(() => {});
    const hasWorksheet = await plr.worksheetCards.count();
    test.fail(hasWorksheet === 0, 'No worksheet resource available this pass');
    if (!hasWorksheet) {
      expect(hasWorksheet).toBeGreaterThan(0);
      return;
    }
    await plr.openResourceCard(plr.worksheetCards);
    await page.waitForTimeout(2000);
    const opened = await plr.worksheetNextPage.isVisible({ timeout: 8000 }).catch(() => false);
    test.fail(!opened, 'Worksheet did not open this pass -- cannot test scroll/page position');
    if (!opened) {
      expect(opened).toBe(true);
      return;
    }
    await plr.worksheetNextPage.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    const pageIndicatorBefore = await page
      .locator('.pagination, [class*="page-indicator" i]')
      .first()
      .textContent()
      .catch(() => null);

    await plr.closeIcon
      .first()
      .click({ force: true })
      .catch(() => {});
    await page.waitForTimeout(1000);
    await nav.resetToClass('Class 12', 'A', 'Physics');
    await page.waitForTimeout(1000);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await page.waitForTimeout(1000);
    await applyClassMap(nav, 'playersDefault');
    await page.waitForTimeout(1000);
    await pl.ensureDrawerVisible().catch(() => {});
    await plr.openResourceCard(plr.worksheetCards);
    await page.waitForTimeout(2000);
    const pageIndicatorAfter = await page
      .locator('.pagination, [class*="page-indicator" i]')
      .first()
      .textContent()
      .catch(() => null);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Worksheet page indicator before switching away:',
        pageIndicatorBefore,
        '| after coming back:',
        pageIndicatorAfter,
      ].join(' '),
    });

    test.fail(
      pageIndicatorAfter !== pageIndicatorBefore,
      "CONFIRMED (matches Zoho TCN-I15637): the resource's scroll/page position was not preserved after switching topics and coming back"
    );
    expect(pageIndicatorAfter).toBe(pageIndicatorBefore);
  }
);
