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
npm test                                  # headless, runs everything in tests/
npm run test:headed                       # watch the browser while it runs
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

## Project layout

```
tests/              test spec files (*.spec.js), one folder per module
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
