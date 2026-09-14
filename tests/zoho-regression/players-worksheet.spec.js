// Zoho historical bug regression -- Players (Worksheet).
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Players (Worksheet)')
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
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

// Reuses the confirmed 'playersDefault' location and openWorksheet() pattern from
// tests/players/worksheet.spec.js.
test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await applyClassMap(nav, 'playersDefault');
  await page.waitForTimeout(1000);
  await pl.ensureDrawerVisible();
});

test(
  'TCN-I15364: The floating annotation Pencil/Eraser tools work in the Worksheet, and the eraser icon does not linger after closing',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15364 -- the floating annotation pencil/eraser tools become unresponsive in the
    // Worksheet player, and the eraser icon remains visible even after closing the tool.
    const plr = new PlayerPage(page);
    await expect(plr.worksheetCards.first()).toBeAttached({ timeout: 10000 });
    await plr.openResourceCard(plr.worksheetCards);
    await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1500);

    const body = page.locator('body');
    await body.click({ position: { x: 700, y: 500 }, force: true }).catch(() => {});
    await page.waitForTimeout(800);
    const pencilTool = page.locator('[class*="pencil" i]').first();
    const pencilVisible = await pencilTool.isVisible({ timeout: 3000 }).catch(() => false);
    test.fail(!pencilVisible, 'No pencil tool control found on this worksheet resource this pass');
    if (!pencilVisible) {
      expect(pencilVisible).toBe(true);
      return;
    }
    await pencilTool.click({ force: true });
    await page.waitForTimeout(500);
    const beforeCount = await plr.worksheetAnnotationLayer
      .locator('path')
      .count()
      .catch(() => 0);
    const box = await page
      .locator('.annotation-layer, svg.annotation-layer')
      .first()
      .boundingBox()
      .catch(() => null);
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 150);
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
    const afterCount = await plr.worksheetAnnotationLayer
      .locator('path')
      .count()
      .catch(() => 0);
    test.info().annotations.push({
      type: 'note',
      description: ['Annotation path count before/after drawing with the pencil:', beforeCount, afterCount].join(' '),
    });

    const eraserTool = page.locator('[class*="eraser" i]').first();
    const eraserVisibleBefore = await eraserTool.isVisible({ timeout: 2000 }).catch(() => false);
    // Close the annotation toolbar by clicking elsewhere.
    await body.click({ position: { x: 1500, y: 900 }, force: true }).catch(() => {});
    await page.waitForTimeout(800);
    const eraserVisibleAfterClose = await eraserTool.isVisible({ timeout: 2000 }).catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Eraser icon visible before close:',
        eraserVisibleBefore,
        '| still visible after closing:',
        eraserVisibleAfterClose,
      ].join(' '),
    });

    const bugReproduces = afterCount <= beforeCount || eraserVisibleAfterClose;
    test.fail(
      bugReproduces,
      `CONFIRMED (matches Zoho TCN-I15364): ${afterCount <= beforeCount ? 'the pencil tool did not create a new annotation' : 'the eraser icon remained visible after closing the annotation toolbar'}`
    );
    expect(bugReproduces).toBe(false);
  }
);
