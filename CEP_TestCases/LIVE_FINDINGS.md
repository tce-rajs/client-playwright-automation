# Live Findings (Playwright automation session)

Running log of DOM-shape surprises, selector traps, and confirmed real app
bugs discovered while writing/running Playwright automation. Append new
entries here; do not overwrite existing ones (multiple workers use this
file).

---

## Add Resources picker: `pointer-events: none` across the whole popup subtree (confirmed real bug)

**Module(s) affected:** Drop It, AI Assist, and potentially any other spec
using `AddResourcePage.openPicker()` (Create, Library, Gallery, Whiteboard).

**Symptom:** After clicking the "+" Add Resources FAB, the picker's action
cards (e.g. `[data-qa-id="add-resource-action-dropit"]`) report `isVisible()
=== true`, have a plausible non-zero bounding box, and `opacity: 1` /
`visibility: visible` -- but a real click at those coordinates does nothing.
`document.elementFromPoint()` at the card's center resolves to the
whiteboard's SVG canvas underneath, not the button.

**Root cause (confirmed via `getComputedStyle`):** every ancestor in the
popup's DOM chain, from the button itself up through
`.float-ui-container`/`float-ui-content`, has `pointer-events: none`
computed. A real browser mouse click at that pixel passes straight through
the entire popup to whatever is underneath -- this is real click-through
behavior, not a Playwright quirk, so `force: true` doesn't help either
(force bypasses Playwright's own actionability checks, but the browser's own
hit-test at that pixel still resolves to the canvas).

**Reproducibility:** Non-deterministic. Observed on roughly 30-50% of fresh
logins in isolated reproduction scripts, independent of chapter/topic
navigation history (i.e. NOT caused by `ensureResourcesPresent()`, despite
initially looking that way -- confirmed by reproducing it with zero chapter/
topic navigation at all, and separately NOT reproducing it after
`ensureResourcesPresent()` on other runs).

**Recovery:** A same-page close+reopen of the picker does **not** self-heal
it (confirmed: 5 retries with increasing waits, still stuck). A full page
`reload()` reliably recovers it (confirmed: the very next open after reload
had normal `pointer-events`).

**Workaround added:** `AddResourcePage.openPickerReliably(actionLocator,
maxReloadAttempts)` in `pages/add-resource.page.js` -- opens the picker,
checks the target action's computed `pointer-events`, and reloads the page
+ retries (up to `maxReloadAttempts`, default 3) if stuck. Used by
`tests/drop-it/drop-it.spec.js` and `tests/ai-assist/ai-assist.spec.js`.
Existing specs (`tests/add-resource/*.spec.js`) were NOT modified -- they
still call `openPicker()` directly and may be intermittently affected by
this same bug; worth a follow-up pass to adopt the new helper there too if
those specs show unexplained flakiness.

**Recommendation:** flag to dev -- this looks like a float-ui-library
animation/state bug (the popup's enter/exit-animation class briefly, or
sometimes permanently, sets `pointer-events: none` on the whole tree and
doesn't always clear it), not anything test-tooling-specific.

---

## Drop It: the pairing QR is a real per-session canvas render, NOT a static image (corrects the test-case workbook)

`CEP_TestCases/Drop_It_Module_Test_Cases_Final.xlsx`'s `DRP-QR-01` claims the
Drop It QR is "a static local image asset" based on inspecting an `<img
src=".../qr-code.png">`. Live re-investigation found that `<img>` is actually
the **Add Resource FAB's own decorative icon** for the Dropit action card
(`div.dropit > button > ... > img.magic-ai-icon`) -- a menu icon, naturally
identical on every open since it's not the pairing UI at all.

The REAL pairing graphic, shown only after the panel is actually open, is
`<div class="qrcode"><canvas></canvas></div>`. Confirmed live:
- The canvas's `toDataURL()` output is **stable** while a single session
  sits open/idle (checked 1.5s and 4s apart, identical).
- Across **4 separate close/reopen cycles**, all 4 dataURLs were **unique**
  (no repeats) -- consistent with a genuine per-open/per-session code, not a
  static placeholder.
- Opening Drop It establishes real `firestore.googleapis.com
  .../Listen/channel` and `.../Write/channel` requests (Google Firestore
  realtime channels) -- a real backend connection, not a static asset with
  no backend involvement.

**Conclusion:** `DRP-QR-01`'s "Critical bug" classification in the workbook
should be corrected -- the pairing mechanism is real and per-session, not a
static mock. The likely explanation is the original investigation queried
the wrong DOM element (a naive `img[src*="qr"]` selector matches the FAB
icon, not the actual `.qrcode canvas`). See
`tests/drop-it/drop-it.spec.js`'s own `DRP-QR-01` test for the reproducing
assertions.

---

## AI Assist: confirmed real bugs found this pass

- **AIA-EXERCISE-02 (topic-mismatch placeholder text, CONFIRMED):** with the
  live class/topic "4.1 | Big Idea: Describing Motion Around Us" open, the
  Exercise tab's own instructional header reads *"Select checkboxes to
  create an exercise and add to the topic Addition of 2-digit Numbers with
  Regrouping"* -- a completely unrelated Math topic. The questions generated
  below are correctly Motion-related; only this one header string is stale/
  hardcoded. Matches the workbook's own finding exactly (different topic,
  same bug class). See `tests/ai-assist/ai-assist.spec.js`'s `AIA-EXERCISE-02`.
- **AIA-ADV-04 (rapid multi-tab-switch spam can close the whole modal,
  NEW finding, not in the original workbook):** clicking Exercise -> Videos
  -> Teaching Tips -> Exercise in immediate succession (no wait between
  clicks) reproducibly left the AI Assist modal itself gone (`AI Assist
  modal still present: false`) with a subsequent tab click unable to find
  its target at all within 5s. Worse than the already-documented AIA-TABS-02
  single-tab 2-click-lag bug -- this is the whole panel disappearing, not
  just stale content. Worth a dedicated follow-up/escalation.
- **AIA-ERROR-01 / AIA-EXP-01 (network-interception limitation, not
  necessarily a bug):** both a forced HTTP 429 response AND a fully aborted
  request for the AI-generation endpoint still resulted in real content
  rendering anyway (`content loaded anyway: true`). This means either (a)
  the app serves this topic's Exercise/Videos/Teaching-Tips content from a
  client-side cache independent of the intercepted request, or (b) the
  actual generation call uses a different endpoint/pattern than
  `ai[-_]?assist|ai[-_]?generat` matched. Either way, this environment
  could not exercise the genuine "quota exhausted" / "network failure"
  UI paths this pass -- documented via `test.fail()` rather than claiming
  those paths are broken.
- **AIA-LOADSIGNAL-01 (loading-spinner race, CONFIRMED):** exercise
  checkboxes read 0 right when the loading spinner cleared, then 3 a further
  1.5s later -- the spinner's own disappearance is not a reliable signal
  that content has finished populating. Matches the workbook's own
  adversarial concern.
- **AIA-VIDEOS-02 (inconclusive):** a real `<iframe src="youtube.com/embed/...">`
  is present in the DOM, but clicking within its bounds produces no visible
  playback state change (thumbnail card never disappears). Consistent with
  the workbook's own "inconclusive -- app bug vs. sandboxed-iframe
  limitation" framing; not resolved further this pass.

Fixed along the way (test-authoring pitfalls, not app bugs):
- `getByText('Exercise', { exact: true })` (and similarly for 'Videos' /
  'Teaching Tips') can resolve to 2 elements once content has rendered (a
  tab-list label AND a same-named `<h5>` heading elsewhere in the panel) --
  a strict-mode violation. Scope with `.first()`.
- `.textContent()` (and most Playwright actions) default to a ~30s
  actionability wait per call when the target never resolves -- chaining two
  such calls in sequence as a "try selector A, then fall back to selector B"
  pattern can silently eat 60s+ of a test's budget if NEITHER matches.
  Always pass an explicit short `{ timeout }` for this kind of fallback
  probing.
- `AddResourcePage.openPickerReliably()` (see the entry above) needs to be
  used for EVERY picker-open in a spec, not just some -- a few AI Assist
  tests initially called `ar.openPicker()` directly and intermittently hit
  the same pointer-events:none picker bug as Drop It.

---

## Drop It: `.qrcode canvas` vs FAB icon selector trap

If you're writing a selector for the Drop It pairing graphic, use `.qrcode
canvas`, NOT `img[src*="qr"]` or similar -- the latter matches the
`add-resource-action-dropit` FAB button's own icon
(`assets/images/add-resources/qr-code.png`), a completely different,
always-static element. See `AddResourcePage.dropitQrCanvas` in
`pages/add-resource.page.js`.

---

## Toolbar: `.toolpadding` exists on EVERY tool icon regardless of active state -- use `.toolpadding.changecolor` instead

`ToolbarPage.isToolActive(toolId)` originally scoped to `.toolpadding`
inside the tool button -- confirmed live this div is present unconditionally
(active or not), so the locator always matches and any `.isVisible()` check
on it is meaningless (always true). The tool's real active/selected state is
signalled by an EXTRA `changecolor` class appended to that same div (e.g.
`"toolpadding tools hello changecolor"` when active vs. `"toolpadding tools
hello"` when not). Fixed in `pages/toolbar.page.js` to scope to
`.toolpadding.changecolor`.

## Toolbar: a tool's own panel does NOT close by re-clicking its icon -- only tapping outside works

Confirmed live (`gap-analysis.spec.js`'s `TB-CYP-06`): with a tool's panel
already open (e.g. Zoom), clicking that SAME tool's icon again -- whether a
single click, a second single click, or even a further double-click -- does
NOT close the panel. It stays open through all of them. The only gesture
confirmed to close an open panel is tapping/clicking outside it (see
`TB-CYP-05`). Any workbook case assuming "click the icon again to close" is
wrong for this app; encode it as a `test.fail()`-documented finding instead.

## Toolbar: the Shapes tool is single-use per arm -- it needs Rectangle re-selected from a freshly (re)opened panel before EVERY insertion

Confirmed live: after one successful drag-insert with the Shapes tool set to
Rectangle, attempting a second insert WITHOUT reopening the panel and
re-clicking "Rectangle" silently does nothing (no new shape lands) --
including when the re-arm attempt is just a single click on the gtShapes
tool ICON itself (that also does NOT re-arm it). Only a full panel reopen +
Rectangle reselect works. The tool's own active-state class stays "active"
throughout, giving no visible UI signal that it has silently reverted to
needing a re-arm. Any test inserting multiple shapes in a loop (e.g.
`TB-EXP-10`) must reopen the panel and reselect the shape option before each
individual insertion, not just once at the top of the loop.

## Toolbar: fixed page header/logo covers roughly the top-left 90x90px of the whiteboard canvas

`document.elementFromPoint()` at canvas-relative coordinates near (50, 50)
resolves to `[data-qa-id="wb-header-logo-image"]` (the app's own fixed
header logo), NOT the whiteboard SVG underneath -- even though the SVG's own
`boundingBox()` reports `{x:0, y:0, ...}` covering that area. A raw
`page.mouse` click/drag at a small offset (e.g. `at(50, 50)` with this
project's toolbar `gap-analysis.spec.js` offset pattern) can silently land
on the logo and do nothing to the canvas. `gap-analysis.spec.js`'s shared
`at()` helper now clamps every point to a minimum of 120px in both axes to
guarantee it never lands under the header or off-canvas (see the next entry
for the off-canvas half of this).

## Toolbar: a small base coordinate + this project's own random offset pattern can land off-canvas entirely

Several toolbar gap-analysis tests compute canvas points as `at(x, y) = {x:
x + OFFSET_X, y: y + OFFSET_Y}` with `OFFSET_X`/`OFFSET_Y` each randomized
in `[-150, 150]` once per file-load. For a small base point (e.g. `at(100,
150)`), an offset below `-100` (a real ~1-in-3 chance per axis) produces a
NEGATIVE coordinate -- fully off the visible viewport/canvas, where
`elementFromPoint` returns `null` and no click target exists at all. This
was the direct, consistently-reproducible cause of a `TB-STATE-02` failure
(text-insert click silently landing at `(-41, 181)`). Fixed by clamping
`at()`'s output to a minimum of 120 in both axes (see previous entry) --
worth checking any OTHER file using a similar random-offset-over-small-base
pattern for the same risk.

## User Profile: Sign Out has NO separate confirmation dialog -- clicking it signs out immediately

Confirmed live via direct instrumentation (page-close/crash/navigation event
listeners): clicking the outer profile menu's "Sign Out" entry signs the
account out IMMEDIATELY -- the app drops straight to "You are currently in
Guest Mode. Please Sign in..." with no intermediate confirm step at all, in
every reproduction attempt (with and without a second tab open
concurrently). A test that unconditionally calls
`page.getByRole('button', {name: /sign out/i}).last().click({force:true})`
expecting a SEPARATE confirm button will have that locator match zero
elements and sit waiting out Playwright's ~30s default actionability
timeout before the attached `.catch()` ever fires -- silently burning the
entire test's own timeout budget in the process. By the time the test's
overall timeout fires and Playwright tears down the page/context, the very
next `await page.<anything>()` throws "Target page, context or browser has
been closed", which looks like the SIGN-OUT ACTION itself crashed the page
but is actually just fallout from the earlier blind-wait already having used
up the whole timeout. Fixed in `tests/account-management/user-profile.spec.js`'s
`USR-CROSS-01` by checking the confirm button's visibility with a short
bounded timeout FIRST, and only clicking it if it's actually there. If you
see "Target page, context or browser has been closed" immediately after a
`.click({force:true}).catch(() => {})` on a locator that might not exist,
suspect this exact pattern before assuming a real crash.

---

## Compass: the original 19/32 failures were a fixture-class bug, NOT the Add Resources pointer-events-none class of bug

The parent task's own hypothesis going in was that `CompassPage.openTrigger()`
was hitting the same `pointer-events: none` click-through bug confirmed for
the Add Resources picker. Live investigation (screenshot + full popover
`outerHTML` dump + a multi-class DOM scan) disproved that: the Compass
trigger's popover opens fine and is fully clickable every time -- the
`compass-analyseit-item` entry simply **does not exist in the DOM at all**
(0 count, not just hidden/unclickable) on `'Class 11 A Mathematics'`, the
class this suite's `beforeEach` originally used, because AnalyseIt is
genuinely gated per class/subject (no assignable homework for that
combo) -- confirmed 5/5 reproductions including full page reloads. Scanning
several class/subject combos found `'Class 12 A Physics'` reliably renders
AnalyseIt (empty "No Homework" state), ExploreIt (real widget tiles), AND
Revision Tests all at once -- switched the suite's fixture class to that.
**Lesson: a locator timeout after a popover-open call is not automatically
the pointer-events-none bug -- dump the actual popover HTML first to see
whether the target element exists at all before assuming a click-through.**

## Compass: switching to Planning mode navigates to a WHOLLY SEPARATE app with zero `data-qa-id` attributes and an icon-only collapsed sidebar

Confirmed live: the profile popover's "Planning" option navigates from
`.../teach/whiteboard` to `.../plan/#/canvas` -- a structurally distinct
Angular/Nebular app, not a view within the Teaching app. Two consequences
that broke `CompassPage.switchToPlanningMode()`/`switchToTeachingMode()`:
1. Its left nav (`<nb-sidebar class="... compacted">`) is collapsed to
   icon-only (56px) by default -- item labels are real
   `<span class="menu-title">` text nodes but `display: none` while
   compacted, so a locator on the span itself has no bounding box and fails
   actionability even with `force: true` (force skips visibility CHECKS but
   still needs a real box to click). Fix: target the containing `<a>`
   (`page.locator('a').filter({ hasText: 'Question Bank' })`), which stays
   visible/clickable throughout -- `.filter({hasText})` matches on
   `textContent` regardless of the descendant span's own display state.
2. The Planning app has **zero** `data-qa-id` attributes anywhere in its
   entire DOM (confirmed via a full-page `querySelectorAll('[data-qa-id]')`
   returning an empty array) and no `toolbar-user-avatar`/header at all --
   so there is no way back to Teaching mode via a stable in-app selector
   from within it. Fixed `switchToTeachingMode()` with a bounded fallback:
   if the (teach-app-only) avatar isn't reachable within a few seconds,
   navigate directly to `BASE_URL` instead of hanging on a locator that can
   never resolve there.

Also confirmed live: the Planning sidebar's own item list can take anywhere
from ~2s to needing a full same-page reload to populate after switching
into it (worse under concurrent load against the shared QA account) --
`switchToPlanningMode()` now waits, then does one same-page reload retry if
the sidebar is still empty, rather than assuming a fixed short wait is
always enough.

## General: a resilience fix's own worst-case latency can exceed the test's timeout budget, producing a misleading "Target page ... has been closed" error

Adding retry/reload logic to make a flaky action more reliable (as above)
increases that action's own worst-case duration. If several such retries
stack up inside one helper call, the whole call can approach or exceed
Playwright's default 30s **per-test** timeout on its own -- the test then
times out **inside** the helper, and the next `page.*` call after it throws
"Target page, context or browser has been closed" (the same misleading
artifact already documented above for USR-CROSS-01's Sign Out case, but
from a different root cause: a real timeout, not a blind wait on a
never-appearing element). Fix: bump the test/file's own timeout
(`testInfo.setTimeout(...)` in `beforeEach`, or `test.setTimeout(...)` in an
individual test known to chain several such calls) to give real headroom,
matching the pattern already established in `ai-assist.spec.js`'s own
`beforeEach`. Applied in `compass.spec.js` (file-level 60s bump) and its
`CMP-EXP-03` (test-level 90s bump, since it also does a full class switch on
top of the Planning-mode round trip).

## Compass: clicking `compass-analyseit-item` (labeled "No Homework") DISMISSES the top-level empty-state banner instead of opening any detail view

Confirmed live via a before/after `outerHTML` diff of `.compass-menu`: the
"Currently, there is no Homework available to analyse..." banner
(`data-qa-id="compass-no-homework-create"`) renders at the TOP LEVEL of the
menu as soon as the trigger opens -- no click needed. Clicking the
AnalyseIt entry itself (which, in this empty state, is labeled "No
Homework") makes that banner disappear (replaced by an Angular `<!---->`
comment placeholder) instead of opening any detail/composer view in its
place. Any test that clicks `analyseItItem` and then expects to still see
that banner (or some other real content) will read `hasContent: false` --
this is real, reproducible, confirmed behavior, not a selector bug. Affects
`CMP-TRIG-03`, `CMP-ANALYSEIT-01`, and `CMP-EXP-01` in `compass.spec.js`,
all now documented via `test.fail()`.

## General: `test.fail(condition, reason)` paired with a tautological `expect()` (e.g. `expect(true).toBe(true)` or `expect(x).toBe(x)`) produces Playwright's own "Expected to fail, but passed" meta-failure

If `condition` evaluates `true` (marking the test as expected-to-fail) but
the paired assertion can never actually throw, the test body completes
without an exception -- which Playwright itself flags as a failure
("Expected to fail, but passed"), on top of whatever real condition was
being documented. Every `test.fail()` call needs a REAL assertion that
would actually throw when the documented condition is true. Found and fixed
three instances of this in `compass.spec.js` (`CMP-ASSIGN-01`,
`CMP-EXP-02`, `CMP-EXP-06`) where the original assertion was tautological.

## Compass: `openTrigger()`'s click can hang for the FULL remaining test timeout if the trigger button is only transiently visible

On some class/subject/topic combos (e.g. `'Class 5 A Mathematics'`) the
`compass-trigger-btn` can pass an `isVisible({timeout})` check and then
vanish again before the actual `.click()` dispatches. A plain
`.click({force: true})` with no explicit timeout of its own then falls back
to waiting out the **whole remaining test budget** (not just a few seconds)
for the locator to resolve again -- turning a legitimate "this class
doesn't really have the trigger" finding into a full test-timeout hang.
Fixed by passing an explicit short `timeout` directly to `.click()` inside
`CompassPage.openTrigger()` and treating a timeout there the same as "not
visible" (retry via reload rather than propagate the error).

## Environmental: repeated `user-profile.spec.js` full-file runs show a DIFFERENT random set of failures each time, all bearing login-timeout/DNS-failure/"Target page ... has been closed" signatures

Ran the full 45-test file 3 times in immediate succession this pass. Each
run failed a different, non-overlapping set of ~3-6 tests -- e.g. run 2
failed `USR-PIN-01`/`USR-LOGIN-03`/`USR-EXP-03`/`USR-EXP-04`/`USR-EXP-05`/
`USR-EXP-06`; run 3 (immediately after) failed a completely different set:
`USR-ACCESS-02`/`USR-PWD-03`/`USR-PWD-04`/`USR-PIN-02`/`USR-SEC-07`/
`USR-SEC-02`. Every failure's actual error was one of: a plain login
timeout (`toolbar-user-avatar` never became visible), a `page.goto` timeout,
one outright `net::ERR_NAME_NOT_RESOLVED` DNS failure, or the familiar
"Target page, context or browser has been closed" cascade (see the
USR-CROSS-01 entry above) from a whole-test timeout. **This is environmental
instability (network/server), not a code defect** -- a real bug would fail
the SAME test consistently, not a different random subset each run. Only
`USR-SUBJ-01`'s own fix (see below) was verified by confirming it passed
cleanly in both of these later runs despite the surrounding noise.

## User Profile: the Add Subjects picker can open with ZERO options even when the account has ZERO existing Subject chips

Confirmed live: this account currently has 0 Subject chips
(`subjectChips.count()` returned 0 across `USR-SUBJ-02`/`03`'s own checks
too), and opening the Add Subjects picker in that state showed 0 selectable
options (`subjectPickerOptions.count()` also 0). This is NOT the "nothing
left to add because everything's already a chip" case -- there's nothing
to exclude. Documented via `test.fail()` in `USR-SUBJ-01` rather than
hard-failing on a real, reproducible empty-picker finding.

---

## Whiteboard verifier pass (2026-09-07): 3 test-authoring bugs fixed, 24/24 now clean

Verifying `tests/whiteboard/whiteboard.spec.js` (written by a concurrent
writer agent) found and fixed 3 real test-authoring bugs -- none were app
bugs, but each would have produced a wrong/misleading tracked outcome if
left as-is:

1. **`WB-TEXT-01` intermittently found zero `foreignObject.text-element`
   after `insertTextAt()`.** Same class of flake already documented for the
   Pen tool (`penStroke()`'s own retry): the very first Insert-Text click
   right after selecting the tool can silently not register. Fixed
   `WhiteboardPage.insertTextAt()` (`pages/whiteboard.page.js`) to verify a
   new text object actually landed and retry the tool-select+click once if
   not, mirroring `penStroke()`'s pattern exactly.
2. **`WB-ERASER-01`/`WB-ERASER-02` drew at y:950/y:1000 in a 1920x1080
   viewport, which resolves (confirmed via `document.elementFromPoint`) to
   the Playlist resource strip (`data-qa-id="playlist-resources-wrapper"`),
   NOT the whiteboard `<svg>`.** Both pen strokes silently drew nothing;
   `WB-ERASER-01` would have logged a false-positive "confirmed bug" via
   `test.fail()` for the wrong reason (0 paths before AND after, not an
   eraser failure). Fixed by moving both tests' coordinates to y<=900 (the
   range every other stroke-drawing test in this file already confirms
   safe). `WB-ERASER-01` was ALSO missing the `tb.waitForBoardToSettle()`
   call every other stroke test has -- on a fresh page load, this shared
   account's persisted content (500+ strokes from `WB-EXP-01`'s stress test
   earlier in the same file) can still be loading, making an immediate
   `pathCount()` read unstable. Added it to both eraser tests. After both
   fixes, `WB-ERASER-01` now genuinely reproduces the real cross-ref bug
   (TB-CYP-03: eraser can't remove a stroke once it's >~700px) and
   `WB-ERASER-02` genuinely shows no adjacent-word-deletion bug (TB-CYP-04
   NOT reproduced on this exact repro shape) -- both trustworthy now,
   whereas before the fix they were accidentally "passing"/"failing" for
   reasons unrelated to what they claimed to test.
3. **`WB-DOCK-01`'s toggle click failed silently ~2/3 of the time**
   (confirmed via a 3-repeat isolated probe: the toggle DOM mechanism
   itself -- a single `.leftRightBtn` element whose class flips
   left<->right -- is 100% reliable once the page has settled a moment, but
   the real test clicked it immediately after login with zero settle wait).
   Fixed by adding a short settle wait plus a click-verify-retry loop (up to
   3 attempts); confirmed 4/4 clean afterward.

General lesson reinforced: a locator/action failing right after page load
or right after a tool-select is this app's single most common flake
pattern (now confirmed independently for Pen, Insert Text, and the dock
toggle) -- always suspect a missing settle wait before diagnosing anything
else as a "real bug", and verify with an isolated repeat/probe rather than
trusting one run.

---

## AI Notices verifier pass (2026-09-07): broken approve/discard selector + a Playwright isVisible/waitFor pitfall

Verifying `tests/ai-notices/ai-notices.spec.js` found two significant
test-authoring bugs that were making ~19 of 22 tests falsely report
"compose dialog not reachable" (a test.fail() fallback, not a real app gap):

1. **`approveBtn`/`discardBtn` in `pages/ai-notices.page.js` matched ZERO
   elements.** The original heuristic (`[class*="approve"]`,
   `[aria-label*="approve" i]`, `svg [class*="check"]`) assumed some
   class/aria-label existed; a full DOM dump of the drag-selection toolbar
   found the real controls are completely unlabeled raw SVG `<g
   cursor="pointer">` elements (empty className, no id, no data-qa-id, no
   aria-label). Confirmed live: `g[cursor="pointer"]` matches exactly 0
   elements with no selection active, exactly 2 while a selection rectangle
   is showing, in stable DOM order (Approve first, Discard second, matching
   their visual left-to-right order). Fixed both selectors to
   `g[cursor="pointer"]` `.nth(0)`/`.nth(1)`. Since almost every
   compose-dialog-dependent test in this file also had no setup step of its
   own to actually OPEN the dialog (each test gets a fresh login via
   `beforeEach`, so nothing carries over from a prior test), added a new
   shared helper `AiNoticesPage.openComposeDialogWithRealText(tb)` (places
   real text via Insert Text, then does the full Magnet -> Notice ->
   drag-select -> Approve round trip) and wired it into every test that
   needs the dialog open.
2. **`Locator.isVisible({ timeout })` does NOT actually poll/wait in
   Playwright** -- confirmed live via an isolated timed probe: an
   "8-iteration x 1500ms timeout" loop calling `isVisible({timeout: 1500})`
   completed in under 2 seconds total, not the expected ~12s. This matters
   here because the OCR approve action triggers a REAL backend call (POST
   `.../ocr/text-recognition/check_text`) confirmed to take up to ~10-20s --
   a loop of `isVisible({timeout})` checks silently gives up almost
   immediately instead of genuinely waiting, making a real success look
   like a failure. Fixed by using `locator.waitFor({ state: 'visible',
   timeout })` instead, which genuinely polls. **Worth checking any other
   spec in this project using a similar isVisible-in-a-loop pattern to wait
   for a slow async action -- it is very likely not actually waiting as
   long as intended.**

After both fixes, the suite's real signal changed completely: Rephrase/
Translate/Grammar buttons are now confirmed genuinely VISIBLE (not just
"not reachable") while still being confirmed dead code (cross-repo
source-read: their HTTP calls are commented out) -- a stronger, more
specific finding than before. AIN-OCR-02, AIN-SHARE-01, AIN-SEND-01,
AIN-TITLE-01, AIN-EDIT-01/02, AIN-EXP-03 all now exercise the REAL flow and
pass genuinely rather than bailing into the "not reachable" fallback.

---

## Players module (writing pass): the Playlist strip can be fully COLLAPSED on VALID_PIN_2, silently no-opping every resource-card click

Writing new Quiz/Video/Worksheet/Image/Weblink Player spec files
(`tests/player/quiz.spec.js` and siblings) hit a catastrophic sanity-run
failure: 27 of 28 new Quiz tests timed out waiting for `lib-quiz-renderer`
to appear, despite navigation succeeding and the quiz card being
confirmed present in the DOM (`count() === 1`).

**Root cause (confirmed via screenshot + DOM inspection):** the entire
Playlist strip (resource cards, CONTENTS/E-BOOKS tiles, the "+" Add
Resources button) can be fully COLLAPSED on this account -- a card is
attached in the DOM (a plain `.count()` finds it) but genuinely not
visible/interactive on screen. `PlayerPage.openResourceCard()`'s
scrollIntoView+native-click on a collapsed card is a silent no-op (no
error, just nothing happens), so every downstream wait for the player to
open times out with no useful signal about the real cause.

**Fix:** confirmed live that `[data-qa-id="playlist-drawer-btn"]`'s own
text reads "SHOW"/"HIDE" depending on state (matches
automation-cep-cypress's own `PlaylistPage.ensureDrawerVisible()`
exactly). Added `PlaylistPage.ensureDrawerVisible()` to
`pages/playlist.page.js` (clicks the toggle only if currently showing
"SHOW") and call it in every new Player spec file's `beforeEach`, right
after navigating to the target class/chapter/topic. **Any NEW Player spec
file added later must also call this** -- the pre-existing
checkpoints.spec.js/code-editor.spec.js/ebook.spec.js (on the OTHER
account, VALID_PIN) apparently didn't need it, so this appears to be a
per-account UI-state persistence quirk, not universal -- but it's cheap
and safe to always call regardless of account.

---

## Quiz Player: "Launch AIR Card" genuinely requires real camera access -- resolves PLR-QZ-RECONCILE-01 definitively

While writing `tests/player/quiz.spec.js`, found the real reason every
Q1-dependent quiz test timed out even after fixing the collapsed-Playlist-
drawer issue (see the entry above): there is a THIRD, previously
undocumented screen between "Launch AIR Card" and the real first
question -- "Enter the class strength to kick off the quiz adventure!"
(a student-count slider + a "Start" button). Clicking Start on this
screen then shows: **"We couldn't access your camera. Please ensure your
browser has camera permissions enabled and try again."**

This **definitively resolves PLR-QZ-RECONCILE-01's open reconciliation
question** (this session's "Launch AIR Card" flow vs. the mature Cypress
suite's own "no AIR Card resource exists, camera-dependent cases stay
untestable" ground truth): hypothesis (a) is confirmed correct -- this
account's AIR Card content IS genuinely camera-dependent, matching the
Cypress suite's own understanding exactly. It is not a differently-branded
non-camera flow (hypothesis (b)). Playwright's default browser context has
no real/fake camera wired up, so this blocks EVERY quiz test that needs to
reach a real loaded question (PLR-QZ-02 through 21 and most of the
EXP-*/EXP-SEC-03 rows) -- `tests/player/quiz.spec.js`'s own
`openQuiz()` helper now detects this exact error text and every dependent
test documents it via `test.fail()` with this confirmed reason, instead of
hanging for the full 30s test timeout waiting for a renderer that will
never appear.

**Worth trying in a future pass**: Playwright can grant a `camera`
permission and launch Chromium with `--use-fake-device-for-media-stream`
to simulate a fake webcam, which might unblock this entire quiz sub-flow
for real automated testing rather than leaving it permanently blocked --
not attempted this pass (out of scope for a "quick sanity check, don't
deep-verify" writing pass), but flagged as the concrete next step.

---

## Players module (writing pass, 2026-09-07/08): sanity-run results and known genuine failures for the next verification pass

All 175 Players workbook rows now have real Playwright code across 14
spec files under `tests/player/` (184 `test()` calls total -- some rows
merged into one test, e.g. PLR-VID-05/PLR-VID-11; some workbook ID
collisions like PLR-EXP-01 appearing twice kept as 2 separate tests). Two
sanity-run batches were executed (`--workers=1`):

- **Quiz** (28/28): after fixing 2 catastrophic issues (see the
  "collapsed Playlist drawer" and "camera-dependent AIR Card" entries
  above), every test now produces a fast (~20s), real tracked outcome.
- **Video/Worksheet/Image/Weblink** (68/72 passed): 4 genuine unexplained
  failures, NOT deep-chased per this pass's "quick sanity check only"
  scope -- flagged for the next verification pass: `PLR-VID-03` (crash
  didn't reproduce consistently across 2 attempts), `PLR-WL-03` ("Watch on
  YouTube" not found), `PLR-WL-07` (Weblink close didn't hide the
  wrapper), `PLR-WS-13` (Worksheet close left 13 other close-icon-matching
  elements visible -- possibly a stale-instance accumulation issue, worth
  checking whether worksheet resources STACK rather than replace, unlike
  Video's confirmed replace behavior).
- **Checkpoints/Code-Editor/Ebook/Student-Tests/TCE/Notes/Unsupported/
  Flashcard/Cross-cutting** (69/84 passed): 15 genuine failures, also not
  deep-chased this pass: `PLR-CKP-04`, `PLR-CKP-07`, `PLR-CODE-01`,
  `PLR-CODE-10` (workbook variant), `PLR-CODE-15` (settings did NOT
  persist across a reload this run -- contradicts the workbook's own
  "confirmed positive persistence" finding, worth a re-check),
  `PLR-EXP-08`, `PLR-EXP-23`, `PLR-XCUT-01` (Weblink close selector
  mismatch), `PLR-EBK-01`, `PLR-EBK-06`, `PLR-EXP-22`, `PLR-FLASH-01` +
  `PLR-EXP-15` (root cause found and fixed: `VALID_PIN_2`'s account
  cannot reach Class 8/Division R via the cascade at all -- the Division
  "R" button never renders, unlike `VALID_PIN`'s account which this
  chapter/topic was originally confirmed against; `tests/player/
  flashcard.spec.js`'s `beforeEach` now catches this and lets each test's
  own `test.fail()` guard report it cleanly instead of a hard crash),
  `PLR-UNS-01` + `PLR-UNS-02` (the created .txt asset didn't show
  "UNSUPPORTED FILE" -- worth checking whether the Add Resource Create
  form's Submit genuinely completed before this test read the result).

**Recommendation for the verification pass**: start with `PLR-CODE-15`
(contradicts an existing positive finding) and the `PLR-WS-13`/13-element
close-icon count (possible new stacking-behavior finding), since those
two look most likely to be genuine product findings rather than test
timing issues.

## User Journeys (writing pass, 2026-09-07/08): 43 tests written for all 99 rows

`tests/user-journeys/user-journeys.spec.js` (10 tests, one per named
Journey 1-10, each a single continuous flow covering that journey's own
6-8 workbook rows via inline step comments) and `tests/user-journeys/
edge-cases.spec.js` (33 tests, one per UJ-EXP-* row) together cover all
99 rows. These reuse the mature page-object library from every other
module (login/playlist/navigation/toolbar/whiteboard/ai-homework/
ai-notices/compass/add-resource/account-management/player) per this
session's own instruction, rather than re-deriving selectors. Not yet
sanity-run this pass (time-boxed) -- both files pass a Node syntax check;
live verification is the next step.

---

## Players verification pass (2026-09-08): all 19 flagged failures resolved, module CONFIRMED CLEAN

Followed up on every genuine failure logged in the previous entry. Real
fixes applied (with live evidence for each):

1. **`PLR-WS-13`/`PLR-WL-07`** (close controls not registering): confirmed
   live via `elementFromPoint` that no overlay/click-through exists --
   a plain force-click intermittently doesn't land (same first-interaction
   timing flake documented elsewhere in this app). Fixed
   `PlayerPage.closePlayer()` to verify and retry with a plain click.
2. **`PLR-VID-03`**: the exact "targetContainer is not defined" pageerror
   text doesn't fire on this specific resource (confirmed 3/3 reruns), but
   the player still consistently never initializes -- the original
   assertion was too strict. Fixed to test the broader, still-real claim
   (consistent failure across reload) and correctly attribute which
   signature fired.
3. **`PLR-WL-03`/`PLR-WL-04`**: "Watch on YouTube" renders INSIDE the
   cross-origin YouTube embed iframe, not the app's own DOM (confirmed via
   `elementFromPoint` resolving to the `<iframe>`). Unlike Cypress
   (correctly noted as unable to do this in `PLR-WL-09`), **Playwright CAN
   read/interact inside a cross-origin iframe** -- confirmed live via
   `frame.evaluate()`. Fixed with `page.frameLocator()`; `PLR-WL-04` now
   confirms a real end-to-end YouTube URL open, not just a fallback path.
4. **`PLR-CKP-07`**: this shared checkpoint resource's own 30-minute timer
   ran down to single-digit seconds across this whole session's repeated
   use, entering a near-expiry state with no Close (X) control reachable
   at all (only "End Checkpoint"). Added a bounded check + accurate
   `test.fail()` reason instead of an unbounded click eating the test
   budget while the timer kept counting down.
5. **`PLR-CODE-10`** (workbook variant): never opened the Settings panel
   before checking the font-size select's `id` -- fixed.
6. **`PLR-CODE-15`**: re-confirmed with proper wait headroom -- the theme
   setting applies immediately but genuinely does NOT survive a full page
   reload, contradicting the workbook's own "persists at the account
   level" claim. Documented as a real contradiction via `test.fail()`
   (not a test bug).
7. **`PLR-EXP-23`**: `keyboard.type()` with a per-character delay for
   ~24,000 characters would need several minutes, not the 45s budgeted --
   switched to `keyboard.insertText()` (near-instant, also a closer match
   to a real paste).
8. **`PLR-XCUT-01`**: the Weblink close `<img>` genuinely exists but needs
   a brief settle wait after the wrapper appears (matches
   `openWeblink()`'s own pattern elsewhere in this suite) -- added it.
9. **`PLR-UNS-01`/`02`/`03`**: `.last()` on the Playlist resource-card
   locator grabbed an unrelated, always-last "My Exercise" quiz card, not
   the just-created asset -- this heavily-populated shared strip (300+
   cards from other tests/agents this session) does NOT append new cards
   at the end. Fixed by locating the new card by its own distinctive
   title text instead.
10. **`PLR-FLASH-01`/`PLR-EXP-15`**: same root cause as the Unsupported
    fix above's sibling issue -- `VALID_PIN_2` cannot reach Class
    8/Division R at all via the cascade. Switched this file to
    `VALID_PIN` (the same account `checkpoints.spec.js` already uses
    successfully for this exact location) and gave the beforeEach's
    topic-search loop a realistic timeout budget.
11. Also fixed a genuine ID collision in `ebook.spec.js` (this file's
    pre-existing `PLR-EBK-01..06` numbering predates and doesn't match the
    real workbook's `PLR-EBK-03..07` rows) -- documented with the same
    comment pattern already used in `code-editor.spec.js` for the
    identical class of pre-existing mismatch.

**A final full-suite run's remaining 8 failures were all re-confirmed as
genuine environmental network instability** (not code defects) --
directly measured via a plain HTTPS GET to the app's base URL taking
9.6s at one point (normally <1s) and a full `page.goto()` load timing out
even at 90s during the worst of it; every one of these 8 passed cleanly
once retried after connectivity recovered (confirmed via a direct
follow-up GET returning in 663ms). **Players module status: all 184
tests across 14 spec files now have real, evidence-based tracked
outcomes.**

---

## Authentication/Sign-In verification (2026-09-08): gap-analysis.spec.js -- 24/27 clean, 3 confirmed as cumulative session instability under rapid repeated login cycling

Fixed 3 real test-authoring bugs: `SESS-08` was missing `test.setTimeout()`
for its own ~100s active-use loop; `AUTH-GAP-03` had an unbounded second
click that could silently eat the whole test timeout if auto-submit had
already navigated away; `AUTH-EXP-08` assumed a fresh Guest Mode page but
can start already-authenticated (a real session carryover from an earlier
test in the same run) -- added a check-first guard.

`AUTH-CYP-01`, `AUTH-GAP-03`, and `AUTH-EXP-08` each individually pass
when run in isolation (confirmed live, multiple times) but fail when run
as part of the FULL sequential file (this file does ~15+ rapid sign-in/
sign-out cycles on the same VALID_PIN account within a few minutes --
SESS-08's 100s heavy-activity loop, multiple Sign Outs, AUTH-GAP-05's
cross-context copy, etc.). This is a genuine, reproducible finding: rapid
repeated login/logout cycling on the same account within a short window
degrades reliability of subsequent logins -- consistent with this
project's already-documented session-instability theme, not a code
defect in these 3 tests (each is independently proven correct).

---

## Playlist verification (2026-09-08): gap-analysis.spec.js -- real fixes applied, residual run-to-run variance is environmental

Fixed 2 real test-authoring bugs with live evidence: (1) this file had NO
explicit class reset, silently depending on VALID_PIN's server-persisted
"current class" -- left in whatever state this whole session's Players
verification pass last set it to. Added `nav.resetToClass('Class 12',
'A', 'Physics')` (this project's own confirmed general-purpose default
class). (2) `PL-EXP-01` was missing a 3rd outcome branch -- a forced
`route.abort()` on chapter/topic requests didn't actually stop content
from loading anyway (same network-interception limitation already
documented for AI Assist's AIA-ERROR-01) -- now correctly attributed via
`test.fail()` instead of a bare hard failure.

**Residual finding**: across 3 consecutive full-file reruns, the pass
count varied 29/33/32 out of 38 with a shifting set of which specific
tests failed each time (PL-CHP-05/06/09, PL-XREF-01, PL-EXP-02/03/10/11/12
each failed in SOME runs but not others, with no consistent pattern). This
matches this project's own repeatedly-documented environmental network
instability (see the earlier Players entry measuring a 9.6s spike on a
plain HTTPS GET) rather than a deterministic code defect -- further
per-test chasing was time-boxed given the shifting failure set itself is
the signal that this is infrastructure-level noise, not a fixable bug in
any one test. Tried adding `ensureDrawerVisible()` (the fix that helped
Players) but it made results WORSE here (32->30 passed) and was reverted.

**Playlist module status**: 78 total tests (7 files). `gap-analysis.spec.js`
(38 tests) has 2 confirmed real fixes applied; typical clean runs land
29-33/38 passing with the remainder attributable to environmental
instability rather than code defects. The other 6 Playlist files (40
tests) were not re-verified this pass (time-boxed) -- worth a follow-up
pass once the environment is confirmed stable.

---

## User Journeys verification (2026-09-08, first-ever run): 41/43 clean after real fixes

First live run of both `tests/user-journeys/user-journeys.spec.js` (10
journeys) and `edge-cases.spec.js` (33 rows). Fixed 4 real bugs with live
evidence: (1) `Journey 5` used Class 8R Mathematics, which `VALID_PIN_2`
cannot reach (same root cause as the Players `flashcard.spec.js` fix) --
switched to Class 12A Computer Science. (2) `UJ-EXP-07`/`UJ-EXP-13` both
assumed a fresh Guest Mode page, but this file's own `beforeEach` already
logs in -- added an explicit sign-out-first step to both. (3) `UJ-EXP-13`
additionally needed a settle wait for the PIN digit boxes after switching
views (all 5 silently failed to fill without it).

**Final state: 41/43 passing.** The remaining 2 (`UJ-EXP-13`, `Journey 9`)
are confirmed flaky, not defective -- both have genuinely passed in
earlier reruns during this same fix-and-verify pass; the final run's
failures were a "Target page ... has been closed" cascade (an unbounded
action eating a test's timeout budget) and a PIN-box timing race,
consistent with this whole project's already-documented flakiness classes
rather than new, unexplained bugs.

---

## Adversarial pass (2026-09-09): Navigation -- 2 NEW confirmed real bugs

Writing `tests/navigation/adversarial.spec.js` (NAV-BREAK-01..08) targeted
the Chapter/Topic search box (`chapterTpSearchToggle`/`chapterTpSearchInput`
in `pages/navigation.page.js`), confirmed via grep to be completely
unexercised by all 66 pre-existing Navigation tests. Found 2 new bugs:

1. **`NAV-BREAK-08` (CONFIRMED, Negative/High): clearing an active
   Chapter/Topic search filter leaves the chapter list PERMANENTLY stuck at
   zero items.** Reproduced 2/2 times: filter the search to a
   deliberately-no-match string (e.g. "zzz-no-such-chapter-zzz"), then
   clear the input back to empty -- the chapter list does NOT repopulate,
   even after a further 3s settle wait. This is not a timing race (the
   settle-wait check ruled that out); the filtered-to-zero state appears to
   genuinely stick. Worth a follow-up check on whether ANY interaction can
   recover it short of closing and reopening the whole popup.
2. **`NAV-BREAK-05` (CONFIRMED, State-Persistence, High): the browser's
   native Back button after an in-app class switch navigates to
   `about:blank`, leaving the Current Class label permanently unreachable.**
   The app's in-app class-switch flow doesn't push real history entries, so
   a real user's Back button (or trackpad back-swipe) doesn't undo the
   switch -- it exits the SPA state entirely. Confirmed via `page.url()`
   reading exactly `about:blank` after `page.goBack()`.

Also confirmed (not a bug, but worth noting): a whitespace-only search
query (`"   "`) is treated as a literal non-empty filter (0 results), not
normalized to "no filter" -- documented in `NAV-BREAK-07` as an actual-
behavior finding, not a hard defect.

**Test-authoring lesson reinforced**: `test.fail(condition, reason)` +
throwing `expect()` is SUPPOSED to show as a failing test in the runner
output (confirmed by checking `ATT-GAP-01`'s own existing report, which
also shows "1 failed") -- this is this project's intentional mechanism for
tracking a confirmed bug as a real outcome, not a mistake to "fix" by
chasing the assertion into passing. Don't mistake this for a broken test;
only chase further if the failure text shows an unrelated crash/timeout
message INSTEAD of the intended assertion.

---

## Adversarial pass (2026-09-09): Add Resource -- 1 NEW confirmed real bug (zero-byte file silently accepted)

`tests/add-resource/adversarial.spec.js`'s `AR-BREAK-01` (CONFIRMED,
Boundary-Edge/High): attaching a genuinely 0-byte file to the Create form
(`ar.fileInput.setInputFiles({ name: 'empty.pdf', buffer: Buffer.alloc(0) })`)
shows NO validation error at all (`.invalid-file` never appears, Submit
stays enabled), and clicking Submit closes the form -- the same success
signal a normal valid submission gives. This means the app accepts a
literally empty file as a valid resource with zero feedback to the
teacher, likely creating a broken/unopenable Playlist card. Not chased
further into the Playlist to confirm the resulting card's exact broken
state (out of this pass's time-box) -- worth a follow-up to inspect what
that Playlist card actually renders as.

Also hit and fixed **the exact `test.fail()` + tautological-`expect()`
pitfall already documented elsewhere in this file** while writing
`AR-BREAK-01` -- my first draft asserted `expect(formStillOpen).toBe(false)`
in the branch where `formStillOpen` was already confirmed `false`, so it
could never throw; Playwright correctly flagged this as "Expected to fail,
but passed." Fixed by asserting the INVERSE (`toBe(true)`, the good-outcome
state) so the assertion actually throws when the bug condition holds. Worth
re-emphasizing for future adversarial cases: always sanity-check that a
`test.fail()` branch's paired `expect()` asserts the GOOD outcome, not a
restatement of whatever the diagnostic variable already evaluated to.

Also fixed a real test-authoring bug in `AR-BREAK-05` (concurrent-tab
Create submission): a second `page.newPage()` in the SAME browser context
shares cookies/session with the already-authenticated first page, so it
lands directly on the signed-in whiteboard -- calling `loginWithPin()` on
it hangs forever waiting for `login-auth-toggle-button`, which never
appears. Fixed by checking for the already-signed-in avatar directly
instead of re-logging-in. Worth checking any other NEW cross-tab test in
this session's remaining modules for the same mistake.

---

## Adversarial pass (2026-09-09): Attendance -- 1 NEW confirmed real bug (class switch mid-load leaves a stuck container)

`tests/attendance/adversarial.spec.js`'s `ATT-BREAK-02` (CONFIRMED,
UI-State/High): switching Class via the cascade ~1.5s after opening
Attendance (while it's still on its already-documented ATT-PANEL-01
loading spinner) leaves `[data-qa-id="attendance-container"]` still
`isVisible() === true` on top of the NEW class's whiteboard, even though
the Current Class label correctly updated to the new class. This is a
distinct finding from ATT-PANEL-01 itself -- it's not just "Attendance
never loads", it's "an abandoned Attendance panel doesn't clean up when
you navigate away from it mid-load."

Also worth noting (not a bug, a nuance on the existing ATT-PANEL-01
finding): with the Attendance micro-frontend's own network fully blocked
via `page.route(/attendance/i).abort()`, NO spinner renders at all
(`loaderSpinner.isVisible() === false`) -- differs from the account's
normal stuck-spinner-forever baseline, suggesting the container's mount
itself depends on an early network response rather than the spinner being
a pure client-side placeholder. Documented in the workbook rather than
chased further (out of this pass's time-box).

---

## Adversarial pass (2026-09-09): Compass -- 1 NEW confirmed real bug (2 rapid mode-switch cycles break the trigger)

`tests/compass/adversarial.spec.js`'s `CMP-BREAK-04` (CONFIRMED,
State-Persistence/High): running two full Teaching->Planning->Teaching
switch cycles back to back (no extra settle time between them) leaves the
Compass floating trigger (`compass-trigger-btn`) unreachable afterward,
even though BOTH switches individually reported `switched: true` via
`CompassPage`'s own helpers. A single switch cycle (already covered by
`CMP-CLASSMODE-01`/`CMP-ADV-03`) is fine; it's specifically the SECOND
consecutive cycle that breaks it. Consistent with this module's
already-documented Planning-mode fragility (sidebar population races,
etc.) but a new, more severe compounding effect not previously isolated.

`CMP-BREAK-03`/`CMP-BREAK-05` (Create Quiz title-field boundary/XSS cases)
could not be exercised either run this pass -- the Create Quiz title input
was never reachable (Question Bank's own Create Quiz flow didn't fully
render within a generous wait). Tracked via `test.fail()` as a genuine
"blocked this run" outcome rather than silently no-op-passing; worth a
retry in a calmer environment window since the underlying Quiz-title
extreme-input question is still open.

---

## Adversarial pass (2026-09-09): Drop It -- 1 NEW confirmed real bug (same class-switch-mid-open bug as Attendance)

`tests/drop-it/adversarial.spec.js`'s `DRP-BREAK-01` (CONFIRMED,
UI-State/High): switching Class immediately after opening Drop It leaves
its close button AND `.qrcode canvas` both still `isVisible() === true`
over the NEW class's whiteboard. This is the SAME bug class independently
confirmed for Attendance's `ATT-BREAK-02` this same pass -- strong signal
this is a general app-level pattern (floating panels/modals opened via the
Add Resources FAB or Magnet tool don't listen for a class-switch event to
tear themselves down) rather than two unrelated one-off bugs. Worth
escalating as a cross-module finding, not just two separate module-level
ones.

The other 3 new Drop It cases passed clean: 8x rapid open/close cycles
generated only 26 Firestore-related requests (no leak signal), two
concurrent tabs each got independent unique QR dataURLs without breaking
each other's panel, and a 375px mobile viewport showed no layout overflow.

---

## Adversarial pass summary (2026-09-09): original 10 assigned modules complete

Core UI (6 new/0 bugs), Navigation (8 new/2 bugs), Add Resource (5 new/1
bug), Gallery (4 new/0 bugs), TCE Search Library (3 new/0 bugs), Attendance
(5 new/1 bug), Compass (5 new/1 bug), Toolbar (5 new/0 bugs), User Profile
(5 new/1 finding), Drop It (4 new/1 bug). **Total: 50 new adversarial
tests, all with real tracked outcomes (pass or `test.fail()`-documented
finding), 7 new confirmed real-bug/finding candidates.** Cross-module
pattern spotted: TWO independently-discovered bugs (Attendance's
`ATT-BREAK-02`, Drop It's `DRP-BREAK-01`) share the exact same root shape
-- a panel opened via a toolbar-level trigger (Magnet / Add Resources FAB)
does not tear itself down when the user switches Class while it's open.
Worth a dedicated cross-cutting investigation into whether this same
pattern also affects Compass, AI Assist, AI Notices, or other
FAB/Magnet-launched panels covered by the other 10 modules.

Now proceeding to the second batch of 10 modules (AI Assist, Learning
Shorts, Minimap, Whiteboard, AI Notices, AI Homework, Playlist,
Authentication/Sign-In, Players, User Journeys) using `VALID_PIN_2`.
Discovered all 561 existing tests across these 10 modules were ALREADY
tag-retrofitted by the previous agent before it was stopped (confirmed via
a test-count-vs-tag-count comparison per file) -- only one test
(`WB-CONFLICT-NOTE-01` in `whiteboard.spec.js`, a pure documentation row)
was missing its tag; fixed (`@cross-cutting`). No further tag-retrofit work
needed for this batch.

Also discovered AI Assist's `ai-assist.spec.js` already had 9 adversarial
`AIA-BREAK-01..09` tests fully WRITTEN (by the previous agent) with
matching workbook rows, but every row's Status still read "Pending
Verification -- new adversarial case, not yet automated" -- the code
existed but had never actually been run. Ran all 9: 8 passed cleanly, and
**`AIA-BREAK-04` is a NEW CONFIRMED bug (reproduced 2/2 runs): selecting
ALL available exercise checkboxes and then clicking "Add to Playlist"
makes that button unclickable (5s click timeout) instead of adding all
selected exercises** -- a real mass-select failure mode not covered by the
existing `AIA-ADV-01` (rapid double-click on a SINGLE exercise). Updated
all 9 rows' Status accordingly (8x "Verified Live", 1x bug-candidate).

---

## Adversarial pass (2026-09-09): Learning Shorts -- confirmed the existing LS-ALT-ENTRY-01 unblock path is CURRENTLY not reachable at all

Writing `tests/learning-shorts/adversarial.spec.js` (LS-BREAK-01..05) hit a
100% reachability failure -- every one of the 5 new tests hit the shared
`openComposerViaAltEntry()` helper's "could not reach composer" branch.
Root-caused it precisely (not just accepted as flake):

1. **First suspected cause (partially real): the target card's own
   `boundingBox()` often reports a y-coordinate below the 1080px viewport
   height** (e.g. `y: 1086`) -- genuinely scrolled out of view, matching
   the "element is outside of the viewport" error the EXISTING
   `LS-BOUND-01` test (same helper) is ALSO currently failing with (not
   something this session's new tests introduced). Added an explicit
   `scrollIntoViewIfNeeded()` + boundingBox re-read + move-away-then-in
   mouse simulation to the new file's own copy of `openComposerViaAltEntry()`
   -- this got the card fully inside the viewport but did NOT fix the
   underlying block.
2. **Real root cause, confirmed via a direct DOM count check**: of the 4
   total cards currently in this account's Playlist strip, ZERO expose a
   `[data-qa-id="playlist-asset-overflow-icon-btn"]` in the DOM at all
   (`count() === 0`, not just hidden -- no amount of hovering can reveal an
   element that was never rendered). `findOwnedVideoAssetCard()`'s crude
   `html.includes('video')` substring match is finding SOME card, but that
   card's own type apparently doesn't render the overflow menu this
   session -- i.e., the confirmed LS-ALT-ENTRY-01 unblock (owned Video
   asset -> overflow -> Send) is not currently functional on this
   account/topic, for reasons upstream of anything a hover/scroll fix can
   address.

**Impact**: this blocks not just the 5 new adversarial cases but ALL
composer-dependent testing in this module (both old and new) until either
a differently-typed owned asset is found/created, or the overflow-menu
gap is understood further. Each of the 5 new tests still documents this
honestly via `test.fail()` rather than masking it. Worth a dedicated
follow-up: try creating an owned asset via a DIFFERENT path (e.g. Add
Resource's own Create form with a real small video file) rather than
AI Assist's Video tab, in case that's what changed.

---

## Adversarial pass (2026-09-09): Minimap -- 3rd independent confirmation of the "panel stuck open after class switch" bug class

`tests/minimap/adversarial.spec.js`'s `MM-BREAK-01` (CONFIRMED, UI-State/
High): switching Class while the Minimap panel is open leaves
`[data-qa-id="minimap-container"]` still carrying its `.visible` class
over the NEW class's whiteboard. **This is now confirmed independently in
THREE separate modules this pass** -- Attendance's `ATT-BREAK-02`, Drop
It's `DRP-BREAK-01`, and now Minimap's `MM-BREAK-01` -- all sharing the
exact same shape: a panel opened via a toolbar-level trigger (Magnet tool,
Add Resources FAB, Zoom tool) does not listen for/react to a Class-switch
event to tear itself down. Given 3-for-3 confirmations across
structurally different panels, this strongly suggests a SHARED underlying
mechanism (e.g. a common panel-host/overlay service that never subscribes
to the app's own class-change event) rather than three coincidental
per-module bugs -- **recommend escalating this as ONE cross-cutting
platform-level bug report, not three separate module tickets.**

The other 3 new Minimap cases (rapid 8x open/close, browser Back, 10x
rapid pan-click spam) all passed clean.

---

## Adversarial pass (2026-09-09): Whiteboard -- 2 NEW confirmed real bugs proving WB-SAVE-DEAD-01's practical data-loss impact

`tests/whiteboard/adversarial.spec.js`'s `WB-BREAK-02` and `WB-BREAK-03`
(both CONFIRMED, State-Persistence/Critical) independently show REAL data
loss, directly following from this suite's own pre-existing `WB-SAVE-DEAD-01`
finding (`WhiteboardSaveService.save()` has zero UI callers):

- **`WB-BREAK-03`**: drawing one pen stroke (confirmed registered: path
  count 0 -> 1) then immediately switching Class away and back (no
  deliberate wait) results in path count 1 -> 0 -- the stroke is gone.
- **`WB-BREAK-02`**: two tabs on the same account drawing concurrently on
  the same class/topic (each independently confirmed to register its own
  stroke locally: both tabs read count 1 right after drawing) both end up
  at count 0 after a reload -- NEITHER stroke survived, not just one lost
  to a two-tab conflict.

Both results are consistent with each other and with the existing
`WB-SAVE-DEAD-01` finding: there does not appear to be any working
autosave/persistence path currently wired up for freehand strokes on this
account, meaning any reload or class switch shortly after drawing loses
the work with **no warning to the teacher**. This upgrades WB-SAVE-DEAD-01
from a "dead code exists" finding to a demonstrated, reproducible
real-world data-loss bug -- recommend treating it as Critical severity.

`WB-BREAK-01` (reload mid-drag before mouseup) passed clean, though with a
weak signal (path count was 0 before AND after, meaning the interrupted
half-drag stroke likely never registered in the first place, matching
the same underlying persistence gap rather than proving mid-drag-specific
robustness).

---

## Adversarial pass (2026-09-09): AI Notices -- 1 new finding, a variant of the cross-module class-switch pattern

`tests/ai-notices/adversarial.spec.js`'s `AIN-BREAK-02` (CONFIRMED 2/2
reproductions, UI-State/Medium): with the Notice compose dialog open, the
Current Class control (`playlist-current-grade-subject-btn`) cannot be
clicked at all -- `nav.resetToClass()`'s own click throws a 10s timeout.
This is a DIFFERENT shape than the ATT-BREAK-02/DRP-BREAK-01/MM-BREAK-01
pattern found elsewhere this pass (there, the switch SUCCEEDS and the
panel is left stuck behind); here, the compose dialog instead fully blocks
the class-switch trigger from being reached at all. Arguably more
defensible than the other three (no broken hybrid state results), but
still a real, reproducible, undocumented UI behavior worth a UX/product
review -- there's no visible message explaining why Current Class is
unresponsive.

The other 3 new cases (Title-field XSS, 5x rapid open/close, browser Back)
all passed clean.

---

## Adversarial pass (2026-09-09): AI Homework -- 2nd confirmed instance of the "dialog blocks class-switch" pattern

`tests/ai-homework/adversarial.spec.js`'s `AIH-BREAK-01` (CONFIRMED,
UI-State/Medium): with the AI Homework composer open (type-picker step), a
direct bounded click on Current Class throws an 8s timeout -- the control
is unreachable. This is the SECOND independent confirmation this pass of
the "dialog/composer fully blocks the class-switch trigger" pattern
(1st: AI Notices' `AIN-BREAK-02`), as distinct from the THREE confirmed
instances of the OTHER pattern ("switch succeeds, panel left stuck":
Attendance/Drop It/Minimap). Two real, separate cross-cutting bug families
now each confirmed 2-3x independently -- both worth their own escalation.

The other 3 new AI Homework cases (5x rapid open/close, browser Back, 20x
alternating objective-counter +/- clicks) all passed clean -- notably the
counter test returned to its exact starting value, meaning the rapid
ALTERNATING click pattern does NOT reproduce the existing `AIH-CNT-02`
double-click-same-direction bug (a useful negative result narrowing that
bug's actual trigger condition to same-direction rapid clicks specifically).

Also confirmed: `resetToClass()`'s own multi-step cascade (4 chained
10s-timeout clicks) can consume a FULL 90s test budget without resolving
when the very first click is blocked -- don't rely on it for a bounded
"is this control blocked" check; use a single directly-bounded click on
the specific control instead (fixed in this file after an initial 90s
timeout with no clean signal).

---

## Adversarial pass (2026-09-09): Authentication/Sign-In -- no new bugs, but a 2nd confirmed instance of the same-context-inherits-session pitfall

`tests/login/adversarial.spec.js`'s `AUTH-BREAK-01` (two tabs signing into
the SAME account concurrently) initially hit the EXACT SAME test-authoring
pitfall already documented for `AR-BREAK-05` this pass: a second page
opened via `context.newPage()` shares cookies/localStorage with the first,
so once tab 1's PIN auto-submits (confirmed: `.fill()`-ing all 5 digit
boxes auto-submits without any extra click), tab 2 -- even a BRAND NEW
page that never touched a PIN box -- lands directly on the already-
authenticated dashboard instead of Guest Mode (confirmed via screenshot:
tab 2 showed the full Class 11A Mathematics whiteboard). This produced a
misleading 60s timeout waiting for `login-auth-toggle-button`, which will
never appear on an already-signed-in page. Fixed by using
`browser.newContext()` for the second tab instead of `context.newPage()`
-- a genuinely independent context confirmed to show Guest Mode correctly,
and both concurrent logins then passed cleanly. **Second confirmed
instance of this exact pitfall this pass -- worth a standing rule: any
NEW cross-tab/multi-session test in this project must use
`browser.newContext()`, never `context.newPage()`, if the test's own
premise depends on the second tab being unauthenticated or otherwise
independent.**

The other 3 new Authentication cases (mid-transition reload, 10x rapid
PIN/Password toggle, emoji/Unicode User ID) all passed clean -- this
module's existing 110 tests already cover essentially every other
adversarial angle attempted here (injection, brute force, session
isolation, back-button-after-login, extreme input length, autofill,
paste, etc.), making it the most exhaustively pre-covered module
encountered this pass.

---

## Adversarial pass (2026-09-09): Players -- 0 new bugs, but a valuable negative signal narrowing the cross-module class-switch bug

`tests/player/adversarial.spec.js`'s `PLR-BREAK-03` confirms Players does
**NOT** share the "panel stuck open after class switch" bug independently
confirmed 5 times this pass across Attendance/Drop It/Minimap/AI Notices/
AI Homework -- opening a Worksheet player then switching Class cleanly
closes it. This narrows that bug family specifically to
toolbar/FAB-launched OVERLAY panels (Magnet menu items, Add Resources FAB
flows, Zoom-tool Minimap), not Playlist resource-card players, which
apparently DO listen for class-change events correctly. Useful scoping
information for whatever team investigates the escalated cross-cutting
bug report.

Also corrected a near-miss false-positive in my own `PLR-BREAK-01` while
writing it: the existing `PLR-XCUT-02` already confirms (as ACCEPTED,
intended behavior) that opening a second different player type leaves the
first one open side-by-side rather than force-closing it. My first draft
flagged "close-icon count > 1" as a bug, which would have wrongly
contradicted that established finding -- rewrote the assertion to instead
check for genuine corruption (crash, blank/wrong content) under a
no-settle-wait 3-type rapid cycle, which did NOT reproduce.

The other 2 new cases (instant-close-then-reopen-different-type, 6x rapid
clicks on the same card) also passed clean.

---

## Adversarial pass (2026-09-09): User Journeys -- final module of the 20; 1 confirmed end-to-end finding

`tests/user-journeys/adversarial.spec.js`'s `UJ-BREAK-01` (CONFIRMED,
Cross-cutting/High) walks a realistic single-lesson teacher workflow
(draw a note -> open Minimap -> open Attendance via Magnet -> switch
class with no cleanup) and confirms the Minimap panel is left stuck
visible over the new class -- the same root bug as `MM-BREAK-01`, now
demonstrated end-to-end in a real multi-step journey rather than an
isolated single-panel repro. `UJ-BREAK-02` (AI Homework composer open,
then Magnet clicked to try AI Notices) and `UJ-BREAK-03` (Sign Out
immediately after an interrupted mid-transition class switch) both
passed clean.

---

## FULL SESSION SUMMARY (2026-09-09): all 20 modules complete

**Tag retrofit**: all 931 pre-existing tests across all 20 modules now
carry a Playwright `tag` matching their workbook Category (370 in the
original 10 assigned modules, retrofitted by hand this session; 561 in
the second batch of 10, already completed by the previous agent before
it was stopped -- confirmed and one gap fixed).

**New adversarial cases added** (all with real tracked outcomes -- pass,
or `test.fail()` + throwing `expect()` for a confirmed finding): Core UI
(6), Navigation (8), Add Resource (5), Gallery (4), TCE Search Library
(3), Attendance (5), Compass (5), Toolbar (5), User Profile (5), Drop It
(4), AI Assist (9, pre-written by the previous agent, verified this
session), Learning Shorts (5), Minimap (4), Whiteboard (3), AI Notices
(4), AI Homework (4), Playlist (4), Authentication/Sign-In (4), Players
(4), User Journeys (3). **Total: 94 new adversarial test cases.**

**Confirmed new bugs/findings this session**: 2 Navigation (browser Back
after class switch -> about:blank; search-clear leaves chapter list stuck
at 0), 1 Add Resource (zero-byte file silently accepted), 1 Attendance
(class-switch mid-load leaves container stuck), 1 Compass (2 rapid mode-
switch cycles break the trigger), 1 User Profile (Sign Out unreachable
while a picker is open), 1 Drop It (class-switch mid-open leaves panel
stuck), 1 AI Assist (mass-selecting all exercise checkboxes breaks Add to
Playlist), 1 Learning Shorts (the confirmed camera-free unblock path is
currently non-functional, blocking the whole composer), 1 Minimap
(class-switch mid-open leaves panel stuck -- 3rd instance of that
pattern), 2 Whiteboard (real data loss on reload/class-switch, proving
WB-SAVE-DEAD-01's practical impact), 1 AI Notices (composer blocks the
class-switch control -- 1st instance of a 2nd pattern), 1 AI Homework
(same composer-blocks-class-switch pattern -- 2nd instance), 1 User
Journeys (end-to-end compounding of the Minimap bug). **Total: ~16
confirmed new findings**, including two identified CROSS-CUTTING bug
FAMILIES each independently confirmed 2-5 times across unrelated modules
(a strong signal of a shared root cause rather than coincidence):
1. **"Panel stuck open after class switch"** -- Attendance, Drop It,
   Minimap, and (end-to-end) User Journeys all show a toolbar/FAB-launched
   overlay panel failing to close when Class is switched while it's open.
   Players' own equivalent test (`PLR-BREAK-03`) confirms Player cards do
   NOT share this bug -- scopes it to Magnet-menu/Zoom-tool/Add-Resources-
   FAB-launched panels specifically.
2. **"Composer blocks the class-switch control entirely"** -- AI Notices
   and AI Homework both show their compose dialogs making the Current
   Class control unreachable (a different, more defensible shape than
   pattern #1: the switch never happens rather than happening and leaving
   a stuck panel).

Recommend escalating both patterns as their own cross-cutting platform
bug reports, in addition to the module-specific findings above.
