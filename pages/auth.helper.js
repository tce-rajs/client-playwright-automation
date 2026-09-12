// Shared PIN sign-in helper used by every page object that needs to log in
// (previously duplicated near-identically in PlaylistPage and
// NavigationPage). Centralized here so the retry fix below applies
// suite-wide from one place.
//
// CONFIRMED LIVE (2026-09-11, diagnosing "running the whole suite fails"):
// reproduced a real, transient failure where a fresh PIN login times out
// waiting for the post-login avatar (TimeoutError, 15s) immediately after a
// PRIOR test signed the same account out/switched class -- e.g.
// `tests/minimap/adversarial.spec.js`'s MM-BREAK-02 failed here right after
// MM-BREAK-01 (a class-switch test) ran before it, then the very next test
// after THAT (a completely unrelated Navigation test) logged in fine again.
// This is a live-backend timing race (the account's previous session/class
// state hasn't finished settling server-side yet), not a permanent lockout
// and not specific to any one module -- it can hit any test, anywhere in a
// long sequential run, which is why running the full suite looks like
// widespread random failures. A reload-and-retry clears it every time it's
// been observed. This is the fix for that: retry the whole login attempt
// (fresh goto + fresh PIN entry) rather than failing the test outright.
async function loginWithPin(page, pin, { toggleTimeout = 30000, avatarTimeout = 15000, retries = 2 } = {}) {
  const avatar = page.locator('[data-qa-id="toolbar-user-avatar"]');

  for (let attempt = 0; attempt <= retries; attempt++) {
    await page.goto('./');
    await page.waitForTimeout(2000);
    await page.locator('[data-qa-id="login-auth-toggle-button"]').click({ timeout: toggleTimeout });
    for (let i = 0; i < 5; i++) {
      await page.locator(`[data-qa-id="login-pin-digit-input-${i}"]`).fill(String(pin)[i]);
    }

    try {
      await avatar.waitFor({ state: 'visible', timeout: avatarTimeout });
      return;
    } catch (err) {
      if (attempt === retries) throw err;
    }
  }
}

module.exports = { loginWithPin };
