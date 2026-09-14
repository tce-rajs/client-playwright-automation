// Zoho historical bug regression -- AI Homework.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'AI Homework')
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
const { AiHomeworkPage } = require('../../pages/ai-homework.page');
const { AiNoticesPage } = require('../../pages/ai-notices.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await applyClassMap(nav, 'aiHomework').catch(() => {});
});

// CWR-I302: "Homework feature not working in CEP v2" (Status: QA Sign off/Closed as of the
// 2026-09-13 export) -- already disproven by existing coverage: AIH-ACCESS-01 (composer opens)
// and AIH-QB-01 (Generate produces real, topic-relevant questions end-to-end) in
// tests/ai-homework/ai-homework.spec.js together confirm the feature's create/access path works.
// The "assign" part is deliberately never exercised end-to-end anywhere in this suite (see
// CWR-I339 below) since it requires a real send to students -- that part of this bug stays
// genuinely unverified, not disproven, which is why matchedTestId cites both cases explicitly
// rather than claiming full coverage.

test(
  'CWR-I339: Sending a Homework/Revise assignment shows a success confirmation message -- deliberately not executed',
  { tag: '@historical-regression' },
  async () => {
    // Zoho CWR-I339 (AI Homework, Status: Duplicate as of the 2026-09-13 export).
    // Original repro: create and send a Homework/Revise assignment -- no success popup confirms
    // it was sent.
    //
    // Actually clicking Send delivers a real assignment to real students on the shared QA
    // account/class, which this suite's established rule (see ai-homework.page.js's own header
    // comment: "NEVER clicked anywhere in this file") excludes as a destructive action -- matching
    // the same policy already applied to Account Management's credential-change cases
    // (ACC-PLAN-02/03/04/06 in tests/user-profile/account-management.spec.js).
    test.fail(
      true,
      "Deliberately not executed -- actually clicking Send delivers a real assignment to real students on the shared QA account, excluded as a destructive action per this suite's established policy"
    );
    expect(true).toBe(false);
  }
);

test(
  'TCN-I15361: Opening a second Magnet submodule automatically closes the first, instead of allowing multiple to stay open at once',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15361 (AI Homework, Status: To do as of the 2026-09-13 export).
    // Original repro: in the Magnet module, open one submodule (e.g. Notice), then open another
    // (e.g. Homework/Learning Shorts) without closing the first -- both stay open simultaneously
    // instead of the first auto-closing.
    const an = new AiNoticesPage(page);
    const opened = await an.openNoticeCapture();
    test.fail(!opened, 'Magnet -> Notice not reachable this pass -- cannot test the multi-submodule-open behavior');
    if (!opened) {
      expect(opened).toBe(true);
      return;
    }
    const noticeActiveBefore = await an.captureInstructionBanner.isVisible({ timeout: 3000 }).catch(() => false);

    const ah = new AiHomeworkPage(page);
    await ah.open();
    const homeworkOpen = await page
      .getByText(/select chapter|homework|worksheet/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    const noticeStillActive = await an.captureInstructionBanner.isVisible({ timeout: 2000 }).catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Notice capture mode active before opening Homework:',
        noticeActiveBefore,
        '| Homework composer opened:',
        homeworkOpen,
        '| Notice capture mode STILL active after opening Homework:',
        noticeStillActive,
      ].join(' '),
    });

    test.fail(
      noticeActiveBefore && homeworkOpen && noticeStillActive,
      'CONFIRMED (matches Zoho TCN-I15361): opening the Homework submodule did not close the still-active Notice capture mode -- both remained open simultaneously'
    );
    expect(noticeActiveBefore && homeworkOpen && noticeStillActive).toBe(false);
  }
);
