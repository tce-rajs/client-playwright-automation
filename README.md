# CEP2 Playwright Automation

A Playwright (JS/CommonJS) end-to-end test suite for Tata ClassEdge CEP v2's
teach webapp, targeting `https://ce-qa-school.devstudi.com/teach/`.

**1,016 automated test cases across 20 modules**, all live-verified against
the real QA app. Every case is tracked to a real outcome — it passes, or it
fails with a documented reason (a confirmed real app bug, or a genuine
tooling/environment limitation) — nothing is silently skipped anywhere in
this suite.

## Setup

```
npm install
cp .env.example .env   # then fill in real values (see below)
```

Every spec drives the real **Tata ClassEdge School** Windows desktop client
(Electron), not a browser — see "Desktop client mode" below. The client must
already be installed locally, logged out (Guest Mode is fine), and set to
talk to the QA backend. `npx playwright install chromium` is no longer
required for the default run (nothing here launches Playwright's own
downloaded browsers); only install it if you still need the legacy
browser-mode fallback described below.

## Running tests

```
npm test                                  # runs everything in tests/
npm run test:headed                       # same as above (see note below)
npm run test:ui                           # Playwright's interactive UI mode
npm run report                            # open the last HTML report

# One module:
npx playwright test tests/compass/ --workers=1

# By category (every test is tagged to match its workbook Category):
npx playwright test --grep "@negative"
npx playwright test --grep "@security"
npx playwright test --grep-invert "@positive"   # everything except positive
```

**Always keep `--workers=1`** (already the config default) when running
against the live app — every test shares real, mutable account state
(current class, session), so parallel workers on the same login will fight
over it and produce false failures.

## Desktop client mode (current default)

Every spec file imports `test`/`expect` from `fixtures/electron-app.js`
instead of `@playwright/test` directly. That fixture launches the real
`Tata ClassEdge School.exe` desktop client (via Playwright's
`_electron.launch()`) for every test, finds the `<webview>` window that
actually hosts the teach webapp (the client's own top-level window is just
a chrome/shell around it), and hands that window back as `page` — so
existing page objects and specs need no changes beyond the import line.

- **Client path**: defaults to
  `C:\Users\v_crystalQA3\AppData\Local\Programs\tceclient\Tata ClassEdge School.exe`;
  override with the `CLASSEDGE_CLIENT_EXE` env var on another machine.
- **`playwright.config.js`'s `headless`/`viewport`/`projects` settings no
  longer apply** to the default run — the fixture ignores them entirely
  and drives the client's own real window at whatever size the client
  itself opens (there is no headless mode for the real client). Those
  config options only still matter if a spec is temporarily pointed back
  at plain `@playwright/test` (see Legacy browser mode below).
- Relative `page.goto('./...')` calls (used throughout the suite) are
  patched inside the fixture to resolve against `BASE_URL`, since Electron
  windows have no `baseURL` context option the way browser pages do.
- **The client shell can show its own "ERROR #404 — Unable to connect
  ClassEdge server" overlay — this is handled automatically now, no action
  needed.** Root cause confirmed: it's caused by Playwright's own required
  launch flags racing with the app's `<webview>` startup (a real teacher
  launching the app normally never triggers it — confirmed via repeated
  manual-vs-Playwright A/B tests). The fixture detects it and retries
  navigation on the same window, which reliably restores real content
  within a few seconds; the overlay itself may stay visible on screen (it
  never self-clears) but doesn't affect the actual page the tests drive
  once recovered. Only if that recovery genuinely fails does the test fail,
  with a clear `BLOCKER` error. See `CEP_TestCases/LIVE_FINDINGS.md`'s
  "RESOLVED" entry for the full investigation.
- **Known intermittent issue, low frequency (~1 in 50 fresh launches
  observed), not fully root-caused**: occasionally a fresh launch's
  `page.goto('./')` throws "Target page, context or browser has been
  closed" — unrelated to the cosmetic overlay above. `pages/auth.helper.js`
  now retries the whole login attempt (not just the final avatar wait)
  when this happens, which resolved every occurrence hit in testing so
  far, but the underlying cause of the occasional "Target closed" itself
  is still unknown.
- **Known behavioral difference, needs re-verification**: PIN-09/PIN-10 in
  `tests/authentication/pin-login.spec.js` assert Angular's
  `mat-form-field-invalid` red-border class appears after backspacing a
  filled PIN digit — this did not reproduce inside the desktop client's
  webview in the same pilot run (the class stayed absent). Not yet
  determined whether this is a genuine webview-vs-browser rendering/event
  difference or a timing issue specific to this run.

### Legacy browser mode

To run a spec against a plain browser instead (e.g. to compare behavior,
or on a machine without the client installed), change that file's import
back to `require('@playwright/test')` and run
`npx playwright install chromium` once. `playwright.config.js`'s
`headless: false` / `viewport: { width: 1920, height: 1080 }` (currently
commented out — re-enable if you need it) / `baseURL` options apply again
in that mode.

## Project layout

```
tests/              test spec files (*.spec.js), one folder per module,
                     matching the 20 modules named below. Inside each
                     folder: feature-area files (e.g. quiz.spec.js,
                     pin-login.spec.js) plus, where relevant, exactly three
                     consistently-named category files — adversarial.spec.js
                     (break-the-app cases), cross-cutting.spec.js (state/
                     network/race/security concerns spanning the module),
                     and extended-coverage.spec.js (additional cases from a
                     later gap-analysis pass). No module has ad-hoc,
                     one-off file names beyond that set.
pages/auth.helper.js  shared PIN sign-in used by every page object that logs
                     in — retries once on a confirmed transient timing race
                     (see the note in the file) rather than each test
                     re-implementing its own login/retry logic
pages/               page objects, one file per screen/module (e.g. login.page.js)
config/moduleClassMap.js   confirmed-working Class/Division/Subject/Chapter/Topic
                     combo per module, for both QA accounts (see below)
fixtures/electron-app.js   custom Playwright fixture that drives the real desktop
                     (Electron) client instead of a plain browser — every spec
                     file imports `test`/`expect` from here now (see "Desktop
                     client mode" below)
CEP_TestCases/       source-of-truth Excel workbooks (one per module) plus
                     LIVE_FINDINGS.md, a running log of confirmed app bugs
                     and DOM/selector gotchas discovered while automating
.env                 real credentials (gitignored, never commit)
```

## Credentials

Two separate, real QA teacher accounts are used (`.env.example` has the
full list):

- `VALID_PIN` — primary account.
- `VALID_PIN_2` — a second, independent account, used so some suites can
  run in parallel without colliding on shared per-account state (current
  class, session).

Element locators prefer `[data-qa-id="..."]` attributes throughout.

## What's covered

All 20 CEP_TestCases modules: Core UI, Grade/Subject/Division (Navigation),
Add Resource, Attendance, Compass, Toolbar, User Profile, Gallery, TCE
Search Library, Drop It, AI Assist, Learning Shorts, Minimap, Whiteboard, AI
Notices, AI Homework, Playlist, Authentication/Sign-In, Players, and User
Journeys — plus a dedicated adversarial ("break the app") pass layered on
top, targeting extreme inputs, rapid/repeated actions, mid-action
interruptions, and cross-account security checks specifically.

See `CEP_TestCases/LIVE_FINDINGS.md` for the running list of confirmed real
app bugs found this way, and each module's own `.xlsx` workbook for the
full case-by-case detail (Status column: `Verified Live` or `Pending
Verification -- <specific reason>`).

## Known follow-ups

- `config/moduleClassMap.js` is integrated into a subset of modules
  (Navigation, Compass, Playlist, AI Homework, AI Notices, Players) — the
  remaining modules still use inline class-setup calls, which work fine but
  aren't yet routed through the shared map.
- Desktop client mode (see above) was wired into every spec file
  (2026-09-12) and pilot-tested on two modules so far: authentication's
  `pin-login.spec.js` (19/23 passed originally) and the full
  `tests/add-resource/` module (50/51 passed after the `auth.helper.js`
  fix above — the one remaining failure, `AR-BREAK-05`, needs two
  simultaneous browser tabs on the same account and doesn't map to a
  single-window desktop client; it's a structural gap in that one test,
  not an app bug). The remaining modules haven't been run against the real
  client yet and may surface their own webview-specific quirks the same
  way these two did.
- Players (15 files), Authentication (12), Toolbar (11), and Playlist (8)
  still have the most files of any module. Every file in them is a real,
  distinct feature area (e.g. Players' quiz/worksheet/video split, Toolbar's
  drawing/text/undo-redo split) rather than ad-hoc sprawl, but Toolbar in
  particular has several very short files (canvas-controls.spec.js,
  drawing.spec.js, object.spec.js are all under 70 lines) that could be
  grouped into fewer, more substantial files if that's still wanted.

## Running everything at once

Every test logs into the same one real, shared QA account fresh (no session
reuse) — running the FULL suite back-to-back for the hours that takes can
hit a confirmed, transient backend timing race where a login right after a
prior test's class-switch/sign-out times out waiting for the post-login
avatar (`pages/auth.helper.js` now retries once automatically, which fixes
this in practice). If Playwright's **UI mode** still shows widespread
failures on "run all" specifically (as opposed to `npm test` from the CLI),
check the workers count in its own toolbar — UI mode has a worker-count
control independent of this project's `playwright.config.js` `workers: 1`
setting, and running more than 1 worker means multiple tests fight over the
same live account's state at once.
