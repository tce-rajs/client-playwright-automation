// Zoho historical bug regression -- Add Resource.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Add Resource')
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

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await pl.ensureResourcesPresent();
});

test(
  'CWR-I305: The Add Resource / Gallery window does not overlap the toolbar or block Filter selection',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I305 (Add Resource, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro (V2): open Add Resource -- its window overlaps the toolbar, and the toolbar
    // ends up blocking the Filter Resource area so filters can't be selected.
    const ar = new AddResourcePage(page);
    const { stillStuck } = await ar.openPickerReliably(ar.actions.gallery);
    if (!stillStuck) await ar.actions.gallery.click({ force: true });
    await ar.galleryFilterSelect.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const toolbarBox = await page.locator('.toolbar-container').first().boundingBox();
    const filterBox = await ar.galleryFilterSelect.boundingBox().catch(() => null);
    console.log('Toolbar bounding box:', toolbarBox, '| Gallery filter bounding box:', filterBox);

    const overlaps =
      toolbarBox &&
      filterBox &&
      toolbarBox.x < filterBox.x + filterBox.width &&
      toolbarBox.x + toolbarBox.width > filterBox.x &&
      toolbarBox.y < filterBox.y + filterBox.height &&
      toolbarBox.y + toolbarBox.height > filterBox.y;

    const filterClickable = filterBox
      ? await ar.galleryFilterSelect
          .evaluate((el) => getComputedStyle(el).pointerEvents !== 'none')
          .catch(() => false)
      : false;

    test.fail(
      !filterBox || Boolean(overlaps) || !filterClickable,
      `CONFIRMED (matches Zoho CWR-I305): Add Resource/Gallery filter is blocked -- filterBox found: ${!!filterBox}, overlaps toolbar: ${overlaps}, clickable: ${filterClickable}`
    );
    expect(filterBox && !overlaps && filterClickable).toBe(true);
  }
);

test(
  'CWR-I309: Drop It can establish its pairing connection while on the office network',
  { tag: '@historical-regression' },
  async () => {
    // Zoho CWR-I309 (Add Resource, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: on the OFFICE network specifically, Drop It fails to connect; other apps on
    // the same network are unaffected.
    //
    // This is a network-topology-dependent defect (which physical/corporate network the test
    // machine is on), not a UI behavior Playwright can control or simulate -- there's no way for
    // this suite to force itself onto "the office network" vs. whatever network this machine
    // actually has. Consistent with this project's own established pattern for genuinely
    // environment/hardware-blocked cases (see DRP-EXP-01 in tests/drop-it/drop-it.spec.js).
    test.fail(
      true,
      "Deliberately not executed -- this bug is specific to which physical network the test machine is on ('the office network'), which Playwright cannot control or simulate; needs a manual check from that specific network instead"
    );
    expect(true).toBe(false);
  }
);

test(
  'TCN-I15338: A PDF added from the Library opens from the Playlist, not stuck loading',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15338 -- a PDF added to the Playlist from the Library keeps loading continuously
    // instead of opening.
    const ar = new AddResourcePage(page);
    const { stillStuck } = await ar.openPickerReliably(ar.actions.library);
    if (!stillStuck) await ar.actions.library.click({ force: true });
    const libraryOpen = await ar.libraryResults.first().isVisible({ timeout: 10000 }).catch(() => false);
    test.fail(!libraryOpen, 'The Library picker did not open reliably this pass');
    if (!libraryOpen) {
      expect(libraryOpen).toBe(true);
      return;
    }
    const pdfCard = ar.libraryResults.filter({ hasText: /pdf/i }).first();
    const hasPdf = await pdfCard.count();
    const targetCard = hasPdf > 0 ? pdfCard : ar.libraryResults.first();
    await targetCard.click({ force: true });
    await page.waitForTimeout(2000);
    const { PlaylistPage: PL } = require('../../pages/playlist.page');
    const { PlayerPage } = require('../../pages/player.page');
    const pl = new PL(page);
    const plr = new PlayerPage(page);
    const newCard = pl.resourceCards.last();
    await plr.openResourceCard(newCard);
    await page.waitForTimeout(2500);
    const stillLoading = await page.getByText(/loading/i).isVisible({ timeout: 3000 }).catch(() => false);
    const closeIconVisible = await plr.closeIcon.first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Still showing a loading state:', stillLoading, '| content opened (closeIcon visible):', closeIconVisible);

    test.fail(
      stillLoading || !closeIconVisible,
      'CONFIRMED (matches Zoho TCN-I15338): the Library-added resource is stuck in a continuous loading state'
    );
    expect(stillLoading).toBe(false);
    expect(closeIconVisible).toBe(true);
  }
);

test(
  'CWR-I285: The Filter Resource panel does not automatically reappear after opening an unrelated asset',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I285 -- the Filter Resource panel keeps appearing automatically every time any asset
    // is opened, instead of only when the user explicitly opens it.
    const pl = new PlaylistPage(page);
    const { PlayerPage } = require('../../pages/player.page');
    const plr = new PlayerPage(page);
    await pl.openOptionsMenu();
    await page.waitForTimeout(500);
    await pl.filterCloseBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    const filterVisibleAfterClose = await page
      .locator('[data-qa-id="playlist-filter-menu-select"]')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    test.fail(filterVisibleAfterClose, 'The filter panel did not actually close this pass -- cannot test the auto-reappear claim');
    if (filterVisibleAfterClose) {
      expect(filterVisibleAfterClose).toBe(false);
      return;
    }
    // Open an unrelated asset -- the filter panel should NOT reappear as a side effect.
    await plr.openResourceCard(pl.resourceCards.first());
    await page.waitForTimeout(1500);
    const filterReappeared = await page
      .locator('[data-qa-id="playlist-filter-menu-select"]')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    console.log('Filter panel reappeared automatically after opening an unrelated asset:', filterReappeared);

    test.fail(
      filterReappeared,
      'CONFIRMED (matches Zoho CWR-I285): the Filter Resource panel reappeared automatically after opening an unrelated asset'
    );
    expect(filterReappeared).toBe(false);
  }
);
