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

const base = require('@playwright/test');
const { _electron: electron } = base;

const CLIENT_EXE_PATH =
  process.env.CLASSEDGE_CLIENT_EXE ||
  'C:\\Users\\v_crystalQA3\\AppData\\Local\\Programs\\tceclient\\Tata ClassEdge School.exe';

const test = base.test.extend({
  page: async ({}, use) => {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    const app = await electron.launch({
      executablePath: CLIENT_EXE_PATH,
      args: ['--env=qa'],
      env,
    });

    // Make sure the shell window has come up before we look for the webview.
    await app.firstWindow();

    const isTeachWindow = (w) => w.url().includes('/teach/');
    let teachWindow = app.windows().find(isTeachWindow);
    if (!teachWindow) {
      teachWindow = await app.waitForEvent('window', {
        predicate: isTeachWindow,
        timeout: 30000,
      });
    }
    await teachWindow.waitForLoadState('domcontentloaded');
    // The webview keeps rendering (fonts, the Guest Mode panel, the Sign In
    // modal) for a bit after domcontentloaded — give it a few seconds so
    // tests don't start clicking before things have settled.
    await teachWindow.waitForTimeout(5000);

    await use(teachWindow);

    await app.close().catch(() => {});
  },
});

module.exports = { test, expect: base.expect };
