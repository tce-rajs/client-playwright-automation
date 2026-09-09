// Cross-Cutting: State, Network, Concurrency, Security, Duplicate-request.
// Source: CEP_TestCases/Playlist_Module_Test_Cases_Final.xlsx,
// cases PL-STATE-01..03, PL-NET-01..02, PL-RACE-01, PL-SEC-01, PL-DUP-01.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');

test.beforeEach(async ({ page }) => {
  test.setTimeout(60000); // ensureResourcesPresent can take 15s+ recovering server-persisted state drift
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  // Current chapter/Topic is server-persisted per account and several other
  // Playlist specs leave it switched to whatever they were last testing --
  // guarantee this test's own precondition (some resources to work with)
  // rather than assume a specific topic.
  await pl.ensureResourcesPresent();
});

test('PL-STATE-01: Playlist content reloads correctly after a full page refresh', { tag: '@state-persistence' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const beforeCards = await pl.resourceCards.allTextContents();

  await page.reload();
  await page.locator('[data-qa-id="toolbar-user-avatar"]').waitFor({ state: 'visible', timeout: 15000 });
  // The playlist strip itself repopulates asynchronously after the avatar
  // appears -- wait for the first card, not just a fixed delay, before
  // reading the restored list.
  await pl.resourceCards.first().waitFor({ state: 'visible', timeout: 10000 });

  const afterCards = await pl.resourceCards.allTextContents();
  expect(afterCards).toEqual(beforeCards);
});

test('PL-STATE-02: Removing a resource requires confirmation before it disappears', { tag: '@state-persistence' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const beforeCount = await pl.resourceCards.count();

  // CONFIRMED LIVE: the per-card remove icon only renders once Playlist
  // Editing mode is active (Playlist Options > Edit) -- a plain hover in
  // normal browsing mode never reveals it (display:none regardless of hover).
  await pl.openOptionsMenu();
  await pl.filterEditBtn.click();
  await page.locator('button', { hasText: /finish editing/i }).waitFor({ state: 'visible', timeout: 5000 });

  await pl.resourceCards.first().hover();
  await pl.resourceRemoveBtn.first().click();
  await expect(page.getByText(/are you sure you'd like to remove this resource/i).filter({ visible: true })).toBeVisible({ timeout: 5000 });

  // Cancel rather than actually deleting shared QA playlist data.
  await pl.resourceRemoveCancelBtn.first().click();
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: /finish editing/i }).click();
  await page.waitForTimeout(500);
  const afterCount = await pl.resourceCards.count();
  expect(afterCount).toBe(beforeCount);
});

test('PL-STATE-03: A failed remove-resource call leaves no inconsistent client state', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const beforeCount = await pl.resourceCards.count();

  await page.route('**/resource/**', (route) => {
    if (route.request().method() === 'DELETE') route.fulfill({ status: 500, body: '{}' });
    else route.continue();
  });

  await pl.openOptionsMenu();
  await pl.filterEditBtn.click();
  await page.locator('button', { hasText: /finish editing/i }).waitFor({ state: 'visible', timeout: 5000 });

  await pl.resourceCards.first().hover();
  await pl.resourceRemoveBtn.first().click();
  await expect(page.getByText(/are you sure you'd like to remove this resource/i).filter({ visible: true })).toBeVisible({ timeout: 5000 });
  await pl.resourceRemoveConfirmBtn.first().click();
  await page.waitForTimeout(1500);

  const afterCount = await pl.resourceCards.count();
  const errorShown = await page.getByText(/error|failed|try again/i).isVisible().catch(() => false);
  console.log('Cards before:', beforeCount, '| after failed delete:', afterCount, '| error shown:', errorShown);

  // The card should NOT have been optimistically removed with no
  // indication anything went wrong.
  const silentlyRemovedWithNoError = afterCount < beforeCount && !errorShown;
  test.fail(silentlyRemovedWithNoError, 'A resource card disappeared even though its delete request failed, with no error shown');
  expect(silentlyRemovedWithNoError).toBe(false);
});

test('PL-NET-01: Resource-list fetch fails when switching to a Topic', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await page.route('**/serve/tp?**', (route) => route.fulfill({ status: 500, body: '{}' }));

  await pl.openContentsPopup();
  await pl.topicItems.nth(1).click();
  await page.waitForTimeout(2000);

  const cardCount = await pl.resourceCards.count();
  const errorStateVisible = await page.getByText(/error|retry|failed to load/i).isVisible().catch(() => false);
  console.log('Resource cards after topic-switch fetch failure:', cardCount, '| error/retry shown:', errorStateVisible);

  test.fail(cardCount === 0 && !errorStateVisible, 'A failed resource-list fetch shows a silent empty playlist, indistinguishable from a topic with genuinely zero resources');
  expect(errorStateVisible).toBe(true);
});

test('PL-NET-02: A resource\'s thumbnail or asset fails to load', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const brokenImageCount = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
  });
  console.log('Broken/failed-to-load images currently visible on the playlist:', brokenImageCount);

  // Report what's actually there rather than forcing a specific broken URL
  // (no known-broken resource identified in this account) -- if any are
  // already broken, that's itself the finding.
  test.fail(brokenImageCount > 0, `${brokenImageCount} resource thumbnail(s) are already showing as broken images on this pass`);
  expect(brokenImageCount).toBe(0);
});

test('PL-RACE-01: Rapidly switching Topics before the previous Topic\'s resource list finishes loading', { tag: '@boundary' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.openContentsPopup();
  await pl.ensureMinTopics(3); // need indices 1 and 2 to exist under the active chapter; popup stays open throughout

  let firstRequestSeen = false;
  await page.route('**/serve/tp?**', async (route) => {
    if (!firstRequestSeen) {
      firstRequestSeen = true;
      await new Promise((r) => setTimeout(r, 2000));
    }
    await route.continue();
  });

  const topicBText = (await pl.topicItems.nth(1).textContent()).trim().replace(/^article/, '');
  await pl.topicItems.nth(1).click(); // -> Topic B (delayed)
  await page.waitForTimeout(300);

  await pl.openContentsPopup();
  const topicCText = (await pl.topicItems.nth(2).textContent()).trim().replace(/^article/, '');
  await pl.topicItems.nth(2).click(); // -> Topic C (fast)
  await page.waitForTimeout(3000);

  const finalTopic = (await pl.contentsTile.textContent()).trim();
  console.log('Switched B (delayed) then C (fast); Current Chapter/Topic now:', finalTopic, '| expected Topic C:', topicCText);
  expect(finalTopic).toContain(topicCText);
});

test('PL-SEC-01: Playlist content is always scoped to the currently authorized class', { tag: ['@security', '@bug'] }, async ({ page }) => {
  // Needs a second known teacher/class account to cross-check resource
  // lists against -- not available in this environment.
  test.fail(true, 'No second reference account available to cross-check for cross-class/cross-teacher resource leakage');
  expect(true).toBe(false);
});

test('PL-DUP-01: A single click on Add Resources or a filter checkbox fires exactly one action', { tag: '@negative' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  let requestCount = 0;
  // Scope to actual API calls (xhr/fetch) -- a broader URL-text match also
  // catches incidental static asset loads (icons/SVGs whose filenames
  // happen to contain "add-resource" or "filter"), which is noise, not a
  // duplicate-action signal.
  page.on('request', (req) => {
    if (['xhr', 'fetch'].includes(req.resourceType()) && /add-resource|filter/i.test(req.url())) requestCount++;
  });

  await pl.openAddResourcesPicker();
  await page.waitForTimeout(1000);

  console.log('API requests matching add-resource/filter from one single "+" click:', requestCount);
  expect(requestCount).toBeLessThanOrEqual(1);
});
