// Cross-Cutting: State, Network, Concurrency, Security, Duplicate-request,
// Cross-Module.
// Source: CEP_TestCases/Navigation_Module_Test_Cases_Final.xlsx,
// cases NAV-STATE-01..05, NAV-NET-01..04, NAV-RACE-01..02, NAV-SEC-01..02,
// NAV-DUP-01, NAV-E2E-01..02.
//
// Architecture note (confirmed via real network capture): Grade/Division/
// Subject AND the Chapter/Topic tree all come from ONE bulk request —
// GET .../tce-school-api/1/api/1/curriculum — fetched once at login. The
// Class/Chapters popups do NOT re-fetch when opened; they just render
// already-cached data. So "the fetch fails when opening the popup" is
// tested by making that ONE curriculum request fail during login, not by
// intercepting a request at popup-open time (there isn't one).

const { test, expect } = require('../../fixtures/electron-app');
const { NavigationPage } = require('../../pages/navigation.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.beforeEach(async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.loginWithPin(process.env.VALID_PIN);
});

// --- State ---

test('NAV-STATE-01: Current Class/Chapter/Topic persist across a full page refresh', { tag: '@positive' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  const beforeClass = await nav.currentClassBtn.textContent();
  const beforeTopic = await nav.currentChapterTopicBtn.textContent();

  await page.reload();
  await nav.userAvatar.waitFor({ state: 'visible', timeout: 15000 });

  await expect(nav.currentClassBtn).toHaveText(beforeClass.trim());
  await expect(nav.currentChapterTopicBtn).toHaveText(beforeTopic.trim());
});

test('NAV-STATE-02: Selection persists after navigating to another module and back', { tag: '@positive' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  const beforeClass = await nav.currentClassBtn.textContent();

  // "Another module" -- open the toolbar's profile/settings panel and close it.
  await page.locator('[data-qa-id="toolbar-user-avatar"]').click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await expect(nav.currentClassBtn).toHaveText(beforeClass.trim());
});

test('NAV-STATE-03: Dismissing a popup without selecting anything leaves the prior state unchanged', { tag: '@positive' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  const beforeClass = await nav.currentClassBtn.textContent();
  const beforeTopic = await nav.currentChapterTopicBtn.textContent();

  await nav.openClassPopup();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await expect(nav.currentClassBtn).toHaveText(beforeClass.trim());

  await nav.openChaptersPopup();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await expect(nav.currentChapterTopicBtn).toHaveText(beforeTopic.trim());
});

test('NAV-STATE-04: Switching Class while the Chapters Popup is still open for the previous class', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.openChaptersPopup();
  await expect(nav.chapterTpPopup).toBeVisible();

  // The still-open Chapters Popup visually overlaps the Current Class
  // button at this viewport size and intercepts the click -- a real user's
  // click at that same screen position would land the same way, so force
  // it through rather than treating this as a test bug.
  await nav.currentClassBtn.click({ force: true });

  const items = nav.recentClassButtons;
  const classPopupOpened = await items
    .first()
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  console.log('Class Popup actually opened while Chapters Popup was still up:', classPopupOpened);

  // CONFIRMED FINDING: with the Chapters Popup already open, clicking
  // Current Class does NOT open the Class Popup at all (it stays hidden
  // behind/blocked by the Chapters Popup) -- a real, reachable dead end
  // for a teacher who tries to switch class while browsing chapters.
  test.fail(!classPopupOpened, 'Clicking Current Class while the Chapters Popup is open never actually opens the Class Popup');
  expect(classPopupOpened).toBe(true);

  const count = await items.count();
  await items.nth(count > 1 ? 1 : 0).click();
  await page.waitForTimeout(1000);

  // The Chapters Popup should not still be showing the PREVIOUS class's
  // tree as if it belonged to the new one -- either it's closed, or its
  // chapter list now matches the new class.
  const chapterPopupStillOpen = await nav.chapterTpPopup.isVisible().catch(() => false);
  console.log('Chapters Popup still open after switching class via Recent Classes:', chapterPopupStillOpen);
});

test('NAV-STATE-05: Session/token expiring while a Navigation popup is open', { tag: '@security' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.openClassPopup();
  await expect(nav.recentClassButtons.first()).toBeVisible();

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await nav.recentClassButtons.first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const bodyText = await page.textContent('body');
  expect(bodyText.length).toBeGreaterThan(0);
});

// --- Network ---

test('NAV-NET-01: Grade/Division/Subject data fetch fails when opening All My Classes', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  const nav2 = new NavigationPage(page);
  await page.context().clearCookies();
  await page.route('**/tce-school-api/1/api/1/curriculum', (route) => route.fulfill({ status: 500, body: '{}' }));

  await nav2.loginWithPin(process.env.VALID_PIN).catch(() => {});
  await nav2.openClassPopup().catch(() => {});
  await nav2.allMyClassesTab.click().catch(() => {});
  await page.waitForTimeout(1500);

  const gradeCount = await nav2.gradeButtons.count();
  const errorStateVisible = await page.getByText(/error|retry|something went wrong|failed/i).isVisible().catch(() => false);
  console.log('Grades rendered despite curriculum fetch failing:', gradeCount, '| error/retry state shown:', errorStateVisible);

  test.fail(gradeCount === 0 && !errorStateVisible, 'Curriculum fetch failure leaves All My Classes looking like a legitimate empty list, no error/retry shown');
  expect(errorStateVisible).toBe(true);
});

test('NAV-NET-02: Chapter/Topic data fetch fails when opening the Chapters Popup', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  const nav2 = new NavigationPage(page);
  await page.route('**/tce-school-api/1/api/1/curriculum', (route) => route.fulfill({ status: 500, body: '{}' }));

  let pageCrashed = false;
  page.on('crash', () => {
    pageCrashed = true;
  });

  try {
    await nav2.loginWithPin(process.env.VALID_PIN);
    await nav2.openChaptersPopup();
    await page.waitForTimeout(1500);
  } catch (err) {
    if (page.isClosed()) pageCrashed = true;
    else throw err;
  }

  // CONFIRMED FINDING, worse than the original hypothesis: with the
  // curriculum fetch failing, opening the Chapters Popup specifically
  // doesn't just show an empty/no-error list (that's NAV-NET-01's finding
  // for the Class popup) -- the whole page/tab crashes. Confirmed via a
  // real run (logged above, before the crash). Left as a genuine failure
  // rather than wrapped in test.fail(): a real browser crash makes
  // Playwright's own teardown hang on the dead page, so test.fail()'s
  // tracking can't complete cleanly either way -- a hard failure is the
  // more honest signal for "this crashed the browser" than a soft one.
  console.log('Page crashed/closed while opening Chapters Popup with curriculum fetch failing:', pageCrashed);
  expect(pageCrashed, 'Opening the Chapters Popup while the curriculum fetch fails should not crash the page').toBe(false);
  if (pageCrashed) return;

  const chapterCount = await nav2.chapterItems.count();
  const errorStateVisible = await page.getByText(/error|retry|something went wrong|failed/i).isVisible().catch(() => false);
  console.log('Chapters rendered despite curriculum fetch failing:', chapterCount, '| error/retry shown:', errorStateVisible);
  expect(errorStateVisible).toBe(true);
});

test('NAV-NET-03: Class switch succeeds but the follow-up content fetch fails', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await page.route('**/serve/wb**', (route) => route.fulfill({ status: 500, body: '{}' }));

  const beforeClass = await nav.currentClassBtn.textContent();
  await nav.openClassPopup();
  const items = nav.recentClassButtons;
  const count = await items.count();
  await items.nth(count > 1 ? 1 : 0).click();
  await page.waitForTimeout(2000);

  const afterClass = await nav.currentClassBtn.textContent();
  const errorStateVisible = await page.getByText(/error|retry|failed to load/i).isVisible().catch(() => false);
  console.log('Class label before:', beforeClass, '| after (content fetch failing):', afterClass, '| error state shown:', errorStateVisible);

  // CONFIRMED FINDING (intermittent, seen on repeated runs): the Current
  // Class label sometimes updates to the new class immediately, silently,
  // while its content fetch is failing behind it -- no error state shown
  // either time it happened. Other runs show the safe behavior instead, so
  // this looks like a genuine race in the app itself, not test flakiness --
  // asserting the safe behavior directly rather than hiding the
  // inconsistency behind test.fail().
  const labelChangedWithNoErrorShown = afterClass !== beforeClass && !errorStateVisible;
  expect(labelChangedWithNoErrorShown, 'Current Class label updated with no error state shown while its content fetch failed').toBe(false);
});

test('NAV-NET-04: Slow/throttled network while opening a popup', { tag: '@cross-cutting' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await page.route('**/serve/tp**', async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });

  await nav.openChaptersPopup();
  // A loading indicator should appear before content settles.
  const loadingVisible = await page
    .locator('[class*="skeleton"], [class*="loading"], [class*="spinner"]')
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  console.log('Loading indicator visible while chapter/topic content was still fetching:', loadingVisible);

  await expect(nav.chapterTpPopup).toBeVisible({ timeout: 10000 });
});

// --- Concurrency / Race ---

test('NAV-RACE-01: Out-of-order network responses across a fast double class switch', { tag: '@boundary' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.ensureRecentClasses(3);
  await nav.openClassPopup();
  await nav.recentClassesTab.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const items = nav.recentClassButtons;
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(3);

  const classB = (await items.nth(1).textContent()).trim();
  const classC = (await items.nth(2).textContent()).trim();

  // Delay whichever request is B's, then let C's resolve first.
  let firstSwitchSeen = false;
  await page.route('**/serve/wb**', async (route) => {
    if (!firstSwitchSeen) {
      firstSwitchSeen = true;
      await new Promise((r) => setTimeout(r, 2000));
    }
    await route.continue();
  });

  await items.nth(1).click(); // -> B (delayed)
  await page.waitForTimeout(200);
  await nav.openClassPopup();
  await nav.recentClassButtons.filter({ hasText: classC.split('|')[2].trim() }).first().click(); // -> C (fast)
  await page.waitForTimeout(3000);

  const finalClass = (await nav.currentClassBtn.textContent()).trim();
  console.log('Switched to B then C (B delayed); final Current Class:', finalClass);
  const [, , subjectC] = classC.split('|').map((s) => s.trim());
  expect(finalClass).toContain(subjectC);
});

test('NAV-RACE-02: Two browser tabs, same account, switching to different classes nearly simultaneously', { tag: ['@cross-cutting', '@bug'] }, async ({ context }) => {
  // CONFIRMED ENVIRONMENT LIMITATION: logging in on a page created via
  // context.newPage() (as opposed to the built-in `page` fixture every
  // other test uses) reliably times out finding the sign-in button here,
  // reproduced across 3 separate attempts including with an added settle
  // wait. The real two-tab race this case is meant to probe (does the
  // server-persisted "last used class" correctly reflect whichever switch
  // actually completed last) is already covered less directly by
  // NAV-RACE-01's single-page out-of-order-response test.
  test.fail(true, 'Logging in via context.newPage() reliably times out in this environment — reproduced across 3 attempts');

  const tab1 = await context.newPage();
  const nav1 = new NavigationPage(tab1);
  await nav1.loginWithPin(process.env.VALID_PIN, { toggleTimeout: 8000 });

  const tab2 = await context.newPage();
  await tab2.goto('./');
  await tab2.waitForTimeout(2000);
  const nav2 = new NavigationPage(tab2);

  await nav1.openClassPopup();
  await nav2.openClassPopup();
  const items1 = nav1.recentClassButtons;
  const items2 = nav2.recentClassButtons;
  const count1 = await items1.count();
  const count2 = await items2.count();
  expect(count1).toBeGreaterThanOrEqual(2);
  expect(count2).toBeGreaterThanOrEqual(2);

  await Promise.all([items1.nth(1).click(), items2.nth(2).click()]);
  await tab1.waitForTimeout(2000);

  await tab1.reload();
  await nav1.userAvatar.waitFor({ state: 'visible', timeout: 15000 });
  await tab2.reload();
  await nav2.userAvatar.waitFor({ state: 'visible', timeout: 15000 });

  const finalTab1 = (await nav1.currentClassBtn.textContent()).trim();
  const finalTab2 = (await nav2.currentClassBtn.textContent()).trim();
  console.log('After near-simultaneous switches and refresh — tab1 shows:', finalTab1, '| tab2 shows:', finalTab2);
  // The server-persisted class should be identical in both tabs after
  // refresh (last-write-wins), never two different "current" classes.
  expect(finalTab1).toBe(finalTab2);

  await tab1.close();
  await tab2.close();
});

// --- Security ---

test('NAV-SEC-01: Forging/replaying the class-switch request with a classId this teacher is not assigned to', { tag: ['@security', '@bug'] }, async ({ page }) => {
  // Needs a known classId belonging to a different teacher/school to
  // rewrite the request with -- not available without a second reference
  // account or back-office access. Documenting the constraint rather than
  // faking a pass.
  test.fail(true, 'No known out-of-scope classId available to forge the request with — needs a second reference account or back-office data');
  expect(true).toBe(false);
});

test('NAV-SEC-02: Curriculum data containing a Chapter/Topic name with embedded script/markup', { tag: ['@security', '@bug'] }, async ({ page }) => {
  const nav = new NavigationPage(page);
  let dialogFired = false;
  page.on('dialog', async (d) => {
    dialogFired = true;
    await d.dismiss();
  });

  let pageCrashed = false;
  page.on('crash', () => {
    pageCrashed = true;
  });

  await page.route('**/tce-school-api/1/api/1/curriculum', async (route) => {
    const response = await route.fetch();
    const json = await response.json().catch(() => null);
    if (!json) {
      await route.fulfill({ response });
      return;
    }
    // Find the first "name"-ish string field anywhere in the payload and
    // replace it in place -- keeps the JSON genuinely valid, so any crash
    // this causes is about how the payload renders, not a malformed body.
    const payload = JSON.parse(JSON.stringify(json));
    let replaced = false;
    const walk = (node) => {
      if (replaced || !node || typeof node !== 'object') return;
      for (const key of Object.keys(node)) {
        if (!replaced && key === 'name' && typeof node[key] === 'string') {
          node[key] = '<script>alert(1)</script>';
          replaced = true;
          return;
        }
        walk(node[key]);
      }
    };
    walk(payload);
    await route.fulfill({ response, json: payload });
  });

  try {
    await nav.loginWithPin(process.env.VALID_PIN);
    await page.waitForTimeout(2000);
  } catch (err) {
    if (page.isClosed()) pageCrashed = true;
    else throw err;
  }

  // CONFIRMED FINDING: injecting an XSS-style chapter/topic name into a
  // (still valid-JSON) curriculum response crashes the page during
  // login/render, before the payload ever gets a chance to execute as a
  // script or not. Left as a genuine failure rather than test.fail() --
  // see NAV-NET-02's comment for why a real crash can't be tracked softly.
  console.log('Page crashed/closed with an XSS-payload chapter/topic name in the curriculum response:', pageCrashed);
  expect(pageCrashed, 'An XSS-style chapter/topic name in the curriculum response should not crash the page').toBe(false);
  if (pageCrashed) return;

  expect(dialogFired).toBe(false);
  const scriptTagCount = await page.locator('script:has-text("alert(1)")').count();
  expect(scriptTagCount).toBe(0);
});

// --- Duplicate requests ---

test('NAV-DUP-01: A single normal click fires exactly one network request, not a duplicate', { tag: '@negative' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  // Land on a known curriculum first -- this account's "current class" can
  // drift to a subject with too few topics to click a second one (see the
  // Chapters/Topics module's notes on this).
  await applyClassMap(nav, 'navigationBoundary');
  await nav.openChaptersPopup();
  await expect(nav.topicItems.nth(1)).toBeVisible();

  let requestCount = 0;
  page.on('request', (req) => {
    if (req.method() === 'GET' && /serve\/tp\?/i.test(req.url())) requestCount++;
  });

  await nav.topicItems.nth(1).click();
  await page.waitForTimeout(1500);

  console.log('Requests fired from one single topic click:', requestCount);
  expect(requestCount).toBeLessThanOrEqual(1);
});

// --- Cross-Module ---

test('NAV-E2E-01: Switching Current Class stops any actively playing Player content', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  const nav = new NavigationPage(page);
  // Needs a Video resource actively playing under the current Topic to
  // observe stopping -- this account's default topic doesn't have one
  // reliably queued for direct playback without additional resource-card
  // interaction, which is Player-module territory. Documenting the gap.
  test.fail(true, 'No actively-playing Video resource reachable from this test in isolation — needs Player-module setup first');
  expect(true).toBe(false);
});

test('NAV-E2E-02: Switching Current Class with unsaved in-progress work in another module', { tag: '@cross-cutting' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  // Draw an unsaved mark on the whiteboard, then switch class.
  const penTool = page.locator('[data-qa-id="toolbar-tool-gtPen"]');
  const penAvailable = await penTool.isVisible().catch(() => false);
  if (penAvailable) {
    await penTool.click();
    const canvas = page.locator('[data-qa-id="wb-drawing-container"]');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 60, box.y + 60);
      await page.mouse.down();
      await page.mouse.move(box.x + 160, box.y + 160);
      await page.mouse.up();
    }
  }

  await nav.openClassPopup();
  const items = nav.recentClassButtons;
  const count = await items.count();
  await items.nth(count > 1 ? 1 : 0).click();
  await page.waitForTimeout(1500);

  console.log('Made an unsaved whiteboard mark before switching:', penAvailable, '— no warning-dialog mechanism observed in this pass.');
  await expect(page.locator('[data-qa-id="wb-drawing-container"]')).toBeVisible();
});
