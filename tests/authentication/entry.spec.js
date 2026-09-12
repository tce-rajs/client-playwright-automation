// Guest Mode & Entry — the state before anyone signs in.
// Source: CEP_TestCases/Login_Module_Test_Cases_Final.xlsx, cases ENT-01..07.

const { test, expect } = require('../../fixtures/electron-app');
const { LoginPage } = require('../../pages/login.page');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('ENT-01: URL loads directly into Guest Mode', { tag: '@positive' }, async ({ page }) => {
  const login = new LoginPage(page);
  await expect(login.guestModeText).toBeVisible();
});

test('ENT-02: Guest mode message is visible', { tag: '@positive' }, async ({ page }) => {
  await expect(page.getByText('You are currently in Guest Mode.')).toBeVisible();
  await expect(page.getByText('Please Sign in to choose a class and start teaching.')).toBeVisible();
});

test('ENT-03: Clicking "Sign in" opens PIN view by default', { tag: '@positive' }, async ({ page }) => {
  const login = new LoginPage(page);
  await login.openSignIn();
  await expect(login.pinForm).toBeVisible();
});

test('ENT-04: Modal layout: image left, sign-in content right', { tag: '@ui-state' }, async ({ page }) => {
  const login = new LoginPage(page);
  await login.openSignIn();

  await expect(login.leftPanel).toBeVisible();
  await expect(login.rightPanel).toBeVisible();
  const leftBox = await login.leftPanel.boundingBox();
  const rightBox = await login.rightPanel.boundingBox();

  expect(leftBox.x).toBeLessThan(rightBox.x);
  await expect(login.pinForm).toBeVisible(); // the sign-in content is in the right panel
});

test('ENT-05: Modal is dismissible / re-openable', { tag: '@positive' }, async ({ page }) => {
  // The sign-in panel is permanently mounted (a collapsed "Sign In" bar
  // sits at the bottom even in Guest Mode) — "closing" it just removes the
  // outer container's --active modifier class rather than unmounting the
  // form, so that's the real signal to check instead of visibility.
  const login = new LoginPage(page);
  await login.openSignIn();
  await expect(login.modal).toHaveClass(/login-modal-outer--active/);

  await login.closeButton.click();
  await expect(login.modal).not.toHaveClass(/login-modal-outer--active/);

  await login.openSignIn();
  await expect(login.modal).toHaveClass(/login-modal-outer--active/);
  await expect(login.pinForm).toBeVisible();
});

test('ENT-06: Guest Mode content unaffected after opening/closing modal', { tag: '@boundary' }, async ({ page }) => {
  const login = new LoginPage(page);
  await expect(login.guestModeText).toBeVisible();

  await login.openSignIn();
  await login.closeButton.click();

  await expect(login.guestModeText).toBeVisible();
});

test('ENT-07: Direct URL access to an authenticated route while logged out', { tag: ['@security', '@bug'] }, async ({ page, baseURL }) => {
  // BUG FOUND: navigating straight to an unmatched/protected-looking route
  // (there's no confirmed real "post-login" route name, so we probe a
  // plausible one) throws an uncaught Angular Router error (NG04002 "no
  // match"). The URL bar does correctly bounce back to the base path, but
  // the app never renders anything after that -- not the whiteboard, not
  // Guest Mode, just a permanent blank white page. Confirmed via a
  // page-error listener catching the uncaught NG04002 exception. Expected
  // behaviour per this test case is a graceful redirect into Guest Mode;
  // instead protected content is avoided (good) but so is everything else
  // (bad). Tracking as expected-to-fail rather than masking it.
  test.fail(true, 'Direct nav to an unmatched route throws an uncaught NG04002 and leaves a permanent blank page');

  await page.goto('./select-class');
  await expect(page).toHaveURL(baseURL);

  const login = new LoginPage(page);
  await expect(login.guestModeText).toBeVisible();
});
