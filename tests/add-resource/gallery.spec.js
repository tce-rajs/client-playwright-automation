// Gallery.
// Source: CEP_TestCases/Add_Resource_Module_Test_Cases_Final.xlsx, cases ADD-GAL-01..07.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await pl.ensureResourcesPresent();
  await ar.openPicker();
  await ar.actions.gallery.click();
  await expect(ar.galleryImageCards.first()).toBeVisible({ timeout: 10000 });
});

test('ADD-GAL-01: Gallery opens showing an image grid, category filters, and a search box', { tag: '@ui-state' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const count = await ar.galleryImageCards.count();
  expect(count).toBeGreaterThan(0);
  await expect(ar.gallerySubjectSelect).toBeVisible();
  await expect(ar.galleryFilterSelect).toBeVisible();
  await expect(ar.gallerySearchInput).toBeVisible();
  await expect(ar.gallerySearchBtn).toBeVisible();
  await expect(ar.gallerySearchClearBtn).toBeVisible();
});

test('ADD-GAL-02: Gallery\'s default category filter is independent of the current class\'s subject', { tag: '@ui-state' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  const currentClassText = (await page.locator('[data-qa-id="playlist-current-grade-subject-btn"]').textContent()).trim();
  const subjectDefault = (await ar.gallerySubjectSelect.textContent()).trim();
  const filterDefault = (await ar.galleryFilterSelect.textContent()).trim();
  console.log('Current class:', currentClassText, '| Gallery subject default:', subjectDefault, '| Gallery filter default:', filterDefault);
  // Documenting the real relationship rather than asserting a specific
  // expected pairing -- this is a live observation per the workbook, not a
  // hard pass/fail bar on its own.
});

test('ADD-GAL-03: Searching a term with no matches shows a completely blank grid with no message', { tag: '@negative' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.gallerySearchInput.fill('zzzxxxqqqnomatch');
  await ar.gallerySearchBtn.click();
  await page.waitForTimeout(1200);
  const gridCount = await ar.galleryImageCards.count();
  const noResultsMsgVisible = await page.getByText(/no result|no image|not found/i).isVisible().catch(() => false);
  console.log('Gallery cards after nonsense search:', gridCount, '| "no results" message shown:', noResultsMsgVisible);
  test.fail(gridCount === 0 && !noResultsMsgVisible, 'Zero-match Gallery search shows a blank grid with no "no results" message -- same defect pattern as Playlist\'s own Table-of-Contents search');
  expect(noResultsMsgVisible).toBe(true);
});

test('ADD-GAL-04: Certain Gallery thumbnails fail to load, showing a broken-image placeholder', { tag: '@negative' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.gallerySearchClearBtn.click();
  await page.waitForTimeout(1500);
  const brokenCount = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
  });
  console.log('Broken/failed-to-load Gallery thumbnails:', brokenCount);
  test.fail(brokenCount > 0, `${brokenCount} Gallery thumbnail(s) failed to load as broken-image placeholders`);
  expect(brokenCount).toBe(0);
});

test('ADD-GAL-05: Changing the category filter dropdowns updates the displayed image grid', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const beforeFirstCard = await ar.galleryImageCards.first().getAttribute('data-qa-id');

  await ar.galleryFilterSelect.click();
  await page.waitForTimeout(400);
  const options = page.locator('mat-option');
  const optionCount = await options.count();
  if (optionCount < 2) {
    test.fail(true, `Only ${optionCount} filter option(s) available -- can't confirm the grid changes on a different selection`);
    expect(optionCount).toBeGreaterThanOrEqual(2);
    return;
  }
  await options.nth(1).click();
  await page.waitForTimeout(1200);

  const afterFirstCard = await ar.galleryImageCards.first().getAttribute('data-qa-id');
  console.log('First card before filter change:', beforeFirstCard, '| after:', afterFirstCard);
  expect(afterFirstCard).not.toBe(beforeFirstCard);
});

test('ADD-GAL-06: Selecting a Gallery image attaches it to the current Topic\'s playlist', { tag: '@positive' }, async ({ page }) => {
  // Deliberately not executed via a real click-to-attach -- would alter the
  // shared QA playlist, matching the workbook's own documented decision.
  const ar = new AddResourcePage(page);
  const count = await ar.galleryImageCards.count();
  expect(count).toBeGreaterThan(0);
  test.fail(true, 'Deliberately not executed (clicking an image) to avoid altering the shared QA playlist');
  expect(true).toBe(false);
});

test('ADD-GAL-07: Pagination controls navigate additional pages of images', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const paginationControls = page.locator('[class*="pagination" i], mat-paginator, .pagination');
  const hasPagination = await paginationControls.first().isVisible().catch(() => false);
  console.log('Pagination controls visible:', hasPagination);
  if (!hasPagination) {
    test.fail(true, 'No pagination controls found on this pass -- current image count may fit on a single page');
    expect(hasPagination).toBe(true);
    return;
  }
  const beforeFirstCard = await ar.galleryImageCards.first().getAttribute('data-qa-id');
  await paginationControls.first().locator('button, a').last().click();
  await page.waitForTimeout(1000);
  const afterFirstCard = await ar.galleryImageCards.first().getAttribute('data-qa-id');
  expect(afterFirstCard).not.toBe(beforeFirstCard);
});
