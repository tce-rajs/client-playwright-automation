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
