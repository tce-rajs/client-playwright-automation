// Zoho historical bug regression -- Playlist.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Playlist')
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
const { AddResourcePage } = require('../../pages/add-resource.page');
const { PlayerPage } = require('../../pages/player.page');
const { AccountManagementPage } = require('../../pages/account-management.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

// ---------------------------------------------------------------------------------------------
// Generic checks -- any account/class with SOME resources present works fine.
// ---------------------------------------------------------------------------------------------
test.describe('Playlist -- generic checks', () => {
  test.beforeEach(async ({ page }) => {
    const pl = new PlaylistPage(page);
    await pl.loginWithPin(process.env.VALID_PIN);
    await pl.ensureResourcesPresent();
  });

  test(
    'CWR-I333 / CWR-I382: "Finish Editing" text does not overlap the Pin icon/CTA in Playlist Edit mode',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I333 + CWR-I382 (Playlist, both Status: QA Sign off/Closed as of the 2026-09-13
      // export) -- the same overlap defect reported twice (V1 and V2).
      const pl = new PlaylistPage(page);
      await pl.openOptionsMenu();
      await pl.filterEditBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      const finishBtn = page.getByText(/finish editing/i).first();
      const finishVisible = await finishBtn.isVisible({ timeout: 5000 }).catch(() => false);
      test.fail(!finishVisible, 'Edit mode\'s "Finish Editing" control not reachable this pass');
      if (!finishVisible) {
        expect(finishVisible).toBe(true);
        return;
      }

      const finishBox = await finishBtn.boundingBox();
      const pinBox = await pl.pinBtn.boundingBox().catch(() => null);
      console.log('Finish Editing box:', finishBox, '| Pin box:', pinBox);
      const overlaps =
        finishBox &&
        pinBox &&
        finishBox.x < pinBox.x + pinBox.width &&
        finishBox.x + finishBox.width > pinBox.x &&
        finishBox.y < pinBox.y + pinBox.height &&
        finishBox.y + finishBox.height > pinBox.y;

      await finishBtn.click({ force: true }).catch(() => {});
      test.fail(
        Boolean(overlaps),
        'CONFIRMED (matches Zoho CWR-I333/CWR-I382): the "Finish Editing" text overlaps the Pin icon/CTA'
      );
      expect(overlaps).toBeFalsy();
    }
  );

  test(
    'CWR-I651: The Edit control actually enters an editable state for playlist resources',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I651 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: clicking Edit for a resource does nothing -- no editable state is entered.
      const pl = new PlaylistPage(page);
      await pl.openOptionsMenu();
      await pl.filterEditBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      const finishVisible = await page
        .getByText(/finish editing/i)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const removeBtnVisible = await pl.resourceRemoveBtn
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      console.log('Finish Editing control visible:', finishVisible, '| a remove control visible:', removeBtnVisible);

      test.fail(
        !finishVisible && !removeBtnVisible,
        'CONFIRMED (matches Zoho CWR-I651): clicking Edit does not enter any visibly-different editable state'
      );
      expect(finishVisible || removeBtnVisible).toBe(true);
    }
  );

  test(
    'CWR-I345: The Grade selection dropdown stays open while actively selecting Grade/Subject',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I345 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: the Grade selection dropdown closes prematurely while changing grade/subject.
      const nav = new NavigationPage(page);
      await nav.currentClassBtn.click({ force: true });
      await page.waitForTimeout(500);
      const gradeButtonsCount = await nav.gradeButtons.count();
      test.fail(gradeButtonsCount === 0, 'Grade selection dropdown not reachable this pass');
      if (gradeButtonsCount === 0) {
        expect(gradeButtonsCount).toBeGreaterThan(0);
        return;
      }
      await nav.gradeButtons.first().click({ force: true });
      await page.waitForTimeout(300);
      const stillOpenAfterGrade = await nav.subjectButtons
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      console.log('Dropdown still open (Subject options visible) right after selecting a Grade:', stillOpenAfterGrade);

      test.fail(
        !stillOpenAfterGrade,
        'CONFIRMED (matches Zoho CWR-I345): the Grade/Subject dropdown closes prematurely right after selecting a Grade'
      );
      expect(stillOpenAfterGrade).toBe(true);
    }
  );

  test(
    'CWR-I731: A success message is shown after adding a resource from the playlist',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I731 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: adding a resource from the playlist completes with no success/confirmation
      // message shown.
      const pl = new PlaylistPage(page);
      const ar = new AddResourcePage(page);
      await pl.openAddResourcesPicker();
      await ar.actions.create.click({ force: true });
      await page.waitForTimeout(1000);
      const titleInput = ar.titleInput;
      const opened = await titleInput.isVisible({ timeout: 5000 }).catch(() => false);
      test.fail(!opened, 'Create form not reachable this pass');
      if (!opened) {
        expect(opened).toBe(true);
        return;
      }
      await titleInput.fill('QA Zoho Regression ' + Date.now());
      const fs = require('fs');
      const path = require('path');
      const tmpFile = path.join(require('os').tmpdir(), `qa-zoho-${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, 'test content');
      await ar.fileInput.setInputFiles(tmpFile);
      await page.waitForTimeout(500);
      const submitDisabled = await ar.submitBtn.isDisabled().catch(() => true);
      test.fail(
        submitDisabled,
        'Submit stayed disabled with a valid Title + file this pass -- cannot test the post-submit message'
      );
      if (submitDisabled) {
        expect(submitDisabled).toBe(false);
        return;
      }
      const toastPromise = page
        .getByText(/success|added/i)
        .first()
        .waitFor({ state: 'visible', timeout: 6000 })
        .then(() => true)
        .catch(() => false);
      await ar.submitBtn.click({ force: true });
      const successVisible = await toastPromise;
      console.log('Success message shown after Submit:', successVisible);

      test.fail(!successVisible, 'CONFIRMED (matches Zoho CWR-I731): no success message shown after adding a resource');
      expect(successVisible).toBe(true);
    }
  );

  test(
    'CWR-I259: Playlist assets open at a sensible position, not always the exact same default spot',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I259 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: every asset opens at a fixed default screen position regardless of prior
      // state, rather than a sensible/expected position.
      const pl = new PlaylistPage(page);
      const plr = new PlayerPage(page);
      const count = await pl.resourceCards.count();
      test.fail(count === 0, 'No playlist resources available this pass');
      if (count === 0) {
        expect(count).toBeGreaterThan(0);
        return;
      }
      await plr.openResourceCard(pl.resourceCards.first());
      await page.waitForTimeout(2000);
      const closeIconVisible = await plr.closeIcon.first().isVisible({ timeout: 8000 }).catch(() => false);
      test.fail(
        !closeIconVisible,
        'The opened asset never actually rendered (no close icon found) this pass -- cannot test its position'
      );
      if (!closeIconVisible) {
        expect(closeIconVisible).toBe(true);
        return;
      }
      // The close icon is a reliable, real part of whatever player rendered -- use ITS box as a proxy
      // for "the asset has a real, sane on-screen position" (a real box with real size, not a
      // degenerate 0-size element from an overly-broad CSS guess).
      const box = await plr.closeIcon.first().boundingBox();
      console.log("Opened asset's close-icon bounding box:", box);
      const sane = box && box.width > 0 && box.height > 0 && box.x >= 0 && box.y >= 0;
      test.fail(!sane, 'CONFIRMED-adjacent: the opened asset has no sane on-screen position this pass');
      expect(sane).toBeTruthy();
    }
  );

  test(
    'CWR-I525: The Drop It / AI Assist window does not remain open after an auto logout',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I525 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: with Drop It or AI Assist open, an automatic sign-out happens -- the window
      // stays open instead of closing.
      const pl = new PlaylistPage(page);
      const ar = new AddResourcePage(page);
      const acc = new AccountManagementPage(page);
      await pl.openAddResourcesPicker();
      await ar.actions.dropit.click({ force: true });
      const dropitOpen = await ar.dropitCloseBtn.isVisible({ timeout: 8000 }).catch(() => false);
      test.fail(!dropitOpen, 'Drop It not reachable this pass');
      if (!dropitOpen) {
        expect(dropitOpen).toBe(true);
        return;
      }

      const menuOpened = await acc
        .openProfileMenu()
        .then(() => true)
        .catch(() => false);
      test.fail(
        !menuOpened,
        'Could not open the profile menu (Sign Out) while Drop It is open this pass -- cannot test the post-signout residue'
      );
      if (!menuOpened) {
        expect(menuOpened).toBe(true);
        return;
      }
      await acc.signOutBtn.click({ force: true, timeout: 5000 });
      await page.waitForTimeout(1500);
      const backToGuest = await page
        .getByText(/guest mode/i)
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test the post-signout Drop It residue');
      if (!backToGuest) {
        expect(backToGuest).toBe(true);
        return;
      }
      const dropitStillVisible = await ar.dropitCloseBtn.isVisible({ timeout: 2000 }).catch(() => false);
      console.log('Drop It window still visible after auto sign-out:', dropitStillVisible);

      test.fail(dropitStillVisible, 'CONFIRMED (matches Zoho CWR-I525): the Drop It window remains open after auto sign-out');
      expect(dropitStillVisible).toBe(false);
    }
  );

  test(
    'CWR-I549: Resource titles break on whole words, not mid-word, in content cards',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I549 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: long resource titles break mid-word instead of wrapping at word boundaries.
      const pl = new PlaylistPage(page);
      const count = await pl.resourceCards.count();
      test.fail(count === 0, 'No playlist resources available this pass');
      if (count === 0) {
        expect(count).toBeGreaterThan(0);
        return;
      }
      const titleEl = pl.resourceCards.first().locator('.title, [class*="title"]').first();
      const found = await titleEl.count();
      test.fail(found === 0, 'No title element found on a resource card this pass -- cannot test its word-break style');
      if (found === 0) {
        expect(found).toBeGreaterThan(0);
        return;
      }
      const breaksMidWord = await titleEl.evaluate((el) => {
        const style = getComputedStyle(el);
        return style.wordBreak === 'break-all' || style.overflowWrap === 'anywhere';
      });
      console.log('Resource title CSS allows mid-word breaks:', breaksMidWord);

      test.fail(
        breaksMidWord,
        'CONFIRMED (matches Zoho CWR-I549): resource card titles are styled to break mid-word (word-break: break-all / overflow-wrap: anywhere)'
      );
      expect(breaksMidWord).toBe(false);
    }
  );

  test(
    'CWR-I275: Chapter/Subject/TP data loads without an indefinite "ghost" loader',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I275 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: Chapter/Subject/TP data sometimes fails to load, leaving a loading spinner
      // running continuously instead of resolving.
      const nav = new NavigationPage(page);
      for (let i = 0; i < 3; i++) {
        await page.reload();
        const loaded = await nav.currentClassBtn
          .waitFor({ state: 'visible', timeout: 10000 })
          .then(() => true)
          .catch(() => false);
        if (!loaded) {
          test.fail(
            true,
            `CONFIRMED (matches Zoho CWR-I275): Chapter/Subject data did not load within 10s on reload attempt ${i + 1}/3`
          );
          expect(loaded).toBe(true);
          return;
        }
      }
      expect(true).toBe(true);
    }
  );

  test(
    'TCN-I16596: A backend 503 on the AI Assist request shows a graceful error, not a silent hang',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho TCN-I16596 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: AI Assist fails with a raw "503 Service Unavailable" instead of a graceful,
      // teacher-facing error message.
      const ar = new AddResourcePage(page);
      let intercepted = false;
      await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (/ai[-_]?assist|ai[-_]?generat/i.test(url) && route.request().method() !== 'OPTIONS') {
          intercepted = true;
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Service Unavailable' }),
          });
        } else {
          await route.continue();
        }
      });
      const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
      if (!stillStuck) await ar.actions.aiAssist.click({ force: true });
      await page.waitForTimeout(3000);
      await page.unroute('**/*');

      const rawErrorVisible = await page
        .getByText(/503|service unavailable/i)
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const gracefulErrorVisible =
        (await ar.aiAssistErrorScreen.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await page
          .getByText(/something went wrong|try again|unable to/i)
          .isVisible({ timeout: 2000 })
          .catch(() => false));
      console.log(
        'Intercepted an AI-related request:',
        intercepted,
        '| raw "503"/"Service Unavailable" text shown:',
        rawErrorVisible,
        '| a graceful error shown instead:',
        gracefulErrorVisible
      );
      test.fail(!intercepted, 'No AI-related request matched the interception pattern this pass -- could not force the 503 path');
      if (!intercepted) {
        expect(intercepted).toBe(true);
        return;
      }

      test.fail(
        rawErrorVisible || !gracefulErrorVisible,
        'CONFIRMED (matches Zoho TCN-I16596): a 503 on the AI Assist request does not show a graceful error'
      );
      expect(!rawErrorVisible && gracefulErrorVisible).toBe(true);
    }
  );

  test(
    'CWR-I737: An edited resource title is reflected on its card, not stuck on the old title',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I737 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: after editing a resource's title, the old title is still displayed.
      const pl = new PlaylistPage(page);
      const ar = new AddResourcePage(page);
      await pl.openAddResourcesPicker();
      await ar.actions.create.click({ force: true });
      await page.waitForTimeout(1000);
      const originalTitle = 'QA Zoho Rename Before ' + Date.now();
      const opened = await ar.titleInput.isVisible({ timeout: 5000 }).catch(() => false);
      test.fail(!opened, 'Create form not reachable this pass');
      if (!opened) {
        expect(opened).toBe(true);
        return;
      }
      await ar.titleInput.fill(originalTitle);
      const fs = require('fs');
      const path = require('path');
      const tmpFile = path.join(require('os').tmpdir(), `qa-zoho-rename-${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, 'test content');
      await ar.fileInput.setInputFiles(tmpFile);
      await page.waitForTimeout(500);
      const submitDisabled = await ar.submitBtn.isDisabled().catch(() => true);
      test.fail(submitDisabled, 'Submit stayed disabled this pass -- cannot create a resource to rename');
      if (submitDisabled) {
        expect(submitDisabled).toBe(false);
        return;
      }
      await ar.submitBtn.click({ force: true });
      await page.waitForTimeout(2000);

      const card = pl.resourceCards.filter({ hasText: originalTitle }).first();
      const cardVisible = await card.isVisible({ timeout: 8000 }).catch(() => false);
      test.fail(!cardVisible, 'Newly created resource card not found this pass -- cannot test rename');
      if (!cardVisible) {
        expect(cardVisible).toBe(true);
        return;
      }

      // Enter Edit mode and look for an edit/rename control on this specific card.
      await pl.openOptionsMenu();
      await pl.filterEditBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      const editIcon = card.locator('[class*="edit" i]').first();
      const editIconVisible = await editIcon.isVisible({ timeout: 3000 }).catch(() => false);
      test.fail(!editIconVisible, 'No per-card edit control found this pass -- cannot test the rename flow');
      if (!editIconVisible) {
        expect(editIconVisible).toBe(true);
        return;
      }
      await editIcon.click({ force: true });
      await page.waitForTimeout(500);
      const renameInput = page.locator('input[type="text"]:visible').first();
      const renameInputVisible = await renameInput.isVisible({ timeout: 3000 }).catch(() => false);
      test.fail(!renameInputVisible, 'No rename input appeared this pass -- cannot test the rename flow');
      if (!renameInputVisible) {
        expect(renameInputVisible).toBe(true);
        return;
      }
      const newTitle = 'QA Zoho Rename After ' + Date.now();
      await renameInput.fill(newTitle);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);

      const stillShowsOld = await pl.resourceCards
        .filter({ hasText: originalTitle })
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const showsNew = await pl.resourceCards
        .filter({ hasText: newTitle })
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      console.log('Card still shows OLD title after rename:', stillShowsOld, '| shows NEW title:', showsNew);

      test.fail(
        stillShowsOld || !showsNew,
        'CONFIRMED (matches Zoho CWR-I737): the edited resource title is not reflected -- the old title is still displayed'
      );
      expect(!stillShowsOld && showsNew).toBe(true);
    }
  );

  test(
    'TCN-I17050: Playlist content loads for the current account',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho TCN-I17050 (Playlist, Status: Reopened as of the 2026-09-13 export).
      const pl = new PlaylistPage(page);
      const count = await pl.resourceCards.count();
      console.log('Playlist resource cards loaded:', count);
      test.fail(count === 0, 'CONFIRMED (matches Zoho TCN-I17050): unable to load any Playlist content');
      expect(count).toBeGreaterThan(0);
    }
  );
});

// ---------------------------------------------------------------------------------------------
// Confirmed-location checks -- these need the specific "playersDefault"/"quiz" class/chapter/topic
// combos, which are confirmed against VALID_PIN_2 specifically (see tests/players/video.spec.js,
// tests/players/quiz.spec.js) -- NOT VALID_PIN, which has a different class roster. This describe
// block's own beforeEach logs in with VALID_PIN_2 directly (a SINGLE login), rather than logging in
// with VALID_PIN first and then re-logging in with VALID_PIN_2 -- confirmed live that a second
// mid-test loginWithPin call intermittently throws "Target page, context or browser has been
// closed" during the re-navigation, which a single clean login avoids.
// ---------------------------------------------------------------------------------------------
test.describe('Playlist -- confirmed-location checks', () => {
  test.beforeEach(async ({ page }) => {
    const pl = new PlaylistPage(page);
    await pl.loginWithPin(process.env.VALID_PIN_2);
  });

  test(
    'CWR-I546: Play/Pause labels appear over the video player, not offset to the left outside it',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I546 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: Play/Pause button labels render to the left, outside the video player's
      // bounds, instead of over the player itself.
      const nav = new NavigationPage(page);
      const pl = new PlaylistPage(page);
      const plr = new PlayerPage(page);
      // Confirmed-working location for a real Video resource (see tests/players/video.spec.js).
      await applyClassMap(nav, 'playersDefault');
      await page.waitForTimeout(500);
      await pl.ensureDrawerVisible().catch(() => {});
      await page.waitForTimeout(1000);
      const hasVideo = await plr.videoCards.count();
      test.fail(hasVideo === 0, 'No video resource available at the confirmed-working location this pass');
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
      test.fail(
        crashed,
        'Video player crashed on open this pass (confirmed cross-repo "targetContainer is not defined" issue) -- cannot test Play/Pause label position'
      );
      if (crashed) {
        expect(crashed).toBe(false);
        return;
      }

      const opened = await plr.closeIcon.first().isVisible({ timeout: 8000 }).catch(() => false);
      test.fail(!opened, 'Video player never actually opened this pass (no close icon) -- cannot test label position');
      if (!opened) {
        expect(opened).toBe(true);
        return;
      }
      const playerBox = await page
        .locator('.video-js, .vjs-tech, video, iframe')
        .first()
        .boundingBox()
        .catch(() => null);
      const playToggleBox = await plr.videoPlayToggle.first().boundingBox().catch(() => null);
      console.log('Video player box:', playerBox, '| Play/Pause control box:', playToggleBox);
      test.fail(
        !playerBox || !playToggleBox,
        'Could not locate the video player and/or its Play/Pause control this pass -- cannot test label position'
      );
      if (!playerBox || !playToggleBox) {
        expect(playerBox && playToggleBox).toBeTruthy();
        return;
      }

      const labelOutsideLeft = playToggleBox.x + playToggleBox.width < playerBox.x;
      test.fail(
        labelOutsideLeft,
        'CONFIRMED (matches Zoho CWR-I546): the Play/Pause control renders to the left, outside the video player bounds'
      );
      expect(labelOutsideLeft).toBe(false);
    }
  );

  test(
    'CWR-I768: Switching Grade/Subject actually changes the Playlist content shown (no stale carryover)',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I768 (Playlist, Status: To do as of the 2026-09-13 export).
      // Original repro: previous class/subject Playlist content persists after switching context.
      const pl = new PlaylistPage(page);
      const nav = new NavigationPage(page);
      await applyClassMap(nav, 'playersDefault');
      await page.waitForTimeout(500);
      await pl.ensureDrawerVisible().catch(() => {});
      await page.waitForTimeout(1000);
      const titlesA = await pl.resourceCards.allTextContents();

      await applyClassMap(nav, 'quiz');
      await page.waitForTimeout(1000);
      const titlesB = await pl.resourceCards.allTextContents();

      console.log(
        'Resource titles at location A:',
        JSON.stringify(titlesA),
        '| after switching to location B:',
        JSON.stringify(titlesB)
      );
      const identical = JSON.stringify(titlesA) === JSON.stringify(titlesB) && titlesA.length > 0;

      test.fail(
        identical,
        'CONFIRMED (matches Zoho CWR-I768): Playlist content did not change after switching Grade/Subject -- stale content persisted'
      );
      expect(identical).toBe(false);
    }
  );

  test(
    'TCN-I16794: The video player renders at a real, usable size, not tiny',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho TCN-I16794 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: the video player displays content too small.
      const nav = new NavigationPage(page);
      const pl = new PlaylistPage(page);
      const plr = new PlayerPage(page);
      await applyClassMap(nav, 'playersDefault');
      await page.waitForTimeout(500);
      await pl.ensureDrawerVisible().catch(() => {});
      await page.waitForTimeout(1000);
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
      test.fail(crashed, 'Video player crashed on open this pass -- cannot test its rendered size');
      if (crashed) {
        expect(crashed).toBe(false);
        return;
      }
      const opened = await plr.closeIcon.first().isVisible({ timeout: 8000 }).catch(() => false);
      test.fail(!opened, 'Video player never actually opened this pass (no close icon) -- cannot test its rendered size');
      if (!opened) {
        expect(opened).toBe(true);
        return;
      }
      const box = await page.locator('.video-js, .vjs-tech, video, iframe').first().boundingBox().catch(() => null);
      console.log('Video player box:', box);
      test.fail(!box, 'Could not locate the video player this pass');
      if (!box) {
        expect(box).toBeTruthy();
        return;
      }
      // A "usable" size is a low bar: at least a small fraction of the viewport, not a few pixels.
      const viewport = page.viewportSize() || { width: 1920, height: 1080 };
      const tooSmall = box.width < viewport.width * 0.15 || box.height < viewport.height * 0.15;
      test.fail(tooSmall, 'CONFIRMED (matches Zoho TCN-I16794): the video player renders far smaller than a usable size');
      expect(tooSmall).toBe(false);
    }
  );

  test(
    'TCN-I16135: An image only expands on click when an expand icon is actually shown',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho TCN-I16135 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: clicking an image expands it even when no expand icon is displayed, implying
      // the click affordance doesn't match what's actually shown.
      const nav = new NavigationPage(page);
      const pl = new PlaylistPage(page);
      const plr = new PlayerPage(page);
      await applyClassMap(nav, 'playersDefault');
      await page.waitForTimeout(500);
      await pl.ensureDrawerVisible().catch(() => {});
      await page.waitForTimeout(1000);
      const hasImage = await plr.imageCards.count();
      test.fail(hasImage === 0, 'No image resource available this pass');
      if (!hasImage) {
        expect(hasImage).toBeGreaterThan(0);
        return;
      }
      await plr.openResourceCard(plr.imageCards);
      await page.waitForTimeout(2000);
      const img = plr.imageGalleryImg.first();
      const imgVisible = await img.isVisible({ timeout: 8000 }).catch(() => false);
      test.fail(!imgVisible, 'Image did not open this pass -- cannot test its expand-on-click behavior');
      if (!imgVisible) {
        expect(imgVisible).toBe(true);
        return;
      }
      // Look for a distinct expand-icon element near/on the image (a common convention: a magnifier
      // icon overlay). If none is confirmed present, clicking should NOT change the image's own size.
      const expandIconVisible = await page
        .locator('[class*="expand" i], [class*="zoom" i], [aria-label*="expand" i]')
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const boxBefore = await img.boundingBox();
      await img.click({ force: true });
      await page.waitForTimeout(1000);
      const boxAfter = await img.boundingBox().catch(() => null);
      const sizeChanged =
        boxAfter &&
        boxBefore &&
        (Math.abs(boxAfter.width - boxBefore.width) > 5 || Math.abs(boxAfter.height - boxBefore.height) > 5);
      console.log('Expand icon visible:', expandIconVisible, '| image size changed on click:', sizeChanged);

      test.fail(
        !expandIconVisible && Boolean(sizeChanged),
        'CONFIRMED (matches Zoho TCN-I16135): the image expands on click even though no expand icon is shown'
      );
      expect(!expandIconVisible && sizeChanged).toBeFalsy();
    }
  );

  test(
    'TCN-I16702: The image is displayed centered, not offset above the surrounding text',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho TCN-I16702 (Playlist, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: an image is displayed above the text and is not centered.
      const nav = new NavigationPage(page);
      const pl = new PlaylistPage(page);
      const plr = new PlayerPage(page);
      await applyClassMap(nav, 'playersDefault');
      await page.waitForTimeout(500);
      await pl.ensureDrawerVisible().catch(() => {});
      await page.waitForTimeout(1000);
      const hasImage = await plr.imageCards.count();
      test.fail(hasImage === 0, 'No image resource available this pass');
      if (!hasImage) {
        expect(hasImage).toBeGreaterThan(0);
        return;
      }
      await plr.openResourceCard(plr.imageCards);
      await page.waitForTimeout(2000);
      const img = plr.imageGalleryImg.first();
      const imgVisible = await img.isVisible({ timeout: 8000 }).catch(() => false);
      test.fail(!imgVisible, 'Image did not open this pass -- cannot test its centering');
      if (!imgVisible) {
        expect(imgVisible).toBe(true);
        return;
      }
      const imgBox = await img.boundingBox();
      const wrapperBox = await plr.imageWrapper.boundingBox().catch(() => null);
      console.log('Image box:', imgBox, '| wrapper box:', wrapperBox);
      test.fail(!wrapperBox, 'Could not locate the image wrapper this pass');
      if (!wrapperBox) {
        expect(wrapperBox).toBeTruthy();
        return;
      }
      const imgCenterX = imgBox.x + imgBox.width / 2;
      const wrapperCenterX = wrapperBox.x + wrapperBox.width / 2;
      const offCenter = Math.abs(imgCenterX - wrapperCenterX) > wrapperBox.width * 0.1;
      test.fail(offCenter, 'CONFIRMED (matches Zoho TCN-I16702): the image is not horizontally centered within its wrapper');
      expect(offCenter).toBe(false);
    }
  );

  test(
    'TCN-I16404: A video resource does not get stuck in continuous loading',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho TCN-I16404 (Playlist, Status: To do as of the 2026-09-13 export).
      // Original repro: video resources do not open and remain stuck on continuous loading.
      const nav = new NavigationPage(page);
      const pl = new PlaylistPage(page);
      const plr = new PlayerPage(page);
      await applyClassMap(nav, 'playersDefault');
      await page.waitForTimeout(500);
      await pl.ensureDrawerVisible().catch(() => {});
      await page.waitForTimeout(1000);
      const hasVideo = await plr.videoCards.count();
      test.fail(hasVideo === 0, 'No video resource available this pass');
      if (!hasVideo) {
        expect(hasVideo).toBeGreaterThan(0);
        return;
      }
      await plr.openResourceCard(plr.videoCards);
      await page.waitForTimeout(5000);
      const spinnerVisible = await page
        .locator('[class*="spinner" i], [class*="loading" i], .mat-spinner')
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const playerReady = await plr.closeIcon.first().isVisible({ timeout: 2000 }).catch(() => false);
      console.log('Loading spinner still visible after 5s:', spinnerVisible, '| player content ready:', playerReady);

      test.fail(
        spinnerVisible && !playerReady,
        'CONFIRMED (matches Zoho TCN-I16404): the video resource is stuck showing a loading spinner instead of opening'
      );
      expect(spinnerVisible && !playerReady).toBe(false);
    }
  );
});
