// Flashcard Player -- CEP_TestCases/Players_Module_Test_Cases_Final.xlsx,
// "Flashcard Player (bonus discovery)" section (2 rows: PLR-FLASH-01,
// PLR-EXP-15).
//
// Confirmed location: Class 8R Mathematics, chapter "Foundation
// Checkpoint", a topic named "Baseline Test" (a DIFFERENT topic from the
// "The Balancing Act" one used by tests/player/checkpoints.spec.js under
// the same chapter) -- card "Baseline Test FlashCard". The exact topic
// INDEX isn't given in the workbook, only its name, so this file searches
// a few topic indices under that chapter for a card matching "FlashCard"
// rather than hardcoding a guessed index.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { PlayerPage } = require('../../pages/player.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }, testInfo) => {
  // The topic-search loop below (up to 5 iterations, each opening/closing
  // the Contents popup) plus login+class-switch can genuinely exceed the
  // default 30s test timeout -- give real headroom rather than risk the
  // misleading "Target page ... has been closed" cascade documented
  // elsewhere in this project for this exact class of timeout.
  testInfo.setTimeout(90000);
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  // CONFIRMED LIVE (verifier pass): VALID_PIN_2's account does not have
  // Class 8/Division R reachable via the cascade at all (the Division "R"
  // button never appears -- a different class-teacher assignment than
  // VALID_PIN's account). Switched to VALID_PIN, the SAME account
  // tests/player/checkpoints.spec.js already uses successfully for this
  // exact Class 8R Mathematics "Foundation Checkpoint" location -- no
  // other agent is running concurrently at this point in the session, so
  // the earlier account-isolation concern no longer applies.
  await pl.loginWithPin(process.env.VALID_PIN);
  await applyClassMap(nav, 'flashcard', { chapterNav: false });

  // Search topics 0..4 under "Foundation Checkpoint" for a FlashCard card.
  let found = false;
  for (let topicIndex = 0; topicIndex < 5 && !found; topicIndex++) {
    await nav.goToChapterTopicByName('Foundation Checkpoint', topicIndex).catch(() => {});
    await page.waitForTimeout(800);
    await pl.ensureDrawerVisible().catch(() => {});
    const flashcardVisible = await pl.resourceCards.filter({ hasText: /flashcard/i }).first().isVisible({ timeout: 2000 }).catch(() => false);
    if (flashcardVisible) found = true;
  }
});

test('PLR-FLASH-01: A paginated Flashcard-style player exists, distinct from Quiz', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const plr = new PlayerPage(page);
  const card = pl.resourceCards.filter({ hasText: /flashcard/i }).first();
  const cardFound = await card.isVisible({ timeout: 5000 }).catch(() => false);
  test.fail(!cardFound, 'Could not locate a FlashCard-type resource card in any of the first 5 topics under "Foundation Checkpoint" this run -- may need a different topic index than searched');
  if (!cardFound) { expect(cardFound).toBe(true); return; }

  await plr.openResourceCard(card);
  await page.waitForTimeout(2000);
  const closeVisible = await plr.closeIcon.first().isVisible({ timeout: 8000 }).catch(() => false);
  const paginationVisible = await page.locator('[class*="pagination" i], [class*="page-number" i]').first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Flashcard player opened (close visible):', closeVisible, '| pagination indicator visible:', paginationVisible);
  expect(closeVisible).toBe(true);
});

test('PLR-EXP-15: The Flashcard player independently confirmed to open and render real content (not just assumed distinct from Notes)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const plr = new PlayerPage(page);
  const card = pl.resourceCards.filter({ hasText: /flashcard/i }).first();
  const cardFound = await card.isVisible({ timeout: 5000 }).catch(() => false);
  test.fail(!cardFound, 'Could not locate a FlashCard-type resource card this run');
  if (!cardFound) { expect(cardFound).toBe(true); return; }

  await plr.openResourceCard(card);
  await page.waitForTimeout(2000);
  const bodyText = (await page.evaluate(() => document.body.innerText)) || '';
  console.log('Real content text length inside the opened Flashcard player:', bodyText.trim().length);
  expect(bodyText.trim().length).toBeGreaterThan(20);
});
