// Responsive & Cross-Browser.
// Source: CEP_TestCases/Login_Module_Test_Cases_Final.xlsx, cases RESP-01..05.

const { test, expect, devices } = require('../../fixtures/electron-app');
const { LoginPage } = require('../../pages/login.page');

test('RESP-01: Layout on mobile viewport (~375px width)', { tag: '@ui-state' }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('./');
  const login = new LoginPage(page);
  await login.openSignIn();

  // Confirmed real behaviour at this width: the decorative left image
  // panel is hidden entirely (not stacked below, just not shown) and only
  // the sign-in form panel renders -- a sensible adaptation, not a bug.
  await expect(login.leftPanel).toBeHidden();
  await expect(login.rightPanel).toBeVisible();
  await expect(login.pinForm).toBeVisible();

  const rightBox = await login.rightPanel.boundingBox();
  expect(rightBox.width).toBeLessThanOrEqual(375);
});

test('RESP-02: Layout on tablet viewport (~768px)', { tag: '@positive' }, async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('./');
  const login = new LoginPage(page);
  await login.openSignIn();

  await expect(login.pinForm).toBeVisible();
  const formBox = await login.pinForm.boundingBox();
  expect(formBox.width).toBeGreaterThan(0);
  expect(formBox.x).toBeGreaterThanOrEqual(0);
  expect(formBox.x + formBox.width).toBeLessThanOrEqual(768 + 1);
});

test('RESP-03: Landscape vs portrait orientation on mobile', { tag: '@boundary' }, async ({ page }) => {
  const login = new LoginPage(page);

  await page.setViewportSize({ width: 375, height: 667 }); // portrait
  await page.goto('./');
  await login.openSignIn();
  await expect(login.pinForm).toBeVisible();

  await page.setViewportSize({ width: 667, height: 375 }); // landscape
  await page.waitForTimeout(500);
  await expect(login.pinForm).toBeVisible();
});

test('RESP-04: Browser zoom at 150-200%', { tag: '@boundary' }, async ({ page }) => {
  await page.goto('./');
  const login = new LoginPage(page);
  await login.openSignIn();

  for (const zoom of [1.5, 2.0]) {
    await page.evaluate((z) => {
      document.body.style.zoom = String(z);
    }, zoom);
    await page.waitForTimeout(300);
    await expect(login.pinForm).toBeVisible();
  }
});

test('RESP-05: Cross-browser consistency (Chromium, Firefox, WebKit)', { tag: '@boundary' }, async ({ page, browserName }) => {
  // Runs three times — once per engine (see playwright.config.js's
  // per-project `grep`) — repeating the core PIN login flow and checking
  // the same real things work on each: the canvas-rendered toolbar, the
  // virtual keyboard, and PIN entry/submit.
  console.log('Running under browser engine:', browserName);

  await page.goto('./');
  const login = new LoginPage(page);
  await expect(login.guestModeText).toBeVisible();

  await login.openSignIn();
  await expect(login.pinForm).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await expect(login.pinDigitBox(i)).toBeVisible();
  }

  await login.enterPin(process.env.VALID_PIN);
  await expect(page.locator('[data-qa-id="toolbar-user-avatar"]')).toBeVisible({ timeout: 15000 });
});
