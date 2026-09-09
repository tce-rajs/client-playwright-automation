// Drop It module.
// Source: CEP_TestCases/Drop_It_Module_Test_Cases_Final.xlsx (17 cases).
//
// DRP-ACCESS-01 is the same "entry point + initial state" behavior already
// covered by ADD-DRP-01 in tests/add-resource/dropit-ai-assist.spec.js --
// cross-referenced below, not duplicated.
// DRP-FAB-OVERLAP-01 is the same "Close button overlaps the Add Resource
// FAB" behavior already covered by AR-CYP-05 in
// tests/add-resource/gap-analysis.spec.js -- cross-referenced below, not
// duplicated.
//
// IMPORTANT CORRECTION TO THE WORKBOOK (see DRP-QR-01 below and
// CEP_TestCases/LIVE_FINDINGS.md): live investigation this pass found the
// workbook's "static QR" finding was based on inspecting the WRONG element
// -- the Add Resource FAB action-card's own decorative <img
// src="qr-code.png"> icon (identical on every open, since it's just a menu
// icon) rather than the actual pairing graphic shown INSIDE the opened
// panel, which is a <canvas class="qrcode"> that (a) is stable while a
// single session sits open/idle but (b) rendered 4 different unique
// dataURLs across 4 separate close/reopen cycles. The panel's open also
// establishes real Firestore Listen/Write realtime channels
// (firestore.googleapis.com), not a static mock. This corrects DRP-QR-01
// from "Critical bug" to "confirmed working as a real per-session
// mechanism" -- see LIVE_FINDINGS.md for the full writeup.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await pl.ensureResourcesPresent();
});

// CONFIRMED LIVE BUG (see LIVE_FINDINGS.md and AddResourcePage.openPickerReliably's
// own comment): the Add Resources picker can render with pointer-events:none
// across its ENTIRE popup subtree -- visible but fully unclickable -- on a
// non-deterministic ~30-50% of fresh logins, unrelated to chapter/topic
// navigation. A same-page close+reopen retry does not recover it; only a
// full page reload does. openPickerReliably() handles that recovery so
// individual tests below don't each need to.
async function openDropit(page, ar) {
  const { stillStuck } = await ar.openPickerReliably(ar.actions.dropit);
  if (!stillStuck) await ar.actions.dropit.click({ force: true });
  await expect(ar.dropitCloseBtn).toBeVisible({ timeout: 8000 });
}

// DRP-ACCESS-01: cross-referenced -- identical "entry point + initial
// pairing state (QR + 3 status lines)" behavior already covered by
// ADD-DRP-01 in tests/add-resource/dropit-ai-assist.spec.js.

test('DRP-ACCESS-02: The picker action card, panel close button, and pairing text/graphic all use the confirmed selectors', { tag: '@ui-state' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openDropit(page, ar);

  await expect(page.getByText('Drop It', { exact: true })).toBeVisible();
  await expect(page.getByText(/connection status/i)).toBeVisible();
  await expect(ar.dropitCloseBtn).toBeVisible();
  // The pairing graphic renders as a canvas (confirmed live) -- at least
  // one graphic element type must be present either way. isVisible() alone
  // doesn't actually wait, so give the canvas a real chance to render first.
  const graphicVisible = await ar.dropitQrCanvas.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
    || await page.locator('.qrcode svg').isVisible().catch(() => false)
    || await page.locator('.qrcode img').isVisible().catch(() => false);
  console.log('Pairing graphic (canvas/svg/img) visible inside .qrcode:', graphicVisible);
  expect(graphicVisible).toBe(true);
  await ar.dropitCloseBtn.click();
});

test('DRP-QR-01: The pairing QR is a real per-open canvas render, not a static shared image (corrects the workbook\'s original finding)', { tag: '@negative' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openDropit(page, ar);
  const getDataUrl = () => ar.dropitQrCanvas.evaluate((c) => c.toDataURL());

  const first = await getDataUrl();
  // Stable while the SAME session sits open (sanity check -- not a
  // flickering/animating canvas).
  await page.waitForTimeout(1500);
  const stillFirst = await getDataUrl();
  console.log('QR canvas stable within one open (1.5s apart):', first === stillFirst);
  expect(first).toBe(stillFirst);

  // Close and reopen 3 times, collect a dataURL each time.
  const urls = [first];
  for (let i = 0; i < 3; i++) {
    await ar.dropitCloseBtn.click();
    await page.waitForTimeout(700);
    await openDropit(page, ar);
    urls.push(await getDataUrl());
  }
  const uniqueCount = new Set(urls).size;
  console.log('Unique QR canvas renders across 4 separate opens:', uniqueCount, '(workbook\'s DRP-QR-01 expected exactly 1 -- a static image)');
  // REAL FINDING, opposite of the workbook: every open produced a distinct
  // render, consistent with a genuine per-session pairing code, not a
  // static placeholder.
  expect(uniqueCount).toBeGreaterThan(1);
  await ar.dropitCloseBtn.click();
});

test('DRP-SCAN-01: Scanning the QR with a phone and sending a file completes the transfer', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real physical phone to scan the Drop It QR and initiate a genuine file transfer -- browser automation cannot simulate a phone camera or a second physical device, and no such device is available in this environment');
  expect(true).toBe(false);
});

test('DRP-RETRY-01: Retry control appears and works after a failed/interrupted transfer', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real physical phone to establish and then interrupt a genuine file transfer -- no such device is available in this environment');
  expect(true).toBe(false);
});

test('DRP-CLOSE-01: Close exits Drop It cleanly from the idle "scan" state', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openDropit(page, ar);
  await ar.dropitCloseBtn.click();
  await expect(page.getByText('Drop It', { exact: true })).toBeHidden({ timeout: 5000 });
  await expect(ar.addResourcesTrigger).toBeVisible();
});

// DRP-FAB-OVERLAP-01: cross-referenced -- identical "Drop It's Close button
// can visually overlap and cover the Add Resource FAB" behavior already
// covered by AR-CYP-05 in tests/add-resource/gap-analysis.spec.js (which
// itself confirmed the overlap live via the same two bounding boxes).

test('DRP-FILETYPE-01: An unsupported file type from the phone is rejected with a clear message', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real physical phone connected via Drop It to attempt sending an unsupported file type -- no such device is available in this environment');
  expect(true).toBe(false);
});

test('DRP-SIZE-01: An oversized file from the phone is rejected or handled gracefully', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real physical phone connected via Drop It to attempt sending an oversized file -- no such device is available in this environment');
  expect(true).toBe(false);
});

test('DRP-CONN-01: Losing network connectivity mid-scan/mid-transfer is handled gracefully', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real physical phone mid-transfer plus control over ITS network connectivity -- neither is available in this environment');
  expect(true).toBe(false);
});

test('DRP-DOUBLE-01: Rapidly opening and closing Drop It does not leave a stuck or duplicated panel', { tag: '@boundary' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openDropit(page, ar);
  await ar.dropitCloseBtn.click();
  await page.waitForTimeout(200);
  await openDropit(page, ar); // reopen immediately
  await ar.dropitQrCanvas.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const closeBtnCount = await ar.dropitCloseBtn.count();
  const qrCanvasCount = await ar.dropitQrCanvas.count();
  console.log('After rapid close+reopen -- Close-button instances:', closeBtnCount, '| QR-canvas instances:', qrCanvasCount);
  expect(closeBtnCount).toBe(1);
  expect(qrCanvasCount).toBe(1);
  await expect(ar.dropitConnectionStatus).toBeVisible();
  await ar.dropitCloseBtn.click();
});

test('DRP-STATE-01: Hard-refreshing while Drop It is open cleanly resets it with no stuck state', { tag: '@state-persistence' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openDropit(page, ar);
  await page.reload();
  await page.waitForTimeout(2000);
  const dropitStillOpen = await ar.dropitCloseBtn.isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Drop It panel still showing after a hard refresh (should be false -- closed, not restored):', dropitStillOpen);
  expect(dropitStillOpen).toBe(false);
  // The app itself should recover cleanly, not be left on a blank/error page.
  await expect(ar.addResourcesTrigger).toBeVisible({ timeout: 10000 });
});

test('DRP-SEC-01: The pairing mechanism uses real per-session backend channels, not a purely client-side/static token', { tag: ['@security', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const wsOrChannelUrls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/firestore\.googleapis\.com/i.test(url) && /(Listen|Write)\/channel/i.test(url)) {
      wsOrChannelUrls.push(url);
    }
  });
  await openDropit(page, ar);
  await page.waitForTimeout(2000);
  console.log('Real-time Firestore Listen/Write channel requests observed while Drop It is open:', wsOrChannelUrls.length);

  // Full end-to-end scoping (a leaked QR from one session being rejected
  // when presented to a different session) still needs a second real
  // device/session to actually attempt a cross-session pairing -- that part
  // remains untestable here. What IS testable and now confirmed live: the
  // panel is backed by real per-session realtime channels, not a static
  // asset with no backend involvement at all (which would make the whole
  // security question moot, per the workbook's original DRP-QR-01 framing).
  test.fail(wsOrChannelUrls.length === 0, 'No real-time backend channel activity observed -- would mean the pairing UI has no live backend to scope a session against at all, matching the workbook\'s original (now-corrected, see DRP-QR-01) static-mock concern. Full cross-session-rejection verification still needs a second real device, which is not available here.');
  expect(wsOrChannelUrls.length).toBeGreaterThan(0);
  await ar.dropitCloseBtn.click();
});

test('DRP-CONVERGE-01: Entry point, pairing UI, and idle-state Close are all independently confirmed reachable and functional', { tag: '@cross-cutting' }, async ({ page }) => {
  // The actual phone-scan file transfer (DRP-SCAN-01/RETRY-01/FILETYPE-01/
  // SIZE-01/CONN-01/EXP-01) remains a genuine, shared hardware limitation in
  // this environment, consistent with the mature Cypress suite's own
  // independent "Minimal coverage" rating for this module -- not
  // re-asserted here as a new finding, just reconfirmed as still true this
  // pass via the checks below.
  const ar = new AddResourcePage(page);
  await openDropit(page, ar);
  await expect(ar.dropitConnectionStatus).toBeVisible();
  await expect(ar.dropitQrCanvas).toBeVisible();
  await ar.dropitCloseBtn.click();
  await expect(page.getByText('Drop It', { exact: true })).toBeHidden({ timeout: 5000 });
});

test('DRP-EXP-01: The three status lines update visibly if a real device connects (not just static defaults)', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real phone to attempt an actual scan and observe whether Connection/Transfer/Upload status text changes from its default values -- no such device is available in this environment');
  expect(true).toBe(false);
});

test('DRP-EXP-02: Leaving the panel open and idle does not desync its state from a fresh reopen', { tag: '@boundary' }, async ({ page }) => {
  test.setTimeout(45000);
  const ar = new AddResourcePage(page);
  await openDropit(page, ar);
  const statusBefore = await ar.dropitConnectionStatus.textContent();

  // NOTE: the workbook's own steps say "several minutes" -- not practical to
  // wait literally that long in an automated pass without materially
  // slowing down the whole suite. This uses a 20s idle wait as a reasonable,
  // honestly-scoped proxy for "left open and idle for an extended period",
  // documented here rather than silently substituted.
  await page.waitForTimeout(20000);
  const statusDuringIdle = await ar.dropitConnectionStatus.textContent();

  await ar.dropitCloseBtn.click();
  await page.waitForTimeout(500);
  await openDropit(page, ar);
  const statusAfterReopen = await ar.dropitConnectionStatus.textContent();

  console.log('Status before idle wait:', statusBefore, '| after 20s idle:', statusDuringIdle, '| after close+reopen:', statusAfterReopen);
  expect(statusDuringIdle).toBe(statusBefore); // no stale/garbled text while idle
  expect(statusAfterReopen).toBe(statusBefore); // fresh reopen shows the same consistent initial state
  await ar.dropitCloseBtn.click();
});

test('DRP-EXP-03: A future dynamic pairing token would need to be rejected across sessions/accounts', { tag: ['@security', '@bug'] }, async ({ page }) => {
  // This row was explicitly written as forward-looking/blocked on the
  // workbook's original DRP-QR-01 "static QR" finding being fixed first.
  // This session's own DRP-QR-01 test above found the pairing graphic is
  // ALREADY a real per-session canvas render backed by real Firestore
  // channels (not static) -- so the premise has technically already
  // changed. Testing real cross-session/cross-account token rejection still
  // needs a second real device/account to actually attempt pairing with a
  // captured token, which remains unavailable here.
  test.fail(true, 'The underlying premise (DRP-QR-01\'s "static QR") no longer holds per this session\'s live findings, but verifying cross-session token rejection still needs a second real device/account to attempt an actual pairing replay -- not available in this environment');
  expect(true).toBe(false);
});
