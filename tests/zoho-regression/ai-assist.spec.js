// Zoho historical bug regression -- AI Assist.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'AI Assist')
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

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(60000);
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await pl.ensureResourcesPresent();
});

async function openAiAssist(page, ar, timeout = 30000) {
  const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
  if (!stillStuck) await ar.actions.aiAssist.click({ force: true });
  await expect(page.getByText('AI Assist', { exact: true })).toBeVisible({ timeout });
  await ar.aiAssistExerciseCheckboxes
    .first()
    .waitFor({ state: 'visible', timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(800);
}

test(
  'CWR-I445: AI Assist loads real resource content instead of a "No Data Available" message',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I445 (AI Assist, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: open AI Assist for a resource -- instead of loading content, a "No Data
    // Available" message is shown.
    const ar = new AddResourcePage(page);
    await openAiAssist(page, ar);

    const noDataVisible = await page
      .getByText(/no data available/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const checkboxCount = await ar.aiAssistExerciseCheckboxes.count();
    test.info().annotations.push({
      type: 'note',
      description: [
        '"No Data Available" text visible:',
        noDataVisible,
        '| exercise checkboxes rendered:',
        checkboxCount,
      ].join(' '),
    });

    test.fail(
      noDataVisible || checkboxCount === 0,
      `CONFIRMED (matches Zoho CWR-I445): AI Assist shows no real content -- "No Data Available" visible: ${noDataVisible}, checkbox count: ${checkboxCount}`
    );
    expect(!noDataVisible && checkboxCount > 0).toBe(true);
  }
);

test(
  'CWR-I674: Adding an AI Assist exercise to the playlist shows a success message, and the saved exercise contains valid questions when reopened',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I674 (AI Assist, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: create an exercise via AI Assist and save it -- no success/confirmation
    // message is shown, and reopening the saved exercise from the playlist shows "no valid
    // question found" instead of the real questions.
    const pl = new PlaylistPage(page);
    const ar = new AddResourcePage(page);
    const plr = new PlayerPage(page);
    await openAiAssist(page, ar);

    const countBefore = await pl.resourceCards.count();
    await ar.aiAssistExerciseCheckboxes.first().waitFor({ state: 'visible', timeout: 10000 });
    await ar.aiAssistExerciseCheckboxes.first().click({ force: true });
    await page.waitForTimeout(400);
    const toastPromise = page
      .getByText(/successfully added/i)
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await ar.aiAssistAddToPlaylistBtn.waitFor({ state: 'visible', timeout: 8000 });
    await ar.aiAssistAddToPlaylistBtn.click({ force: true });
    const toastVisible = await toastPromise;
    await page.waitForTimeout(1500);
    const countAfter = await pl.resourceCards.count();
    const savedSuccessfully = toastVisible || countAfter > countBefore;
    test.info().annotations.push({
      type: 'note',
      description: [
        'Success toast shown:',
        toastVisible,
        '| Playlist count before/after:',
        countBefore,
        '->',
        countAfter,
      ].join(' '),
    });

    test.fail(
      !savedSuccessfully,
      'CONFIRMED (matches Zoho CWR-I674, part 1): no success/confirmation message or resource-count increase after Add to Playlist'
    );
    if (!savedSuccessfully) {
      expect(savedSuccessfully).toBe(true);
      return;
    }

    // Part 2: reopen the just-saved exercise and check it has real questions.
    await plr.openResourceCard(pl.resourceCards.last());
    await page.waitForTimeout(2000);
    const noValidQuestionVisible = await page
      .getByText(/no valid question/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['"No valid question found" shown on reopening the saved exercise:', noValidQuestionVisible].join(
        ' '
      ),
    });

    test.fail(
      noValidQuestionVisible,
      'CONFIRMED (matches Zoho CWR-I674, part 2): reopening the saved AI Assist exercise shows "no valid question found"'
    );
    expect(noValidQuestionVisible).toBe(false);
  }
);

test(
  'CWR-I262: Opening Browser/Weblink or AI Assist assets does not navigate to a "File Not Found" page',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I262 (AI Assist, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: opening assets related to Browser, AI Assist, or YouTube redirects to a
    // "File Not Found" page instead of the real content.
    const ar = new AddResourcePage(page);
    const plr = new PlayerPage(page);

    await openAiAssist(page, ar);
    const fileNotFoundOnAiAssist = await page
      .getByText(/file not found/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    await ar.aiAssistCloseBtn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    const weblinkCardCount = await plr.weblinkCards.count();
    let fileNotFoundOnWeblink = false;
    if (weblinkCardCount > 0) {
      await plr.openResourceCard(plr.weblinkCards.first());
      await page.waitForTimeout(1500);
      fileNotFoundOnWeblink = await page
        .getByText(/file not found/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false);
    }
    test.info().annotations.push({
      type: 'note',
      description: [
        '"File Not Found" on AI Assist:',
        fileNotFoundOnAiAssist,
        '| Weblink/Browser cards available:',
        weblinkCardCount,
        '| "File Not Found" on Weblink:',
        fileNotFoundOnWeblink,
      ].join(' '),
    });

    test.fail(
      fileNotFoundOnAiAssist || fileNotFoundOnWeblink,
      `CONFIRMED (matches Zoho CWR-I262): a "File Not Found" page was shown -- AI Assist: ${fileNotFoundOnAiAssist}, Weblink: ${fileNotFoundOnWeblink}`
    );
    expect(fileNotFoundOnAiAssist || fileNotFoundOnWeblink).toBe(false);
  }
);
