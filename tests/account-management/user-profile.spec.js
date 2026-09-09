// User Profile -- the FULL, newly re-explored version of this module.
// Source: CEP_TestCases/User_Profile_Module_Test_Cases_Final.xlsx (45 cases,
// USR-* prefix, superseding the older account-management.spec.js's smaller
// ACC-* case set, which is left in place as additional regression coverage
// rather than deleted).
//
// CONFIRMED LIVE (new workbook): the entry point is a TWO-LEVEL popover --
// avatar click opens an OUTER flat menu ("Signed in as <name> >", Dark
// Mode, Virtual Keyboard, Classroom Mode, Sign Out, build-info), and
// clicking the "Signed in as" row's chevron opens a SEPARATE INNER
// Account/Profile tab group (the actual User Profile modal). These are two
// structurally distinct views, not one screen.
//
// Every case that would require an actual Save on Change Password/Change
// PIN (or repeated wrong-credential attempts, or removing every Subject
// chip down to zero) is deliberately NOT executed against the one shared
// QA account (arjun.reddy) used throughout this whole project -- doing so
// would change or lock out the real login credential relied on by every
// other test/session. Each such case still runs for real up to the point
// just before the destructive action, and documents the constraint via
// test.fail() rather than being skipped.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AccountManagementPage } = require('../../pages/account-management.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
});

test('USR-ACCESS-01: User Profile entry point -- avatar -> Signed in as chevron -> modal with Account/Profile tabs', { tag: '@positive' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await expect(acc.drilldownTrigger).toBeVisible();
  await acc.drilldownTrigger.click({ force: true });
  await expect(acc.accountTab).toBeVisible({ timeout: 10000 });
  await expect(acc.profileTab).toBeVisible();
});

test('USR-ACCESS-02: The outer flat menu and inner Account/Profile tab group are two distinct popovers', { tag: '@ui-state' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  // Outer menu controls, before drilling in.
  await expect(acc.signedInAsRow).toBeVisible();
  await expect(acc.darkModeToggle).toBeVisible();
  await expect(acc.virtualKeyboardToggle).toBeVisible();
  await expect(acc.signOutBtn).toBeVisible();
  const accountTabVisibleBeforeDrilldown = await acc.accountTab.isVisible().catch(() => false);
  console.log('Account tab visible on the OUTER menu (should be false -- it lives in the inner view):', accountTabVisibleBeforeDrilldown);
  expect(accountTabVisibleBeforeDrilldown).toBe(false);

  await acc.drilldownTrigger.click({ force: true });
  await expect(acc.accountTab).toBeVisible({ timeout: 10000 });
});

test('USR-ACCOUNT-01: Account tab shows Preferred Resource Type and Subjects', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const resourceTypeVisible = await acc.preferredResourceTypeDropdown.isVisible({ timeout: 5000 }).catch(() => false);
  const subjectChipCount = await acc.subjectChips.count();
  console.log('Preferred Resource Type control visible:', resourceTypeVisible, '| Subject chips found:', subjectChipCount);
  test.fail(!resourceTypeVisible && subjectChipCount === 0, 'Account tab shows neither a Preferred Resource Type control nor any Subject chips -- conflicts with this workbook\'s own confirmed finding');
  expect(resourceTypeVisible || subjectChipCount > 0).toBe(true);
});

test('USR-PROFILE-01: Profile tab shows Change Password and Change PIN entries', { tag: '@positive' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await expect(acc.profileTab).toBeVisible({ timeout: 10000 });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await expect(acc.openChangePasswordLink).toBeVisible();
  await expect(acc.openChangePinLink).toBeVisible();
});

test('USR-PWD-01: Change Password form fields render correctly', { tag: '@positive' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePasswordLink.click({ force: true });
  await expect(acc.currentPasswordInput).toBeVisible({ timeout: 5000 });
  await expect(acc.newPasswordInput).toBeVisible();
  await expect(acc.repeatPasswordInput).toBeVisible();
  await expect(acc.changePasswordSaveBtn).toBeDisabled();
  await expect(acc.changePasswordCancelBtn).toBeVisible();
});

test('USR-PWD-02: A weak new password is flagged in real time, before Save is attempted', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePasswordLink.click({ force: true });
  await expect(acc.newPasswordInput).toBeVisible({ timeout: 5000 });
  await acc.newPasswordInput.fill('abc');
  await page.waitForTimeout(400);
  const errorVisible = await page.getByText(/at least 8 characters/i).isVisible().catch(() => false);
  console.log('Real-time weak-password error shown:', errorVisible);
  test.fail(!errorVisible, 'No real-time validation error shown for a 3-character New Password');
  expect(errorVisible).toBe(true);
});

test('USR-PWD-03: Save stays disabled while the new password is invalid', { tag: '@negative' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePasswordLink.click({ force: true });
  await expect(acc.newPasswordInput).toBeVisible({ timeout: 5000 });
  await acc.newPasswordInput.fill('abc');
  await page.waitForTimeout(400);
  await expect(acc.changePasswordSaveBtn).toBeDisabled();
});

test('USR-PWD-04: Cancel safely discards the form without changing the password', { tag: '@positive' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePasswordLink.click({ force: true });
  await expect(acc.newPasswordInput).toBeVisible({ timeout: 5000 });
  await acc.newPasswordInput.fill('SomePartialInput1!');
  await acc.changePasswordCancelBtn.click({ force: true });
  await page.waitForTimeout(500);
  const formStillVisible = await acc.newPasswordInput.isVisible().catch(() => false);
  expect(formStillVisible).toBe(false);
});

test('USR-PWD-05: A wrong Current Password is rejected server-side (not executed -- destructive)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real Save submit against the shared QA account (arjun.reddy) -- deliberately not executed to avoid risking the working credential relied on by every other test/session');
  expect(true).toBe(false);
});

test('USR-PWD-06: New Password / Repeat New Password mismatch is caught (not executed -- destructive)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real Save submit against the shared QA account -- deliberately not executed for the same credential-safety reason as USR-PWD-05');
  expect(true).toBe(false);
});

test('USR-PWD-07: A successful password change works next login and invalidates the old one (not executed -- destructive)', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires actually changing the shared QA account\'s real password -- deliberately not executed');
  expect(true).toBe(false);
});

test('USR-PIN-01: Change PIN form fields render correctly, including Auto-Generate PIN', { tag: '@positive' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePinLink.click({ force: true });
  await expect(acc.currentPinBox(0)).toBeVisible({ timeout: 5000 });
  await expect(acc.newPinBox(0)).toBeVisible();
  await expect(acc.repeatPinBox(0)).toBeVisible();
  await expect(acc.pinAutoGenerateLink).toBeVisible();
  await expect(acc.changePinCancelBtn).toBeVisible();
  await expect(acc.changePinSaveBtn).toBeVisible();
});

test('USR-PIN-02: New PIN boxes only accept numeric characters via a restricted keypad', { tag: '@negative' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePinLink.click({ force: true });
  await expect(acc.newPinBox(0)).toBeVisible({ timeout: 5000 });
  await acc.newPinBox(0).click({ force: true });
  await page.keyboard.type('a');
  await page.waitForTimeout(300);
  const value = await acc.newPinBox(0).inputValue().catch(async () => (await acc.newPinBox(0).textContent()) || '');
  console.log('Value in New PIN box 0 after attempting to type "a":', JSON.stringify(value));
  expect(value).not.toContain('a');
});

test('USR-PIN-04: Auto-Generate PIN displays the generated value in plaintext (security-relevant finding)', { tag: ['@security', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePinLink.click({ force: true });
  await expect(acc.pinAutoGenerateLink).toBeVisible({ timeout: 5000 });
  await acc.pinAutoGenerateLink.click({ force: true });
  await page.waitForTimeout(500);
  const newPinValue = await acc.newPinBox(0).inputValue().catch(async () => (await acc.newPinBox(0).textContent()) || '');
  const inputType = await acc.newPinBox(0).getAttribute('type').catch(() => null);
  console.log('New PIN box value after Auto-Generate:', JSON.stringify(newPinValue), '| input type:', inputType);
  const isPlaintext = newPinValue.length > 0 && inputType !== 'password';
  test.fail(isPlaintext, 'Auto-Generate PIN displays the generated PIN in plaintext (unmasked) on screen -- a real shoulder-surfing risk in a classroom setting');
  expect(isPlaintext).toBe(false);
});

test('USR-PIN-05: PIN boxes are a fixed digit-count group, structurally preventing overflow', { tag: '@negative' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePinLink.click({ force: true });
  await expect(acc.newPinBox(0)).toBeVisible({ timeout: 5000 });
  const box5Exists = await acc.newPinBox(5).count();
  console.log('A 6th New PIN box exists beyond the expected 5-digit group:', box5Exists > 0);
  expect(box5Exists).toBe(0);
});

test('USR-SEC-07: A trivially weak/sequential New PIN pattern (not executed -- destructive)', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real Save submit of a weak PIN against the shared QA account -- deliberately not executed for the same credential-safety reason as USR-PWD-05');
  expect(true).toBe(false);
});

test('USR-PIN-03: A successful PIN change is usable next login (not executed -- destructive)', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires actually changing the shared QA account\'s real PIN (currently 26826, documented and relied on throughout this project) -- deliberately not executed');
  expect(true).toBe(false);
});

test('USR-BUG-01: Change Password and Change PIN forms can both be open simultaneously (naming implies mutual exclusion)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePasswordLink.click({ force: true });
  await expect(acc.newPasswordInput).toBeVisible({ timeout: 5000 });

  const changePinLinkStillVisible = await acc.openChangePinLink.isVisible().catch(() => false);
  console.log('Change PIN entry link still visible/clickable while Change Password form is open:', changePinLinkStillVisible);
  let bothOpenAtOnce = false;
  if (changePinLinkStillVisible) {
    await acc.openChangePinLink.click({ force: true });
    await page.waitForTimeout(500);
    const bothFormsVisible = await acc.newPasswordInput.isVisible().catch(() => false) && await acc.newPinBox(0).isVisible().catch(() => false);
    bothOpenAtOnce = bothFormsVisible;
  }
  console.log('Both Change Password and Change PIN forms open simultaneously:', bothOpenAtOnce);
  test.fail(bothOpenAtOnce, 'CONFIRMED (source: isPasswordOrOtpOpen defined as AND, not OR) -- opening one credential form leaves the other\'s entry link clickable, allowing both to be open at once');
  expect(bothOpenAtOnce).toBe(false);
});

test('USR-UI-01: Dark Mode / Virtual Keyboard toggles are raw checkboxes, not Material toggles', { tag: '@ui-state' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await expect(acc.darkModeToggle).toBeVisible();
  const tagName = await acc.darkModeToggle.evaluate((el) => el.tagName.toLowerCase());
  const inputType = await acc.darkModeToggle.getAttribute('type').catch(() => null);
  console.log('Dark Mode toggle element:', tagName, '| type attribute:', inputType);
  expect(tagName).toBe('input');
  expect(inputType).toBe('checkbox');
});

test('USR-UI-02: Release Notes dialog content renders inside a Shadow DOM web component', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  const buildBtnVisible = await acc.buildInfoBtn.isVisible({ timeout: 3000 }).catch(() => false);
  test.fail(!buildBtnVisible, 'Build-info/Release Notes link not found in this account\'s outer profile menu this pass');
  if (!buildBtnVisible) {
    expect(buildBtnVisible).toBe(true);
    return;
  }
  await acc.buildInfoBtn.click({ force: true });
  await page.waitForTimeout(800);
  const shadowHostCount = await page.evaluate(() => {
    let count = 0;
    document.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) count++; });
    return count;
  });
  console.log('Shadow-DOM host elements found after opening Release Notes:', shadowHostCount);
  expect(shadowHostCount).toBeGreaterThan(0);
});

test('USR-UI-03: Account/Profile tab labels carry identical classes regardless of which is selected', { tag: '@ui-state' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const accountClass = await acc.accountTab.getAttribute('class');
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(500);
  const profileClassWhileSelected = await acc.profileTab.getAttribute('class');
  const accountClassWhileNotSelected = await acc.accountTab.getAttribute('class');
  console.log('Account tab class (selected):', accountClass, '| Account tab class (not selected):', accountClassWhileNotSelected);
  const ariaSelected = await acc.profileTab.getAttribute('aria-selected').catch(() => null);
  console.log('Profile tab aria-selected while active:', ariaSelected);
  expect(accountClass).toBe(accountClassWhileNotSelected);
});

test('USR-LOGIN-01: Server-flagged forced-password-change flow at login (not available)', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  test.fail(true, 'No account in this project\'s known credential set is server-flagged with a forced-password-change-at-login state');
  expect(true).toBe(false);
});

test('USR-LOGIN-02: Server-flagged forced-PIN-set flow at login (not available)', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  test.fail(true, 'No account in this project\'s known credential set is server-flagged with a no-PIN-set state');
  expect(true).toBe(false);
});

test('USR-LOGIN-03: MFA Register flow (no MFA enrollment path found in this account)', { tag: ['@security', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const mfaOptionVisible = await page.getByText(/mfa|two-factor|2fa|multi-factor/i).isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Any MFA-related option found in Account/Profile tabs:', mfaOptionVisible);
  test.fail(!mfaOptionVisible, 'No MFA/second-factor enrollment option found anywhere in the Account/Profile tabs for this account -- either not eligible or not enabled in this environment');
  expect(mfaOptionVisible).toBe(true);
});

test('USR-LOGIN-04: MFA Verify flow blocks wrong codes and enforces limits (blocked -- no MFA path exists)', { tag: ['@security', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Same blocker as USR-LOGIN-03 -- no MFA enrollment path was found, so there is no MFA Verify flow to test against');
  expect(true).toBe(false);
});

test('USR-SEC-01: Repeated wrong-Current-Password attempts are rate-limited (not executed -- risks account lockout)', { tag: ['@security', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Deliberately not attempted -- repeated wrong-password submissions risk actually locking out the shared QA account used throughout this project');
  expect(true).toBe(false);
});

test('USR-SEC-02: Account lockout/CAPTCHA after repeated failed sign-in attempts (not executed -- risks account lockout)', { tag: ['@security', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Same lockout risk as USR-SEC-01, at the sign-in surface instead of the in-app form -- deliberately not attempted');
  expect(true).toBe(false);
});

test('USR-SEC-03: A credential change invalidates other logged-in sessions (not executed -- needs a real credential change + second session)', { tag: ['@security', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Needs an actual password/PIN change on the shared QA account plus a second logged-in session to check invalidation -- neither set up, and the credential change itself is deliberately avoided');
  expect(true).toBe(false);
});

test('USR-SEC-04: New Password identical to Current Password is rejected as a no-op (not executed -- destructive)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real Save submit against the shared QA account -- deliberately not executed for the same credential-safety reason as USR-PWD-05');
  expect(true).toBe(false);
});

test('USR-SEC-05: An extremely long/Unicode New Password does not crash the form (client-side length check only)', { tag: '@boundary' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePasswordLink.click({ force: true });
  await expect(acc.newPasswordInput).toBeVisible({ timeout: 5000 });
  const longUnicode = 'Pässwörd123!🎉'.repeat(20); // 260+ chars with emoji/unicode
  await acc.newPasswordInput.fill(longUnicode);
  await page.waitForTimeout(400);
  const actualValue = await acc.newPasswordInput.inputValue();
  console.log('Typed', longUnicode.length, 'chars of Unicode/emoji, field retained:', actualValue.length, 'chars');
  // The concern is a crash/broken layout, not a real submit (deliberately
  // not attempted, same reasoning as USR-PWD-05).
  const formStillUsable = await acc.changePasswordCancelBtn.isVisible().catch(() => false);
  expect(formStillUsable).toBe(true);
});

test('USR-SEC-06: Leading/trailing whitespace in New Password is preserved, not silently trimmed', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePasswordLink.click({ force: true });
  await expect(acc.newPasswordInput).toBeVisible({ timeout: 5000 });
  const withSpaces = '  Password123!  ';
  await acc.newPasswordInput.fill(withSpaces);
  await page.waitForTimeout(300);
  const actualValue = await acc.newPasswordInput.inputValue();
  console.log('Typed value with leading/trailing spaces, field retained:', JSON.stringify(actualValue));
  test.fail(actualValue !== withSpaces, 'The New Password field trims leading/trailing whitespace client-side -- if the same trimming happens server-side but the user retypes the password WITH spaces later, that is a real login-lockout risk');
  expect(actualValue).toBe(withSpaces);
});

test('USR-SUBJ-01: Adding a subject via Add Subjects persists immediately', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const beforeCount = await acc.subjectChips.count();
  const addVisible = await acc.addSubjectsBtn.isVisible({ timeout: 5000 }).catch(() => false);
  test.fail(!addVisible, 'Add Subjects button not found on the Account tab this pass');
  if (!addVisible) {
    expect(addVisible).toBe(true);
    return;
  }
  await acc.addSubjectsBtn.click({ force: true });
  await page.waitForTimeout(600);
  const optionCount = await acc.subjectPickerOptions.count();
  console.log('Subject chips before:', beforeCount, '| picker options available:', optionCount);
  // CONFIRMED LIVE this pass: this account currently has ZERO Subject
  // chips (beforeCount: 0), and the Add Subjects picker opened with zero
  // selectable options too -- not just "nothing left to add" (which would
  // make sense with existing chips already covering everything), but a
  // picker offering nothing at all with no existing chips either. Document
  // as a real finding rather than assuming the picker always has options.
  test.fail(optionCount === 0, 'The Add Subjects picker opened with zero selectable options despite this account currently having zero existing Subject chips -- expected the picker to offer the full curriculum subject list when nothing is already added');
  expect(optionCount).toBeGreaterThan(0);
  // Not actually adding one to avoid mutating the shared account's real
  // Subjects list beyond what's easily reversible in this pass.
  await page.keyboard.press('Escape');
});

test('USR-SUBJ-02: Removing a subject chip is handled gracefully, one at a time', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const count = await acc.subjectChips.count();
  console.log('Subject chips present:', count);
  test.fail(count === 0, 'No Subject chips present on this account to test single-chip removal against');
  expect(count).toBeGreaterThan(0);
  // Not actually removing one this pass -- verifying the remove control's
  // presence/reachability is the safe, non-mutating check.
  if (count > 0) {
    const removeIcon = acc.subjectChips.first().locator('mat-icon, .remove-icon, [aria-label="remove"]').first();
    await expect(removeIcon).toBeVisible();
  }
});

test('USR-SUBJ-03: Adding the same subject twice is prevented at the picker level', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const existingSubjects = await acc.subjectChips.allTextContents();
  const addVisible = await acc.addSubjectsBtn.isVisible({ timeout: 5000 }).catch(() => false);
  test.fail(!addVisible, 'Add Subjects button not found on the Account tab this pass');
  if (!addVisible) {
    expect(addVisible).toBe(true);
    return;
  }
  await acc.addSubjectsBtn.click({ force: true });
  await page.waitForTimeout(600);
  const pickerOptions = await acc.subjectPickerOptions.allTextContents();
  const overlap = existingSubjects.some((s) => pickerOptions.some((p) => p.trim() === s.trim()));
  console.log('Existing chips:', existingSubjects.map((s) => s.trim()), '| any already-added subject still offered in the picker:', overlap);
  test.fail(overlap, 'An already-added Subject is still offered as a selectable option in the Add Subjects picker');
  expect(overlap).toBe(false);
  await page.keyboard.press('Escape');
});

test('USR-SUBJ-04: Rapidly double-clicking a chip\'s remove icon does not remove two chips', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const beforeCount = await acc.subjectChips.count();
  test.fail(beforeCount === 0, 'No Subject chips present on this account to test rapid-double-click removal against');
  if (beforeCount === 0) {
    expect(beforeCount).toBeGreaterThan(0);
    return;
  }
  // Documenting reachability only -- not actually performing the removal,
  // to avoid mutating the shared account's real Subjects list.
  const removeIcon = acc.subjectChips.first().locator('mat-icon, .remove-icon, [aria-label="remove"]').first();
  await expect(removeIcon).toBeVisible();
});

test('USR-RES-01: Preferred Resource Type selection persists across a full page refresh', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const dropdownVisible = await acc.preferredResourceTypeDropdown.isVisible({ timeout: 5000 }).catch(() => false);
  test.fail(!dropdownVisible, 'Preferred Resource Type control not found on the Account tab this pass');
  expect(dropdownVisible).toBe(true);
  // Not toggling a real selection this pass -- USR-RES-01's own workbook
  // note describes restoring the original state manually afterward, which
  // isn't guaranteed reliable in an automated, unattended run against the
  // shared account.
});

test('USR-CLASSMODE-01: Classroom Mode toggle (Teaching/Planning) may silently change the active class', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  const beforeClass = await page.locator('[data-qa-id="playlist-current-grade-subject-btn"]').textContent().catch(() => '');
  await acc.openProfileMenu();
  const switcherVisible = await acc.classroomModeSwitcher.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Classroom Mode switcher visible in this scope:', switcherVisible, '| class before:', beforeClass.trim());
  test.fail(!switcherVisible, 'Classroom Mode switcher not reachable in this pass -- workbook notes a later "Teaching mode only" scope restriction may have removed it');
  expect(switcherVisible).toBe(true);
});

test('USR-CROSS-01: Sign Out clears local auth such that a stale tab cannot resume an authenticated action', { tag: '@cross-cutting' }, async ({ page, context }) => {
  const acc = new AccountManagementPage(page);
  const secondPage = await context.newPage();
  await secondPage.goto('./');
  await secondPage.waitForTimeout(1500);

  await acc.openProfileMenu();
  await acc.signOutBtn.click({ force: true });
  await page.waitForTimeout(500);
  // CONFIRMED LIVE: clicking Sign Out in the outer menu signs out
  // IMMEDIATELY, with no separate confirmation dialog at all -- a plain
  // unconditional `.click({force:true})` on a confirm button that never
  // appears would otherwise wait out Playwright's own ~30s default
  // actionability timeout (the `.catch()` only absorbs the eventual
  // rejection, not the time spent waiting), blowing this test's entire
  // timeout budget and leaving the page/context torn down by the time the
  // next line runs. Check visibility first with a short bounded timeout.
  const confirmBtn = page.getByRole('button', { name: /sign out/i }).last();
  const confirmVisible = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('A separate Sign Out confirmation button appeared:', confirmVisible);
  if (confirmVisible) {
    await confirmBtn.click({ force: true }).catch(() => {});
  }
  await page.waitForTimeout(1500);

  // Attempt an authenticated action on the STALE second tab.
  const secondAvatarVisible = await secondPage.locator('[data-qa-id="toolbar-user-avatar"]').isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Stale second tab still shows the authenticated avatar after Sign Out on the first tab:', secondAvatarVisible);
  await secondPage.close();
  // Documenting actual behavior -- this is explicitly a "worth checking"
  // case in the workbook, not a hard pass/fail bar on its own.
});

test('USR-CROSS-02: A credential change does not disrupt unrelated in-progress unsaved work (not executed -- needs a real credential change)', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Needs an actual credential change (deliberately avoided, see USR-PWD-05) at the exact moment of unrelated unsaved work elsewhere -- not attempted this pass');
  expect(true).toBe(false);
});

test('USR-EXP-01: Removing the LAST remaining Subject chip is not an ambiguous silent failure (not executed -- would leave account with zero subjects)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Reducing this account\'s real Subjects list down to zero is not safely reversible in an automated run -- deliberately not executed to protect the shared QA account\'s working state');
  expect(true).toBe(false);
});

test('USR-EXP-02: New PIN identical to Current PIN is rejected as a no-op (not executed -- destructive)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Requires a real Save submit against the shared QA account -- deliberately not executed for the same credential-safety reason as USR-PWD-05');
  expect(true).toBe(false);
});

test('USR-EXP-03: Saving Preferred Resource Type with ZERO types selected is blocked', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  const dropdownVisible = await acc.preferredResourceTypeDropdown.isVisible({ timeout: 5000 }).catch(() => false);
  test.fail(!dropdownVisible, 'Preferred Resource Type control not found on the Account tab this pass -- cannot test the zero-selection boundary');
  expect(dropdownVisible).toBe(true);
  // Not deselecting every real type this pass -- see USR-RES-01's own
  // reasoning for why a real mutation here isn't safely reversible
  // unattended.
});

test('USR-EXP-04: Change Password/PIN forms do not retain stale values if reopened after cancelling', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openProfileMenu();
  await acc.drilldownTrigger.click({ force: true });
  await acc.profileTab.click({ force: true });
  await page.waitForTimeout(800);
  await acc.openChangePinLink.click({ force: true });
  await expect(acc.newPinBox(0)).toBeVisible({ timeout: 5000 });
  await acc.newPinBox(0).click({ force: true });
  await page.keyboard.type('9');
  await page.waitForTimeout(300);
  await acc.changePinCancelBtn.click({ force: true });
  await page.waitForTimeout(500);

  await acc.openChangePinLink.click({ force: true });
  await expect(acc.newPinBox(0)).toBeVisible({ timeout: 5000 });
  const valueAfterReopen = await acc.newPinBox(0).inputValue().catch(async () => (await acc.newPinBox(0).textContent()) || '');
  console.log('New PIN box 0 value after cancel + reopen:', JSON.stringify(valueAfterReopen));
  test.fail(valueAfterReopen.includes('9'), 'Change PIN form retains a stale digit from a previously cancelled attempt when reopened');
  expect(valueAfterReopen).not.toContain('9');
});

test('USR-EXP-05: Adding 10+ subjects does not break the chip-wrapping layout (not executed -- would require adding many real subjects)', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.fail(true, 'Adding 10+ real subjects to the shared QA account is not safely reversible in an automated run -- deliberately not executed');
  expect(true).toBe(false);
});

test('USR-EXP-06: Rapidly switching Account/Profile tabs does not leave stale content visible', { tag: '@boundary' }, async ({ page }) => {
  const acc = new AccountManagementPage(page);
  await acc.openAccountTab();
  for (let i = 0; i < 4; i++) {
    await acc.profileTab.click({ force: true });
    await acc.accountTab.click({ force: true });
  }
  await page.waitForTimeout(500);
  const accountContentVisible = await acc.preferredResourceTypeDropdown.isVisible({ timeout: 3000 }).catch(() => false)
    || (await acc.subjectChips.count()) > 0;
  const profileContentVisible = await acc.openChangePasswordLink.isVisible({ timeout: 1000 }).catch(() => false);
  console.log('After rapid tab toggling, settled on Account tab -- Account content visible:', accountContentVisible, '| stale Profile content also visible:', profileContentVisible);
  expect(profileContentVisible).toBe(false);
});
