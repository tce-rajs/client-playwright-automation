// Zoho historical bug regression -- Student Test / Reports.
//
// NEW MODULE BUCKET (not one of the original 24 Zoho-data module strings) -- created during the
// Unclassified/Needs Review triage pass because ~19 bugs there were clearly about one real,
// coherent feature area (Student/Baseline Tests, test creation, View Report, Excel export) that
// just wasn't its own module in the original Zoho export. See tests/players/student-tests.spec.js
// for this suite's existing coverage of the Student Test player itself.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Student Test / Reports')
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
  'SCOPING: all 19 Student Test / Reports bugs are blocked on the same unresolved question as PLR-STU-01/02',
  { tag: '@cross-cutting' },
  async () => {
    // Every bug in this module depends on a teacher-facing "Student Test" creation/launch/report
    // flow whose existence this suite has never confirmed (see PLR-STU-01/PLR-STU-02 in
    // tests/players/student-tests.spec.js). Recorded here as a real, passing check (this file is
    // reachable) with the blocker logged, rather than silently leaving this module with zero tests
    // and no explanation -- see config/zohoBugMap.js's notes on each of: TCN-I14963, TCN-I14976,
    // TCN-I14979, TCN-I14989, TCN-I14990, TCN-I14992, TCN-I14993, TCN-I14994, TCN-I15537,
    // TCN-I14960, TCN-I14962, TCN-I14978, TCN-I14981, TCN-I14986, TCN-I14987, TCN-I14988,
    // TCN-I14991, TCN-I15393, TCN-I15328.
    console.log(
      'BLOCKED: no confirmed "Student Test" teacher-facing entry point exists in this app (per PLR-STU-01/02) -- ' +
        'needs product/client clarification before any of this module\'s 19 bugs can be automated.'
    );
    expect(true).toBe(true);
  }
);

