# Senior Automation Review — CEP2 Playwright Suite

Review date: 2026-09-12
Scope: full project — test cases, page objects, fixtures, config, and how the suite is run.

## Bottom line

This is an unusually mature project for its size — better than most commercial QA suites at this
stage. The gaps that remain are not "the team doesn't know what they're doing" gaps; they're the
normal next layer of maturity (CI, tooling, execution speed, wait hygiene) that gets deferred while
a suite is still being built out to 1,000+ cases. Nothing here needs a rewrite. Below is what's
already right, what's missing, and a prioritized order to close the gaps.

## Ideal industry-standard project structure

Before the module-by-module comparison, here's the reference shape a mature Playwright framework
converges on — this is what "ideal" is being measured against below:

```
project-root/
├── .github/workflows/            # CI pipelines (or /ci for Azure/Jenkins) — triggers, schedules
├── config/
│   ├── environments/
│   │   ├── qa.config.js          # baseURL + env-specific values, one file per environment
│   │   └── staging.config.js
│   └── test-data-map.js          # e.g. this project's moduleClassMap.js
├── fixtures/                     # custom Playwright fixtures — app/session bootstrapping only
│   └── electron-app.js
├── pages/
│   ├── base.page.js              # shared behavior every page object inherits (retry-click,
│   │                              #   settle-then-click, common wait helpers) — written once
│   ├── components/                # reusable sub-widgets used by multiple pages (a modal, a
│   │   ├── login-modal.component.js   #   virtual keyboard, a card grid) instead of duplicating
│   │   └── virtual-keyboard.component.js
│   └── <module>.page.js          # one page object per screen/module, extends base.page.js
├── utils/  (or helpers/)
│   ├── auth.helper.js            # login/session helpers — NOT page objects, so they don't live
│   │                              #   under pages/
│   ├── retry.util.js             # generic retry/poll helpers shared across page objects
│   └── wait.util.js
├── test-data/  (or docs/test-cases/)
│   └── *.xlsx / *.json           # source-of-truth test case docs, separated from framework code
├── tests/
│   └── <module>/
│       ├── <feature>.spec.js
│       ├── adversarial.spec.js
│       └── cross-cutting.spec.js
├── playwright.config.js
├── .eslintrc.js / eslint.config.js
├── .prettierrc
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

The organizing principles behind this shape, not just the folder names:

1. **A page object represents ONE screen or ONE reusable widget, never a whole feature domain.**
   If a page object needs a "which sub-type am I" switch internally (11 branches for Quiz/Video/
   Worksheet/Image/Weblink/... in one file), that's a sign it should be N component objects
   composed together, not one large class.
2. **Helpers are not page objects.** Anything that doesn't represent a screen (login flow, retry
   logic, data formatting) belongs in `utils/`/`helpers/`, so `pages/` stays a clean 1:1 map of
   "screen → class" that a new engineer can navigate by app structure alone.
3. **Shared behavior lives in a base class, not copy-pasted per page object.** Retry-click,
   settle-then-click, and "wait then verify" patterns should be written once and inherited, not
   reimplemented slightly differently in each page object that needs them.
4. **Environment config is data, not a hardcoded string duplicated in two files.** One config file
   per environment (qa/staging/prod), selected by an env var — not the same `BASE_URL` fallback
   string living independently in both `playwright.config.js` and the fixture.
5. **Framework code and test-case documentation are separated at the top level.** Excel workbooks,
   progress-tracking docs, and presentation files are project artifacts, not framework code — they
   belong in a docs/test-data folder, not mixed in with the same top-level footprint as `pages/`
   and `fixtures/`.
6. **CI, lint, and format config live at the root, visible on first look.** Their absence (or
   presence) is usually the fastest signal of a project's actual maturity level to anyone opening
   the repo for the first time.

## How this project's structure compares

| Ideal                                        | This project                                                                                                                                                                                                                | Gap                                                                                                                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/` = one class per screen              | Mostly true, but `player.page.js` (224 lines) and `compass.page.js`/`add-resource.page.js` (300+ lines) each cover many sub-features in one file                                                                            | Split into component objects per sub-type (e.g. `QuizPlayerComponent`, `VideoPlayerComponent`) composed by a slim `PlayerPage`                                                                                |
| Helpers separated from page objects          | `pages/auth.helper.js` sits inside `pages/`, alongside actual page classes                                                                                                                                                  | Move to a new `utils/` (or `helpers/`) folder — it's login logic, not a screen                                                                                                                                |
| `base.page.js` shared class                  | Does not exist                                                                                                                                                                                                              | Retry-click / settle-then-click logic is currently reimplemented separately in `login.page.js` (`clickInKeypad`) and `player.page.js` (`closePlayer`, `openCodeEditorCard`) — extract the common pattern once |
| `config/environments/*.config.js`            | `config/moduleClassMap.js` only (test data, not environment config); `BASE_URL` fallback duplicated in `playwright.config.js` and `fixtures/electron-app.js`                                                                | Add environment config files; single source for `BASE_URL`                                                                                                                                                    |
| Test-case docs separated from framework code | `CEP_TestCases/` holds workbooks + `LIVE_FINDINGS.md` + a `presentation.html` — reasonably separated already, just named/cased inconsistently with the rest of the kebab-case project (`CEP_TestCases` vs `tests`, `pages`) | Low priority: rename for consistency if you want strict uniformity, not urgent                                                                                                                                |
| CI config at root/`. github/`                | Missing entirely                                                                                                                                                                                                            | See Phase 2 below                                                                                                                                                                                             |
| Lint/format config at root                   | Missing entirely                                                                                                                                                                                                            | See Phase 1 below                                                                                                                                                                                             |
| Reusable UI components (`components/`)       | Not present — e.g. the numeric/QWERTY virtual keyboard logic lives inline in `login.page.js` rather than as its own reusable component                                                                                      | Extract widgets reused across pages (virtual keyboard, modals) into `pages/components/`                                                                                                                       |

None of this is urgent in the sense of "broken" — the current flat structure works and is
navigable at 87 spec files. It becomes worth doing once you're actively adding new modules, since
the split-out structure is what keeps a 200+ file suite from turning `player.page.js`-style files
into unmaintainable ones.

## What's genuinely strong (keep doing this)

- **Traceability**: every test ID maps back to a specific row in a source-of-truth Excel workbook
  (`CEP_TestCases/*.xlsx`). Most teams claim this; very few actually maintain it at 1,000+ cases.
- **Root-cause documentation culture**: `LIVE_FINDINGS.md`, the comments in
  `fixtures/electron-app.js`, and `config/moduleClassMap.js`'s `knownIssues` fields all capture
  _why_ a workaround exists, with dates and "confirmed live" evidence — not just what the
  workaround does. This is the single biggest differentiator from an average suite, and it's what
  stops future work from "fixing" something that was already deliberately reverted once (e.g., the
  shell-overlay relaunch logic).
- **Page Object Model** is real, not decorative — locators are centralized, `data-qa-id` is
  preferred consistently, and undocumented fallback selectors are commented as such.
- **Secrets hygiene**: `.env` is gitignored, `.env.example` documents every required value, no
  credentials in code.
- **Targeted retries at the right layer**: `loginWithPin`'s retry, `clickNumericKeyInto`'s
  verify-then-retry, `PlayerPage.closePlayer`'s force-then-plain-click fallback — these retry a
  specific, diagnosed flake, not "just retry everything and hope." That's the correct way to fight
  flakiness.
- **Honest test discipline**: tests that can't be safely executed against the shared live account
  (e.g., a real double-submit) are marked with `test.fail()` and a documented reason instead of
  being silently skipped or faked.

## Scorecard

| Area                            | Status             | Why                                                                 |
| ------------------------------- | ------------------ | ------------------------------------------------------------------- |
| Test case traceability          | Strong             | Excel → spec ID mapping maintained by hand and by construction      |
| Page Object architecture        | Strong             | Consistent, centralized, well-commented locators                    |
| Secrets/credentials handling    | Strong             | `.env` gitignored, example file complete                            |
| Documentation of _why_          | Exceptional        | Rare at any team size                                               |
| Test independence / parallelism | Weak (constrained) | One shared live account, `workers: 1` forced suite-wide             |
| Execution speed                 | Weak               | Full Electron relaunch + fresh login on **every single test**       |
| Wait/flake hygiene              | Mixed              | Good targeted retries, but 975 hard-coded `waitForTimeout` calls    |
| CI/CD                           | Missing            | No pipeline anywhere — the suite has never run itself automatically |
| Linting/formatting              | Missing            | No ESLint/Prettier — 87 files, no enforced consistency              |
| Reporting/observability         | Basic              | `html` reporter only, no video, no CI-consumable output             |
| Debug output hygiene            | Weak               | 783 raw `console.log` calls inside test bodies                      |

## Test case documentation & traceability audit

All 20 workbooks under `CEP_TestCases/*.xlsx` were opened programmatically and cross-checked
against every ID referenced in `tests/**/*.spec.js`, module by module. Headline result: **this is
one of the strongest traceability setups reviewed at this size**, with real caveats worth fixing.

**Coverage is excellent almost everywhere.** 17 of 20 modules are at 100% — every workbook row has
a matching automated test and vice versa. The three with any gap at all:

- **Players** (179 workbook rows, the largest workbook): 171/175 unique IDs matched. The real gap
  is Checkpoints — the workbook uses `PLR-CHK-01..12` (12 rows) while the code uses a differently-
  prefixed, differently-scoped `PLR-CKP-01..07` in `checkpoints.spec.js` (7 tests). 12 documented
  checkpoint cases are effectively untraceable to the 7 that exist in code.
- **Attendance**: 35/36 — the one miss (`ATT-CONFLICT-NOTE-01`) is a process note, not a real test
  case, so this is effectively 100%.
- **Compass**: apparent 92% is mostly a `-PLAN` suffix dropped in code (`CMP-ANALYSEIT-01-PLAN` →
  `CMP-ANALYSEIT-01`) — real coverage is close to 100%.

**One undocumented spec file**: `tests/add-resource/dropit-ai-assist.spec.js` uses IDs
(`ADD-DRP-01`, `ADD-AIA-01`) that exist in **none** of the 20 workbooks (checked against all 1,045
rows). Either backfill these into the Add Resource workbook, or note explicitly that this file is
intentionally out-of-band.

**One real data defect in the Players workbook**: `PLR-EXP-01` through `PLR-EXP-04` are each reused
across unrelated Quiz/Video/Worksheet/Code-Editor sections — the same four IDs used for four
different, unrelated test cases. The automation code actually handled this gracefully (each spec
file disambiguates with a "(Quiz variant)"/"(Video variant)" suffix and a comment calling out the
collision) — but the source workbook itself needs its IDs renumbered so this doesn't have to be
worked around in code at all.

**The README's headline number is inflated in a specific, checkable way.** It states "1,016
automated test cases... all live-verified against the real QA app." The real numbers: 1,045
workbook rows total, but only **732 (70%) actually carry a "Verified Live" Status** — the other
**313 rows (30%) are still "Pending Verification"** or are process/meta notes. The "automated" part
is essentially accurate (nearly every row has a matching test), but "all live-verified" is not — the
workbooks' own Status column contradicts it for roughly 3 in 10 cases. This should either be
corrected in the README, or the wording changed to something like "1,045 cases documented and
automated; 732 (70%) confirmed live so far."

**Documentation quality**: every workbook shares a clean, identical 10-column schema (ID, Section,
Category, Title, Precondition, Test Data, Steps, Expected Result, Priority, Status) with no empty
Expected Result cells anywhere. The one recurring quality issue: Title/Expected Result cells are
frequently overwritten in place with narrative findings ("CLARIFIED:", "LIVE-CONFIRMED:",
"BREAKTHROUGH:") once a case is run, rather than staying a fixed acceptance criterion with the
outcome recorded separately. This merges "what should happen" (the spec) with "what we found"
(the findings log) into one cell — useful for a human reading top-to-bottom, but it means the
workbook can no longer answer "what was this test originally supposed to prove" without reading
past the finding. `User_Journeys.xlsx` is also structurally different from the other 19 — it
synthesizes/cross-references cases already verified in other modules' own workbooks rather than
independently re-testing them; its Status values do say "synthesized," but that's easy to miss if
skimmed as a plain "Verified Live."

**Revised scorecard entry**: traceability itself is genuinely strong (17/20 modules at 100%,
real defects are few and specific) — but the public-facing claim in the README needs a correction,
and the two concrete defects above (Players' duplicate IDs, the Checkpoints naming drift) are worth
fixing before this gets shown to anyone senior.

## The details

**1. No CI/CD at all.** There's no `.github/workflows`, no pipeline of any kind. 1,030 tests exist
and pass or fail only when someone manually runs `npm test` on this one machine. That means
regressions in the real app can sit undetected for however long it is between manual runs, and
there's no record of pass/fail trends over time. This is the single highest-leverage gap to close,
and it's tractable even though the app is a Windows desktop client — you need a self-hosted runner
(a GitHub Actions self-hosted runner or Azure Pipelines agent) on a Windows machine with the client
installed and pointed at QA, not a hosted Linux runner. Nightly, scheduled, not on every commit
(given the live-account and runtime constraints below).

**2. Execution speed — this is the biggest hidden cost.** Look at `fixtures/electron-app.js:112-134`:
the `page` fixture launches the _entire Electron client fresh_ and does a full login, for **every
single one of the ~1,030 tests**. The README itself says a full run takes "hours." Given
`workers: 1` is already forced (correctly, for account-state reasons), the fix isn't parallelism —
it's making the fixture worker-scoped: launch the app once, log in once, and reset UI state
(navigate home, close popups) between tests instead of relaunching the whole process. This alone
could plausibly cut total runtime by an order of magnitude. The trade-off: you lose the "every test
starts from a truly blank process" safety net, so `afterEach` cleanup needs to be deliberate. Worth
doing, but needs care.

**3. 975 hard-coded `waitForTimeout` calls across the suite.** Some are justified and
well-commented (the keypad-settling poll in `login.page.js`, the deliberate 5s post-load settle in
the fixture). But at this volume, most are almost certainly "just wait 500ms and hope the UI caught
up" rather than waiting for a specific, real condition. This is the classic source of both
flakiness (waits too short under load) and wasted runtime (waits too long when the UI was already
ready). Every one should be replaced with `locator.waitFor({ state })`, an auto-waiting
`expect(...)`, or `page.waitForResponse`/network-idle where the actual condition is known — with
hard waits reserved for the rare cases where there's genuinely no observable signal to wait on.

**4. 783 `console.log` calls inside test bodies.** These pollute CI logs and are invisible in the
HTML report unless someone's tailing stdout. The intent behind them (documenting what was actually
observed, e.g. "Zero-byte file — validation error shown: false") is good and worth keeping — it
should just go through `testInfo.annotations.push(...)` or `test.info().attach(...)` so it shows up
_in the report itself_, not the console.

**5. No linting or formatting.** 87 spec files, ~19,200 lines, hand-styled. An ESLint config (with
the `eslint-plugin-playwright` rules — which would also _automatically_ flag some of the
`waitForTimeout` and swallowed-catch issues above) plus Prettier would keep the next 1,000 tests
consistent with the current ones, cheaply.

**6. Reporting is minimal.** Only `reporter: 'html'`. No video capture (for a suite this dependent
on visual/timing flakiness — the keypad, the popup-stacking bug — video would be far more useful
than a single failure screenshot). No JUnit/machine-readable output, so a future CI step can't gate
on results. `trace: 'on-first-retry'` combined with `retries: 0` locally means local failures never
get a trace at all — `trace: 'retain-on-failure'` would fix that for free.

**7. Config/reality drift.** `playwright.config.js` still carefully documents
`headless`/`viewport`/the firefox+webkit cross-browser projects — but the README confirms none of
that applies anymore now that every spec drives the real Electron client. It's not wrong, exactly,
but it's dead configuration that will confuse the next person who touches it. Worth a comment at
the top of the config pointing at the README's "Desktop client mode" section, or trimming what's
now unused.

**8. `test.fail(condition, reason)` + `expect(...)` pattern, used ~847 times.** This is a legitimate
and fairly clever technique (mark a confirmed app bug as an _expected_ failure so it doesn't block
CI, but automatically flip to a real failure — "hey, this got fixed, update the workbook" — the
moment the app behavior changes). It's just heavily duplicated boilerplate at this volume. A small
shared helper (e.g. `expectKnownBug(condition, reason)`) would cut the repetition without changing
the behavior.

## Proposed order of work

**Phase 1 — cheap, high-value, low-risk (do first):**

- Correct the README's "1,016... all live-verified" claim (actual: 1,045 documented/automated
  rows, 732 confirmed Verified Live so far — see the traceability audit above).
- Renumber the Players workbook's colliding `PLR-EXP-01..04` IDs (currently reused across four
  unrelated Quiz/Video/Worksheet/Code-Editor cases).
- Reconcile the Players Checkpoints naming drift (`PLR-CHK-*` in the workbook vs `PLR-CKP-*` in
  `checkpoints.spec.js`) so the 12 documented cases map cleanly to the 7 automated ones (or document
  why 5 are intentionally not automated).
- Backfill `tests/add-resource/dropit-ai-assist.spec.js`'s `ADD-DRP-01`/`ADD-AIA-01` into the Add
  Resource workbook, or mark the file as deliberately out-of-band.
- Add ESLint + `eslint-plugin-playwright` + Prettier; run once to auto-fix formatting.
- Switch `trace` to `retain-on-failure`, add `video: 'retain-on-failure'`.
- Add a second reporter (`['list']` alongside `['html']`) for CI-legible terminal output.
- Route the ~783 `console.log` calls through `test.info()` annotations (mechanical, scriptable
  change).

**Phase 2 — structural, real payoff:**

- Stand up a self-hosted CI runner (Windows, client pre-installed) and a scheduled (nightly)
  pipeline running the full suite, publishing the HTML report as an artifact.
- Move the Electron `page` fixture to worker scope with explicit per-test reset, to collapse
  runtime from hours to a fraction of that.
- Sweep the 975 `waitForTimeout` calls, replacing the ones with a real observable condition; leave
  only the genuinely justified ones (keep their existing comments).
- Move `pages/auth.helper.js` into a new `utils/` folder; it's a login helper, not a page object.
- Introduce `pages/base.page.js` and migrate the duplicated retry-click/settle-then-click logic
  (`login.page.js`'s `clickInKeypad`, `player.page.js`'s `closePlayer`/`openCodeEditorCard`) into it.
- Add `config/environments/` (qa/staging) so `BASE_URL` has one source of truth instead of the
  fallback string currently duplicated in `playwright.config.js` and `fixtures/electron-app.js`.

**Phase 3 — polish / longer-term:**

- Extract the `test.fail`/`expect` duplication into a shared helper.
- Add a traceability check script (every workbook test-case ID has a matching spec, and vice versa)
  to stop the Excel-vs-code drift.
- Consider TypeScript or at least JSDoc typedefs on the page objects, given the suite's now large
  enough that locator/method typos are a real cost.
- Split the largest page objects (`player.page.js`, `compass.page.js`, `add-resource.page.js`) into
  `pages/components/` — one class per sub-widget (Quiz/Video/Worksheet/... player component,
  virtual-keyboard component) composed by a slim parent page object.
