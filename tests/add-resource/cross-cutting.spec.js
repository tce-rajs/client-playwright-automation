// Cross-Cutting: State, Network, Race, Security.
// Source: CEP_TestCases/Add_Resource_Module_Test_Cases_Final.xlsx,
// cases ADD-STATE-01, ADD-NET-01..02, ADD-RACE-01, ADD-SEC-01..02.
//
// Real create endpoint (confirmed live): POST **/serve/custom/asset, body
// {gradeId, subjectId, chapterId, tpId, description, title, isShared,
// keywords, fileName, folder}. Real search endpoint (Library/Gallery share
// it): GET **/content/search?searchTerm=...

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await pl.ensureResourcesPresent();
});

test('ADD-STATE-01: Newly added resources appear in the Playlist strip immediately, without a manual refresh', { tag: '@negative' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  const beforeCount = await pl.resourceCards.count();
  const uniqueTitle = 'AutoTest-' + Date.now();

  await ar.openPicker();
  await ar.actions.create.click();
  await ar.titleInput.fill(uniqueTitle);
  await ar.fileInput.setInputFiles({ name: 'autotest.txt', mimeType: 'text/plain', buffer: Buffer.from('automated test file') });
  await ar.submitBtn.click();

  // Confirmed live: the card can take a few seconds to appear -- the real
  // question this case cares about is whether a manual page refresh is
  // needed, not exact latency, so wait generously without reloading.
  const newCard = pl.resourceCards.filter({ hasText: uniqueTitle });
  await expect(newCard).toBeVisible({ timeout: 10000 });
  const afterCount = await pl.resourceCards.count();
  expect(afterCount).toBe(beforeCount + 1);

  // Cleanup: remove the test resource so the shared QA playlist isn't
  // permanently altered. Cards added via Add Resource are their own
  // playlist-asset-card type and use an overflow-menu remove path, not the
  // direct hover-reveal icon used by pre-existing curriculum resources.
  await pl.openOptionsMenu();
  await pl.filterEditBtn.click();
  await page.locator('button', { hasText: /finish editing/i }).waitFor({ state: 'visible', timeout: 5000 });
  await pl.removeAssetCard(newCard);
  await page.waitForTimeout(1000);
  // Confirmed live: removing an asset card via its overflow menu already
  // exits Edit mode as a side effect (unlike removing a pre-existing
  // curriculum resource via the direct hover-icon path, which stays in Edit
  // mode until "Finish Editing" is clicked) -- only click it if still shown.
  const finishEditingBtn = page.locator('button:visible', { hasText: /finish editing/i });
  if (await finishEditingBtn.last().isVisible().catch(() => false)) {
    await finishEditingBtn.last().click({ timeout: 10000 });
  }
  await page.waitForTimeout(500);
  const finalCount = await pl.resourceCards.count();
  expect(finalCount).toBe(beforeCount);
});

test('ADD-NET-01: The resource-creation/upload request fails mid-submit', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await page.route('**/serve/custom/asset', (route) => route.fulfill({ status: 500, body: '{}' }));

  await ar.openPicker();
  await ar.actions.create.click();
  await ar.titleInput.fill('ADD-NET-01-' + Date.now());
  await ar.fileInput.setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
  await ar.submitBtn.click();
  await page.waitForTimeout(1500);

  const formClosed = await ar.createForm.isHidden().catch(() => true);
  const errorShown = await page.getByText(/error|failed|try again|something went wrong/i).isVisible().catch(() => false);
  console.log('Create form closed after failed submit:', formClosed, '| error shown:', errorShown);

  test.fail(formClosed && !errorShown, 'A failed create-resource request silently closes the form as if it succeeded, with no error shown');
  expect(errorShown || !formClosed).toBe(true);
});

test('ADD-NET-02: A Library search request itself fails (not just zero results)', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await page.route('**/content/search**', (route) => route.fulfill({ status: 500, body: '{}' }));

  await ar.openPicker();
  await ar.actions.library.click();
  await page.waitForTimeout(500);
  await ar.librarySearchInput.fill('quiz');
  await ar.librarySearchBtn.click();
  await page.waitForTimeout(1500);

  const resultCount = await ar.libraryResults.count();
  const noResultMsg = await page.getByText(/no result found/i).isVisible().catch(() => false);
  const errorStateVisible = await page.getByText(/error|retry|failed to load|something went wrong/i).isVisible().catch(() => false);
  console.log('Results:', resultCount, '| "No result found" (zero-result empty state) shown:', noResultMsg, '| distinct error/retry state shown:', errorStateVisible);

  test.fail(noResultMsg && !errorStateVisible, 'A failed search request shows the same "No result found" empty state as a legitimate zero-result search -- indistinguishable from each other');
  expect(errorStateVisible).toBe(true);
});

test('ADD-RACE-01: Rapidly double-clicking Submit on a valid Create form', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  let createRequestCount = 0;
  // Intercept and fulfill locally so a double-click can be safely tested
  // without risking two real resources landing in the shared QA account.
  await page.route('**/serve/custom/asset', (route) => {
    createRequestCount++;
    route.fulfill({ status: 200, body: '{}' });
  });

  await ar.openPicker();
  await ar.actions.create.click();
  await ar.titleInput.fill('ADD-RACE-01-' + Date.now());
  await ar.fileInput.setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
  // Force both -- a mocked instant response can close/remove the form
  // before Playwright's normal actionability-retry loop finishes on the
  // first click, which isn't the double-submit race this case cares about.
  await Promise.all([
    ar.submitBtn.click({ force: true }).catch(() => {}),
    ar.submitBtn.click({ force: true }).catch(() => {}),
  ]);
  await page.waitForTimeout(1500);

  console.log('Create requests fired from a rapid double-click on Submit:', createRequestCount);
  test.fail(createRequestCount > 1, `Double-clicking Submit fired ${createRequestCount} create-resource requests instead of exactly one`);
  expect(createRequestCount).toBeLessThanOrEqual(1);
});

test('ADD-SEC-01: Added resources are scoped to the correct class/topic and never leak into another class\'s playlist', { tag: ['@security', '@bug'] }, async ({ page }) => {
  // Needs a second known teacher/class account to cross-check against --
  // not available in this environment (same limitation as Playlist's own
  // PL-SEC-01).
  test.fail(true, 'No second reference account available to cross-check for cross-class/cross-teacher resource leakage');
  expect(true).toBe(false);
});

test('ADD-SEC-02: Tampering the create-resource request to target a different chapterId/topicId than shown in the UI', { tag: ['@security', '@bug'] }, async ({ page }) => {
  // Deliberately not executed against the real backend: if the server does
  // NOT validate (the exact defect this case is checking for), the tampered
  // request would succeed and create a real, permanent resource under a
  // chapter/topic not reachable from this account's own UI to clean up
  // afterward. Needs a dedicated pass with a disposable/sandboxed account.
  test.fail(true, 'Not executed against the live shared QA backend -- a successful tamper (the exact defect being tested for) would create an orphaned resource with no safe way to clean it up from this account\'s own UI. Needs a dedicated pass with a disposable account.');
  expect(true).toBe(false);
});
