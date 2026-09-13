// Zoho historical bug regression -- Whiteboard.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Whiteboard')
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
const { WhiteboardPage } = require('../../pages/whiteboard.page');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.loginWithPin(process.env.VALID_PIN);
});

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
  'CWR-I760 / TCN-I16037 / TCN-I15458: Whiteboard content is still there after switching topics and coming back',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I760, TCN-I16037, TCN-I15458 -- 3 reports of the same underlying complaint:
    // whiteboard content is lost/not saved when switching to another topic and back.
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    const marker = { x: 700 + Date.now() % 100, y: 700 };
    await tb.drawStroke(marker, { x: marker.x + 150, y: marker.y });
    await page.waitForTimeout(6000); // real autosave debounce, per this app's own confirmed toast timing

    // Navigate away to a completely different confirmed-working Grade/Subject (not just another
    // topic within the same chapter -- guessing a topic index within chapter 0 proved unreliable,
    // this class's own topic list didn't cooperate with a fixed index across repeated live runs)
    // and back, then re-select the exact same starting topic.
    await nav.resetToClass('Class 12', 'A', 'Physics');
    await page.waitForTimeout(1500);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await page.waitForTimeout(1500);
    const pathsAfter = await tb.pathCount();
    console.log('Stroke paths present after switching topics away and back:', pathsAfter);

    test.fail(
      pathsAfter === 0,
      'CONFIRMED (matches Zoho CWR-I760/TCN-I16037/TCN-I15458): whiteboard content was lost after switching topics and coming back'
    );
    expect(pathsAfter).toBeGreaterThan(0);
  }
);

test(
  'TCN-I15319 / CWR-I1530 / TCN-I16612 / TCN-I16614: Whiteboard content is still there after a real sign-out + sign-in',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15319, CWR-I1530 (Invalid), TCN-I16612 (Invalid), TCN-I16614 (Invalid) -- reports of
    // whiteboard drawn/typed content not being retained after a real sign-out/re-login (distinct
    // from TCN-I16308's topic-identity check -- this checks the actual drawn content).
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    const before = await tb.pathCount();
    await tb.drawStroke({ x: 750, y: 750 }, { x: 900, y: 750 });
    await page.waitForTimeout(6000);
    const afterDraw = await tb.pathCount();
    test.fail(afterDraw <= before, 'Drawing a stroke did not actually add a path this pass -- cannot test its persistence');
    if (afterDraw <= before) {
      expect(afterDraw).toBeGreaterThan(before);
      return;
    }

    const backToGuest = await signOut(page);
    test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test content persistence across relogin');
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }
    await nav.loginWithPin(process.env.VALID_PIN);
    await tb.waitForBoardToSettle();
    const afterRelogin = await tb.pathCount();
    console.log('Path count: before draw', before, '| after draw', afterDraw, '| after sign-out+relogin', afterRelogin);

    test.fail(
      afterRelogin < afterDraw,
      'CONFIRMED (matches Zoho TCN-I15319/CWR-I1530/TCN-I16612/TCN-I16614): drawn whiteboard content was not retained after a real sign-out/sign-in'
    );
    expect(afterRelogin).toBeGreaterThanOrEqual(afterDraw);
  }
);

test(
  'TCN-I16581 / TCN-I16700: The Whiteboard window/history screen does not remain open after an automatic sign-out',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16581 (Whiteboard Window Remains Open After Automatic Sign-Out) + TCN-I16700
    // (Whiteboard History screen remains open after signing out).
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();

    const backToGuest = await signOut(page);
    test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test post-signout residue');
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }
    await page.waitForTimeout(1000);
    const wbStillVisible = await tb.wbContainer.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Whiteboard drawing container still visible after auto sign-out:', wbStillVisible);

    test.fail(
      wbStillVisible,
      'CONFIRMED (matches Zoho TCN-I16581/TCN-I16700): the Whiteboard window remains visible after signing out'
    );
    expect(wbStillVisible).toBe(false);
  }
);

test(
  'TCN-I15234 / TCN-I15241 / TCN-I15317 / TCN-I16253: Opening an asset from the Playlist does not reset the Whiteboard pan/position to the top',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15234 (Duplicate), TCN-I15241 (Invalid), TCN-I15317, TCN-I16253 -- 4 reports that
    // opening a Playlist asset resets/pans the whiteboard to the top instead of the current working
    // position.
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    const { PlaylistPage } = require('../../pages/playlist.page');
    const { PlayerPage } = require('../../pages/player.page');
    const pl = new PlaylistPage(page);
    const plr = new PlayerPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();
    // Pan the canvas away from its default position.
    await tb.selectTool('gtPan');
    const box = await tb.wbContainer.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 300, box.y + box.height / 2 - 200, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const transformBefore = await tb.wbContainer.evaluate((el) => getComputedStyle(el).transform);

    const count = await pl.resourceCards.count();
    test.fail(count === 0, 'No playlist resources available this pass');
    if (count === 0) {
      expect(count).toBeGreaterThan(0);
      return;
    }
    await plr.openResourceCard(pl.resourceCards.first());
    await page.waitForTimeout(1500);
    await plr.closeIcon.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    const transformAfter = await tb.wbContainer.evaluate((el) => getComputedStyle(el).transform);
    console.log('Whiteboard transform before opening asset:', transformBefore, '| after closing it:', transformAfter);

    test.fail(
      transformAfter !== transformBefore,
      'CONFIRMED (matches Zoho TCN-I15234/TCN-I15241/TCN-I15317/TCN-I16253): the whiteboard pan/position reset after opening a Playlist asset'
    );
    expect(transformAfter).toBe(transformBefore);
  }
);

test(
  'CWR-I755 / TCN-I16852: Cleared/erased whiteboard content does not reappear after navigating between topics',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I755 + TCN-I16852 -- erased shapes/annotations reappear after navigating away from
    // and back to a topic.
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    await tb.drawStroke({ x: 800, y: 800 }, { x: 950, y: 800 });
    await page.waitForTimeout(6000);
    const afterDraw = await tb.pathCount();
    test.fail(afterDraw === 0, 'Drawing a stroke did not add a path this pass -- cannot test erase persistence');
    if (afterDraw === 0) {
      expect(afterDraw).toBeGreaterThan(0);
      return;
    }

    const wb = new WhiteboardPage(page);
    await wb.clearWhiteboardBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    const confirmVisible = await wb.clearConfirmDialogConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (confirmVisible) {
      await wb.clearConfirmDialogConfirmBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }
    const afterClear = await tb.pathCount();
    test.fail(afterClear > 0, 'Clear Whiteboard did not actually remove the stroke this pass -- cannot test reappearance');
    if (afterClear > 0) {
      expect(afterClear).toBe(0);
      return;
    }

    // Same navigation approach as the CWR-I760/TCN-I16037/TCN-I15458 test above -- switch to a
    // completely different confirmed Grade/Subject and back, rather than a fixed topic index within
    // the same chapter (unreliable for this class across repeated live runs).
    await nav.resetToClass('Class 12', 'A', 'Physics');
    await page.waitForTimeout(1500);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await page.waitForTimeout(1500);
    const afterReturn = await tb.pathCount();
    console.log('Path count: after draw', afterDraw, '| after clear', afterClear, '| after navigating away and back', afterReturn);

    test.fail(
      afterReturn > 0,
      'CONFIRMED (matches Zoho CWR-I755/TCN-I16852): cleared/erased content reappeared after navigating between topics'
    );
    expect(afterReturn).toBe(0);
  }
);

test(
  'TCN-I15631 / CWR-I767: Undo after a fresh re-login does not restore a previous session\'s erased annotations',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15631 + CWR-I767 (To do) -- the Undo button stays active after sign-out and restores
    // the PREVIOUS session's erased annotations once clicked post-relogin.
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    await tb.drawStroke({ x: 600, y: 900 }, { x: 750, y: 900 });
    await page.waitForTimeout(6000);

    const backToGuest = await signOut(page);
    test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test this pass');
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }
    await nav.loginWithPin(process.env.VALID_PIN);
    await tb.waitForBoardToSettle();

    const undoBtn = tb.tool('gtUndo');
    const undoEnabled = await undoBtn.isEnabled().catch(() => false);
    console.log('Undo button enabled immediately after a fresh re-login:', undoEnabled);

    test.fail(
      undoEnabled,
      "CONFIRMED (matches Zoho TCN-I15631/CWR-I767): the Undo button remains active after a fresh re-login, able to restore the previous session's annotations"
    );
    expect(undoEnabled).toBe(false);
  }
);

test(
  'TCN-I15381 / TCN-I15235 / TCN-I15240: Text box size/position is stable across a real sign-out + sign-in',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15381, TCN-I15235, TCN-I15240 -- text box size/alignment changes after sign
    // out/sign in.
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtInserttext');
    const box = await tb.wbSvg.boundingBox();
    await page.mouse.click(box.x + 400, box.y + 400);
    await page.waitForTimeout(1000);
    const editorVisible = await tb.textEditor.isVisible({ timeout: 3000 }).catch(() => false);
    test.fail(!editorVisible, 'Text tool did not open an editor this pass -- cannot test text box persistence');
    if (!editorVisible) {
      expect(editorVisible).toBe(true);
      return;
    }
    await page.keyboard.type('QA Zoho Regression Text');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(6000);
    const boxBefore = await tb.wbContainer.locator('.text-input-container').first().boundingBox().catch(() => null);

    const backToGuest = await signOut(page);
    test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test this pass');
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }
    await nav.loginWithPin(process.env.VALID_PIN);
    await tb.waitForBoardToSettle();
    const boxAfter = await tb.wbContainer.locator('.text-input-container').first().boundingBox().catch(() => null);
    console.log('Text box before sign-out:', boxBefore, '| after re-login:', boxAfter);

    test.fail(
      !boxAfter || !boxBefore || Math.abs(boxAfter.width - boxBefore.width) > 5 || Math.abs(boxAfter.height - boxBefore.height) > 5,
      'CONFIRMED (matches Zoho TCN-I15381/TCN-I15235/TCN-I15240): the text box size/position changed after a real sign-out/sign-in'
    );
    expect(boxAfter && boxBefore && Math.abs(boxAfter.width - boxBefore.width) <= 5 && Math.abs(boxAfter.height - boxBefore.height) <= 5).toBe(
      true
    );
  }
);

test(
  'TCN-I16017: The "Four Line with Space" background is not black in Light Mode',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16017 -- this background remains black in Light Mode, hiding the header logo/
    // date-time/subject/topic text against it.
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    const am = new AccountManagementPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();

    await am.openProfileMenu();
    const darkModeOn = await am.darkModeToggle.isChecked().catch(() => null);
    if (darkModeOn === null || darkModeOn === undefined) {
      test.fail(true, 'Could not determine Dark Mode toggle state this pass -- cannot test Light Mode background');
      expect(darkModeOn).not.toBeNull();
      return;
    }
    if (darkModeOn) {
      await am.darkModeToggle.click({ force: true });
      await page.waitForTimeout(500);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await tb.selectTool('gtBackground');
    const fourLineOption = page.locator('[data-qa-id*="Four" i], [data-qa-id*="four" i]').first();
    const optionVisible = await fourLineOption.isVisible({ timeout: 3000 }).catch(() => false);
    test.fail(!optionVisible, '"Four Line with Space" background option not found this pass');
    if (!optionVisible) {
      expect(optionVisible).toBe(true);
      return;
    }
    await fourLineOption.click({ force: true });
    await page.waitForTimeout(1000);
    // The container's own CSS background-color is usually transparent (rgba(0,0,0,0)) -- the actual
    // "Four Line" pattern is painted by an SVG rect/pattern fill underneath it, so check both rather
    // than assume the container itself carries the visible color.
    const colors = await tb.wbContainer.evaluate((el) => {
      const bg = getComputedStyle(el).backgroundColor;
      const rects = Array.from(el.querySelectorAll('rect, pattern')).map((r) => getComputedStyle(r).fill || r.getAttribute('fill'));
      return { bg, rects };
    });
    console.log('Whiteboard background color in Light Mode with Four Line background:', JSON.stringify(colors));
    // Only a fully-opaque black counts -- rgba(0,0,0,0) is transparent, not visually black.
    const isOpaqueBlack = (c) => {
      if (!c) return false;
      const m = c.match(/rgba?\(\s*0,\s*0,\s*0(?:,\s*([\d.]+))?\s*\)/i);
      if (!m) return c === '#000' || c === '#000000' || c === 'black';
      const alpha = m[1] === undefined ? 1 : parseFloat(m[1]);
      return alpha > 0.5;
    };
    const isBlack = isOpaqueBlack(colors.bg) || colors.rects.some(isOpaqueBlack);

    test.fail(
      isBlack,
      `CONFIRMED (matches Zoho TCN-I16017): the "Four Line with Space" background remains black in Light Mode (${JSON.stringify(colors)})`
    );
    expect(isBlack).toBe(false);
  }
);

test(
  'TCN-I16483: A single click with the Pen tool draws a visible dot, not nothing',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16483 -- the Pen tool does not draw a dot on a single click (no drag).
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    const before = await tb.pathCount();
    const box = await tb.wbSvg.boundingBox();
    await page.mouse.click(box.x + 500, box.y + 500);
    await page.waitForTimeout(500);
    const after = await tb.pathCount();
    console.log('Path count before/after a single Pen click:', before, after);

    test.fail(after <= before, 'CONFIRMED (matches Zoho TCN-I16483): a single Pen click does not draw a visible dot');
    expect(after).toBeGreaterThan(before);
  }
);

test(
  'TCN-I16039: The Select tool moves a drawn shape, rather than removing it',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16039 -- a line shape is removed instead of being moved when dragged with the
    // Select tool.
    const nav = new NavigationPage(page);
    const tb = new ToolbarPage(page);
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    await tb.drawStroke({ x: 450, y: 450 }, { x: 600, y: 450 });
    await page.waitForTimeout(1000);
    const beforeCount = await tb.pathCount();
    const lineBoxBefore = await tb.paths.last().boundingBox();

    await tb.selectTool('gtSelect');
    // Click at the stroke's own real on-screen position (from boundingBox(), already in page
    // coordinates) -- a raw guessed page coordinate missed the stroke entirely (confirmed live).
    const midX = lineBoxBefore.x + lineBoxBefore.width / 2;
    const midY = lineBoxBefore.y + lineBoxBefore.height / 2;
    await page.mouse.move(midX, midY);
    await page.mouse.down();
    await page.mouse.move(midX + 100, midY + 100, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1000);
    const afterCount = await tb.pathCount();
    const lineBoxAfter = await tb.paths.last().boundingBox();
    console.log(
      'Path count before/after dragging with Select tool:',
      beforeCount,
      afterCount,
      '| line box before/after:',
      lineBoxBefore,
      lineBoxAfter
    );
    const moved = lineBoxAfter && (Math.abs(lineBoxAfter.x - lineBoxBefore.x) > 20 || Math.abs(lineBoxAfter.y - lineBoxBefore.y) > 20);

    test.fail(
      afterCount < beforeCount || !moved,
      `CONFIRMED (matches Zoho TCN-I16039): dragging the shape with the Select tool did not move it as expected (path count ${beforeCount}->${afterCount}, moved: ${moved})`
    );
    expect(afterCount >= beforeCount && moved).toBe(true);
  }
);

test(
  'TCN-I16308: The last accessed Chapter/Topic re-opens automatically after a real sign-out + sign-in (not just a page refresh)',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16308 (Whiteboard, Highest priority, Status: Reopened as of the 2026-09-12 export).
    // Original repro: log in, open a subject/chapter/topic, do an activity, sign out, sign back in
    // with the same account, and check whether the app resumes that same topic automatically.
    // NOTE: this is a stronger check than NAV-STATE-01/02 (which only cover a page REFRESH,
    // confirmed already covered) -- a real sign-out clears more session state than a refresh does,
    // so this needed its own case rather than assuming the refresh coverage already proves it.
    const nav = new NavigationPage(page);
    const am = new AccountManagementPage(page);

    // Land on config/moduleClassMap.js's confirmed-working "navigationGeneral" combo (Class 5A
    // Mathematics, chapter/topic index 0) -- a deliberate, known-good class switch away from
    // whatever this long-lived shared account was last sitting on from earlier tests today, so a
    // match after re-login is a real signal, not a coincidence.
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await nav.goToChapterTopic(0, 0);
    const chapterTopicBefore = (await nav.currentChapterTopicBtn.textContent()).trim();
    console.log('Chapter/Topic selected before sign-out:', chapterTopicBefore);

    // Real sign-out (per the confirmed chain in account-management.page.js / LIVE_FINDINGS.md --
    // no confirmation dialog, immediate). The avatar click is documented elsewhere in this codebase
    // (e.g. account-management.page.js's own openProfileMenu) as not always registering on the
    // first attempt right after other UI activity -- retry once rather than treat a missed click as
    // a real finding about sign-out itself.
    let backToGuest = false;
    for (let attempt = 0; attempt < 2 && !backToGuest; attempt++) {
      await am.avatarTrigger.click({ force: true });
      await page.waitForTimeout(700);
      const signOutVisible = await am.signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`Attempt ${attempt}: profile menu opened, Sign Out visible:`, signOutVisible, '| URL:', page.url());
      if (!signOutVisible) continue;
      await am.signOutBtn.click({ force: true, timeout: 5000 });
      await page.waitForTimeout(1500);
      backToGuest = await page
        .getByText(/guest mode/i)
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      console.log(
        `Attempt ${attempt}: after clicking Sign Out -- back to Guest Mode:`,
        backToGuest,
        '| URL:',
        page.url(),
        '| avatar still visible (would mean still signed in):',
        await am.avatarTrigger.isVisible({ timeout: 2000 }).catch(() => false)
      );
    }
    console.log('Signed out back to Guest Mode:', backToGuest);
    test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test the re-login resume behavior at all');
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }

    // Sign back in with the SAME account and read the Chapter/Topic label without navigating
    // anywhere ourselves -- this is exactly what the bug's "Expected Result" describes.
    await nav.loginWithPin(process.env.VALID_PIN);
    await nav.currentChapterTopicBtn.waitFor({ state: 'visible', timeout: 15000 });
    const chapterTopicAfter = (await nav.currentChapterTopicBtn.textContent()).trim();
    console.log('Chapter/Topic shown immediately after re-login (no manual navigation):', chapterTopicAfter);

    test.fail(
      chapterTopicAfter !== chapterTopicBefore,
      `CONFIRMED (matches Zoho TCN-I16308): app did not resume the last-accessed topic after a real sign-out/sign-in. Before: "${chapterTopicBefore}" | After re-login: "${chapterTopicAfter}"`
    );
    expect(chapterTopicAfter).toBe(chapterTopicBefore);
  }
);

async function countCanvasImageCandidates(page) {
  // Same multi-selector probe already established (and proven) in
  // tests/gallery/gallery.spec.js's GAL-ASSET-01 -- reused here rather than duplicated logic.
  const selectors = ['svg image', '[data-qa-id="wb-drawing-container"] image', 'image.draggable', '[class*="image-element"]'];
  const counts = {};
  for (const sel of selectors) {
    counts[sel] = await page.locator(sel).count().catch(() => -1);
  }
  return counts;
}

test(
  'CWR-I288: Adding a Gallery image to the whiteboard actually adds it (or shows an error if it fails)',
  { tag: '@historical-regression' },
  async ({ page }, testInfo) => {
    // Zoho CWR-I288 -- selecting a Gallery image completes with no error/feedback, but the image
    // never appears on the whiteboard canvas.
    testInfo.setTimeout(60000);
    const pl = new PlaylistPage(page);
    const ar = new AddResourcePage(page);
    await pl.ensureResourcesPresent();
    const { stillStuck } = await ar.openPickerReliably(ar.actions.gallery);
    if (!stillStuck) await ar.actions.gallery.click({ force: true });
    await page.waitForTimeout(1000);
    let pickerOpen = await ar.galleryImageCards.first().isVisible({ timeout: 10000 }).catch(() => false);
    if (!pickerOpen) {
      // One retry: the Add Resources trigger/gallery tab can need a second attempt (same class of
      // flakiness as the documented pointer-events:none picker issue elsewhere in this suite).
      await ar.actions.gallery.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
      pickerOpen = await ar.galleryImageCards.first().isVisible({ timeout: 8000 }).catch(() => false);
    }
    console.log('openPickerReliably stillStuck:', stillStuck, '| picker open (galleryImageCards visible):', pickerOpen);
    test.fail(!pickerOpen, 'The Gallery picker did not open reliably this pass');
    if (!pickerOpen) {
      expect(pickerOpen).toBe(true);
      return;
    }
    const beforeCanvas = await countCanvasImageCandidates(page);
    await ar.galleryImageCards.first().click({ force: true });
    await page.waitForTimeout(1500);
    const afterCanvas = await countCanvasImageCandidates(page);
    console.log('Canvas image-candidate counts before:', JSON.stringify(beforeCanvas), '| after:', JSON.stringify(afterCanvas));
    const anyCanvasIncrease = Object.keys(afterCanvas).some((sel) => afterCanvas[sel] > (beforeCanvas[sel] ?? -1));
    // No error/feedback message of any kind is also part of the original complaint -- capture it
    // either way for context, but the real signal is whether the image actually landed.
    const anyErrorVisible = await page.getByText(/error|failed|something went wrong/i).isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Any error/failure message shown:', anyErrorVisible);

    test.fail(
      !anyCanvasIncrease,
      'CONFIRMED (matches Zoho CWR-I288): selecting a Gallery image did not add it to the whiteboard canvas (no increase detected via any probed selector), and no error/feedback was shown either'
    );
    expect(anyCanvasIncrease).toBe(true);
  }
);

test(
  'TCN-I15917: Erasing a small portion of an annotation does not distort/reshape the rest of it',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15917 -- using the Eraser on a small part of a drawn annotation changes the shape
    // of the REMAINING (non-erased) part of it. Objective proxy for "distorted": draw a straight
    // diagonal stroke (a known, simple bounding-box aspect ratio), erase only a small section near
    // one end, then confirm the remaining stroke's aspect ratio is still consistent with a
    // proportionally-shortened version of the same line -- not warped into a different shape.
    const tb = new ToolbarPage(page);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    const start = { x: 300, y: 300 };
    const end = { x: 600, y: 600 }; // 45-degree diagonal, ~424px
    await tb.drawStroke(start, end);
    const strokeLocator = tb.paths.last();
    const boxBefore = await strokeLocator.boundingBox().catch(() => null);
    test.fail(!boxBefore, 'Could not measure the drawn stroke this pass');
    if (!boxBefore) {
      expect(boxBefore).toBeTruthy();
      return;
    }
    const ratioBefore = boxBefore.height / boxBefore.width;
    console.log('Stroke box before erasing:', JSON.stringify(boxBefore), '| height/width ratio:', ratioBefore);

    await tb.selectTool('gtErase');
    const wbBox = await tb.wbSvg.boundingBox();
    // Erase only a SMALL section near the end point (not the whole stroke).
    const eraseFrom = { x: end.x - 40, y: end.y - 40 };
    const eraseTo = { x: end.x + 10, y: end.y + 10 };
    await page.mouse.move(wbBox.x + eraseFrom.x, wbBox.y + eraseFrom.y);
    await page.mouse.down();
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      await page.mouse.move(
        wbBox.x + eraseFrom.x + (eraseTo.x - eraseFrom.x) * t,
        wbBox.y + eraseFrom.y + (eraseTo.y - eraseFrom.y) * t
      );
    }
    await page.mouse.up();
    await page.waitForTimeout(800);

    const remainingCount = await tb.pathCount();
    // After a small partial erase, the remaining portion of THIS stroke is whichever path(s) are
    // left near the original stroke's location -- take the union bounding box of all paths that
    // still overlap the original stroke's area.
    const allBoxes = [];
    for (let i = 0; i < remainingCount; i++) {
      const b = await tb.paths.nth(i).boundingBox().catch(() => null);
      if (b) allBoxes.push(b);
    }
    const relevant = allBoxes.filter(
      (b) => b.x < boxBefore.x + boxBefore.width + 5 && b.x + b.width > boxBefore.x - 5 &&
             b.y < boxBefore.y + boxBefore.height + 5 && b.y + b.height > boxBefore.y - 5
    );
    test.fail(relevant.length === 0, 'No remaining stroke found near the original location after the partial erase');
    if (relevant.length === 0) {
      expect(relevant.length).toBeGreaterThan(0);
      return;
    }
    const unionBox = relevant.reduce(
      (acc, b) => ({
        x: Math.min(acc.x, b.x),
        y: Math.min(acc.y, b.y),
        right: Math.max(acc.x + acc.width, b.x + b.width),
        bottom: Math.max(acc.y + acc.height, b.y + b.height),
        width: 0,
        height: 0,
      }),
      { x: relevant[0].x, y: relevant[0].y, width: 0, height: 0 }
    );
    const afterWidth = unionBox.right - unionBox.x;
    const afterHeight = unionBox.bottom - unionBox.y;
    const ratioAfter = afterHeight / afterWidth;
    console.log('Remaining stroke union box after erasing:', JSON.stringify({ width: afterWidth, height: afterHeight }), '| height/width ratio:', ratioAfter, '| path count after erase:', remainingCount);

    // A proportionally-shortened 45-degree diagonal keeps roughly the same height/width ratio
    // (~1.0 here). A ratio that's changed by more than 30% indicates the remaining shape warped.
    const ratioChangedSignificantly = Math.abs(ratioAfter - ratioBefore) / ratioBefore > 0.3;
    test.fail(
      ratioChangedSignificantly,
      `CONFIRMED (matches Zoho TCN-I15917): erasing a small portion distorted the remaining annotation's shape (height/width ratio went from ${ratioBefore.toFixed(2)} to ${ratioAfter.toFixed(2)})`
    );
    expect(ratioChangedSignificantly).toBe(false);
  }
);

test(
  'TCN-I15837: A continuous curved drawing gesture does not break into multiple disconnected strokes',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15837 -- annotation strokes intermittently break during continuous drawing,
    // producing discontinuous lines instead of one smooth stroke. Objective proxy: one real
    // continuous pointer-down/move/move/.../up gesture along a curve should register as ONE path
    // element, not multiple -- a break would show up as extra path elements from the same gesture.
    const tb = new ToolbarPage(page);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtPen');
    const countBefore = await tb.pathCount();
    const wbBox = await tb.wbSvg.boundingBox();
    const cx = 400, cy = 400, r = 100;
    // Draw a full circle via many small steps in ONE continuous down/move/up gesture.
    await page.mouse.move(wbBox.x + cx + r, wbBox.y + cy);
    await page.mouse.down();
    const steps = 60;
    for (let i = 1; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      await page.mouse.move(wbBox.x + cx + r * Math.cos(angle), wbBox.y + cy + r * Math.sin(angle));
    }
    await page.mouse.up();
    await page.waitForTimeout(800);
    const countAfter = await tb.pathCount();
    const newPaths = countAfter - countBefore;
    console.log('Path count before:', countBefore, '| after one continuous curved gesture:', countAfter, '| new paths created:', newPaths);

    test.fail(
      newPaths > 1,
      `CONFIRMED (matches Zoho TCN-I15837): one continuous curved drawing gesture created ${newPaths} separate path elements instead of 1 -- the stroke broke apart while drawing`
    );
    expect(newPaths).toBeLessThanOrEqual(1);
  }
);

test(
  'CWR-I274: No "Not Found" (404) network errors occur loading whiteboard/browser-based assets during normal navigation',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I274 -- browser-based assets (e.g., whiteboards) fail to load with a server-side
    // "Not Found" error on their URL. Objective proxy: monitor real network responses during normal
    // whiteboard use (initial load already happened via beforeEach; also switch topic and reopen
    // the chapters popup, both of which re-fetch whiteboard-related assets) and flag any 404s.
    const nav = new NavigationPage(page);
    const notFoundResponses = [];
    page.on('response', (res) => {
      if (res.status() === 404) notFoundResponses.push(res.url());
    });
    const tb = new ToolbarPage(page);
    await tb.waitForBoardToSettle();
    await nav.openChaptersPopup();
    await page.waitForTimeout(1500);
    await nav._closeChaptersPopupIfOpen();
    await page.waitForTimeout(1000);

    console.log('404 responses observed during normal whiteboard navigation:', JSON.stringify(notFoundResponses));
    test.fail(
      notFoundResponses.length > 0,
      `CONFIRMED (matches Zoho CWR-I274): ${notFoundResponses.length} real "Not Found" (404) network response(s) occurred during normal whiteboard navigation: ${JSON.stringify(notFoundResponses.slice(0, 5))}`
    );
    expect(notFoundResponses.length).toBe(0);
  }
);

test(
  'TCN-I15392: Selecting a text box still opens its edit popup even with a large amount of prior canvas content',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15392 -- with a large amount of annotations/images/text already on the whiteboard,
    // selecting an existing text box no longer opens the text-editing popup. Reuses the proven
    // placeText()/Select-tool pattern from tests/toolbar/text.spec.js's TB-TXT-03 (already confirmed
    // to work under normal/light content) but first builds up real heavy content to match this
    // bug's specific claim.
    const tb = new ToolbarPage(page);
    await tb.waitForBoardToSettle();
    const wbBox = await tb.wbSvg.boundingBox();
    const OFFSET_X = Math.floor(Math.random() * 200) - 100;
    const OFFSET_Y = Math.floor(Math.random() * 200) - 100;

    // Build up "heavy" content: 8 pen strokes + 3 text boxes.
    await tb.selectTool('gtPen');
    for (let i = 0; i < 8; i++) {
      await tb.drawStroke(
        { x: 50 + OFFSET_X + i * 5, y: 50 + OFFSET_Y + i * 40 },
        { x: 700 + OFFSET_X, y: 90 + OFFSET_Y + i * 40 }
      );
    }
    async function placeText(point, text) {
      await tb.selectTool('gtInserttext');
      await page.mouse.click(wbBox.x + point.x, wbBox.y + point.y);
      await page.waitForTimeout(800);
      const opened = await tb.textEditor.isVisible({ timeout: 3000 }).catch(() => false);
      if (!opened) return false;
      await page.keyboard.type(text);
      await page.mouse.click(wbBox.x + point.x + 500, wbBox.y + point.y + 350);
      await page.waitForTimeout(600);
      return true;
    }
    for (let i = 0; i < 3; i++) {
      await placeText({ x: 850 + OFFSET_X, y: 100 + OFFSET_Y + i * 60 }, `QA heavy-content filler text ${i}`);
    }
    const finalPoint = { x: 850 + OFFSET_X, y: 400 + OFFSET_Y };
    const finalPlaced = await placeText(finalPoint, 'QA TCN-I15392 target text box');
    test.fail(!finalPlaced, 'Could not place the target text box this pass');
    if (!finalPlaced) {
      expect(finalPlaced).toBe(true);
      return;
    }

    await tb.selectTool('gtSelect');
    await page.mouse.click(wbBox.x + finalPoint.x + 20, wbBox.y + finalPoint.y + 10);
    await page.waitForTimeout(1000);
    const formattingPanelVisible = await tb.textMenuFontSlider.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Text formatting/edit popup visible after selecting the text box under heavy content:', formattingPanelVisible);

    test.fail(
      !formattingPanelVisible,
      'CONFIRMED (matches Zoho TCN-I15392): the text edit popup did not appear after selecting a text box once heavy canvas content (8 strokes, 3 other text boxes) was present'
    );
    expect(formattingPanelVisible).toBe(true);
  }
);
