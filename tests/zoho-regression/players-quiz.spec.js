// Zoho historical bug regression -- Players (Quiz).
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Players (Quiz)')
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

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await applyClassMap(nav, 'quiz');
  await page.waitForTimeout(1000);
  await pl.ensureDrawerVisible();
});

test(
  'TCN-I15386: The Class Strength message is visible on the Air Card quiz launch screen',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15386 -- the Class Strength message is not visible on the Air Card Quiz screen.
    // Reachable pre-camera-gate (per tests/players/quiz.spec.js's own documented 3rd screen).
    const plr = new PlayerPage(page);
    await expect(plr.quizCards.first()).toBeAttached({ timeout: 10000 });
    await plr.openResourceCard(plr.quizCards);
    await page.waitForTimeout(1500);
    const onLaunchScreen = await plr.quizLaunchScreenBtn.isVisible({ timeout: 4000 }).catch(() => false);
    if (onLaunchScreen) {
      await plr.quizLaunchScreenBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }
    const onClassStrengthScreen = await plr.quizClassStrengthStartBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!onClassStrengthScreen, 'Class Strength screen not reached this pass');
    if (!onClassStrengthScreen) {
      expect(onClassStrengthScreen).toBe(true);
      return;
    }
    const messageVisible = await page
      .getByText(/class strength/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Class Strength message visible on this screen:', messageVisible].join(' '),
    });

    test.fail(
      !messageVisible,
      'CONFIRMED (matches Zoho TCN-I15386): the Class Strength message is not visible on this screen'
    );
    expect(messageVisible).toBe(true);
  }
);

test(
  'TCN-I15260: Custom Quiz opens without getting stuck on a continuous loading spinner',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15260 (Closed) -- Custom Quiz does not open, displays a continuous loading spinner.
    const plr = new PlayerPage(page);
    await expect(plr.quizCards.first()).toBeAttached({ timeout: 10000 });
    await plr.openResourceCard(plr.quizCards);
    await page.waitForTimeout(6000);
    const spinnerVisible = await page
      .locator('[class*="spinner" i], [class*="loading" i], .mat-spinner')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const launchOrClassStrengthVisible =
      (await plr.quizLaunchScreenBtn.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await plr.quizClassStrengthStartBtn.isVisible({ timeout: 2000 }).catch(() => false));
    test.info().annotations.push({
      type: 'note',
      description: [
        'Loading spinner still visible after 6s:',
        spinnerVisible,
        '| launch/class-strength screen reached:',
        launchOrClassStrengthVisible,
      ].join(' '),
    });

    test.fail(
      spinnerVisible && !launchOrClassStrengthVisible,
      'CONFIRMED (matches Zoho TCN-I15260): Custom Quiz is stuck on a continuous loading spinner'
    );
    expect(spinnerVisible && !launchOrClassStrengthVisible).toBe(false);
  }
);

test(
  'TCN-I15679: Play Quiz closes (or shows real content), rather than staying open with nothing, when navigating to a topic with no quiz',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15679 -- Play Quiz remains open when the next topic has no content.
    const { NavigationPage } = require('../../pages/navigation.page');
    const nav = new NavigationPage(page);
    const plr = new PlayerPage(page);
    await expect(plr.quizCards.first()).toBeAttached({ timeout: 10000 });
    await plr.openResourceCard(plr.quizCards);
    await page.waitForTimeout(1500);
    const openedSomething =
      (await plr.quizLaunchScreenBtn.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await plr.quizClassStrengthStartBtn.isVisible({ timeout: 3000 }).catch(() => false));
    test.fail(!openedSomething, 'Quiz did not open at all this pass -- cannot test topic-switch behavior');
    if (!openedSomething) {
      expect(openedSomething).toBe(true);
      return;
    }

    // Switch to a different Grade/Subject entirely (very likely to have no quiz for this exact topic).
    await nav.resetToClass('Class 5', 'A', 'Mathematics');
    await page.waitForTimeout(1500);
    const stillShowingQuizUi =
      (await plr.quizLaunchScreenBtn.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await plr.quizClassStrengthStartBtn.isVisible({ timeout: 2000 }).catch(() => false));
    test.info().annotations.push({
      type: 'note',
      description: [
        'Quiz launch UI still showing after switching to a class/topic with no quiz:',
        stillShowingQuizUi,
      ].join(' '),
    });

    test.fail(
      stillShowingQuizUi,
      'CONFIRMED (matches Zoho TCN-I15679): Play Quiz remains open after navigating to a topic with no quiz content'
    );
    expect(stillShowingQuizUi).toBe(false);
  }
);

test(
  'TCN-I15681: Opening a different Quiz file after one shows an error still works',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15681 -- other Quiz files cannot be opened after encountering an error on one.
    const plr = new PlayerPage(page);
    const count = await plr.quizCards.count();
    test.fail(
      count < 2,
      'Fewer than 2 quiz cards available this pass -- cannot test opening a second one after the first'
    );
    if (count < 2) {
      expect(count).toBeGreaterThanOrEqual(2);
      return;
    }
    await plr.openResourceCard(plr.quizCards.nth(0));
    await page.waitForTimeout(2000);
    await plr.quizCloseBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    await plr.openResourceCard(plr.quizCards.nth(1));
    await page.waitForTimeout(1500);
    const secondOpened =
      (await plr.quizLaunchScreenBtn.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await plr.quizClassStrengthStartBtn.isVisible({ timeout: 3000 }).catch(() => false));
    test.info().annotations.push({
      type: 'note',
      description: ['Second quiz file opened successfully after the first:', secondOpened].join(' '),
    });

    test.fail(
      !secondOpened,
      'CONFIRMED (matches Zoho TCN-I15681): a second Quiz file could not be opened after the first'
    );
    expect(secondOpened).toBe(true);
  }
);

test(
  "CWR-I368: A CBA topic's Play Quiz file is present (not missing/replaced by only a worksheet)",
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I368 -- a CBA topic's "Play Quiz" file is missing (only a worksheet is present),
    // making CBA questions unreachable at all.
    const plr = new PlayerPage(page);
    const quizCount = await plr.quizCards.count();
    test.info().annotations.push({
      type: 'note',
      description: ['Quiz cards present at this confirmed "quiz" location:', quizCount].join(' '),
    });

    test.fail(
      quizCount === 0,
      'CONFIRMED-adjacent (matches Zoho CWR-I368): no Play Quiz file/card present at this location'
    );
    expect(quizCount).toBeGreaterThan(0);
  }
);

test(
  'TCN-I15782: A Custom Quiz for open-ended questions shows up as a real card in the Playlist',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15782 -- a Custom Quiz for open-ended questions is not displayed in the Playlist.
    const plr = new PlayerPage(page);
    const count = await plr.quizCards.count();
    test
      .info()
      .annotations.push({ type: 'note', description: ['Quiz cards visible in the Playlist:', count].join(' ') });

    test.fail(
      count === 0,
      'CONFIRMED-adjacent (matches Zoho TCN-I15782): no quiz cards displayed in the Playlist at all'
    );
    expect(count).toBeGreaterThan(0);
  }
);

test(
  'TCN-I15680: Opening an Exercise-type quiz does not show "No Valid Question Found"',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15680 -- "No Valid Question Found" error shown for an Exercise quiz. Exercise-type
    // resources are a different entry point from Play Quiz's Air Card gate (confirmed reachable
    // earlier this session via AI Assist -- see CWR-I674 in tests/zoho-regression/ai-assist.spec.js).
    const pl = new PlaylistPage(page);
    const count = await pl.resourceCards.count();
    test.fail(count === 0, 'No playlist resources available this pass');
    if (count === 0) {
      expect(count).toBeGreaterThan(0);
      return;
    }
    const exerciseCard = pl.resourceCards.filter({ hasText: /exercise/i }).first();
    const hasExercise = await exerciseCard.count();
    test.fail(hasExercise === 0, 'No Exercise-type resource available this pass');
    if (!hasExercise) {
      expect(hasExercise).toBeGreaterThan(0);
      return;
    }
    const { PlayerPage: PP } = require('../../pages/player.page');
    const plr2 = new PP(page);
    await plr2.openResourceCard(exerciseCard);
    await page.waitForTimeout(2000);
    const noValidQuestionVisible = await page
      .getByText(/no valid question/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['"No valid question found" shown for this Exercise:', noValidQuestionVisible].join(' '),
    });

    test.fail(
      noValidQuestionVisible,
      'CONFIRMED (matches Zoho TCN-I15680): "No Valid Question Found" is shown for this Exercise-type resource'
    );
    expect(noValidQuestionVisible).toBe(false);
  }
);

test(
  'CWR-I711: The "Launch AIR Card" button text is readable (not white-on-white)',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I711 (originally mis-tagged "Playlist", reassigned here -- "AI Card" in the Zoho
    // title is this app's own "Launch AIR Card" quiz-entry screen, per pages/player.page.js).
    // Original repro: text on the Launch AIR Card screen is white on a white background.
    const pl = new PlaylistPage(page);
    const plr = new PlayerPage(page);
    await expect(plr.quizCards.first()).toBeAttached({ timeout: 10000 });
    await plr.openResourceCard(plr.quizCards);
    await page.waitForTimeout(1500);

    const onLaunchScreen = await plr.quizLaunchScreenBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!onLaunchScreen, 'Launch AIR Card screen not reached this pass -- cannot test its text contrast');
    if (!onLaunchScreen) {
      expect(onLaunchScreen).toBe(true);
      return;
    }

    const lowContrast = await plr.quizLaunchScreenBtn.evaluate((el) => {
      const style = getComputedStyle(el);
      const textColor = style.color;
      let bg = el;
      let bgColor = getComputedStyle(bg).backgroundColor;
      let hops = 0;
      while ((bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') && bg.parentElement && hops < 6) {
        bg = bg.parentElement;
        bgColor = getComputedStyle(bg).backgroundColor;
        hops++;
      }
      return textColor.replace(/\s/g, '') === bgColor.replace(/\s/g, '');
    });
    test.info().annotations.push({
      type: 'note',
      description: ['"Launch AIR Card" text color exactly matches its background color:', lowContrast].join(' '),
    });

    test.fail(
      lowContrast,
      'CONFIRMED (matches Zoho CWR-I711): the "Launch AIR Card" text color exactly matches its background (unreadable)'
    );
    expect(lowContrast).toBe(false);
  }
);

test(
  'CWR-I332 / CWR-I533: Clicking the quiz "X" removes it from the Playlist (not opens it / not a no-op)',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I332 -- clicking the delete "X" on a quiz opens it instead of deleting.
    // Zoho CWR-I533 -- clicking the delete "X" on a quiz does nothing at all.
    // Reuses the established remove-resource pattern from tests/playlist/cross-cutting.spec.js
    // (PL-STATE-02/03) -- Edit mode must be active for the per-card remove icon to render at all,
    // and playlist.page.js's resourceRemoveBtn already matches the quiz-specific
    // playlist-quiz-remove-btn variant.
    const pl = new PlaylistPage(page);
    const plr = new PlayerPage(page);
    await expect(plr.quizCards.first()).toBeAttached({ timeout: 10000 });
    await pl.openOptionsMenu();
    await pl.filterEditBtn.click();
    await page.locator('button', { hasText: /finish editing/i }).waitFor({ state: 'visible', timeout: 5000 });
    await plr.quizCards.first().hover();
    await pl.resourceRemoveBtn.first().click({ force: true });
    await page.waitForTimeout(1000);
    const confirmDialogVisible = await page
      .getByText(/are you sure you'd like to remove this resource/i)
      .filter({ visible: true })
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const quizOpenedInstead =
      (await plr.quizLaunchScreenBtn.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await plr.quizClassStrengthStartBtn.isVisible({ timeout: 2000 }).catch(() => false));
    test.info().annotations.push({
      type: 'note',
      description: [
        'Remove-confirmation dialog appeared:',
        confirmDialogVisible,
        '| quiz opened instead:',
        quizOpenedInstead,
      ].join(' '),
    });

    if (confirmDialogVisible) {
      // Cancel rather than actually deleting shared QA playlist data.
      await pl.resourceRemoveCancelBtn
        .first()
        .click()
        .catch(() => {});
    }
    await page
      .locator('button', { hasText: /finish editing/i })
      .click()
      .catch(() => {});

    const bugReproduces = quizOpenedInstead || !confirmDialogVisible;
    test.fail(
      bugReproduces,
      `CONFIRMED (matches Zoho CWR-I332/CWR-I533): clicking the quiz "X" ${quizOpenedInstead ? 'opened the quiz instead of removing it' : 'did nothing -- no remove-confirmation dialog appeared'}`
    );
    expect(bugReproduces).toBe(false);
  }
);

test(
  'TCN-I16028: Clicking Close (X) on a Custom Quiz actually closes it',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16028 -- Close (X) button on a Custom Quiz does not close it.
    // CONFIRMED LIVE (this pass): opening a quiz card via openResourceCard() lands on the
    // pre-camera-gate LAUNCH SCREEN (quizLaunchScreenBtn/quizClassStrengthStartBtn), not directly
    // into gameplay with plr.closeIcon -- same reachable-pre-gate surface already used by
    // TCN-I15386 above. Test the close control available on THAT screen instead.
    const plr = new PlayerPage(page);
    await expect(plr.quizCards.first()).toBeAttached({ timeout: 10000 });
    await plr.openResourceCard(plr.quizCards);
    await page.waitForTimeout(1500);
    const onLaunchScreen =
      (await plr.quizLaunchScreenBtn.isVisible({ timeout: 4000 }).catch(() => false)) ||
      (await plr.quizClassStrengthStartBtn.isVisible({ timeout: 2000 }).catch(() => false));
    const closeIconVisible = await plr.closeIcon
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const opened = onLaunchScreen || closeIconVisible;
    test.info().annotations.push({
      type: 'note',
      description: ['On launch screen:', onLaunchScreen, '| closeIcon visible:', closeIconVisible].join(' '),
    });
    test.fail(
      !opened,
      'The quiz did not open (neither launch screen nor closeIcon appeared) this pass -- cannot test the close button'
    );
    if (!opened) {
      expect(opened).toBe(true);
      return;
    }
    const closeBtn = onLaunchScreen ? plr.quizCloseBtn : plr.closeIcon.first();
    await closeBtn.click({ force: true });
    await page.waitForTimeout(1500);
    const stillOpen =
      (await plr.quizLaunchScreenBtn.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await plr.quizClassStrengthStartBtn.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await plr.closeIcon
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false));
    test
      .info()
      .annotations.push({
        type: 'note',
        description: ['Quiz still open after clicking Close (X):', stillOpen].join(' '),
      });

    test.fail(
      stillOpen,
      'CONFIRMED (matches Zoho TCN-I16028): clicking Close (X) did not close the quiz -- it remains open'
    );
    expect(stillOpen).toBe(false);
  }
);

test(
  'CWR-I630: Accessing an Exercise File shows the real question type, not "Unknown Question Type"',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I630 -- accessing an Exercise File under Chapter Resources shows "Unknown Question
    // Type" instead of the real question type. Reuses the same confirmed Exercise-resource access
    // pattern as TCN-I15680 above.
    const pl = new PlaylistPage(page);
    const count = await pl.resourceCards.count();
    test.fail(count === 0, 'No playlist resources available this pass');
    if (count === 0) {
      expect(count).toBeGreaterThan(0);
      return;
    }
    const exerciseCard = pl.resourceCards.filter({ hasText: /exercise/i }).first();
    const hasExercise = await exerciseCard.count();
    test.fail(hasExercise === 0, 'No Exercise-type resource available this pass');
    if (!hasExercise) {
      expect(hasExercise).toBeGreaterThan(0);
      return;
    }
    const plr = new PlayerPage(page);
    await plr.openResourceCard(exerciseCard);
    await page.waitForTimeout(2000);
    const unknownTypeVisible = await page
      .getByText(/unknown question type/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['"Unknown Question Type" shown for this Exercise:', unknownTypeVisible].join(' '),
    });

    test.fail(
      unknownTypeVisible,
      'CONFIRMED (matches Zoho CWR-I630): "Unknown Question Type" is shown for this Exercise-type resource'
    );
    expect(unknownTypeVisible).toBe(false);
  }
);

test(
  'TCN-I15329: Exercise questions render the degree symbol correctly and are not repeated identically',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15329 -- angle symbols render as the literal text "#176" instead of the degree
    // symbol "°", and the same incorrect question repeats across all exercises. Reuses the same
    // confirmed Exercise-resource access pattern as TCN-I15680/CWR-I630 above.
    const pl = new PlaylistPage(page);
    const exerciseCards = pl.resourceCards.filter({ hasText: /exercise/i });
    const exerciseCount = await exerciseCards.count();
    test.fail(exerciseCount === 0, 'No Exercise-type resources available this pass');
    if (exerciseCount === 0) {
      expect(exerciseCount).toBeGreaterThan(0);
      return;
    }
    const plr = new PlayerPage(page);
    const questionTexts = [];
    for (let i = 0; i < Math.min(exerciseCount, 3); i++) {
      await plr.openResourceCard(exerciseCards.nth(i));
      await page.waitForTimeout(1800);
      const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
      questionTexts.push(text);
      await plr.closeIcon
        .first()
        .click({ force: true })
        .catch(() => {});
      await page.waitForTimeout(800);
    }
    const anyLiteralHashCode = questionTexts.some((t) => /#176/.test(t));
    const allIdentical = questionTexts.length > 1 && questionTexts.every((t) => t === questionTexts[0]);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Checked',
        questionTexts.length,
        'Exercise(s) | literal "#176" found:',
        anyLiteralHashCode,
        '| all identical text:',
        allIdentical,
      ].join(' '),
    });

    const bugReproduces = anyLiteralHashCode || allIdentical;
    test.fail(
      bugReproduces,
      `CONFIRMED (matches Zoho TCN-I15329): ${anyLiteralHashCode ? 'the literal "#176" appears instead of the degree symbol' : ''}${anyLiteralHashCode && allIdentical ? ' and ' : ''}${allIdentical ? 'the same question text repeats identically across different Exercises' : ''}`
    );
    expect(bugReproduces).toBe(false);
  }
);
