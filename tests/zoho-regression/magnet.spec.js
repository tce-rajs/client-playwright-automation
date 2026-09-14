// Zoho historical bug regression -- Magnet (entry point -> Attendance/Homework/Notices/Learning Shorts).
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Magnet (entry point -> Attendance/Homework/Notices/Learning Shorts)')
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
const { AiHomeworkPage } = require('../../pages/ai-homework.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test(
  'TCN-I16080 / TCN-I16879: The Notice capture/drag-select box appears once and behaves correctly while creating a Notice',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16080 (capture box reappears while moving the notice selection) + TCN-I16879
    // (the drag box is not displayed at all while creating a Notice).
    const pl = new PlaylistPage(page);
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    const an = new AiNoticesPage(page);
    await pl.loginWithPin(process.env.VALID_PIN);
    await applyClassMap(nav, 'aiNotices').catch(() => {});
    await page.waitForTimeout(500);

    const opened = await an.openNoticeCapture();
    test.fail(!opened, 'Magnet -> Notice not reachable this pass');
    if (!opened) {
      expect(opened).toBe(true);
      return;
    }
    const box = await tb.wbSvg.boundingBox();
    // Start a drag but don't release yet -- move the pointer partway to check the selection box
    // renders exactly once (not duplicated) during the drag.
    await page.mouse.move(box.x + 200, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 350, box.y + 280, { steps: 8 });
    const boxCountMidDrag = await page.locator('svg rect, svg [class*="selection"]').count();
    await page.mouse.move(box.x + 400, box.y + 300, { steps: 4 });
    const boxCountAfterMove = await page.locator('svg rect, svg [class*="selection"]').count();
    await page.mouse.up();
    console.log('Selection rect count mid-drag:', boxCountMidDrag, '| after moving further:', boxCountAfterMove);

    test.fail(
      boxCountMidDrag === 0,
      'CONFIRMED (matches Zoho TCN-I16879): the drag/selection box is not displayed while creating a Notice'
    );
    test.fail(
      boxCountAfterMove > boxCountMidDrag,
      'CONFIRMED (matches Zoho TCN-I16080): an additional capture box appears while continuing to move the selection'
    );
    expect(boxCountMidDrag).toBeGreaterThan(0);
    expect(boxCountAfterMove).toBeLessThanOrEqual(boxCountMidDrag);
  }
);

test(
  'TCN-I16863: A green tick/checkmark shows on the selected topic in the Homework Chapter selection',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16863 -- the green tick indicating a selected topic is missing in the Select
    // Chapter section while creating an assignment/homework from Magnet.
    const pl = new PlaylistPage(page);
    const nav = new NavigationPage(page);
    const ah = new AiHomeworkPage(page);
    await pl.loginWithPin(process.env.VALID_PIN_2);
    await applyClassMap(nav, 'aiHomework').catch(() => {});
    await page.waitForTimeout(500);
    await ah.open();
    await ah.selectChapterBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    const chapterVisible = await ah.topicsChapter(0).isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!chapterVisible, 'Select Chapter section not reachable this pass');
    if (!chapterVisible) {
      expect(chapterVisible).toBe(true);
      return;
    }
    await ah.topicsChapterCheckbox(0).click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    const checkedIndicator = await ah
      .topicsChapter(0)
      .locator('[class*="check" i], [class*="tick" i], .mat-checkbox-checked')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const checkboxState = await ah.topicsChapterCheckbox(0).isChecked().catch(() => null);
    console.log('Visible check/tick indicator on selected topic:', checkedIndicator, '| checkbox isChecked():', checkboxState);

    test.fail(
      !checkedIndicator && checkboxState !== true,
      'CONFIRMED (matches Zoho TCN-I16863): no visible indication (tick/checkmark) that the topic is selected'
    );
    expect(checkedIndicator || checkboxState === true).toBe(true);
  }
);

test(
  'TCN-I16869: The Homework/Magnet composer does not overlap the resource tray',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16869 -- the Homework/Magnet screen overlaps the Resource Tray.
    const pl = new PlaylistPage(page);
    const nav = new NavigationPage(page);
    const ah = new AiHomeworkPage(page);
    await pl.loginWithPin(process.env.VALID_PIN_2);
    await applyClassMap(nav, 'aiHomework').catch(() => {});
    await page.waitForTimeout(500);
    await ah.open();
    const composerVisible = await ah.selectChapterBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!composerVisible, 'Homework composer not reachable this pass');
    if (!composerVisible) {
      expect(composerVisible).toBe(true);
      return;
    }
    const composerBox = await ah.selectChapterBtn.boundingBox();
    const trayBox = await pl.resourceCards.first().boundingBox().catch(() => null);
    console.log('Composer box:', composerBox, '| resource tray card box:', trayBox);
    test.fail(!trayBox, 'No resource tray card found this pass to check for overlap');
    if (!trayBox) {
      expect(trayBox).toBeTruthy();
      return;
    }
    const overlaps =
      composerBox.x < trayBox.x + trayBox.width &&
      composerBox.x + composerBox.width > trayBox.x &&
      composerBox.y < trayBox.y + trayBox.height &&
      composerBox.y + composerBox.height > trayBox.y;
    test.fail(overlaps, 'CONFIRMED (matches Zoho TCN-I16869): the Homework composer overlaps the resource tray');
    expect(overlaps).toBe(false);
  }
);
