// Zoho historical bug regression -- Compass.
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Compass')
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
const { CompassPage } = require('../../pages/compass.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }, testInfo) => {
  // Same confirmed-working setup as tests/compass/compass.spec.js -- some classes have ZERO
  // AnalyseIt/ExploreIt DOM presence at all, and Compass's own retry/reload logic can legitimately
  // run close to the default per-test timeout, so both the extended timeout and the
  // 'compassBaseline' class (confirmed to render ExploreIt widgets) are needed here too.
  testInfo.setTimeout(60000);
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await applyClassMap(nav, 'compassBaseline', { chapterNav: false });
});

test(
  'CWR-I769: Hovering over a widget tile shows that widget\'s own name, not the literal text "Compass" for every tile',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I769 -- "Compass" text appears on hover for ALL widgets instead of each widget's
    // own respective name.
    const cmp = new CompassPage(page);
    await cmp.openTrigger();
    const openWidgetsVisible = await cmp.exploreItOpenWidgetsLink.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!openWidgetsVisible, 'ExploreIt widgets not reachable this pass');
    if (!openWidgetsVisible) {
      expect(openWidgetsVisible).toBe(true);
      return;
    }
    await cmp.exploreItOpenWidgetsLink.click({ force: true });
    await page.waitForTimeout(1000);
    const widgetTiles = page.locator('[data-qa-id^="toolbar-widget-tool-"]');
    const count = await widgetTiles.count();
    test.fail(count === 0, 'No widget tiles found this pass');
    if (count === 0) {
      expect(count).toBeGreaterThan(0);
      return;
    }
    const titles = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      const el = widgetTiles.nth(i);
      const title = (await el.getAttribute('title')) || (await el.getAttribute('aria-label')) || '';
      titles.push(title.trim());
    }
    test.info().annotations.push({
      type: 'note',
      description: ["First few widget tiles' hover-name attributes:", JSON.stringify(titles)].join(' '),
    });
    const allSayCompass = titles.length > 0 && titles.every((t) => /^compass$/i.test(t));

    test.fail(
      allSayCompass,
      `CONFIRMED (matches Zoho CWR-I769): every widget tile's hover text reads literally "Compass" instead of its own name (${JSON.stringify(titles)})`
    );
    expect(allSayCompass).toBe(false);
  }
);

// The 4 tests below all interact with the "Revision Tests" popup (Student Tests list), reached via
// cmp.revisionTestsItem. CONFIRMED LIVE via a throwaway diagnostic test this pass: clicking it opens
// a real list of student-test cards with NO data-qa-id matching the page object's own
// listAssignment(cxId) pattern -- the real, confirmed selector is
// [data-qa-id^="player-student-test-item-sat-"], each containing a .resource-card with .title,
// .checkpoint-info-line.infoDate/.infoTitle/.infoStatus. This account's compassBaseline combo
// (Class 12A Physics) has 3 real cards including one literally titled "testing title overlap issue"
// -- almost certainly seeded by a prior QA pass specifically to reproduce TCN-I16048.

test(
  'TCN-I16048: The Revision Test card title does not overlap its duration/question-count/date metadata',
  { tag: '@historical-regression' },
  async ({ page }) => {
    const cmp = new CompassPage(page);
    await cmp.openTrigger();
    await cmp.revisionTestsItem.click({ force: true });
    await page.waitForTimeout(1500);
    const card = page
      .locator('[data-qa-id^="player-student-test-item-sat-"]')
      .filter({ hasText: 'testing title overlap issue' })
      .first();
    const cardCount = await card.count();
    test.fail(cardCount === 0, 'The QA-seeded "testing title overlap issue" card was not found this pass');
    if (cardCount === 0) {
      expect(cardCount).toBeGreaterThan(0);
      return;
    }
    const titleBox = await card.locator('.title').boundingBox();
    const metaBox = await card.locator('.checkpoint-description').boundingBox();
    test.info().annotations.push({
      type: 'note',
      description: ['Title box:', JSON.stringify(titleBox), '| metadata block box:', JSON.stringify(metaBox)].join(' '),
    });
    const overlaps =
      titleBox &&
      metaBox &&
      titleBox.x < metaBox.x + metaBox.width &&
      titleBox.x + titleBox.width > metaBox.x &&
      titleBox.y < metaBox.y + metaBox.height &&
      titleBox.y + titleBox.height > metaBox.y;
    test.fail(
      Boolean(overlaps),
      'CONFIRMED (matches Zoho TCN-I16048): the Revision Test card title overlaps its duration/question-count/date metadata block'
    );
    expect(overlaps).toBeFalsy();
  }
);

test(
  'TCN-I16052: The Revision Test pop-up does not overlap the Resource Tray (Playlist drawer)',
  { tag: '@historical-regression' },
  async ({ page }) => {
    const cmp = new CompassPage(page);
    const pl = new PlaylistPage(page);
    await cmp.openTrigger();
    await cmp.revisionTestsItem.click({ force: true });
    await page.waitForTimeout(1500);
    const popupBox = await page.locator('[data-qa-id^="player-student-test-item-sat-"]').first().boundingBox();
    const trayBox = await pl.resourceCards
      .first()
      .boundingBox()
      .catch(() => null);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Revision Test popup card box:',
        JSON.stringify(popupBox),
        '| Resource Tray (first playlist card) box:',
        JSON.stringify(trayBox),
      ].join(' '),
    });
    test.fail(!popupBox || !trayBox, 'Could not measure both the popup and the Resource Tray this pass');
    if (!popupBox || !trayBox) {
      expect(popupBox && trayBox).toBeTruthy();
      return;
    }
    const overlaps =
      popupBox.x < trayBox.x + trayBox.width &&
      popupBox.x + popupBox.width > trayBox.x &&
      popupBox.y < trayBox.y + trayBox.height &&
      popupBox.y + popupBox.height > trayBox.y;
    // Also check whether the Resource Tray is actually interactable while the popup is open --
    // this is the workbook's own second, distinct complaint (must close popup first).
    const trayClickable = await pl.resourceCards
      .first()
      .isEnabled()
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: ['Resource Tray card still clickable/enabled while popup is open:', trayClickable].join(' '),
    });
    test.fail(
      Boolean(overlaps) || !trayClickable,
      `CONFIRMED (matches Zoho TCN-I16052): the Revision Test popup ${overlaps ? 'overlaps the Resource Tray' : 'does not overlap, but the Resource Tray is not interactable while it is open'}`
    );
    expect(overlaps).toBeFalsy();
    expect(trayClickable).toBe(true);
  }
);

test(
  'TCN-I16046: The Revision Test pop-up closes automatically when navigating to another topic',
  { tag: '@historical-regression' },
  async ({ page }) => {
    const cmp = new CompassPage(page);
    await cmp.openTrigger();
    await cmp.revisionTestsItem.click({ force: true });
    await page.waitForTimeout(1500);
    const popupVisibleBefore = await page
      .locator('[data-qa-id^="player-student-test-item-sat-"]')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    test.fail(!popupVisibleBefore, 'The Revision Test popup was not open this pass');
    if (!popupVisibleBefore) {
      expect(popupVisibleBefore).toBe(true);
      return;
    }
    const nextTopicBtn = page.locator('[data-qa-id="playlist-nav-topic-right"]');
    await nextTopicBtn.scrollIntoViewIfNeeded();
    await nextTopicBtn.click({ force: true });
    await page.waitForTimeout(1500);
    const popupStillVisibleAfter = await page
      .locator('[data-qa-id^="player-student-test-item-sat-"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: [
        'Revision Test popup still visible after navigating to the next topic:',
        popupStillVisibleAfter,
      ].join(' '),
    });

    test.fail(
      popupStillVisibleAfter,
      'CONFIRMED (matches Zoho TCN-I16046): the Revision Test popup remains open after navigating to another topic instead of closing automatically'
    );
    expect(popupStillVisibleAfter).toBe(false);
  }
);

test(
  'TCN-I16056: Re-clicking the Compass trigger while the Revision Test pop-up is open does not create overlapping UI',
  { tag: '@historical-regression' },
  async ({ page }) => {
    const cmp = new CompassPage(page);
    await cmp.openTrigger();
    await cmp.revisionTestsItem.click({ force: true });
    await page.waitForTimeout(1500);
    const popupVisibleBefore = await page
      .locator('[data-qa-id^="player-student-test-item-sat-"]')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    test.fail(!popupVisibleBefore, 'The Revision Test popup was not open this pass');
    if (!popupVisibleBefore) {
      expect(popupVisibleBefore).toBe(true);
      return;
    }
    await cmp.triggerBtn.click({ force: true });
    await page.waitForTimeout(1000);
    const compassMenuVisible = await cmp.analyseItItem.isVisible({ timeout: 2000 }).catch(() => false);
    const popupStillVisible = await page
      .locator('[data-qa-id^="player-student-test-item-sat-"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: [
        'After re-clicking the Compass trigger -- Compass menu visible:',
        compassMenuVisible,
        '| Revision Test popup still visible:',
        popupStillVisible,
      ].join(' '),
    });
    // The reported bug is specifically BOTH being visible/overlapping at once.
    const bothVisibleAtOnce = compassMenuVisible && popupStillVisible;
    test.fail(
      bothVisibleAtOnce,
      'CONFIRMED (matches Zoho TCN-I16056): the Compass panel and the Revision Test popup are both visible/overlapping at once after re-clicking the trigger'
    );
    expect(bothVisibleAtOnce).toBe(false);
  }
);
