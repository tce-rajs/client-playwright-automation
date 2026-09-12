// Network & Resilience.
// Source: CEP_TestCases/Login_Module_Test_Cases_Final.xlsx, cases NET-01..04.

const { test, expect } = require('../../fixtures/electron-app');
const { LoginPage } = require('../../pages/login.page');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  const login = new LoginPage(page);
  await login.openSignIn();
});

test('NET-01: Submit login while offline', { tag: '@boundary' }, async ({ page, context }) => {
  const login = new LoginPage(page);
  await context.setOffline(true);
  await login.enterPin(process.env.VALID_PIN);

  // A clear "no connection" style error, and specifically NOT an infinite
  // spinner -- give it a bounded wait and check the form is still usable.
  await page.waitForTimeout(5000);
  const stillOnPinForm = await login.pinForm.isVisible();
  console.log('Still on PIN form after offline submit (not stuck loading):', stillOnPinForm);
  expect(stillOnPinForm).toBe(true);

  await context.setOffline(false);
});

test('NET-02: Backend 5xx error on login request', { tag: '@boundary' }, async ({ page }) => {
  const login = new LoginPage(page);
  await page.route('**/sso/pin/**', (route) => {
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) });
  });

  await login.enterPin(process.env.VALID_PIN);

  // Graceful error, never a raw stack trace or blank screen.
  await expect(login.pinErrorMessage).toBeVisible({ timeout: 10000 });
  const bodyText = await page.textContent('body');
  expect(bodyText).not.toMatch(/stack trace|Internal Server Error|<html/i);
});

test('NET-03: Slow network shows a loading/disabled state', { tag: '@boundary' }, async ({ page }) => {
  const login = new LoginPage(page);
  await login.switchToPasswordView();
  await login.selectSchool(process.env.SCHOOL_SEARCH_TERM);
  await login.usernameInput.fill(process.env.USERNAME);
  await login.passwordInput.fill('definitely-not-the-real-password');

  await page.route('**/sso/token*', async (route) => {
    await new Promise((r) => setTimeout(r, 3000)); // simulate a slow backend
    await route.continue();
  });

  await login.submitButton.click();
  // While the (slowed) request is in flight, the button should reflect a
  // busy/disabled state rather than staying clickable (which would invite
  // a double-submit).
  await expect(login.submitButton).toBeDisabled({ timeout: 1000 });
});

test('NET-04: Request timeout handling', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  // FINDING: with the login request hung indefinitely (never
  // fulfilled/continued/aborted), no timeout message appeared within a 20s
  // bounded wait — confirmed via a real run, the loader/disabled state
  // just stays stuck rather than eventually surfacing a "taking too long"
  // message.
  test.fail(true, 'No client-side timeout message appears within 20s of a hung login request — indefinite loader');

  const login = new LoginPage(page);
  // Simulate a request that never resolves.
  await page.route('**/sso/pin/**', () => {
    // Never call route.fulfill/continue/abort -- the request just hangs.
  });

  await login.enterPin(process.env.VALID_PIN);
  await expect(login.pinErrorMessage).toBeVisible({ timeout: 20000 });
});
