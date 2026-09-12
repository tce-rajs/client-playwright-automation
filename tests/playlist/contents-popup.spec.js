// Contents Popup (Chapters/Topics reached via the Playlist's CONTENTS tile).
// Source: CEP_TestCases/Playlist_Module_Test_Cases_Final.xlsx, cases PL-TOC-01..09.

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');

// CONFIRMED LIVE: the Chapters/Topics popup renders ~1425px wide, which
// overflows the default 1280x720 viewport and pushes its search toggle
// button off-screen (unreachable even after Playwright scrolls it into
// view -- the popup itself doesn't scroll horizontally). Same fix already
// used in core-ui.spec.js for the Login virtual keyboard.
test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await pl.openContentsPopup();
  await expect(pl.contentsPopup).toBeVisible();
});

test('PL-TOC-01: Contents tile opens a Chapters/Topics popup', { tag: '@ui-state' }, async ({ page }) => {
  await expect(page.getByText('Choose a Chapter')).toBeVisible();
  await expect(page.getByText('Choose a Topic')).toBeVisible();
});

test('PL-TOC-02: The Contents popup reuses the same Chapter/Topic model as top-level Navigation', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const chaptersFromPlaylist = await pl.chapterItems.allTextContents();

  // CONFIRMED LIVE: like the Filter Options menu, this popup does NOT close
  // on Escape -- it stays open (and its own toggle button, the same
  // playlist-chapter-topic-btn used here, is what the Dashboard's Current
  // Chapter/Topic control also is). Clicking it again while open CLOSES it
  // (removing the popup from the DOM entirely), so close-then-reopen via
  // the toggle itself to confirm the same Chapter list reappears.
  await pl.contentsTile.click(); // close
  await expect(pl.contentsPopup).toBeHidden();
  await pl.contentsTile.click(); // reopen
  await expect(pl.contentsPopup).toBeVisible();
  const chaptersFromNav = await pl.chapterItems.allTextContents();
  expect(chaptersFromNav).toEqual(chaptersFromPlaylist);
});

test('PL-TOC-03: Selecting a Topic from Contents updates Current Chapter/Topic and refreshes the playlist', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const activeTopicText = (await page.locator('[data-qa-id="playlist-select-topic"].active').textContent()).trim();
  const otherTopic = pl.topicItems.filter({ hasNotText: activeTopicText.replace(/^article/, '') }).first();
  const otherTopicText = (await otherTopic.textContent()).trim().replace(/^article/, '');

  await otherTopic.click();
  await expect(pl.contentsTile).toContainText(otherTopicText, { timeout: 10000 });
  await expect(pl.contentsPopup).toBeHidden();
});

test('PL-TOC-04: Search Table of Contents matches by case-insensitive substring', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const allTopics = await pl.topicItems.allTextContents();
  // Pick the longest word across every topic title -- guarantees a usable
  // 3+ character search term regardless of this account's actual curriculum.
  const words = allTopics
    .map((t) => t.replace(/^article/, '').trim())
    .flatMap((t) => t.split(/\s+/))
    .filter((w) => w.length >= 3);
  const searchTerm = words.sort((a, b) => b.length - a.length)[0].toLowerCase();

  await pl.contentsSearchToggle.click();
  await pl.contentsSearchInput.fill(searchTerm);
  await page.waitForTimeout(800);

  const resultsCount = await pl.topicItems.count();
  console.log(`Search "${searchTerm}" ->`, resultsCount, 'results');
  expect(resultsCount).toBeGreaterThan(0);
  const results = await pl.topicItems.allTextContents();
  for (const r of results) {
    expect(r.toLowerCase()).toContain(searchTerm);
  }
});

test('PL-TOC-05: Search Table of Contents with no matches', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.contentsSearchToggle.click();
  await pl.contentsSearchInput.fill('zzzxxxqqqnonexistent');
  await page.waitForTimeout(800);

  const resultsCount = await pl.topicItems.count() + await pl.chapterItems.count();
  const noResultsMessageVisible = await page.getByText(/no results|no items|not found/i).isVisible().catch(() => false);
  console.log('Results after nonsense search:', resultsCount, '| "no results" message shown:', noResultsMessageVisible);

  // CONFIRMED FINDING: the panel goes blank with no explicit "no results"
  // message, unlike this same app's Sign-in school-search which does show one.
  test.fail(resultsCount === 0 && !noResultsMessageVisible, 'Zero-match search shows a blank panel with no "No results found" message');
  expect(noResultsMessageVisible).toBe(true);
});

test('PL-TOC-06: Cancel restores the full Chapter/Topic list after a search', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const fullChapterList = await pl.chapterItems.allTextContents();

  await pl.contentsSearchToggle.click();
  await pl.contentsSearchInput.fill('zzzxxxqqqnonexistent');
  await page.waitForTimeout(800);

  await pl.contentsSearchCancel.click();
  await page.waitForTimeout(800);
  const restoredList = await pl.chapterItems.allTextContents();
  expect(restoredList).toEqual(fullChapterList);
});

test('PL-TOC-07: Search also matches Chapter titles, not only Topic titles', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const chapterTexts = await pl.chapterItems.allTextContents();
  // Longest word across every chapter title -- guarantees a usable 3+
  // character search term regardless of this account's actual curriculum.
  const words = chapterTexts
    .map((t) => t.replace(/^\d+\.?\s*/, '').trim())
    .flatMap((t) => t.split(/\s+/))
    .filter((w) => w.length >= 3);
  const searchTerm = words.sort((a, b) => b.length - a.length)[0];

  await pl.contentsSearchToggle.click();
  await pl.contentsSearchInput.fill(searchTerm);
  await page.waitForTimeout(800);

  const chapterResultsCount = await pl.chapterItems.count();
  console.log(`Chapter-name search "${searchTerm}" -> ${chapterResultsCount} chapter result(s)`);
  test.fail(chapterResultsCount === 0, 'Searching a term that only appears in a Chapter name (not any Topic name) returns zero chapter results — search may be Topic-only');
  expect(chapterResultsCount).toBeGreaterThan(0);
});

test('PL-TOC-08: Very long search query', { tag: '@boundary' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.contentsSearchToggle.click();
  const longQuery = 'a'.repeat(120);
  await pl.contentsSearchInput.fill(longQuery);
  await page.waitForTimeout(800);

  const value = await pl.contentsSearchInput.inputValue();
  expect(value.length).toBeGreaterThan(0);
  await expect(pl.contentsPopup).toBeVisible(); // no layout break/crash
});

test('PL-TOC-09: Special characters or emoji in the search box', { tag: '@security' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  let pageErrored = false;
  page.on('pageerror', () => {
    pageErrored = true;
  });

  await pl.contentsSearchToggle.click();
  await pl.contentsSearchInput.fill('@#$% 😀');
  await page.waitForTimeout(800);

  expect(pageErrored).toBe(false);
  await expect(pl.contentsPopup).toBeVisible();
});
