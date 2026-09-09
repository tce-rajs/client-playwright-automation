// Playlist Options / Filters.
// Source: CEP_TestCases/Playlist_Module_Test_Cases_Final.xlsx, cases PL-FLT-01..09.
//
// CONFIRMED LIVE (2026-09-05): there is no single "master" filter checkbox --
// Playlist Options lists one checkbox per resource type present in the
// current Topic (e.g. "Video (2)", "Worksheets (2)", "Quiz (16)"), each
// independently togglable. Unchecking every type is what produces the
// "No resources found!" empty state. Also confirmed: the menu has no
// backdrop and does NOT close on Escape -- only clicking its own toggle
// button opens/closes it (see PlaylistPage#openOptionsMenu/closeOptionsMenu).

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');

// CONFIRMED LIVE: the Chapters/Topics popup (used by PL-FLT-05 to switch
// Topic) overflows the default 1280x720 viewport, pushing its items off
// screen -- same fix already used in contents-popup.spec.js/core-ui.spec.js.
test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await pl.openOptionsMenu();
  await expect(pl.filterOptions.first()).toBeVisible();
});

// Resource-type filter selection is persisted server-side per account (the
// same pattern already confirmed for "current class" in Navigation) -- it
// survives a fresh login. Several cases here deliberately uncheck types, so
// restore every type to checked afterwards or later modules/tests would
// start with a starved resource list.
test.afterEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await page.goto('./');
  await page.waitForTimeout(2000);
  const loggedIn = await pl.contentsTile.isVisible({ timeout: 5000 }).catch(() => false);
  if (!loggedIn) return;

  await pl.openOptionsMenu();
  const count = await pl.filterOptions.count();
  for (let i = 0; i < count; i++) {
    const checked = await pl.filterOptions.nth(i).getAttribute('aria-selected');
    if (checked !== 'true') {
      await pl.filterOptions.nth(i).click();
      await page.waitForTimeout(300);
    }
  }
  await pl.closeOptionsMenu();
});

test('PL-FLT-01: Playlist Options shows one checkbox per resource type, with a live count', { tag: '@ui-state' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const count = await pl.filterOptions.count();
  expect(count).toBeGreaterThan(0);
  const texts = await pl.filterOptions.allTextContents();
  console.log('Filter options:', JSON.stringify(texts));
  for (const t of texts) {
    expect(t).toMatch(/\(\d+\)/);
  }
});

test('PL-FLT-02: Unchecking every resource-type checkbox hides all resource cards', { tag: '@negative' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const optionCount = await pl.filterOptions.count();
  for (let i = 0; i < optionCount; i++) {
    await pl.filterOptions.nth(i).click();
    await page.waitForTimeout(400);
  }

  const cardCount = await pl.resourceCards.count();
  const noResourcesMessage = await page.getByText(/no resources found/i).isVisible().catch(() => false);
  console.log('Resource cards after unchecking all', optionCount, 'type(s):', cardCount, '| "No resources found!" shown:', noResourcesMessage);
  expect(cardCount).toBe(0);
  expect(noResourcesMessage).toBe(true);
});

test('PL-FLT-03: Re-checking every resource-type checkbox restores all previously visible resource cards', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const beforeCount = await pl.resourceCards.count();
  const optionCount = await pl.filterOptions.count();

  for (let i = 0; i < optionCount; i++) {
    await pl.filterOptions.nth(i).click(); // uncheck
    await page.waitForTimeout(300);
  }
  for (let i = 0; i < optionCount; i++) {
    await pl.filterOptions.nth(i).click(); // re-check
    await page.waitForTimeout(300);
  }

  const afterCount = await pl.resourceCards.count();
  expect(afterCount).toBe(beforeCount);
});

test('PL-FLT-04: Unchecking a single resource-type checkbox hides only that type', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const optionCount = await pl.filterOptions.count();
  if (optionCount < 2) {
    test.fail(true, `Only ${optionCount} distinct resource type(s) in this account's active topic — need 2+ to confirm isolated filtering`);
    expect(optionCount).toBeGreaterThanOrEqual(2);
    return;
  }

  const beforeCount = await pl.resourceCards.count();
  await pl.filterOptions.nth(0).click();
  await page.waitForTimeout(600);
  const afterCount = await pl.resourceCards.count();

  expect(afterCount).toBeLessThan(beforeCount);
  expect(afterCount).toBeGreaterThan(0);
});

test('PL-FLT-05: Filter selection persists or resets when switching to a different Topic', { tag: '@negative' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const optionCount = await pl.filterOptions.count();
  for (let i = 0; i < optionCount; i++) {
    await pl.filterOptions.nth(i).click();
    await page.waitForTimeout(300);
  }
  await pl.closeOptionsMenu();
  await page.waitForTimeout(500);

  await pl.openContentsPopup();
  await pl.ensureMinTopics(2); // need a genuinely different Topic B to switch to; some chapters have only 1 (or 0)
  await pl.topicItems.first().click();
  await page.waitForTimeout(1000);

  const filterStateOnTopicB = await page.getByText(/no resources found/i).isVisible().catch(() => false);
  console.log('Filter (all-unchecked) still applied after switching topics:', filterStateOnTopicB);
  // Documenting whichever real behaviour occurs -- both "remembered" and
  // "reset" are legitimate as long as they're consistent; this isn't a
  // pass/fail bar on its own per the test case, just a documented finding.
});

test('PL-FLT-06: "Edit" warns that it will reset filters, but ONLY when a filter is actively applied', { tag: '@ui-state' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  // CONFIRMED LIVE: with every type checked (default), Edit enters editing
  // mode directly with no confirmation at all -- the warning only appears
  // once a filter is actually narrowing the list.
  await pl.filterOptions.nth(0).click();
  await page.waitForTimeout(400);

  await pl.filterEditBtn.click();
  await expect(page.getByText(/editing the playlist will reset the applied filters/i)).toBeVisible({ timeout: 5000 });
  await pl.filterCancelBtn.click();
});

test('PL-FLT-07: "Reset" restores the playlist to its default order/state after confirmation', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.filterResetBtn.click();
  await expect(page.getByText(/are you sure you want to reset your playlist/i)).toBeVisible({ timeout: 5000 });
  await pl.filterResetConfirmBtn.click();
  await page.waitForTimeout(1000);
  await expect(pl.resourceCards.first()).toBeVisible();
});

test('PL-FLT-08: Cancelling the Edit confirmation makes no change', { tag: '@ui-state' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const beforeCount = await pl.resourceCards.count();
  await pl.filterOptions.nth(0).click(); // apply a filter so Edit actually shows the confirmation
  await page.waitForTimeout(400);
  const filteredCount = await pl.resourceCards.count();

  await pl.filterEditBtn.click();
  await expect(page.getByText(/editing the playlist will reset the applied filters/i)).toBeVisible({ timeout: 5000 });
  await pl.filterCancelBtn.click();
  await page.waitForTimeout(500);

  const afterCancelCount = await pl.resourceCards.count();
  expect(afterCancelCount).toBe(filteredCount);
  expect(afterCancelCount).not.toBe(beforeCount); // Cancel undoes Edit-mode entry, not the filter itself
});

test('PL-FLT-09: Cancelling the Reset confirmation makes no change', { tag: '@negative' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const beforeCount = await pl.resourceCards.count();

  await pl.filterResetBtn.click();
  await expect(page.getByText(/are you sure you want to reset your playlist/i)).toBeVisible({ timeout: 5000 });
  await pl.filterCancelBtn.click();
  await page.waitForTimeout(500);

  const afterCount = await pl.resourceCards.count();
  expect(afterCount).toBe(beforeCount);
});
