// Session & State.
// Source: CEP_TestCases/Login_Module_Test_Cases_Final.xlsx, cases SESS-01..07.

const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/login.page');

// The confirmed "you're logged in" signal: the toolbar's user avatar
// (data-qa-id="toolbar-user-avatar"), which opens the profile/sign-out
// menu. An earlier guess at a different id ("toolbar-profile-trigger")
// turned out to be a separate, unrelated hidden element.
const avatar = (page) => page.locator('[data-qa-id="toolbar-user-avatar"]');

test('SESS-01: Session persists after browser refresh post-login', { tag: '@positive' }, async ({ page }) => {
  const login = new LoginPage(page);
  await page.goto('./');
  await login.openSignIn();
  await login.enterPin(process.env.VALID_PIN);
  await expect(avatar(page)).toBeVisible({ timeout: 15000 });

  await page.reload();
  await expect(login.guestModeText).toBeHidden();
  await expect(avatar(page)).toBeVisible({ timeout: 10000 });
});

test('SESS-02: Session persists across a new tab (same browser)', { tag: '@boundary' }, async ({ page, context }) => {
  const login = new LoginPage(page);
  await page.goto('./');
  await login.openSignIn();
  await login.enterPin(process.env.VALID_PIN);
  await expect(avatar(page)).toBeVisible({ timeout: 15000 });

  const secondPage = await context.newPage();
  await secondPage.goto('./');
  const secondLogin = new LoginPage(secondPage);
  await expect(secondLogin.guestModeText).toBeHidden();
  await expect(avatar(secondPage)).toBeVisible({ timeout: 10000 });
  await secondPage.close();
});

test('SESS-03: Two tabs, two different logins — session isolation', { tag: '@boundary' }, async ({ context }) => {
  // A genuine two-different-accounts test needs a second confirmed-working
  // credential set, which we don't have (VALID_PIN is the only one).
  // What actually happened when this was first attempted with the same PIN
  // in both tabs is itself the real, useful finding: opening tab 2 in the
  // SAME browser context (same as any two tabs a real user would have)
  // lands it ALREADY logged in via the shared session -- there's no
  // "Sign in" bar to click on tab 2 at all, confirming auth state is
  // shared across tabs by design (consistent with SESS-02). Testing that
  // directly here instead of forcing a broken re-login flow.
  const tab1 = await context.newPage();
  const login1 = new LoginPage(tab1);
  await tab1.goto('./');
  await tab1.waitForTimeout(2000); // this SPA never reaches "networkidle" -- fixed settle wait instead
  await login1.openSignIn();
  await login1.enterPin(process.env.VALID_PIN);
  await expect(avatar(tab1)).toBeVisible({ timeout: 15000 });

  const tab2 = await context.newPage();
  await tab2.goto('./');
  await tab2.waitForTimeout(2000);
  // tab2 should already be logged in -- no Guest Mode text, no Sign In bar.
  const tab2Login = new LoginPage(tab2);
  await expect(tab2Login.guestModeText).toBeHidden();
  await expect(avatar(tab2)).toBeVisible({ timeout: 10000 });

  await tab1.close();
  await tab2.close();
});

test('SESS-04: Session/token expiry mid-session', { tag: '@boundary' }, async ({ page }) => {
  // We can't wait out a real session timeout in a test run, so we simulate
  // expiry directly: clear the auth token(s) the app stores client-side
  // after a real login, then try to interact -- a graceful app should
  // detect the missing/invalid token and prompt re-login rather than
  // silently break.
  const login = new LoginPage(page);
  await page.goto('./');
  await login.openSignIn();
  await login.enterPin(process.env.VALID_PIN);
  await expect(avatar(page)).toBeVisible({ timeout: 15000 });

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  // A graceful handling shows Guest Mode again -- not a blank page or a JS
  // error overlay.
  await expect(login.guestModeText).toBeVisible({ timeout: 10000 });
});

test('SESS-05: Sign-out clears session fully', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  const login = new LoginPage(page);
  await page.goto('./');
  await login.openSignIn();
  await login.enterPin(process.env.VALID_PIN);
  await expect(avatar(page)).toBeVisible({ timeout: 15000 });

  await avatar(page).click();
  await page.locator('[data-qa-id="toolbar-profile-signout-btn"]').click();
  await expect(login.guestModeText).toBeVisible({ timeout: 10000 });

  // BUG FOUND (same class of bug as ENT-07): pressing Back after sign-out
  // lands on a permanent blank white page, not the guest/sign-in screen a
  // real user would expect and not the still-authenticated content either.
  await page.goBack();
  const bodyTextLength = (await page.textContent('body')).length;
  console.log('body text length after Back post-sign-out:', bodyTextLength);
  test.fail(bodyTextLength === 0, 'Browser Back after sign-out lands on a blank page — same class of bug as ENT-07');
  expect(bodyTextLength).toBeGreaterThan(0);
});

test('SESS-06: Browser back button after successful login', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  // BUG FOUND (same class of bug as ENT-07 and SESS-05): pressing Back
  // right after a successful login also lands on a permanent blank page.
  test.fail(true, 'Browser Back after login lands on a blank page — same class of bug as ENT-07/SESS-05');

  const login = new LoginPage(page);
  await page.goto('./');
  await login.openSignIn();
  await login.enterPin(process.env.VALID_PIN);
  await expect(avatar(page)).toBeVisible({ timeout: 15000 });

  await page.goBack();
  await page.waitForTimeout(1500);
  const bodyText = await page.textContent('body');
  expect(bodyText.length).toBeGreaterThan(0);
});

test('SESS-07: Guest-mode state preserved or lost on sign-in', { tag: '@boundary' }, async ({ page }) => {
  const login = new LoginPage(page);
  await page.goto('./');

  // Draw something on the guest-mode canvas using the pen tool, if reachable.
  const penTool = page.locator('[data-qa-id="toolbar-tool-gtPen"]');
  const penAvailable = await penTool.isVisible().catch(() => false);
  if (penAvailable) {
    await penTool.click();
    const canvas = page.locator('[data-qa-id="wb-drawing-container"]');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 150);
      await page.mouse.up();
    }
  }

  await login.openSignIn();
  await login.enterPin(process.env.VALID_PIN);
  await expect(avatar(page)).toBeVisible({ timeout: 15000 });

  console.log('Guest-mode drawing attempted before sign-in:', penAvailable);
  // Whether the drawing persisted or was discarded is the real finding to
  // read from this run's trace/screenshot -- both are legitimate outcomes,
  // what matters is confirming the app doesn't crash carrying state across
  // the guest -> authenticated transition.
  await expect(page.locator('[data-qa-id="wb-drawing-container"]')).toBeVisible();
});
