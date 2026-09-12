// Core Navigation UI.
// Source: CEP_TestCases/Navigation_Module_Test_Cases_Final.xlsx, cases NAV-CORE-01..05.

const { test, expect } = require('../../fixtures/electron-app');
const { NavigationPage } = require('../../pages/navigation.page');

test.beforeEach(async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.loginWithPin(process.env.VALID_PIN);
});

test('NAV-CORE-01: Current Class label visible on Dashboard', { tag: '@ui-state' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await expect(nav.currentClassBtn).toBeVisible();
  await expect(nav.currentClassBtn).toContainText('Class');
  await expect(nav.currentClassBtn).toContainText('expand_more');
});

test('NAV-CORE-02: Current Chapter/Topic label visible on Dashboard', { tag: '@ui-state' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await expect(nav.currentChapterTopicBtn).toBeVisible();
  await expect(nav.currentChapterTopicBtn).toContainText('|');
});

test('NAV-CORE-03: Clicking Current Class opens the Class Popup on Recent Classes by default', { tag: '@positive' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.openClassPopup();
  await expect(nav.recentClassButtons.first()).toBeVisible();
  await expect(nav.recentClassesTab).toHaveAttribute('aria-selected', 'true');
});

test('NAV-CORE-04: Clicking Current Chapter/Topic opens the Chapters Popup', { tag: '@positive' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.openChaptersPopup();
  await expect(nav.chapterTpPopup).toBeVisible();
  await expect(nav.chapterItems.first()).toBeVisible();
  await expect(nav.topicItems.first()).toBeVisible();
});

test('NAV-CORE-05: Class Popup has two tabs: Recent Classes and All My Classes', { tag: '@ui-state' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.openClassPopup();
  await expect(nav.recentClassesTab).toBeVisible();
  await expect(nav.allMyClassesTab).toBeVisible();

  await nav.allMyClassesTab.click();
  await expect(nav.gradeButtons.first()).toBeVisible();
  await nav.recentClassesTab.click();
  await expect(nav.recentClassButtons.first()).toBeVisible();
});
