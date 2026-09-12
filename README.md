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
npx playwright install chromium
cp .env.example .env   # then fill in real values (see below)
```

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

**Every run opens a real, visible browser window at 1920x1080** — both
`headless: false` and `viewport: { width: 1920, height: 1080 }` are set as
defaults in `playwright.config.js`, not just passed as CLI flags. That's
also why `npm test` and `npm run test:headed` behave the same now: there's
no headless mode to opt out of by adding `--headed`. The 1920x1080 size
matches the real classroom displays this app targets — at the smaller
1280x720 Playwright default, the whiteboard canvas only renders into part
of the window instead of filling it. Set `headless: true` in
`playwright.config.js` (there's no CLI flag to override a `headless: false`
config back to headless) if you ever need a faster, invisible run, e.g. on
a headless CI machine.

**Always keep `--workers=1`** (already the config default) when running
against the live app — every test shares real, mutable account state
(current class, session), so parallel workers on the same login will fight
over it and produce false failures.

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
fixtures/electron-app.js   custom Playwright fixture to drive the real desktop
                     (Electron) client instead of a plain browser — not yet
                     wired into any spec file, ready for that follow-up
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
- `fixtures/electron-app.js` can drive the real desktop client, but no spec
  file uses it yet — the suite currently runs against the browser only.
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
