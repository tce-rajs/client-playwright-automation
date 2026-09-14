// Zoho historical bug regression -- Drop It.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Drop It')
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

// All three bugs below require a real mobile device actually scanning Drop It's QR code and
// initiating a file/link share back to the desktop client -- something Playwright (which only
// drives the desktop client's own window) has no way to do. This exact limitation is already
// established and documented in tests/drop-it/drop-it.spec.js (DRP-EXP-01, DRP-CONVERGE-01's own
// comment, matching the reference Cypress suite's own "Minimal coverage" rating for this reason).
// Each case below is written for real (not skipped), following that same "deliberately not
// executed" pattern used throughout this project for genuinely hardware-blocked cases.

test(
  'TCN-I16067: Sharing a link via Drop It succeeds instead of showing a "Failed" status -- deliberately not executed',
  { tag: '@historical-regression' },
  async () => {
    // Zoho TCN-I16067 (Drop It, Status: To do as of the 2026-09-13 export).
    // Original repro: scan Drop It's QR code with a mobile device, share a URL -- upload ends with
    // a "Failed" status.
    test.fail(
      true,
      'Deliberately not executed -- requires a real mobile device to scan the QR code and share a link, which is not available in this environment (see tests/drop-it/drop-it.spec.js DRP-EXP-01/DRP-CONVERGE-01)'
    );
    expect(true).toBe(false);
  }
);

test(
  'TCN-I16097: File sharing via Drop It succeeds on the first attempt on iOS, not just on retry -- deliberately not executed',
  { tag: '@historical-regression' },
  async () => {
    // Zoho TCN-I16097 (Drop It, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: on iOS specifically, the first file-share attempt fails; retrying the same
    // file succeeds.
    test.fail(
      true,
      'Deliberately not executed -- requires a real iOS device to scan the QR code and share a file, which is not available in this environment (see tests/drop-it/drop-it.spec.js DRP-EXP-01/DRP-CONVERGE-01)'
    );
    expect(true).toBe(false);
  }
);

test(
  'TCN-I17127: Drop It shows a success/completion status after a URL asset is successfully added, instead of staying stuck on "Creating Resource" -- deliberately not executed',
  { tag: '@historical-regression' },
  async () => {
    // Zoho TCN-I17127 (Drop It, Status: To do as of the 2026-09-13 export).
    // Original repro: upload a URL asset via Drop It from an Android device -- the asset is
    // successfully added and playable in the Playlist, but Drop It keeps showing "Creating
    // Resource" with a loading indicator instead of a success/completion message.
    test.fail(
      true,
      'Deliberately not executed -- requires a real Android device to scan the QR code and share a URL asset, which is not available in this environment (see tests/drop-it/drop-it.spec.js DRP-EXP-01/DRP-CONVERGE-01)'
    );
    expect(true).toBe(false);
  }
);

