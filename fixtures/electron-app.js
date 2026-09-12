// Custom Playwright fixture for driving the real Tata ClassEdge School desktop
// client (an Electron app), instead of a plain browser.
//
// Why this exists: the client is a native Windows app, not a website. Its main
// window is just a chrome/shell (logo, toolbar, a "connect to local ClassEdge
// box" status panel) — the actual teach webapp (the thing our test cases are
// about: Guest Mode, Sign In, PIN/password, the whiteboard) lives inside a
// <webview> tag, which Electron exposes to Playwright as its OWN separate
// window. So every test here uses THAT window as `page`, not the shell.
//
// Setup this required (see docs/CLIENT_AUTOMATION_NOTES.md for the full story):
//   1. This machine has ELECTRON_RUN_AS_NODE=1 set globally, which makes any
//      Electron exe run as plain Node instead of opening its GUI. We strip it
//      from the launched process's env.
//   2. The client needs `--env=qa` on its command line, or it silently talks
//      to the prod backend instead of QA.
//   3. C:\Users\Public\tce_settings.json (external, not part of this project)
//      is this machine's saved client profile. Its "path" must be
//      https://ce-qa-school.devstudi.com/teach/ — it was found set to the
//      http:// (not https://) version, which made the client fail to load the
//      real app at all. Already fixed on this machine; documented here in
//      case a fresh machine hits the same thing.

const fs = require('fs');
const base = require('@playwright/test');
const { _electron: electron } = base;

const CLIENT_EXE_PATH =
  process.env.CLASSEDGE_CLIENT_EXE ||
  'C:\\Users\\v_crystalQA3\\AppData\\Local\\Programs\\tceclient\\Tata ClassEdge School.exe';

const BASE_URL = process.env.BASE_URL || 'https://ce-qa-school.devstudi.com/teach/';

// Every spec was written against a plain browser `page`, where Playwright's
// own `baseURL` config option lets `page.goto('./')` resolve automatically.
// That resolution only exists for browser contexts Playwright itself creates
// -- the Electron window returned below has no such context option, so an
// unmodified relative goto throws "Cannot navigate to invalid URL" (confirmed
// live). Patch `goto` once here, so every existing spec's `page.goto('./')`,
// `page.goto('./whiteboard')`, etc. keep working unchanged against the real
// client instead of needing ~40 call sites edited individually.
function resolveUrl(url) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : new URL(url, BASE_URL).toString();
}

// The webview window is created at `about:blank` and only client-side
// navigates to the real teach URL a moment later — the SAME window object,
// no second 'window' event. So `waitForEvent('window', { predicate })`
// checked once at creation time can permanently miss it (confirmed live:
// intermittently hangs the full 30s timeout). Poll every known window
// (existing + newly created) until one's current URL matches, instead of
// relying on a one-shot event/predicate pairing.
async function findTeachWindow(app, timeout = 30000) {
  const isTeachWindow = (w) => w.url().includes('/teach/');
  const candidates = new Set(app.windows());
  const onWindow = (w) => candidates.add(w);
  app.on('window', onWindow);
  try {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      for (const w of candidates) {
        if (isTeachWindow(w)) return w;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Teach window (URL containing "/teach/") not found within ${timeout}ms`);
  } finally {
    app.off('window', onWindow);
  }
}

// The shell window's own teach `<webview>` has a did-fail-load handler
// that retries once after 2s; if that retry ALSO fails, it locks a flag
// that shows a full-screen "E R R O R # 404 -- Unable to connect
// ClassEdge server" overlay (`.uiverse` in the SHELL's own DOM) permanently
// (confirmed live: sat unchanged for 90s+, does not self-clear on its own).
//
// ROOT CAUSE, confirmed live (2026-09-12, after a full machine restart did
// NOT fix it, ruling out resource exhaustion): this is specifically caused
// by Playwright's OWN required `--inspect`/`--remote-debugging-port` launch
// flags racing with this app's `<webview>` guest-view creation at startup.
// Captured directly from the client's main-process log:
//   "Error occurred in handler for 'GUEST_VIEW_MANAGER_CALL': ERR_FAILED (-2)"
// Confirmed via repeated back-to-back A/B testing: a manually-launched copy
// of this exact same client, same machine, same moment, NEVER shows this --
// only Playwright-launched instances do. A real teacher launching the app
// normally will never encounter this.
//
// Also confirmed: this is CHEAPLY recoverable. The failure is a one-time
// startup race, not a lasting break -- once past it, a plain Playwright-level
// `page.goto()` on the SAME window (bypassing the app's own broken internal
// retry) reliably loads real content within a few seconds. The shell's
// overlay stays visually stuck either way (nothing in the app ever resets
// that flag short of a full relaunch), but the actual webview content is
// what the test drives, and that recovers fine.
//
// So: on suspicion (overlay visible OR webview body suspiciously empty),
// retry navigation on the SAME window first (cheap, ~5-10s) before ever
// falling back to a full app relaunch. Only treat it as a genuine BLOCKER
// if the content is STILL missing after that -- per explicit user decision,
// don't silently ignore a real empty/broken page just because the overlay
// itself is known to be a tooling artifact.
async function isConnectionErrorShowing(app) {
  const shell = app.windows().find((w) => w.url().includes('app.asar'));
  if (!shell) return false;
  try {
    return await shell.evaluate(() => {
      const panel = document.querySelector('.uiverse');
      if (!panel) return false;
      const style = getComputedStyle(panel);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  } catch {
    return false; // shell window gone/navigating -- don't block on it
  }
}

async function hasRealContent(teachWindow) {
  try {
    const text = await teachWindow.evaluate(() => document.body.innerText.trim());
    return text.length > 20; // confirmed-broken state renders a fully empty body
  } catch {
    return false;
  }
}

async function launchClient() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    executablePath: CLIENT_EXE_PATH,
    args: ['--env=qa'],
    env,
  });

  // Make sure the shell window has come up before we look for the webview.
  await app.firstWindow();

  const teachWindow = await findTeachWindow(app);
  await teachWindow.waitForLoadState('domcontentloaded');
  // The webview keeps rendering (fonts, the Guest Mode panel, the Sign In
  // modal) for a bit after domcontentloaded — give it a few seconds so
  // tests don't start clicking before things have settled. This is also
  // enough time for the did-fail-load retry-and-give-up sequence above to
  // resolve one way or the other before we check for it below.
  await teachWindow.waitForTimeout(5000);

  return { app, teachWindow };
}

// If a full relaunch is ever still needed (the cheap same-window retry
// below failed too), don't loop forever -- 2 fresh app instances is plenty
// given the cheap retry already handles the common case.
const MAX_LAUNCH_ATTEMPTS = 2;

const test = base.test.extend({
  page: [async ({}, use) => {
    // Without this check, a missing client just fails with Playwright's own
    // generic "Process failed to launch!" (confirmed live -- no path, no
    // reason, nothing actionable), repeated identically on every single
    // test. Fail fast with a message that says what's actually wrong.
    if (!fs.existsSync(CLIENT_EXE_PATH)) {
      throw new Error(
        `Tata ClassEdge School client not found at: ${CLIENT_EXE_PATH}\n` +
          `Install the desktop client on this machine, or set CLASSEDGE_CLIENT_EXE ` +
          `in .env to point at its real install location.`
      );
    }

    let app, teachWindow;
    for (let attempt = 1; attempt <= MAX_LAUNCH_ATTEMPTS; attempt++) {
      ({ app, teachWindow } = await launchClient());

      if (await isConnectionErrorShowing(app)) {
        // Cheap recovery first: a plain Playwright-level goto on the SAME
        // window, bypassing the app's own broken internal retry. Confirmed
        // live this reliably restores real content within a few seconds.
        try {
          await teachWindow.goto(resolveUrl(BASE_URL), { timeout: 20000, waitUntil: 'domcontentloaded' });
        } catch {
          // fall through to the real-content check below regardless
        }
      }

      if (await hasRealContent(teachWindow)) break;

      await app.close().catch(() => {});
      if (attempt === MAX_LAUNCH_ATTEMPTS) {
        throw new Error(
          `BLOCKER: the client's teach window is still empty/broken after ${MAX_LAUNCH_ATTEMPTS} ` +
            `fresh launches, each with a recovery retry attempted. This is a genuine failure to ` +
            `load real content, not the known cosmetic startup-race overlay (which recovers on ` +
            `retry) -- so this test is failing rather than working around it. Check the QA ` +
            `server/network before re-running.`
        );
      }
    }

    const originalGoto = teachWindow.goto.bind(teachWindow);
    teachWindow.goto = (url, options) => originalGoto(resolveUrl(url), options);

    await use(teachWindow);

    await app.close().catch(() => {});
  }, { timeout: 100000 }], // 2 launch attempts worst-case (~10-20s each incl. recovery retry) needs more than Playwright's fixture-timeout default
});

module.exports = { test, expect: base.expect, devices: base.devices };
