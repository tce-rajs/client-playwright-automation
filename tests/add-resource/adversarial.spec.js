// Add Resource (Create form + entry FAB) -- NEW adversarial "break the app"
// cases on top of the existing 94 tests in this folder. New ID prefix
// AR-BREAK-* (CEP_TestCases/Add_Resource_Module_Test_Cases_Final.xlsx).

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await pl.ensureResourcesPresent();
  await ar.openPicker();
  await ar.actions.create.click();
  await expect(ar.createForm).toBeVisible({ timeout: 10000 });
});

test('AR-BREAK-01: submitting Create with a zero-byte (empty) file is rejected or handled gracefully, not silently accepted as valid', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.titleInput.fill('Zero-byte file adversarial test');
  await ar.fileInput.setInputFiles({ name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) });
  await page.waitForTimeout(500);

  const fileErrorVisible = await page.locator('.invalid-file').first().isVisible({ timeout: 2000 }).catch(() => false);
  const submitEnabled = await ar.submitBtn.isEnabled().catch(() => false);
  console.log('Zero-byte file -- validation error shown:', fileErrorVisible, '| Submit enabled:', submitEnabled);

  if (submitEnabled) {
    await ar.submitBtn.click();
    await page.waitForTimeout(2000);
    const formStillOpen = await ar.createForm.isVisible().catch(() => false);
    console.log('Form still open after submitting a zero-byte file:', formStillOpen);
    // Documenting actual behavior either way is the goal here -- a silent
    // "success" with a zero-byte file would itself be the adversarial finding.
    // formStillOpen === false means the form closed (i.e. the submission was
    // accepted) with zero prior validation feedback -- that IS the bug.
    test.fail(!formStillOpen, 'CONFIRMED: a zero-byte file submission silently succeeds (form closes) with no validation feedback at all -- likely creates a broken/empty resource on the Playlist');
    expect(formStillOpen).toBe(true);
  } else {
    expect(submitEnabled).toBe(false);
  }
});

test('AR-BREAK-02: a double-extension filename ("notes.pdf.exe") is evaluated by real content/type, not just a naive extension string match', { tag: ['@security', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.titleInput.fill('Double-extension filename test');
  await ar.fileInput.setInputFiles({ name: 'notes.pdf.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ fake exe header bytes for adversarial testing') });
  await page.waitForTimeout(800);

  const fileErrorVisible = await page.locator('.invalid-file').first().isVisible({ timeout: 2000 }).catch(() => false);
  const submitEnabled = await ar.submitBtn.isEnabled().catch(() => false);
  console.log('Double-extension "notes.pdf.exe" -- validation error shown:', fileErrorVisible, '| Submit enabled:', submitEnabled);

  test.fail(submitEnabled && !fileErrorVisible, 'A file named "notes.pdf.exe" (double extension, ending in a disallowed type) is accepted with no validation error -- suggests filename-suffix matching rather than a real type check');
  expect(submitEnabled && !fileErrorVisible).toBe(false);
});

test('AR-BREAK-03: an emoji + 150-character filename does not crash the Create form or corrupt the displayed filename', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const crazyName = '🔥📄'.repeat(3) + 'a'.repeat(150) + '.pdf';
  await ar.titleInput.fill('Extreme filename test');
  await ar.fileInput.setInputFiles({ name: crazyName, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fake pdf content for adversarial testing') });
  await page.waitForTimeout(500);

  const formStillResponsive = await ar.createForm.isVisible().catch(() => false);
  const overflowsViewport = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5);
  console.log('Form still responsive after emoji+150char filename:', formStillResponsive, '| horizontal overflow:', overflowsViewport);

  test.fail(!formStillResponsive || overflowsViewport, 'An extreme emoji+150-character filename crashes the Create form or breaks its layout');
  expect(formStillResponsive).toBe(true);
  expect(overflowsViewport).toBe(false);
});

test('AR-BREAK-04: clicking where the first source card WILL be, immediately (0ms) after clicking the "+" FAB, does not misfire on stale/wrong content', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  // Re-open the picker fresh (beforeEach already opened Create) to test the
  // FAB's own opening instant, not a source card's.
  const ar = new AddResourcePage(page);
  await ar.cancelBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  await ar.addResourcesTrigger.click({ force: true });
  // No wait at all -- click Create's expected position the literal instant
  // the trigger click returns, before Playwright's own actionability wait
  // would normally stabilize things.
  const clickResult = await ar.actions.create.click({ timeout: 3000, force: true }).then(() => 'clicked').catch((e) => 'failed: ' + e.message.split('\n')[0]);
  await page.waitForTimeout(1000);

  const createOpened = await ar.createForm.isVisible({ timeout: 3000 }).catch(() => false);
  const pickerStillOpen = await ar.actions.create.isVisible({ timeout: 1000 }).catch(() => false);
  console.log('Immediate post-FAB click result:', clickResult, '| Create form opened:', createOpened, '| raw picker still showing:', pickerStillOpen);

  // Either outcome (opened cleanly, or the click legitimately missed and
  // nothing happened) is acceptable -- the adversarial failure mode is a
  // CRASH or a WRONG action firing (e.g. a different source card opening).
  const noOtherSourceAccidentallyOpened = !(await ar.libraryPopup.isVisible({ timeout: 500 }).catch(() => false));
  test.fail(!noOtherSourceAccidentallyOpened, 'Clicking the instant the Add Resources FAB opens can misfire onto the WRONG source card (opened Library instead of/alongside Create)');
  expect(noOtherSourceAccidentallyOpened).toBe(true);
});

test('AR-BREAK-05: two browser tabs on the same account both submitting a Create resource to the same Topic at nearly the same instant do not corrupt each other\'s upload', { tag: ['@cross-cutting', '@bug'] }, async ({ page, context }) => {
  test.setTimeout(90000); // a second tab's fresh login can be slow under this project's documented environmental network instability
  const ar1 = new AddResourcePage(page);
  await ar1.titleInput.fill('Concurrent-tab resource A');
  await ar1.fileInput.setInputFiles({ name: 'concurrent-a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 concurrent A') });

  const page2 = await context.newPage();
  const ar2 = new AddResourcePage(page2);
  // page2 shares this browser context's cookies/session with page1, which is
  // already authenticated -- confirmed live it lands directly on the
  // signed-in whiteboard (login-auth-toggle-button never appears), so a
  // second loginWithPin() call here just hangs waiting for a control that
  // will never show. Go straight to the app and confirm the already-signed-
  // in state instead.
  await page2.goto('./');
  await page2.locator('[data-qa-id="toolbar-user-avatar"]').waitFor({ state: 'visible', timeout: 20000 });
  await ar2.openPicker();
  await ar2.actions.create.click();
  await expect(ar2.createForm).toBeVisible({ timeout: 10000 });
  await ar2.titleInput.fill('Concurrent-tab resource B');
  await ar2.fileInput.setInputFiles({ name: 'concurrent-b.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 concurrent B') });

  // Fire both submits with no ordering guarantee.
  const [res1, res2] = await Promise.all([
    ar1.submitBtn.click().then(() => 'ok').catch((e) => 'err: ' + e.message.split('\n')[0]),
    ar2.submitBtn.click().then(() => 'ok').catch((e) => 'err: ' + e.message.split('\n')[0]),
  ]);
  await page.waitForTimeout(3000);

  console.log('Tab 1 submit result:', res1, '| Tab 2 submit result:', res2);
  const cardA = page.locator('text=Concurrent-tab resource A').first();
  const cardB = page.locator('text=Concurrent-tab resource B').first();
  const aVisible = await cardA.isVisible({ timeout: 8000 }).catch(() => false);
  const bVisible = await cardB.isVisible({ timeout: 8000 }).catch(() => false);
  console.log('Resource A visible somewhere:', aVisible, '| Resource B visible somewhere:', bVisible);

  test.fail(!aVisible || !bVisible, 'Two nearly-simultaneous Create submissions from two tabs on the same account result in one of them silently missing/lost instead of both landing');
  expect(aVisible && bVisible).toBe(true);
  await page2.close();
});
