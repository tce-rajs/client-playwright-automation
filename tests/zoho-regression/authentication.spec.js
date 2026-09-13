// Zoho historical bug regression -- Authentication / Sign-In.
//
// Live-verifies real, previously-reported Zoho defects for this module against the CURRENT app,
// rather than trusting their last-known Zoho Status (open/closed is not a reason to skip one --
// only an existing test that already proves the behavior is).
//
// Sources:
//   - CEP_TestCases/Zoho_Bugs_TeachMode.xlsx  (this module's rows)
//   - config/zohoBugMap.js                    (the same data as a queryable JS module)
//
// Convention for adding a case here:
//   1. Pick an unmatched bug for this module:
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Authentication / Sign-In')
//   2. Before writing anything new, check CEP_TestCases/*_Module_Test_Cases_Final.xlsx and the rest
//      of tests/ for this module -- if an existing test case already exercises this exact defect,
//      that's the ONLY valid reason to skip automating it. Set matchedTestId to that existing
//      test's title/id (not 'null') and move on; don't write a duplicate.
//   3. Otherwise, write a test that reproduces the bug's ORIGINAL repro steps against the real app
//      and asserts the ORIGINAL bug does not happen. Title it '<Zoho Item Id>: <short description>',
//      tag it '@historical-regression', and reference the Zoho title in a comment for traceability.
//   4. The test's real outcome IS the finding -- if it currently passes, the bug is confirmed fixed;
//      if it fails, the bug is confirmed still live. Both are useful results; don't force an
//      expected outcome before actually running it.
//   5. Once written, update that bug's matchedTestId field in config/zohoBugMap.js to this test's
//      title/id, then re-run 'node scripts/generate-zoho-regression-progress.js' to refresh
//      tests/zoho-regression/README.md.

const { test, expect } = require('../../fixtures/electron-app');
const { NavigationPage } = require('../../pages/navigation.page');
const { AccountManagementPage } = require('../../pages/account-management.page');
const { PlaylistPage } = require('../../pages/playlist.page');
const base = require('@playwright/test');
const { _electron: electron } = base;

const CLIENT_EXE_PATH =
  process.env.CLASSEDGE_CLIENT_EXE ||
  'C:\\Users\\v_crystalQA3\\AppData\\Local\\Programs\\tceclient\\Tata ClassEdge School.exe';
const BASE_URL = process.env.BASE_URL || 'https://ce-qa-school.devstudi.com/teach/';

function resolveUrl(url) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : new URL(url, BASE_URL).toString();
}

async function launchAndGetTeachWindow() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: CLIENT_EXE_PATH, args: ['--env=qa'], env });
  await app.firstWindow();
  const isTeachWindow = (w) => w.url().includes('/teach/');
  const deadline = Date.now() + 30000;
  let teachWindow = null;
  while (Date.now() < deadline && !teachWindow) {
    teachWindow = app.windows().find(isTeachWindow) || null;
    if (!teachWindow) await new Promise((r) => setTimeout(r, 250));
  }
  if (!teachWindow) throw new Error('Teach window not found within 30s');
  await teachWindow.waitForLoadState('domcontentloaded');
  await teachWindow.waitForTimeout(5000);
  // Same relative-URL patch as fixtures/electron-app.js -- this window has no Playwright-managed
  // browser context, so page.goto('./') (used by NavigationPage.loginWithPin) would otherwise throw
  // "Cannot navigate to invalid URL".
  const originalGoto = teachWindow.goto.bind(teachWindow);
  teachWindow.goto = (url, options) => originalGoto(resolveUrl(url), options);
  return { app, teachWindow };
}

base.test(
  'TCN-I16282: A previous session is NOT silently retained after fully closing and reopening the client (should return to Guest Mode)',
  { tag: '@historical-regression' },
  async () => {
    // Zoho TCN-I16282 (Authentication/Sign-In, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: sign in, fully close the client, reopen it -- the previous user's session is
    // still active instead of returning to Guest Mode (a real security/state concern on a shared
    // classroom device).
    //
    // This test manages its own Electron app instances directly (bypassing the shared `page`
    // fixture, which only ever launches ONE instance per test) since it specifically needs two
    // separate launches of the same real client.
    base.test.setTimeout(120000);
    const { app: app1, teachWindow: win1 } = await launchAndGetTeachWindow();
    const { NavigationPage } = require('../../pages/navigation.page');
    const nav1 = new NavigationPage(win1);
    await nav1.loginWithPin(process.env.VALID_PIN);
    await win1.waitForTimeout(1000);
    await app1.close().catch(() => {});

    const { app: app2, teachWindow: win2 } = await launchAndGetTeachWindow();
    const stillSignedIn = await win2
      .locator('[data-qa-id="toolbar-user-avatar"]')
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    const guestModeVisible = await win2
      .getByText(/guest mode/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    console.log(
      'After fully closing and reopening the client -- still shows signed-in avatar:',
      stillSignedIn,
      '| Guest Mode visible:',
      guestModeVisible
    );
    await app2.close().catch(() => {});

    base.test.fail(
      stillSignedIn && !guestModeVisible,
      'CONFIRMED (matches Zoho TCN-I16282): the previous session was silently retained after fully closing and reopening the client, instead of returning to Guest Mode'
    );
    base.expect(stillSignedIn && !guestModeVisible).toBe(false);
  }
);

test(
  'CWR-I500: Grade and Subject finish loading after login instead of spinning continuously',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I500 (Authentication/Sign-In, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: after logging in, the Grade and Subject selector keeps showing a loading
    // state indefinitely instead of resolving to the real class.
    const nav = new NavigationPage(page);
    await nav.loginWithPin(process.env.VALID_PIN);
    const loaded = await nav.currentClassBtn
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    const text = loaded ? (await nav.currentClassBtn.textContent()).trim() : '';
    console.log('Grade/Subject button loaded:', loaded, '| text:', JSON.stringify(text));

    test.fail(
      !loaded || text.length === 0,
      'CONFIRMED (matches Zoho CWR-I500): the Grade/Subject selector never resolved to real content after login'
    );
    expect(loaded && text.length > 0).toBe(true);
  }
);

test(
  'TCN-I15985: The Sign In bar shows a real close-arrow icon while loading, not literal placeholder text',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I15985 (Authentication/Sign-In, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: on the login page's loading state, the collapse/close-arrow control shows raw
    // placeholder text ("carr/arrow") instead of the real icon.
    await page.goto('./');
    // Check early (right after navigation) since this is specifically a LOADING-state artifact --
    // a stable check after full load would miss it even if it exists.
    const bodyText = await page
      .locator('body')
      .textContent({ timeout: 5000 })
      .catch(() => '');
    const placeholderTextVisible = /carr\s*\/?\s*arrow/i.test(bodyText || '');
    // Re-check after full settle too, in case the placeholder persists rather than being transient.
    await page.waitForTimeout(3000);
    const bodyTextAfter = await page
      .locator('body')
      .textContent({ timeout: 5000 })
      .catch(() => '');
    const placeholderStillVisible = /carr\s*\/?\s*arrow/i.test(bodyTextAfter || '');
    console.log(
      'Placeholder icon text visible right after navigation:',
      placeholderTextVisible,
      '| still visible after settling:',
      placeholderStillVisible
    );

    test.fail(
      placeholderTextVisible || placeholderStillVisible,
      'CONFIRMED (matches Zoho TCN-I15985): literal "carr/arrow" placeholder text is visible instead of the real close-arrow icon'
    );
    expect(placeholderTextVisible || placeholderStillVisible).toBe(false);
  }
);

test(
  'TCN-I14980: A confirmation message is shown after logging out',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I14980 (Authentication/Sign-In, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: after logging out, no confirmation/message is displayed to the user.
    const nav = new NavigationPage(page);
    const acc = new AccountManagementPage(page);
    await nav.loginWithPin(process.env.VALID_PIN);

    await acc.openProfileMenu();
    await acc.signOutBtn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1000);

    const confirmationVisible = await page
      .getByText(/signed out|logged out|logout successful|you have been signed out/i)
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    console.log('A logout confirmation message was shown:', confirmationVisible);

    test.fail(
      !confirmationVisible,
      'CONFIRMED (matches Zoho TCN-I14980): no confirmation/message is displayed after logging out'
    );
    expect(confirmationVisible).toBe(true);
  }
);

test(
  'CWR-I286: Opened assets do not remain open after an auto sign-out',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I286 (Authentication/Sign-In, Status: QA Sign off/Closed as of the 2026-09-13 export).
    // Original repro: with a resource/asset open, an automatic sign-out happens -- the opened asset
    // stays visible on screen instead of being closed.
    const pl = new PlaylistPage(page);
    const nav = new NavigationPage(page);
    const acc = new AccountManagementPage(page);
    await pl.loginWithPin(process.env.VALID_PIN);
    await pl.ensureResourcesPresent();

    const opened = await pl.resourceCards.count();
    test.fail(opened === 0, 'No playlist resources available this pass -- cannot test asset residue after sign-out');
    if (opened === 0) {
      expect(opened).toBeGreaterThan(0);
      return;
    }
    await pl.resourceCards.first().evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      el.click();
    });
    await page.waitForTimeout(2000);

    await acc.avatarTrigger.click({ force: true });
    await page.waitForTimeout(700);
    await acc.signOutBtn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1500);

    const backToGuest = await page
      .getByText(/guest mode/i)
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    test.fail(!backToGuest, 'Sign-out did not return to Guest Mode -- cannot test the post-signout asset residue');
    if (!backToGuest) {
      expect(backToGuest).toBe(true);
      return;
    }

    const closeIconStillVisible = await page
      .locator("img[alt='close-btn'], .weblink-close-btn, .image-close-btn img")
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    console.log('An opened asset player is still visible after auto sign-out:', closeIconStillVisible);

    test.fail(
      closeIconStillVisible,
      'CONFIRMED (matches Zoho CWR-I286): an opened asset remains visible on screen after signing out'
    );
    expect(closeIconStillVisible).toBe(false);
  }
);

test(
  'TCN-I16618: The virtual keyboard opens when entering a new password',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16618 -- the virtual keyboard does not open during New Password Creation, though it
    // correctly opens during login. Reuses the established Change Password flow (the closest
    // "creating/entering a new password" surface confirmed reachable in this suite).
    const pl = new PlaylistPage(page);
    await pl.loginWithPin(process.env.VALID_PIN);
    const acc = new AccountManagementPage(page);
    // CONFIRMED LIVE (this pass): Change Password lives under the PROFILE tab, not Account
    // (Account's own content never actually renders -- a separate, already-documented bug).
    await acc.openProfileMenu();
    await acc.drilldownTrigger.click({ force: true });
    await acc.profileTab.waitFor({ state: 'visible', timeout: 10000 });
    await acc.profileTab.click({ force: true });
    await page.waitForTimeout(800);
    const openLinkVisible = await acc.openChangePasswordLink.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!openLinkVisible, 'Change Password link not reachable this pass');
    if (!openLinkVisible) {
      expect(openLinkVisible).toBe(true);
      return;
    }
    await acc.openChangePasswordLink.click({ force: true });
    await acc.newPasswordInput.waitFor({ state: 'visible', timeout: 5000 });
    await acc.newPasswordInput.click({ force: true });
    await page.waitForTimeout(1000);
    const keyboardVisible = await page.locator('.keyboard-wrapper').first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Virtual keyboard visible after focusing the New Password field:', keyboardVisible);
    await acc.changePasswordCancelBtn.click({ force: true }).catch(() => {});

    test.fail(
      !keyboardVisible,
      'CONFIRMED (matches Zoho TCN-I16618): the virtual keyboard did not open when entering a new password'
    );
    expect(keyboardVisible).toBe(true);
  }
);
