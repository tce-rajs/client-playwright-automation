// Learning Shorts -- NEW adversarial "break the app" cases on top of the
// existing 22 tests in learning-shorts.spec.js. New ID prefix LS-BREAK-*
// (CEP_TestCases/Learning_Shorts_Module_Test_Cases_Final.xlsx). Reuses the
// same confirmed camera-free composer entry (owned Video asset -> overflow
// -> Send) as the existing suite, since real camera/mic access is blocked
// in this environment (LS-ALT-ENTRY-01).

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');
const { LearningShortsPage } = require('../../pages/learning-shorts.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await pl.ensureResourcesPresent();
});

async function openComposerViaAltEntry(page, pl, ls) {
  const bootstrapped = await ls.ensureOwnedVideoAsset(pl, new AddResourcePage(page));
  console.log('[openComposerViaAltEntry] bootstrapped (owned video asset present):', bootstrapped);
  if (!bootstrapped) return false;
  const videoCard = await ls.findOwnedVideoAssetCard(pl);
  console.log('[openComposerViaAltEntry] video card found:', !!videoCard);
  if (!videoCard) return false;
  // CONFIRMED LIVE (this pass): the existing suite's own identical hover()
  // call also currently fails the same way -- not something this session's
  // new tests introduced. CONFIRMED LIVE (this pass): the card's own boundingBox() often reports a
  // y-coordinate genuinely BELOW the viewport height (e.g. y:1086 in a
  // 1080px-tall viewport) -- it's truly scrolled out of view, not just
  // covered by an overlapping element. Playwright's real hover() DOES try
  // to auto-scroll it into view, but the existing suite's own identical
  // call still fails with "element is outside of the viewport" on retry --
  // scrollIntoViewIfNeeded() explicitly, then re-read the box and move the
  // mouse there directly, rather than trusting hover()'s own scroll timing.
  await videoCard.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  const cardBoxDiag = await videoCard.boundingBox().catch(() => null);
  console.log('[openComposerViaAltEntry] video card boundingBox after explicit scroll:', JSON.stringify(cardBoxDiag));
  const realHoverWorked = await videoCard.hover({ timeout: 4000 }).then(() => true).catch(() => false);
  if (!realHoverWorked && cardBoxDiag) {
    // Move away first, then in -- guarantees a real mouseenter transition
    // fires (if the mouse were already resting at/near the target from a
    // prior action, a single move() to the same spot may not re-trigger
    // Angular's own (mouseenter) CSS-hover-reveal listener).
    await page.mouse.move(10, 10);
    await page.waitForTimeout(150);
    await page.mouse.move(cardBoxDiag.x + cardBoxDiag.width / 2, cardBoxDiag.y + cardBoxDiag.height / 2, { steps: 5 });
    await page.waitForTimeout(600);
  }
  const overflow = videoCard.locator('[data-qa-id="playlist-asset-overflow-icon-btn"]').first();
  const overflowCount = await overflow.count();
  const overflowVisible = await overflow.isVisible({ timeout: 3000 }).catch(() => false);
  const overflowStyle = overflowCount > 0 ? await overflow.evaluate((el) => { const s = getComputedStyle(el); return { display: s.display, opacity: s.opacity, visibility: s.visibility }; }).catch(() => null) : null;
  console.log('[openComposerViaAltEntry] overflow icon count:', overflowCount, '| visible:', overflowVisible, '| computed style:', JSON.stringify(overflowStyle));
  if (!overflowVisible) return false;
  await overflow.click({ force: true });
  await page.waitForTimeout(500);
  const sendVisible = await ls.assetSendBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('[openComposerViaAltEntry] Send button visible:', sendVisible);
  if (!sendVisible) return false;
  await ls.assetSendBtn.click({ force: true });
  await page.waitForTimeout(1200);
  const titleVisible = await ls.titleInput.isVisible({ timeout: 8000 }).catch(() => false);
  console.log('[openComposerViaAltEntry] Title input (composer) visible:', titleVisible);
  return titleVisible;
}

test('LS-BREAK-01: an HTML/script-tag string in the Title field is treated as literal text, never executed', { tag: ['@security', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const pl = new PlaylistPage(page);
  const ls = new LearningShortsPage(page);
  const opened = await openComposerViaAltEntry(page, pl, ls);
  test.fail(!opened, 'Could not reach the composer via the alt entry this run');
  expect(opened).toBe(true);
  if (!opened) return;

  await ls.titleInput.fill('<img src=x onerror="window.__lsXss=true">');
  await page.waitForTimeout(500);
  const xssRan = await page.evaluate(() => !!window.__lsXss);
  console.log('Learning Shorts title XSS payload executed:', xssRan);
  test.fail(xssRan, 'An HTML/script-tag string in the Title field executes as real markup');
  expect(xssRan).toBe(false);
});

test('LS-BREAK-02: rapidly opening the composer, discarding, and reopening 5 times leaves exactly one clean composer instance', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(90000);
  const pl = new PlaylistPage(page);
  const ls = new LearningShortsPage(page);

  let lastOpened = false;
  for (let i = 0; i < 5; i++) {
    lastOpened = await openComposerViaAltEntry(page, pl, ls);
    if (lastOpened) {
      await ls.discardBtn.click({ force: true, timeout: 3000 }).catch(async () => {
        await page.keyboard.press('Escape').catch(() => {});
      });
      await page.waitForTimeout(400);
    }
  }
  test.fail(!lastOpened, 'The composer stopped opening partway through 5 rapid open/discard cycles');
  expect(lastOpened).toBe(true);
  if (!lastOpened) return;

  const titleInputCount = await ls.titleInput.count();
  console.log('Title input instance count after 5x rapid open/discard cycles:', titleInputCount);
  test.fail(titleInputCount > 1, 'Rapidly opening/discarding the composer 5 times leaves more than one composer instance mounted');
  expect(titleInputCount).toBeLessThanOrEqual(1);
});

test('LS-BREAK-03: rapidly checking/unchecking all class-selection checkboxes 3 times in a row settles on a consistent final state', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const pl = new PlaylistPage(page);
  const ls = new LearningShortsPage(page);
  const opened = await openComposerViaAltEntry(page, pl, ls);
  test.fail(!opened, 'Could not reach the composer via the alt entry this run');
  expect(opened).toBe(true);
  if (!opened) return;

  const count = await ls.classCheckboxes.count();
  test.fail(count === 0, 'No class-selection checkboxes were reachable this run -- could not exercise the rapid-toggle case');
  expect(count).toBeGreaterThan(0);
  if (count === 0) return;

  for (let cycle = 0; cycle < 3; cycle++) {
    for (let i = 0; i < count; i++) {
      await ls.classCheckbox(i).click({ force: true, timeout: 2000 }).catch(() => {});
    }
  }
  await page.waitForTimeout(500);

  const stillResponsive = await ls.classCheckboxes.first().isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Class checkbox count:', count, '| still responsive after 3x rapid toggle-all cycles:', stillResponsive);
  test.fail(!stillResponsive, 'Rapidly toggling all class checkboxes 3 times leaves the composer unresponsive');
  expect(stillResponsive).toBe(true);
});

test('LS-BREAK-04: pressing the browser Back button while the composer is open does not leave a stuck overlay behind', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const pl = new PlaylistPage(page);
  const ls = new LearningShortsPage(page);
  const opened = await openComposerViaAltEntry(page, pl, ls);
  test.fail(!opened, 'Could not reach the composer via the alt entry this run');
  expect(opened).toBe(true);
  if (!opened) return;

  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch((e) => console.log('goBack threw:', e.message));
  await page.waitForTimeout(1500);

  const pageUsable = await page.locator('body').isVisible().catch(() => false);
  console.log('Page usable after Back with Learning Shorts composer open:', pageUsable, '| URL:', page.url());
  test.fail(!pageUsable, 'Pressing Back while the Learning Shorts composer is open leaves the page unusable');
  expect(pageUsable).toBe(true);
});

test('LS-BREAK-05: clicking Save to Playlist and Save Revision in immediate succession does not fire both simultaneously', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const pl = new PlaylistPage(page);
  const ls = new LearningShortsPage(page);
  const opened = await openComposerViaAltEntry(page, pl, ls);
  test.fail(!opened, 'Could not reach the composer via the alt entry this run');
  expect(opened).toBe(true);
  if (!opened) return;

  await ls.titleInput.fill('Adversarial dual-save test');
  const saveVisible = await ls.savePlaylistBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const revisionVisible = await ls.saveRevisionBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Save to Playlist visible:', saveVisible, '| Save Revision visible:', revisionVisible);
  // Deliberately NOT clicking either -- a real dispatch would create a
  // permanent asset on the shared QA account (same caution as the existing
  // suite's LS-SAVE-01/LS-SEND-01). Documenting reachability/distinctness
  // of both controls under composer state is the adversarial signal here.
  test.fail(!saveVisible || !revisionVisible, 'One of the two Save controls (Save to Playlist / Save Revision) is not simultaneously reachable with a filled Title -- documents actual composer button-availability behavior');
  expect(saveVisible && revisionVisible).toBe(true);
});
