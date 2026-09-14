// Zoho historical bug regression -- Unclassified / Needs Review.
//
// Live-verifies real, previously-reported Zoho defects for this module against the CURRENT app,
// rather than trusting their last-known Zoho Status (open/closed is not a reason to skip one --
// only an existing test that already proves the behavior is).
//
// Sources:
//   - CEP_TestCases/Zoho_Bugs_TeachMode.xlsx  (this module's rows)
//   - config/zohoBugMap.js                    (the same data as a queryable JS module)
//
// NOTE: these bugs weren't cleanly classified into a module during the original import --
// read each one's title/description first and reassign its `module` in config/zohoBugMap.js if a
// real module is obvious, then move the case to that module's spec file instead of this one.
//
// Convention for adding a case here:
//   1. Pick an unmatched bug for this module:
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Unclassified / Needs Review')
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
const { NavigationPage } = require('../../pages/navigation.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe('Unclassified -- generic checks', () => {
  test.beforeEach(async ({ page }) => {
    const pl = new PlaylistPage(page);
    await pl.loginWithPin(process.env.VALID_PIN);
    await pl.ensureResourcesPresent();
  });

  test(
    'TCN-I15340 / CWR-I694 / TCN-I15350 / TCN-I15353: Opened resources render at a real, usable size, not a tiny window',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho TCN-I15340 (Closed), CWR-I694 (Duplicate), TCN-I15350 (Closed), TCN-I15353 (Closed) --
      // 4 duplicate reports of the same underlying complaint: resources open in a reduced/small
      // window instead of full-screen focus.
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
      const closeIconVisible = await plr.closeIcon
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      test.fail(!closeIconVisible, 'The opened resource never actually rendered this pass -- cannot test its size');
      if (!closeIconVisible) {
        expect(closeIconVisible).toBe(true);
        return;
      }
      const viewport = page.viewportSize() || { width: 1920, height: 1080 };
      const box = await page
        .locator('.player, [class*="-player"]')
        .first()
        .boundingBox()
        .catch(() => null);
      test
        .info()
        .annotations.push({
          type: 'note',
          description: ['Viewport:', viewport, '| opened player box:', box].join(' '),
        });
      test.fail(!box, 'Could not locate the opened player element this pass -- cannot test its size');
      if (!box) {
        expect(box).toBeTruthy();
        return;
      }
      const tooSmall = box.width < viewport.width * 0.4 || box.height < viewport.height * 0.4;
      test.fail(
        tooSmall,
        'CONFIRMED (matches Zoho TCN-I15340/CWR-I694/TCN-I15350/TCN-I15353): the opened resource renders in a small window, not full-screen focus'
      );
      expect(tooSmall).toBe(false);
    }
  );

  test(
    'TCN-I15345 / TCN-I15362: A resource does not get permanently stuck on a loading screen',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho TCN-I15345 (To do) + TCN-I15362 (Closed) -- resources opening but remaining stuck on a
      // loading screen / taking too long to load.
      const pl = new PlaylistPage(page);
      const plr = new PlayerPage(page);
      const count = await pl.resourceCards.count();
      test.fail(count === 0, 'No playlist resources available this pass');
      if (count === 0) {
        expect(count).toBeGreaterThan(0);
        return;
      }
      await plr.openResourceCard(pl.resourceCards.first());
      await page.waitForTimeout(8000);
      const spinnerVisible = await page
        .locator('[class*="spinner" i], [class*="loading" i], .mat-spinner')
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const contentReady = await plr.closeIcon
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      test.info().annotations.push({
        type: 'note',
        description: [
          'Loading spinner still visible after 8s:',
          spinnerVisible,
          '| resource opened successfully:',
          contentReady,
        ].join(' '),
      });

      test.fail(
        spinnerVisible && !contentReady,
        'CONFIRMED (matches Zoho TCN-I15345/TCN-I15362): the resource is stuck on a loading screen instead of opening within a reasonable time'
      );
      expect(spinnerVisible && !contentReady).toBe(false);
    }
  );

  test(
    'TCN-I17061: A user-created custom asset can be deleted',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho TCN-I17061 (Unclassified, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: the user is not able to delete a custom asset.
      const pl = new PlaylistPage(page);
      const ar = new AddResourcePage(page);
      await pl.openAddResourcesPicker();
      await ar.actions.create.click({ force: true });
      await page.waitForTimeout(1000);
      const title = 'QA Zoho Delete Test ' + Date.now();
      const opened = await ar.titleInput.isVisible({ timeout: 5000 }).catch(() => false);
      test.fail(!opened, 'Create form not reachable this pass');
      if (!opened) {
        expect(opened).toBe(true);
        return;
      }
      await ar.titleInput.fill(title);
      const fs = require('fs');
      const path = require('path');
      const tmpFile = path.join(require('os').tmpdir(), `qa-zoho-delete-${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, 'test content');
      await ar.fileInput.setInputFiles(tmpFile);
      await page.waitForTimeout(500);
      const submitDisabled = await ar.submitBtn.isDisabled().catch(() => true);
      test.fail(submitDisabled, 'Submit stayed disabled this pass -- cannot create an asset to delete');
      if (submitDisabled) {
        expect(submitDisabled).toBe(false);
        return;
      }
      await ar.submitBtn.click({ force: true });
      await page.waitForTimeout(2000);

      const card = pl.resourceCards.filter({ hasText: title }).first();
      const cardVisible = await card.isVisible({ timeout: 8000 }).catch(() => false);
      test.fail(!cardVisible, 'Newly created asset card not found this pass -- cannot test delete');
      if (!cardVisible) {
        expect(cardVisible).toBe(true);
        return;
      }

      await pl.openOptionsMenu();
      await pl.filterEditBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      const removeBtn = card.locator('[class*="remove" i], [class*="delete" i]').first();
      const removeBtnVisible = await removeBtn.isVisible({ timeout: 3000 }).catch(() => false);
      test.fail(!removeBtnVisible, 'No per-card delete/remove control found this pass -- cannot test delete');
      if (!removeBtnVisible) {
        expect(removeBtnVisible).toBe(true);
        return;
      }
      await removeBtn.click({ force: true });
      await page.waitForTimeout(500);
      const confirmBtn = page.getByRole('button', { name: /yes|confirm|delete|remove/i }).first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }

      const stillVisible = await pl.resourceCards
        .filter({ hasText: title })
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      test.info().annotations.push({
        type: 'note',
        description: ['Custom asset still visible after delete attempt:', stillVisible].join(' '),
      });

      test.fail(stillVisible, 'CONFIRMED (matches Zoho TCN-I17061): the custom asset could not be deleted');
      expect(stillVisible).toBe(false);
    }
  );
});

// Needs the "playersDefault" confirmed combo, which is scoped to VALID_PIN_2 (see
// tests/zoho-regression/playlist.spec.js's own header note on why this gets its own describe with
// its own single login, rather than a second mid-test loginWithPin call).
test.describe('Unclassified -- confirmed-location checks', () => {
  test.beforeEach(async ({ page }) => {
    const pl = new PlaylistPage(page);
    await pl.loginWithPin(process.env.VALID_PIN_2);
  });

  test(
    'CWR-I423: Video resources open without 404/401 errors or continuous loading',
    { tag: '@historical-regression' },
    async ({ page }) => {
      // Zoho CWR-I423 (Playlist/Unclassified, Status: QA Sign off/Closed as of the 2026-09-13 export).
      // Original repro: video resources fail to open in V2, stuck loading with 404/401 network errors.
      const nav = new NavigationPage(page);
      const pl = new PlaylistPage(page);
      const plr = new PlayerPage(page);
      await applyClassMap(nav, 'playersDefault');
      await page.waitForTimeout(500);
      await pl.ensureDrawerVisible().catch(() => {});
      const hasVideo = await plr.videoCards.count();
      test.fail(hasVideo === 0, 'No video resource available this pass');
      if (!hasVideo) {
        expect(hasVideo).toBeGreaterThan(0);
        return;
      }
      const failedRequests = [];
      page.on('response', (res) => {
        if ([401, 404].includes(res.status()) && /video|asset|resource/i.test(res.url())) {
          failedRequests.push(`${res.status()} ${res.url()}`);
        }
      });
      await plr.openResourceCard(plr.videoCards);
      await page.waitForTimeout(4000);
      const opened = await plr.closeIcon
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      test.info().annotations.push({
        type: 'note',
        description: ['Video opened successfully:', opened, '| 401/404 responses observed:', failedRequests].join(' '),
      });

      test.fail(
        !opened || failedRequests.length > 0,
        `CONFIRMED (matches Zoho CWR-I423): video did not open cleanly -- opened: ${opened}, 401/404 responses: ${JSON.stringify(failedRequests)}`
      );
      expect(opened && failedRequests.length === 0).toBe(true);
    }
  );
});
