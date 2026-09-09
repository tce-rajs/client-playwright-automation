// Concurrency.
// Source: CEP_TestCases/Login_Module_Test_Cases_Final.xlsx, cases CONC-01..02.

const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/login.page');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  const login = new LoginPage(page);
  await login.openSignIn();
});

test('CONC-01: Double-submit via Enter + click, or rapid double-click', { tag: '@boundary' }, async ({ page }) => {
  const login = new LoginPage(page);
  await login.switchToPasswordView();
  await login.selectSchool(process.env.SCHOOL_SEARCH_TERM);
  await login.usernameInput.fill(process.env.USERNAME);
  await login.passwordInput.fill('definitely-not-the-real-password');

  let loginRequestCount = 0;
  page.on('request', (req) => {
    if (req.method() === 'POST' && /sso\/token/i.test(req.url())) loginRequestCount++;
  });

  // Rapid double-click, as close together as a real double-click gesture.
  await login.submitButton.click({ clickCount: 2, delay: 20 });
  await expect(login.passwordErrorMessage).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000); // let any second request finish arriving

  console.log('Login POST requests fired from one rapid double-click:', loginRequestCount);
  expect(loginRequestCount).toBe(1);
});

test('CONC-02: Submitting a new PIN while a previous wrong-PIN request is still in flight', { tag: '@boundary' }, async ({ page }) => {
  const login = new LoginPage(page);

  // IMPORTANT: use fresh random PINs, not fixed ones like '11111' — this is
  // a shared QA environment with many real accounts, and a hardcoded
  // "wrong" PIN can coincidentally BE someone else's real, valid PIN
  // (confirmed: '11111' actually logged into a real "Class 6A |
  // Mathematics" account mid-test here, derailing everything downstream).
  const wrongPin1 = String(Math.floor(10000 + Math.random() * 89999));
  const wrongPin2 = String(Math.floor(10000 + Math.random() * 89999));

  // Slow the first request down so we have a window to submit a second PIN
  // before it resolves.
  let requestNumber = 0;
  await page.route('**/sso/pin/**', async (route) => {
    requestNumber++;
    if (requestNumber === 1) await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });

  await login.enterPin(wrongPin1); // request #1 in flight
  await page.waitForTimeout(300); // don't wait for it to resolve

  // FINDING: the app actually prevents this race outright -- the PIN boxes
  // become disabled while a request is in flight. That's the good outcome
  // this test case is checking for, just enforced earlier (via disabling
  // input) rather than by reconciling two in-flight responses.
  await expect(login.pinDigitBox(0)).toBeDisabled();

  // Once request #1 resolves and boxes re-enable, a second PIN can be
  // entered normally with no leftover mismatched state.
  await expect(login.pinDigitBox(4)).toBeEnabled({ timeout: 10000 });
  await login.enterPin(wrongPin2);
  await expect(login.pinErrorMessage).toBeVisible({ timeout: 10000 });
  await expect(login.pinForm).toBeVisible();
});
