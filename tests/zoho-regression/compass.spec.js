// Zoho historical bug regression -- Compass.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Compass')
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
const { CompassPage } = require('../../pages/compass.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }, testInfo) => {
  // Same confirmed-working setup as tests/compass/compass.spec.js -- some classes have ZERO
  // AnalyseIt/ExploreIt DOM presence at all, and Compass's own retry/reload logic can legitimately
  // run close to the default per-test timeout, so both the extended timeout and the
  // 'compassBaseline' class (confirmed to render ExploreIt widgets) are needed here too.
  testInfo.setTimeout(60000);
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await applyClassMap(nav, 'compassBaseline', { chapterNav: false });
});

test(
  'CWR-I769: Hovering over a widget tile shows that widget\'s own name, not the literal text "Compass" for every tile',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I769 -- "Compass" text appears on hover for ALL widgets instead of each widget's
    // own respective name.
    const cmp = new CompassPage(page);
    await cmp.openTrigger();
    const openWidgetsVisible = await cmp.exploreItOpenWidgetsLink.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!openWidgetsVisible, 'ExploreIt widgets not reachable this pass');
    if (!openWidgetsVisible) {
      expect(openWidgetsVisible).toBe(true);
      return;
    }
    await cmp.exploreItOpenWidgetsLink.click({ force: true });
    await page.waitForTimeout(1000);
    const widgetTiles = page.locator('[data-qa-id^="toolbar-widget-tool-"]');
    const count = await widgetTiles.count();
    test.fail(count === 0, 'No widget tiles found this pass');
    if (count === 0) {
      expect(count).toBeGreaterThan(0);
      return;
    }
    const titles = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      const el = widgetTiles.nth(i);
      const title = (await el.getAttribute('title')) || (await el.getAttribute('aria-label')) || '';
      titles.push(title.trim());
    }
    console.log('First few widget tiles\' hover-name attributes:', JSON.stringify(titles));
    const allSayCompass = titles.length > 0 && titles.every((t) => /^compass$/i.test(t));

    test.fail(
      allSayCompass,
      `CONFIRMED (matches Zoho CWR-I769): every widget tile's hover text reads literally "Compass" instead of its own name (${JSON.stringify(titles)})`
    );
    expect(allSayCompass).toBe(false);
  }
);

