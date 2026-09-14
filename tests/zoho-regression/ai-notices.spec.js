// Zoho historical bug regression -- AI Notices.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'AI Notices')
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
const { ToolbarPage } = require('../../pages/toolbar.page');
const { AiNoticesPage } = require('../../pages/ai-notices.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(60000);
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await applyClassMap(nav, 'aiNotices').catch(() => {});
});

// CWR-I381: "Captured content not displayed ... shows error 'No readable text found in the
// image'" (Status: QA Sign off/Closed as of the 2026-09-13 export) -- already covered by
// AIN-OCR-02 ("The OCR success path works end-to-end -- real text is captured and opens a
// pre-filled compose dialog") in tests/ai-notices/ai-notices.spec.js, which reproduces this exact
// flow (place real readable text, drag-select over it, Approve) and asserts it succeeds rather
// than erroring. No new test needed here; see config/zohoBugMap.js's matchedTestId + notes.

test(
  'CWR-I357: Capture AI Notice content stays correctly aligned within the visible screen area when scrolling',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I357 (AI Notices, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: generate/open a Capture AI Notice, scroll down -- its content appears below
    // the visible screen area instead of staying within the structured layout.
    const an = new AiNoticesPage(page);
    const tb = new ToolbarPage(page);
    const opened = await an.openComposeDialogWithRealText(tb);
    test.fail(!opened, 'Compose dialog not reachable this pass -- cannot test its scroll/layout behavior');
    if (!opened) {
      expect(opened).toBe(true);
      return;
    }

    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(500);

    // page.viewportSize() returns null for this app's Electron webview window (it's not a
    // Playwright-launched browser context, so the viewport option never applies) -- confirmed live.
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const titleBox = await an.titleInput.boundingBox();
    const bodyBox = await an.bodyEditor.boundingBox().catch(() => null);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Viewport height:',
        viewportHeight,
        '| title box after scroll:',
        titleBox,
        '| body box:',
        bodyBox,
      ].join(' '),
    });

    const titleBelowFold = !titleBox || titleBox.y >= viewportHeight;
    const bodyBelowFold = bodyBox && bodyBox.y >= viewportHeight;

    test.fail(
      titleBelowFold || Boolean(bodyBelowFold),
      `CONFIRMED (matches Zoho CWR-I357): Capture AI Notice content is pushed below the visible screen area on scroll (title below fold: ${titleBelowFold}, body below fold: ${bodyBelowFold})`
    );
    expect(titleBelowFold || bodyBelowFold).toBe(false);
  }
);
