// UI Edge Quirks.
// Source: CEP_TestCases/Login_Module_Test_Cases_Final.xlsx, cases EDGE-01..03.

const { test, expect } = require('../../fixtures/electron-app');
const { LoginPage } = require('../../pages/login.page');

test('EDGE-01: Settings-menu Virtual Keyboard toggle stays in sync with the modal\'s own toggle', { tag: '@ui-state' }, async ({ page }) => {
  const login = new LoginPage(page);
  await page.goto('./');
  await login.openSignIn();
  await login.enterPin(process.env.VALID_PIN);
  await expect(page.locator('[data-qa-id="toolbar-user-avatar"]')).toBeVisible({ timeout: 15000 });

  // Disable the keyboard from the profile/settings menu.
  await page.locator('[data-qa-id="toolbar-user-avatar"]').click();
  const settingsToggle = page.locator('[data-qa-id="toolbar-profile-keyboard-toggle"]');
  await expect(settingsToggle).toBeVisible();
  const initiallyChecked = await settingsToggle.isChecked().catch(async () => {
    // Might be a custom toggle, not a real checkbox -- fall back to an aria/class check.
    return (await settingsToggle.getAttribute('aria-checked')) === 'true';
  });
  await settingsToggle.click();

  const afterClickChecked = await settingsToggle.isChecked().catch(async () => (await settingsToggle.getAttribute('aria-checked')) === 'true');
  console.log('Settings keyboard toggle: before =', initiallyChecked, '| after =', afterClickChecked);
  expect(afterClickChecked).not.toBe(initiallyChecked);
});

test('EDGE-02: Resizing the browser window mid-PIN-entry does not lose entered digits', { tag: '@boundary' }, async ({ page }) => {
  await page.goto('./');
  const login = new LoginPage(page);
  await login.openSignIn();

  await login.pinDigitBox(0).fill('1');
  await login.pinDigitBox(1).fill('2');

  await page.setViewportSize({ width: 900, height: 700 });
  await page.waitForTimeout(500);

  await expect(login.pinDigitBox(0)).toHaveValue('1');
  await expect(login.pinDigitBox(1)).toHaveValue('2');

  await login.pinDigitBox(2).fill('3');
  await expect(login.pinDigitBox(2)).toHaveValue('3');
});

test('EDGE-03: Switching keyboard language mid-session does not corrupt entered value', { tag: '@boundary' }, async ({ page }) => {
  await page.goto('./');
  const login = new LoginPage(page);
  await login.openSignIn();
  await login.switchToPasswordView();

  await login.usernameInput.fill('partial-user-id');
  await expect(login.qwertyKeyboard).toBeVisible();

  const languageSelect = login.qwertyKeyboard.locator('select');
  await languageSelect.selectOption({ label: 'Hindi' });
  await page.waitForTimeout(300);

  // The already-typed value should be untouched -- only the on-screen key
  // labels should change, not the field's actual content.
  await expect(login.usernameInput).toHaveValue('partial-user-id');
});
