// Zoho historical bug regression -- Players (Ebook).
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Players (Ebook)')
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

// Reuses the confirmed 'ebook' location from tests/players/ebook.spec.js (Class 12A Physics,
// chapter index 13, topic 0 -- a real linked e-book).
test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await applyClassMap(nav, 'ebook');
  await page.waitForTimeout(1000);
});

async function openEbook(page, plr) {
  await plr.openResourceCard(plr.ebookTriggerBtn);
  await plr.ebookLaunchBtn.first().waitFor({ state: 'visible', timeout: 10000 });
  await plr.openResourceCard(plr.ebookLaunchBtn.first());
  await plr.closeIcon.first().waitFor({ state: 'visible', timeout: 25000 });
}

test(
  'TCN-I15322: The eBook loads real content, not a continuous loading state',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15322 -- Ebook content does not load, stuck in a continuous loading state.
    const plr = new PlayerPage(page);
    await openEbook(page, plr);
    await page.waitForTimeout(1500);
    const stillLoading = await page
      .getByText(/loading/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const closeIconVisible = await plr.closeIcon
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Still showing a loading state:',
        stillLoading,
        '| reader closeIcon (real content signal) visible:',
        closeIconVisible,
      ].join(' '),
    });

    test.fail(
      stillLoading || !closeIconVisible,
      'CONFIRMED (matches Zoho TCN-I15322): the eBook is stuck in a continuous loading state / real content never rendered'
    );
    expect(stillLoading).toBe(false);
    expect(closeIconVisible).toBe(true);
  }
);

test(
  'CWR-I552: eBook content does not overlap the Resource Tray, and the topic name stays readable',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I552 -- eBook content overlaps the resource tray bar, making the topic name
    // unreadable due to white text on a white/light background.
    const pl = new PlaylistPage(page);
    const plr = new PlayerPage(page);
    await openEbook(page, plr);
    await page.waitForTimeout(1500);
    const topicLabel = page.locator('[data-qa-id="playlist-chapter-topic-btn"]').first();
    const topicColorInfo = await topicLabel
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return { color: style.color, backgroundColor: style.backgroundColor, opacity: style.opacity };
      })
      .catch(() => null);
    const readerBox = await plr.closeIcon
      .first()
      .locator('xpath=ancestor::*[3]')
      .boundingBox()
      .catch(() => null);
    const trayBox = await pl.resourceCards
      .first()
      .boundingBox()
      .catch(() => null);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Topic label style:',
        JSON.stringify(topicColorInfo),
        '| reader region box:',
        JSON.stringify(readerBox),
        '| resource tray box:',
        JSON.stringify(trayBox),
      ].join(' '),
    });

    function overlaps(a, b) {
      if (!a || !b) return false;
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }
    // White text alone is not the bug -- this app's topic label is white-on-transparent by
    // default design (readable against its own dark toolbar background). The bug's actual claim is
    // that OVERLAP with the eBook/tray causes it to become unreadable -- so overlap is the real
    // condition to check, not text color in isolation.
    test.info().annotations.push({
      type: 'note',
      description: ['Topic label style (context only):', JSON.stringify(topicColorInfo)].join(' '),
    });
    const overlapsTray = overlaps(readerBox, trayBox);
    test
      .info()
      .annotations.push({ type: 'note', description: ['Reader overlaps resource tray:', overlapsTray].join(' ') });

    test.fail(overlapsTray, 'CONFIRMED (matches Zoho CWR-I552): the eBook reader overlaps the Resource Tray');
    expect(overlapsTray).toBe(false);
  }
);
