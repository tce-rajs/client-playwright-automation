// Page Object for the sign-in modal (Guest Mode entry, PIN sign-in, Password sign-in).
//
// Locator strategy:
//  - Prefer [data-qa-id="..."] — these come from the app's own QA reference doc
//    (../cep2-workspace/docs/qa/DATA-QA-ID-REFERENCE.md), the same ids the app's
//    real Angular templates use, so they don't break when text/styling changes.
//  - Where the reference doc has no id for something (plain static text, a
//    button that isn't documented yet), fall back to Playwright's own
//    locators (getByText/getByRole). Each fallback is commented as such.

class LoginPage {
  constructor(page) {
    this.page = page;

    // --- Guest mode entry ---
    this.guestModeText = page.getByText('You are currently in Guest Mode.'); // no data-qa-id documented
    this.signInLink = page.locator('[data-qa-id="login-auth-toggle-button"]');

    // --- Modal shell ---
    this.modal = page.locator('[data-qa-id="login-auth-modal-container"]');
    this.modalTitle = page.locator('[data-qa-id="login-auth-title-text"]');
    this.modalSubtitle = page.locator('[data-qa-id="login-auth-subtitle-text"]');

    // --- PIN sign-in ---
    this.pinForm = page.locator('[data-qa-id="login-pin-form"]');
    this.pinKeyboardButton = page.locator('[data-qa-id="login-pin-keyboard-button"]');
    this.pinPasswordLink = page.locator('[data-qa-id="login-pin-password-link"]');
    this.pinInstructionText = page.locator('[data-qa-id="login-pin-instruction-text"]');
    this.pinErrorMessage = page.locator('[data-qa-id="login-pin-error-message"]');
    this.pinDivider = page.locator('[data-qa-id="login-pin-divider-text"]');

    // --- Modal chrome shared by both views ---
    // The "X" that fully dismisses the modal — undocumented data-qa-id,
    // distinct from login-auth-toggle-button (which only expands/collapses
    // the bottom "Sign In" bar, it doesn't remove the modal from the DOM).
    this.closeButton = page.locator('.btn-close');
    this.termsLink = page.getByRole('link', { name: 'Terms' });
    this.privacyPolicyLink = page.getByRole('link', { name: 'Privacy Policy' });
    // No data-qa-id for the two side-by-side panels either.
    this.leftPanel = this.modal.locator('.left-col');
    this.rightPanel = this.modal.locator('.right-col');

    // --- Virtual keyboards ---
    // There are TWO virtual-keyboard instances mounted at once (a QWERTY one
    // and a numeric-only one) — both report as "visible" by CSS, so we tell
    // them apart by content: the numeric one has no "Tab" key, the QWERTY
    // one does.
    this.numericKeypad = page.locator('.keyboard-wrapper').filter({ hasNotText: 'Tab' });
    this.qwertyKeyboard = page.locator('.keyboard-wrapper').filter({ hasText: 'Tab' });

    // --- Password sign-in ---
    this.passwordForm = page.locator('[data-qa-id="login-pwd-form"]');
    this.schoolSelect = page.locator('[data-qa-id="login-pwd-school-select"]');
    this.usernameInput = page.locator('[data-qa-id="login-pwd-username-input"]');
    this.passwordInput = page.locator('[data-qa-id="login-pwd-password-input"]');
    this.submitButton = page.locator('[data-qa-id="login-pwd-submit-button"]');
    this.passwordKeyboardButton = page.locator('[data-qa-id="login-pwd-keyboard-button"]');
    this.pinLink = page.locator('[data-qa-id="login-pwd-pin-link"]'); // "Sign in with Pin"
    this.passwordErrorMessage = page.locator('[data-qa-id="login-pwd-error-message"]');

    // --- Post-login (whiteboard shell) ---
    this.welcomeBackTitle = page.locator('[data-qa-id="wb-welcome-back-title"]');
  }

  async open() {
    // NOTE: baseURL has a path (".../teach/"), so we must use './' here —
    // a leading '/' would replace that path and load the bare domain root.
    await this.page.goto('./');
  }

  /** Click "Sign in" from Guest Mode to open the modal (defaults to the PIN view). */
  async openSignIn() {
    await this.signInLink.click();
  }

  /** One PIN digit box, 0-based index (matches the app's own indexing). */
  pinDigitBox(index) {
    return this.page.locator(`[data-qa-id="login-pin-digit-input-${index}"]`);
  }

  /**
   * The red-border "invalid" state lives on the Angular Material
   * mat-form-field wrapper (class mat-form-field-invalid), not the <input>
   * itself — the input's own class never gets an "invalid" flag here.
   */
  pinDigitFormField(index) {
    return this.pinDigitBox(index).locator('xpath=ancestor::mat-form-field');
  }

  /** Type a 5-digit PIN one box at a time, like a real user would. */
  async enterPin(pin) {
    const digits = String(pin).split('');
    for (let i = 0; i < digits.length; i++) {
      await this.pinDigitBox(i).fill(digits[i]);
    }
  }

  /** One key on the numeric virtual keypad — a digit ("0".."9"), "Backspace" or "Enter". */
  numericKey(label) {
    return this.numericKeypad.getByText(label, { exact: true });
  }

  /** The down-arrow "minimize keyboard" icon (no data-qa-id, no text — it's an SVG). */
  get numericKeypadMinimizeButton() {
    return this.numericKeypad.locator('svg').first();
  }

  /**
   * Click something inside the numeric keypad. Right after it opens, its
   * position keeps shifting for a moment (settling in), which makes a
   * single boundingBox() read unreliable — clicking mid-shift can land
   * beyond the viewport (Playwright's own scroll-into-view can't fix this;
   * it's not a scroll container, just a still-moving one). We poll until
   * two consecutive reads agree, then click the settled coordinates.
   */
  async clickInKeypad(locator) {
    let previous = null;
    let box = await locator.boundingBox();
    for (let i = 0; i < 10 && (!previous || previous.y !== box.y); i++) {
      previous = box;
      await this.page.waitForTimeout(150);
      box = await locator.boundingBox();
    }
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  /**
   * Click a numeric keypad digit and confirm it actually landed in the
   * given box, retrying a few times if not. Position-only settling
   * (clickInKeypad's poll) wasn't enough on its own — this keypad's clicks
   * are genuinely flaky under automation, so we verify the real outcome
   * (the box's value) rather than trust that one click worked.
   */
  async clickNumericKeyInto(digit, boxIndex) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await this.clickNumericKey(digit);
      if ((await this.pinDigitBox(boxIndex).inputValue()) === digit) return;
    }
  }

  async clickNumericKey(label) {
    await this.clickInKeypad(this.numericKey(label));
  }

  async switchToPasswordView() {
    await this.pinPasswordLink.click();
  }

  async switchToPinView() {
    await this.pinLink.click();
  }

  /** Pick a school from the dropdown by typing a search substring. */
  async selectSchool(schoolSearchTerm) {
    await this.schoolSelect.click();
    await this.page.keyboard.type(schoolSearchTerm);
    // Scope to real dropdown options (case-insensitive) -- a plain
    // page-wide getByText(searchTerm) occasionally matched nothing (the
    // visible option text is capitalized differently from the search term)
    // and silently left the field empty.
    const option = this.page.locator('.ng-option', { hasText: new RegExp(schoolSearchTerm, 'i') }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
    await this.schoolSelect.locator('.ng-value').waitFor({ state: 'visible' });
  }

  /** Fill and submit the password form. School is matched by a search substring. */
  async loginWithPassword({ schoolSearchTerm, username, password }) {
    await this.selectSchool(schoolSearchTerm);
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

module.exports = { LoginPage };
