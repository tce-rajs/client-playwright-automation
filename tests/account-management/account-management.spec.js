// Account Management.
// Source: CEP_TestCases/Account_Management_Module_Test_Cases_Final.xlsx,
// cases ACC-SESSION-01..02, ACC-ACCESS-01, ACC-PLAN-01..06.
//
// CONFIRMED LIVE (2026-09-06): the manual pass's "screen not reached"
// finding (ACC-ACCESS-01) is PARTIALLY corrected and partially reconfirmed
// with more precision: avatar click -> toolbar-profile-trigger -> the
// Account/Profile tab row IS reachable. But clicking "Account" specifically
// never reveals its own panel -- the sibling .tab-panel elements are both
// rendered in the DOM (confirmed via computed styles) with Profile's
// content permanently visibility:visible and Account's (Change
// Password/PIN) permanently visibility:hidden, regardless of the click.
// Checked at 0/100/300/600/1000/2000/3000ms after the click, with a plain
// click, a forced click, and a double-click -- never changes. No class
// change on the tab element either. This is a CRITICAL confirmed bug, not
// a "couldn't find it" access problem: Change Password/PIN are genuinely
// unreachable via this UI right now. Change Password/PIN would never be
// actually submitted here regardless (destructive credential risk to the
// shared QA account) -- only menu/form-presence behavior was going to be
// verified.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AccountManagementPage } = require('../../pages/account-management.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
});

test('ACC-ACCESS-01: The Account Management screen is reachable via the avatar/profile drilldown', { tag: '@positive' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const changePwdLinkVisible = await acc.openChangePasswordLink.isVisible().catch(() => false);
  const changePinLinkVisible = await acc.openChangePinLink.isVisible().catch(() => false);
  console.log('Change Password link visible after clicking Account tab:', changePwdLinkVisible, '| Change PIN link visible:', changePinLinkVisible);

  test.fail(!changePwdLinkVisible || !changePinLinkVisible, 'Clicking the "Account" tab never reveals its own panel -- the Profile tab\'s content stays visibility:visible and Account\'s (Change Password/PIN) stays visibility:hidden regardless of the click, checked from 0ms to 3000ms after clicking. Change Password/PIN are genuinely unreachable via this UI right now.');
  expect(changePwdLinkVisible && changePinLinkVisible).toBe(true);
});

test('ACC-PLAN-01: The Change Password form requires the current password before a new one', { tag: '@negative' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const linkVisible = await acc.openChangePasswordLink.isVisible().catch(() => false);
  if (!linkVisible) {
    test.fail(true, 'Blocked by ACC-ACCESS-01 -- the Change Password link is never revealed by clicking the Account tab');
    expect(linkVisible).toBe(true);
    return;
  }
  await acc.openChangePasswordLink.click({ force: true });
  await page.waitForTimeout(800);
  await expect(acc.changePasswordForm).toBeVisible();
  await expect(acc.currentPasswordInput).toBeVisible();
  await expect(acc.newPasswordInput).toBeVisible();
  await expect(acc.repeatPasswordInput).toBeVisible();

  // Confirm Save is gated on the current-password field being filled,
  // without ever actually submitting a real change.
  const saveDisabledEmpty = await acc.changePasswordSaveBtn.isDisabled().catch(() => null);
  console.log('Save button disabled with all fields empty:', saveDisabledEmpty);
  expect(saveDisabledEmpty).not.toBe(false);

  await acc.changePasswordCancelBtn.click({ force: true });
  await page.waitForTimeout(500);
  await expect(acc.changePasswordForm).toBeHidden();
});

test('ACC-PLAN-02: No rate-limiting/lockout confirmation attempted -- deliberately not executed', { tag: '@security' }, async ({ page }) => {
  // Deliberately not executed: this would require repeatedly submitting a
  // wrong current password/PIN, which risks tripping a real account
  // lockout on the shared QA credential used by every other module's tests.
  test.fail(true, 'Deliberately not executed -- repeated wrong-password/PIN submission risks locking the shared QA account that every other module\'s tests depend on');
  expect(true).toBe(false);
});

test('ACC-PLAN-03: Cross-session invalidation on credential change -- deliberately not executed', { tag: '@security' }, async ({ page }) => {
  test.fail(true, 'Deliberately not executed -- requires actually changing the shared account\'s password/PIN, which is excluded from automation (destructive credential risk)');
  expect(true).toBe(false);
});

test('ACC-PLAN-04: A successful credential change usable on next login -- deliberately not executed', { tag: '@security' }, async ({ page }) => {
  test.fail(true, 'Deliberately not executed -- same reason as ACC-PLAN-03: requires a real credential change on the shared account');
  expect(true).toBe(false);
});

test('ACC-PLAN-05: New PIN validation (format rules) is enforced client-side', { tag: '@boundary' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const pinLinkVisible = await acc.openChangePinLink.isVisible().catch(() => false);
  if (!pinLinkVisible) {
    test.fail(true, 'Blocked by ACC-ACCESS-01 -- the Change PIN link is never revealed by clicking the Account tab');
    expect(pinLinkVisible).toBe(true);
    return;
  }
  await acc.openChangePinLink.click({ force: true });
  await page.waitForTimeout(800);

  const pinBoxVisible = await acc.newPinBox(0).isVisible().catch(() => false);
  console.log('New PIN entry box visible:', pinBoxVisible);
  expect(pinBoxVisible).toBe(true);

  // Fill an intentionally too-short/invalid new PIN and confirm Save
  // doesn't silently accept it -- without ever clicking Save for a valid one.
  await acc.newPinBox(0).fill('1');
  await page.waitForTimeout(500);
  const saveDisabled = await acc.changePinSaveBtn.isDisabled().catch(() => null);
  console.log('Save button disabled with an incomplete new PIN:', saveDisabled);
  expect(saveDisabled).not.toBe(false);

  await acc.changePinCancelBtn.click({ force: true });
});

test('ACC-PLAN-06: MFA setup/verification flow -- deliberately not executed', { tag: '@security' }, async ({ page }) => {
  test.fail(true, 'Deliberately not executed -- enrolling/verifying MFA on the shared QA account risks locking out every other module\'s tests that depend on simple PIN login');
  expect(true).toBe(false);
});

test('ACC-SESSION-01: The logged-in session remains valid through a sustained period of active use', { tag: '@state-persistence' }, async ({ page }) => {
  test.setTimeout(150000);
  const pl = new PlaylistPage(page);
  const start = Date.now();
  let droppedAt = null;

  // Real, continuous light activity for ~2 minutes -- matching the
  // manually-observed "60-120s of active use" window -- checking session
  // validity every 15s rather than a single before/after snapshot.
  while (Date.now() - start < 120000) {
    await page.locator('[data-qa-id="playlist-resource-nav-filter-menu"]').click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1000);
    const stillSignedIn = await pl.resourceCards.first().isVisible({ timeout: 3000 }).catch(() => false)
      || await page.locator('[data-qa-id="toolbar-user-avatar"]').isVisible({ timeout: 3000 }).catch(() => false);
    if (!stillSignedIn) {
      droppedAt = Date.now() - start;
      break;
    }
    await page.waitForTimeout(3000);
  }

  console.log('Session dropped at (ms):', droppedAt);
  test.fail(droppedAt !== null && droppedAt < 120000, `Session dropped back to Guest Mode after ${droppedAt}ms of active use, well before a teacher would expect`);
  expect(droppedAt).toBeNull();
});

test('ACC-SESSION-02: Re-entering the PIN after a session drop is reliable via the on-screen keypad', { tag: '@state-persistence' }, async ({ page }) => {
  // This case only has a real precondition to test against if ACC-SESSION-01
  // actually reproduces a drop -- automation cannot force a session drop on
  // demand, and the underlying keypad-reliability question was already
  // separately confirmed (Login module) to need a human on a real
  // keyboard/mouse to judge layout-shift vs. automation-only artifact.
  test.fail(true, 'Cannot force a session drop on demand to set up this case\'s precondition; the underlying keypad-click-reliability question was already flagged in the Login module as needing human confirmation on a real device');
  expect(true).toBe(false);
});
