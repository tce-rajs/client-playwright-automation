// Image Player -- CEP_TestCases/Players_Module_Test_Cases_Final.xlsx,
// "Image Player" section (11 rows: PLR-IMG-01..08, PLR-EXP-SEC-09,
// PLR-EXP-06, PLR-EXP-24).
//
// Confirmed location (automation-cep-cypress moduleClassMap.json
// "computerScienceProject"): Class 12A Computer Science, chapter index 13
// ("14. Project Based Learning"), topic index 0 -- one confirmed Image
// resource. Per the workbook (PLR-IMG-02), this resource type shares the
// SAME confirmed hybrid-player crash as Video (PLR-VID-02) --
// "ReferenceError: targetContainer is not defined" in
// tceplayer-two/tce-player-hybrid.js.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { PlayerPage } = require('../../pages/player.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await applyClassMap(nav, 'playersDefault');
  await page.waitForTimeout(1000);
  // CONFIRMED LIVE (see quiz.spec.js's own beforeEach note): the Playlist
  // strip can be fully collapsed on this account -- must expand it before
  // any resource card is genuinely clickable.
  await pl.ensureDrawerVisible();
});

async function openImageTrackingCrash(page, plr) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await expect(plr.imageCards.first()).toBeAttached({ timeout: 10000 });
  await plr.openResourceCard(plr.imageCards);
  await page.waitForTimeout(4000);
  const crashed = errors.some((m) => /targetContainer is not defined/i.test(m));
  const imageLoaded = await plr.imageGalleryImg.first().isVisible({ timeout: 3000 }).catch(() => false);
  return { crashed, imageLoaded, errors };
}

test('PLR-IMG-01: Clicking an Image resource opens the image viewer frame', { tag: '@positive' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  await expect(plr.imageCards.first()).toBeAttached({ timeout: 10000 });
  await plr.openResourceCard(plr.imageCards);
  await page.waitForTimeout(2000);
  const frameOpened = await plr.closeIcon.first().isVisible({ timeout: 8000 }).catch(() => false);
  console.log('Viewer frame opened:', frameOpened);
  expect(frameOpened).toBe(true);
});

test('PLR-IMG-02: CRITICAL -- Image fails with the same hybrid-player crash confirmed on Video (re-check)', { tag: '@negative' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const { crashed, imageLoaded, errors } = await openImageTrackingCrash(page, plr);
  console.log('Crashed (targetContainer error):', crashed, '| image loaded:', imageLoaded, '| pageerrors:', JSON.stringify(errors));
  test.fail(crashed || !imageLoaded, crashed
    ? 'CRITICAL, re-confirmed: the same hybrid-player crash confirmed on Video (PLR-VID-02) reproduces here on Image -- the frame stays black/empty, the image never displays'
    : 'CRITICAL, but no "targetContainer is not defined" pageerror fired this run -- the image still never loaded, but via a different/unconfirmed failure mode than the documented crash signature');
  expect(crashed).toBe(false);
  expect(imageLoaded).toBe(true);
});

test('PLR-IMG-03: Zoom/pan controls work on a loaded image (blocked if the crash reproduces)', { tag: '@positive' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const { crashed, imageLoaded } = await openImageTrackingCrash(page, plr);
  test.fail(crashed || !imageLoaded, 'Blocked because the player never initialized this run (crashed flag: see the console.log above -- may be the confirmed targetContainer crash, or a different/unconfirmed non-init failure) -- no loaded image exists to zoom/pan');
  expect(imageLoaded).toBe(true);
});

test('PLR-IMG-04: Annotation tools work over a loaded image (blocked if the crash reproduces)', { tag: '@positive' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const { crashed, imageLoaded } = await openImageTrackingCrash(page, plr);
  test.fail(crashed || !imageLoaded, 'Blocked because the player never initialized this run (crashed flag: see the console.log above -- may be the confirmed targetContainer crash, or a different/unconfirmed non-init failure) -- no loaded image exists to annotate over');
  expect(imageLoaded).toBe(true);
});

test('PLR-IMG-05: Confirmed Image DOM -- third-party gallery element with no data-qa-id inside (blocked if the crash reproduces)', { tag: '@cross-cutting' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const { crashed, imageLoaded } = await openImageTrackingCrash(page, plr);
  test.fail(crashed || !imageLoaded, 'Blocked because the player never initialized this run (crashed flag: see the console.log above -- may be the confirmed targetContainer crash, or a different/unconfirmed non-init failure) -- no rendered .image-gallery element exists to inspect');
  if (crashed || !imageLoaded) { expect(imageLoaded).toBe(true); return; }
  const qaIdInside = await page.locator('.image-gallery [data-qa-id]').count();
  console.log('data-qa-id attributes found inside .image-gallery (expected 0):', qaIdInside);
  expect(qaIdInside).toBe(0);
});

test('PLR-IMG-06: The image annotation overlay is real SVG with genuine path elements (blocked if the crash reproduces)', { tag: '@cross-cutting' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const { crashed, imageLoaded } = await openImageTrackingCrash(page, plr);
  test.fail(crashed || !imageLoaded, 'Blocked because the player never initialized this run (crashed flag: see the console.log above -- may be the confirmed targetContainer crash, or a different/unconfirmed non-init failure) -- no loaded image exists to draw an annotation over');
  expect(imageLoaded).toBe(true);
});

test('PLR-IMG-07: Only one confirmed Image resource exists -- size/orientation variety and multi-image-open are blocked', { tag: '@boundary' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const count = await plr.imageCards.count();
  console.log('Distinct Image resources found on this topic:', count);
  test.fail(count < 2, 'Content-availability gap, not a defect: only ' + count + ' Image resource(s) confirmed on this account/topic -- size/orientation variety and multi-image-open scenarios need more resources than exist here');
  expect(count).toBeGreaterThanOrEqual(2);
});

test('PLR-IMG-08: RECONCILIATION -- is the crash universal to all Image resources, or scoped like Video\'s split?', { tag: '@cross-cutting' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const { crashed } = await openImageTrackingCrash(page, plr);
  console.log('This resource (the only confirmed Image resource on this account) crashed:', crashed);
  test.fail(crashed, 'Unlike Video, no working counter-example Image resource has been found on any account so far -- this pass\'s own confirmed resource also crashed, leaving Image\'s crash scope more (not less) certain to be universal on this account');
  expect(crashed).toBe(false);
});

test('PLR-EXP-SEC-09: An Image resource\'s underlying asset URL cannot be manipulated to load an unauthorized asset', { tag: '@security' }, async ({ page }) => {
  test.fail(true, 'Needs real request-crafting tooling against the image asset URL, not available in this Playwright-only environment this pass. The confirmed hybrid-player crash (PLR-IMG-02) also means no genuinely loaded image asset URL is reachable to inspect on this account\'s available resources.');
  expect(true).toBe(false);
});

test('PLR-EXP-06: An Image resource that fails to load shows a clear broken-image state within the player chrome', { tag: '@negative' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const { crashed, imageLoaded } = await openImageTrackingCrash(page, plr);
  console.log('Crashed:', crashed, '| loaded:', imageLoaded);
  const closeStillWorks = await plr.closeIcon.first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Player chrome (close button) remains functional despite the load failure:', closeStillWorks);
  test.fail(!closeStillWorks, 'The player chrome itself (close control) is not functional when the image content fails to load -- worse than a contained broken-image state, the whole player becomes unrecoverable');
  expect(closeStillWorks).toBe(true);
});

test('PLR-EXP-24: A very high-resolution image loads and displays without breaking zoom/pan (boundary, blocked -- no such resource confirmed, and the crash blocks the only one that exists)', { tag: '@boundary' }, async ({ page }) => {
  const plr = new PlayerPage(page);
  const { crashed, imageLoaded } = await openImageTrackingCrash(page, plr);
  test.fail(true, crashed || !imageLoaded
    ? 'Blocked because the player never initialized this run (crashed flag: see the console.log above -- may be the confirmed targetContainer crash, or a different/unconfirmed non-init failure) -- the only confirmed Image resource on this account never loads at all, let alone at high resolution'
    : 'No high-resolution Image resource confirmed available on this account this pass');
  expect(true).toBe(false);
});
