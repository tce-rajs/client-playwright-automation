// Playwright config — kept intentionally simple and commented for beginners.
// Full reference: https://playwright.dev/docs/test-configuration

require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Where our test files live.
  testDir: './tests',

  // IMPORTANT: every test in this suite shares ONE live login/account
  // against the real QA app (no test-account-per-worker isolation exists
  // here) -- "current class", popup state, and the session itself are all
  // shared, mutable state. Running tests in parallel means multiple tests
  // fight over that same state at once (one switches class mid-way through
  // another's assertion, etc.), which is exactly what makes a run look like
  // "almost everything is failing" when using a tool (like UI mode) that
  // doesn't get a manual --workers=1 flag. Force serial execution here by
  // default so this is safe regardless of how the suite is invoked.
  fullyParallel: false,
  workers: 1,

  // Fail the build on CI if someone leaves a `.only` in the code.
  forbidOnly: !!process.env.CI,

  // Retry failing tests automatically on CI (flaky network etc.), not locally.
  retries: process.env.CI ? 2 : 0,

  // HTML report you can open after a run with `npx playwright show-report`.
  reporter: 'html',

  use: {
    // Every test can call page.goto('/login') instead of the full URL.
    baseURL: process.env.BASE_URL || 'https://ce-qa-school.devstudi.com/teach/',

    // Run with a real, visible browser window by default. UI mode has no
    // "show browser" toggle in this Playwright version -- this config
    // setting is the only way to make UI mode (which can't be given a
    // --headed CLI flag of its own) show the browser while it runs. Set
    // back to true (or delete this line, true is the default) if you ever
    // need faster/invisible runs, e.g. on a headless CI machine.
    headless: false,

    // The real app runs on large classroom displays (interactive flat
    // panels) -- 1920x1080 is this project's confirmed standard size. Most
    // spec files already set this themselves via their own test.use(), but
    // ~30 files never did, silently falling back to Playwright's small
    // 1280x720 default -- which, in headed mode on a real monitor, visibly
    // renders the app into only part of the screen (confirmed live: at
    // 1280x720 the canvas genuinely only fills that smaller area; at
    // 1920x1080 it correctly fills the whole window). Setting it here
    // makes every file consistent regardless of whether it overrides it.
    viewport: { width: 1920, height: 1080 },

    // Capture a trace only when a test fails, so we can debug it visually.
    trace: 'on-first-retry',

    // Take a screenshot only when a test fails.
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // These two only run the RESP-05 cross-browser-consistency case —
    // every other test only needs to run once, on chromium, so there's no
    // point tripling the whole suite's runtime for tests that don't care
    // which engine they run under.
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grep: /RESP-05/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: /RESP-05/,
    },
  ],
});
