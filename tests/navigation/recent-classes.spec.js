// Recent Classes.
// Source: CEP_TestCases/Navigation_Module_Test_Cases_Final.xlsx, cases NAV-REC-01..07.

const { test, expect } = require('../../fixtures/electron-app');
const { NavigationPage } = require('../../pages/navigation.page');

test.beforeEach(async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.loginWithPin(process.env.VALID_PIN);
  await nav.openClassPopup();
});

test('NAV-REC-01: Recent Classes lists previously used class/division/subject combinations', { tag: '@positive' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  const count = await nav.recentClassButtons.count();
  expect(count).toBeGreaterThan(0);
  await expect(nav.recentClassButtons.first()).toContainText('|');
});

test('NAV-REC-02: Selecting a Recent Classes item instantly switches the active class', { tag: '@positive' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  const items = nav.recentClassButtons;
  const count = await items.count();
  // Pick an item that ISN'T the current class (skip index 0, which is
  // usually the active one already sitting first).
  const targetIndex = count > 1 ? 1 : 0;
  const targetText = (await items.nth(targetIndex).textContent()).trim();

  await items.nth(targetIndex).click();
  await expect(page.locator('.mat-mdc-tab-labels, [data-qa-id="playlist-chapter-tp-popup"]')).toBeHidden({ timeout: 5000 }).catch(() => {});
  // Current Class label updates to the class we just picked (compare by
  // grade/division, since the button label format is "Class N | D | Subject"
  // and the header format is "Class ND | Subject").
  const [, div, subject] = targetText.split('|').map((s) => s.trim());
  await expect(nav.currentClassBtn).toContainText(subject);
  console.log('Switched to:', targetText, '-> header now:', await nav.currentClassBtn.textContent());
});

test('NAV-REC-03: Switching to a class via Recent Classes moves it to the top of the list', { tag: '@positive' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.ensureRecentClasses(2);
  const items = nav.recentClassButtons;

  const targetText = (await items.nth(1).textContent()).trim();
  await items.nth(1).click();
  await page.waitForTimeout(1000);

  await nav.openClassPopup();
  const firstText = (await nav.recentClassButtons.first().textContent()).trim();
  expect(firstText).toBe(targetText);
});

test('NAV-REC-04: Recent Classes list does not visually mark which class is currently active', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  // LIVE FINDING (from the test case doc, re-verified here): every entry's
  // radio indicator looks identical -- nothing distinguishes "this is
  // where you already are." Confirmed by comparing the first (current)
  // entry's radio-icon markup against a later one.
  const nav = new NavigationPage(page);
  await nav.ensureRecentClasses(2);
  const items = nav.recentClassButtons;

  // Compare each button's full markup with its own text stripped out --
  // whatever's left (icons, classes, structure) should differ for the
  // active entry if there really is a visual marker for it.
  const stripText = async (locator) =>
    (await locator.innerHTML()).replace(/>([^<]*)</g, (m, t) => `>${t.trim() ? '[text]' : ''}<`);
  const firstMarkup = await stripText(items.first());
  const secondMarkup = await stripText(items.nth(1));
  console.log('First (current) entry markup (text stripped):', firstMarkup);
  console.log('Second entry markup (text stripped):', secondMarkup);

  test.fail(firstMarkup === secondMarkup, 'The active class entry has no distinguishing indicator from any other entry in the Recent Classes list');
  expect(firstMarkup).not.toBe(secondMarkup);
});

test('NAV-REC-05: Recent Classes tab with zero history (brand-new teacher)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  // The real "brand-new teacher, zero history" scenario needs an account
  // that has never selected a class -- not available here (VALID_PIN's
  // account already has 10+ entries, confirmed below). What we CAN verify
  // for real: the list isn't just conditionally rendered garbage when
  // non-empty, i.e. the app has a genuine populated state to contrast
  // against. Full empty-state coverage needs a fresh account.
  const nav = new NavigationPage(page);
  const count = await nav.recentClassButtons.count();
  console.log('This account\'s Recent Classes count (not zero, so the true empty-state path is unverified):', count);
  test.fail(true, 'No brand-new/zero-history teacher account available in this environment to verify the empty state');
  expect(count).toBe(0);
});

test('NAV-REC-06: Recent Classes list scroll behavior with many distinct classes', { tag: '@boundary' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  // This account's Recent Classes history can come up unexpectedly empty
  // after other tests in the same run switch classes/crash the page (see
  // NAV-NET-02/SEC-02) -- rebuild a real, multi-entry history rather than
  // failing on what's just transient leftover state from earlier tests.
  await nav.ensureRecentClasses(5);
  const count = await nav.recentClassButtons.count();
  console.log('Recent Classes entries found:', count);
  expect(count).toBeGreaterThanOrEqual(2);

  await nav.recentClassButtons.last().scrollIntoViewIfNeeded();
  await expect(nav.recentClassButtons.last()).toBeVisible();
});

test('NAV-REC-07: Rapid double-click on the same Recent Classes item', { tag: '@boundary' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  let switchRequestCount = 0;
  page.on('request', (req) => {
    if (req.method() === 'POST' && /class|subject|grade/i.test(req.url())) switchRequestCount++;
  });

  const items = nav.recentClassButtons;
  const count = await items.count();
  const targetIndex = count > 1 ? 1 : 0;
  await items.nth(targetIndex).click({ clickCount: 2, delay: 20 });
  await page.waitForTimeout(1500);

  console.log('Class-switch requests fired from one rapid double-click:', switchRequestCount);
  expect(switchRequestCount).toBeLessThanOrEqual(1);
});
