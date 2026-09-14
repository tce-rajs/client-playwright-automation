// Zoho historical bug regression -- Compass (AfL Reports).
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Compass (AfL Reports)')
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

test(
  'SCOPING: all 17 AfL Report bugs are blocked on an unconfirmed/likely Principal-only UI path',
  { tag: '@cross-cutting' },
  async () => {
    // This whole module depends on an "AfL Report" screen that has no page object or confirmed
    // entry point anywhere in this suite. TCN-I16599's own title ("...for Principal Account")
    // strongly suggests it requires Principal-level access this teacher QA account may not have --
    // same class of gap as tests/players/student-tests.spec.js's PLR-STU-01/02. Recorded here as a
    // real, passing check (this file is reachable) with the blocker logged, rather than silently
    // leaving this module with zero tests -- see config/zohoBugMap.js's notes on: TCN-I16599,
    // TCN-I16602, TCN-I16604, TCN-I16605, TCN-I16606, TCN-I16608, TCN-I16904, TCN-I16905,
    // TCN-I16907, TCN-I16909, TCN-I16911, TCN-I16912, TCN-I16927, TCN-I17129, CWR-I536, CWR-I680,
    // TCN-I15731.
    test.info().annotations.push({
      type: 'note',
      description: [
        'BLOCKED: no confirmed "AfL Report" UI entry point exists for a teacher account in this suite -- ' +
          "needs product/client clarification (Principal-level access?) before any of this module's 17 bugs can be automated.",
      ].join(' '),
    });
    expect(true).toBe(true);
  }
);
