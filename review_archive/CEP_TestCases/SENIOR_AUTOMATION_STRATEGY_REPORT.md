# CEP Playwright Suite — Senior Automation Engineer Strategy & Gap Analysis

**Scope of this document**: analysis and strategy only. No Playwright code, page objects, or
scripts are proposed here — see `AUTOMATION_REVIEW.md` (architecture/quality) and
`DATA_QA_ID_GAPS.md` (locator instrumentation asks) for the two existing companion reports this
one builds on and cross-references rather than repeats. Source inputs: the full
`D:\Projects\client-playwright-automation` codebase (87 spec files, 15 page objects, fixtures,
config), all 20 `CEP_TestCases/*.xlsx` workbooks, `00_PROGRESS_PLAN.md`, `LIVE_FINDINGS.md`,
`TEST_SUITE_GAP_ANALYSIS.md`, and a Zoho Sprints export (`ItemExport_50966000002530901.xlsx`,
1,037 tracker items, 693 of them `Bug`-type, spanning two Zoho projects — "Teacher Connect (New)"
and "CE6 WEB Revamp") supplied as historical defect intelligence.

---

## 1. Executive Summary

This suite is, in absolute terms, unusually mature for its size — `AUTOMATION_REVIEW.md` already
says so correctly, and nothing found here overturns that. But "do we have enough coverage to
release with confidence" is a different question from "is this a well-built suite," and the
honest answer to the confidence question is **not yet, in three specific, fixable places**:

1. **The historical-defect data and the automated-test data don't point at the same modules.**
   Cross-referencing 693 historical bugs against the current suite's spec-file/test-count
   footprint (Section 21) surfaces a real mismatch: **Checkpoints carries the single largest
   historical defect load of any feature (101 bugs) but has only 19 automated tests** — the
   thinnest ratio of defect-history to test-count anywhere in the suite. **Attendance has 91
   historical bugs and a live-confirmed, still-reproducing CRITICAL blocker** (`ATT-PANEL-01`,
   `LIVE_FINDINGS.md`) that would fail a teacher every single time they tried to take attendance —
   this alone should gate release today, independent of anything else in this report.
2. **A large share of the historical bug population is visual/layout defects (broken images,
   overlapping elements, misalignment, z-index stacking) that a functional-assertion suite
   structurally cannot catch**, and this suite has **zero visual regression tooling** (no
   screenshot-diffing, no `toHaveScreenshot()` baseline anywhere). This is not a coverage gap that
   more `test()` cases fixes — it needs a different tool, and Section 14 sizes exactly how much of
   the historical bug population this affects.
3. **A meaningful slice of the highest-defect-density feature (Checkpoints/Compass-Reports) lives
   in Planning mode**, which this suite is explicitly and deliberately restricted away from
   (`00_PROGRESS_PLAN.md`'s "Teaching mode only" scope decision) and which has **zero
   `data-qa-id` attributes anywhere** (`DATA_QA_ID_GAPS.md`). Regressions there are currently
   invisible to this automation by design, not by oversight — worth a deliberate go/no-go decision
   with the client rather than leaving it as an unstated gap.

None of this means start over. It means: don't sign off on release readiness using test-count or
"1,016 automated cases" as the headline metric (that number is itself internally inconsistent —
see Section 30), and specifically close the Checkpoints/Attendance/visual-regression gaps before
trusting this suite as a release gate. Sections 19-24 turn this into a concrete matrix and phased
roadmap.

---

## 2. Application Understanding

CEP ("ClassEdge / Tata ClassEdge School") is a teaching application for classroom teachers,
delivered as a Windows Electron desktop client wrapping an Angular web app
(`https://ce-qa-school.devstudi.com/teach/`). The client's own shell window is chrome only; the
real teaching surface lives inside a `<webview>` the app creates and navigates client-side.

Two structurally separate experiences exist inside the same login:

- **Teaching mode** — the day-to-day, in-classroom surface this entire automation suite targets:
  pick a class → navigate curriculum → open/use resources → annotate on a whiteboard → use
  cross-cutting tools (Attendance, AI Notices, AI Homework, Learning Shorts — all gated behind one
  shared "Magnet" toolbar entry point) → Compass (AnalyseIt/ExploreIt/Revision Tests) → Drop
  It/Gallery/AI Assist/TCE Search Library/Minimap/User Profile.
- **Planning mode** — a structurally distinct app (`/plan/#/canvas`, a different Angular/Nebular
  shell) reached via a mode toggle, used for authoring content (Question Bank, Checkpoint
  creation/editing, Content Library). This suite deliberately excludes it per an explicit scope
  decision, and it has **zero** `data-qa-id` instrumentation anywhere in its DOM
  (`pages/compass.page.js` comments, confirmed via a full-page attribute scan).

The 18 client-named modules plus Core UI (supplementary) and User Journeys (cross-cutting,
synthesized) give 20 total workbooks/coverage areas — this is the scope boundary used everywhere
below.

---

## 3. Reconstructed Application Flow

Derived from the actual Playwright automation (page objects + fixtures), not just the client's
feature list:

```
Sign-In (PIN or Password, School lookup)
  -> Grade / Subject / Division cascade (Recent Classes | All My Classes)
      -> Chapters / Topics popup (Table-of-Contents / Contents drawer)
          -> Playlist strip (resource cards, E-Books, Filters)
              -> Resource Player (Quiz | Video | Worksheet | Image | Weblink |
                                   Code Editor | Ebook | Checkpoint | Flashcard |
                                   Student Test | TCE | Notes | Unsupported)
              -> Whiteboard (Toolbar: Pen/Shapes/Eraser/Text/Background/Zoom/Widgets;
                             annotations persist per teacher account, not just per session)
      <-> Magnet toolbar icon (per-account/class-teacher-assignment gated) -->
              Attendance | AI Homework | AI Notices | Learning Shorts
      <-> Compass floating trigger --> AnalyseIt | ExploreIt | Revision Tests
      <-> Add Resource "+" --> Create | Library (TCE Search Library) | Gallery |
                                Drop It | AI Assist | Whiteboard-action cards
  -> User Profile (avatar -> "Signed in as" -> chevron) --> Account/Profile tabs,
     Change Password, Change PIN, Sign Out (immediate, no confirm dialog)

  [separately, out of this suite's scope:]
  Classroom-Mode toggle -> Planning mode (/plan/#/canvas)
      -> Question Bank (Create Quiz / Create Revision Test / Create Question)
      -> Checkpoint authoring/editing
      -> Content Library
```

Key state/entry-point facts that shape everything downstream in this report:

- **Magnet is a single shared gateway to four otherwise-unrelated modules** (Attendance, AI
  Homework, AI Notices, Learning Shorts) and is itself account/class-teacher-assignment gated —
  it was "never sighted" across 9+ class/subject combinations before being found via direct DOM
  inspection (`00_PROGRESS_PLAN.md`). Any Magnet-level regression silently takes out four modules
  at once, not one.
- **Current class/chapter/topic and the whiteboard's own drawn content are server-persisted per
  teacher account**, not per-session — this is confirmed both by the automation's own
  `resetToClass`/`ensureResourcesPresent` defensive helpers (`AUTOMATION_REVIEW.md`) and by real
  found bugs (Whiteboard History leaking across classes, content not refreshing on
  class/subject switch — Section 12).
- **Sign-Out is immediate with no confirmation step** — a one-click, unrecoverable action from
  mid-lesson (`LIVE_FINDINGS.md`).

---

## 4. Existing Playwright Automation Assessment

Full architecture/quality review already exists in `AUTOMATION_REVIEW.md` — summarized here
rather than repeated, with this report's own additions where the historical-bug lens changes the
picture.

**What's genuinely strong** (do not regress on any of this while closing gaps below):
traceability (workbook row ⇄ spec ID, 17/20 modules at 100%), a real Page Object Model with
centralized `data-qa-id`-first locators, secrets hygiene, root-cause documentation culture
(`LIVE_FINDINGS.md`, `moduleClassMap.js`'s structured `knownIssues`), and targeted (not blanket)
retries for diagnosed flakes.

**What's structurally weak, independent of any single test's quality**:

- **One shared live QA account, `workers: 1` forced globally** — correct given the constraint,
  but it means the entire suite's realistic parallelism ceiling is 1, and a full run takes
  "hours" (README) because every single test does a full Electron relaunch + fresh login
  (`fixtures/electron-app.js`). This is a release-cadence risk, not just a runtime annoyance: a
  suite that takes hours to run end-to-end is one that, in practice, doesn't get run before every
  release without CI to carry the wait.
- **No CI/CD anywhere** — 1,000+ tests exist and only run when a person manually invokes them on
  one machine. There is currently no mechanism by which a regression gets caught automatically
  before it reaches a real classroom.
- **Desktop-client mode (the current, correct way of exercising the real app) has only been
  pilot-run on 2 of 20 modules** (`pin-login.spec.js`, `add-resource/`) per the README's own
  "Known follow-ups" — the other ~85 spec files have not yet been confirmed to behave the same
  way inside the real Electron `<webview>` as they did in the legacy browser-mode runs their
  pass/fail history is based on. Treat every module's "Verified Live" claim below as *browser-mode
  verified* unless stated otherwise, until this pilot is extended.
- **Zero visual regression coverage** (Section 14) against a historical bug population where
  visual/layout defects are the largest single category.

---

## 5. Application Module Breakdown

| # | Module | Purpose (teacher outcome) | Business Importance | Key Dependencies | Automated Spec Coverage | Historical Zoho Bugs¹ | Risk | Priority |
|---|---|---|---|---|---|---|---|---|
| 1 | Authentication/Sign-In | Get into the app at all | Every other module depends on this | None (entry point) | 12 files, ~119 tests — deepest single-module coverage in the suite | 79 (+ share of 68 Unclassified) | High (session/re-login state loss confirmed, Section 12) | **P0** |
| 2 | Grade/Subject/Division | Pick the right class to teach | Gate to all curriculum content | Authentication | 7 files, ~80 tests | 14 | Medium | **P0** |
| 3 | Playlist | Find/open the right resource for the lesson | Core lesson-delivery surface | Grade/Subject/Division | 8 files, ~83 tests | **108 — largest historical bug volume of any module** | High (content persistence/refresh bugs recur across 6+ specific defects) | **P0** |
| 4 | Add Resource | Bring outside content into a lesson | Frequent, discretionary but common | Playlist | 5 files, ~53 tests | 2 (direct) — likely undercounted, see Section 30 | Medium | P1 |
| 5 | Toolbar | Annotate while teaching | Used in nearly every lesson | Whiteboard | 11 files, ~72 tests | 16 | Medium | P1 |
| 6 | Compass | AI-assisted analysis/revision widgets | Value-add, not core-path | Playlist, Grade/Subject/Division | 2 files, ~37 tests (Teaching-mode only — Planning-mode Question Bank origin of some findings is out of scope) | 15 (Compass) + 16 (Compass-Reports, **not in any current spec file at all**) | High for Reports specifically | P1 |
| 7 | Players | Deliver every resource type to students | Core lesson-delivery surface | Playlist | 15 files, ~184 tests — largest file count of any module | 101 (Checkpoint) + 26 (Quiz) + 21 (Code Editor) + 6 (Worksheet) = **155, and Checkpoint alone (101) is the single highest historical-defect feature in the whole app** against only 19 Checkpoint tests | **Critical** (see Section 21) | **P0** |
| 8 | Whiteboard | The persistent teaching canvas | Core, used continuously through a lesson | Toolbar | 2 files, ~28 tests (deliberately tested last per client) | **51 — 2nd-largest historical bug volume**, several about content/annotation not persisting or restoring correctly | High | **P0** |
| 9 | AI Assist | AI-generated exercises/videos/tips | Value-add | Add Resource, Playlist | 1 file, 33 tests | 3 | Low-Medium | P2 |
| 10 | AI Notices | Compose/send a notice from captured whiteboard text | Occasional but classroom-visible when broken | Magnet, Whiteboard | 2 files, ~26 tests | 3 (+ share of Magnet-Entry) | Medium | P1 |
| 11 | Attendance | Take attendance during class | Daily, mandatory teacher workflow | Magnet | 2 files, ~40 tests | **91 — 3rd-largest historical bug volume, and a CRITICAL blocking bug is live-confirmed still present today** (`ATT-PANEL-01`) | **Critical** | **P0** |
| 12 | Drop It | Pair a student device, transfer a file | Occasional, device-dependent | Add Resource | 2 files, ~22 tests | 3 | Low | P2 |
| 13 | Gallery | Browse/insert stock images | Occasional | Add Resource | 2 files, ~25 tests | 0 directly classified | Low | P3 |
| 14 | Learning Shorts | Record a short video during class | Occasional, camera-dependent | Magnet | 2 files, ~27 tests | 0 directly (1 folded into Magnet-Entry) | Low-Medium | P2 |
| 15 | Minimap | Whiteboard overview/navigation aid | Rare | Toolbar | 2 files, ~25 tests | 0 directly classified | Low | P3 |
| 16 | TCE Search Library | Search a shared content library | Frequent, feeds Add Resource | Add Resource | 2 files, ~32 tests | 2 | Low | P2 |
| 17 | User Profile | Manage account, change password/PIN | Occasional but security-relevant | Authentication | 3 files, ~59 tests | 1 (direct) — likely undercounted, see note in Section 21 | Medium | P1 |
| 18 | AI Homework | Compose/assign AI-generated homework | Frequent, high visibility to students/parents | Magnet, Compass (Assignment list) | 2 files, ~31 tests | 3 (direct) but **most of Magnet-Entry's 26 bugs are actually AI-Homework-generation defects** (Section 21) | High | **P0** |
| — | Core UI | Chrome: logo, version, date/time, toolbar toggle | Supplementary | None | 2 files, ~19 tests | 5 | Low | P3 |
| — | User Journeys | Cross-module, end-to-end teacher flows | Validates real business workflows, not individual screens | All of the above | 3 files, ~47 tests, 43 distinct journeys named | N/A (synthesized, not independently sourced) | High (this is where cross-module regressions actually surface) | **P0** |

¹ Bug counts are from this report's own Epic+keyword classification of the 693 Zoho `Bug`-type
items (Section 10 methodology) — treat as directionally strong, not a certified exact count; see
the caveats in Section 30.

---

## 6. Existing Coverage Analysis

Two independent measurements exist and roughly agree, which is itself a useful cross-check:

- **Manual test-case design** (`TEST_SUITE_GAP_ANALYSIS.md`): 969 documented test cases across 20
  workbooks, split 254 Positive / 241 Negative / 168 Edge-Boundary / 145 UI-State / 77 Security (per
  its own summary table — treat the 969 vs. 951-vs-1,045 discrepancy noted in `00_PROGRESS_PLAN.md`
  and `AUTOMATION_REVIEW.md` as a live documentation-hygiene issue, not resolved as of this report).
- **Automated Playwright tests**: 87 spec files, ~1,016-1,030 `test()` calls (README's claimed
  figure roughly matches this report's own grep-based count), with 17/20 modules' IDs traced
  1:1 to a workbook row (`AUTOMATION_REVIEW.md`'s traceability audit).

**What is actually protected today** (highest confidence): PIN/password sign-in core paths,
Grade/Subject/Division cascade, Playlist core browse/open, Quiz/Video/Worksheet/Image/Weblink
player launch and close, Toolbar's 12 named tools, Whiteboard drawing/erase/text/dock, AI
Homework's full generate-to-assignment-form flow, AI Notices' drag-select-OCR-compose flow,
Compass's Teaching-mode AnalyseIt/ExploreIt, User Profile's Change Password flow, and 43 named
cross-module User Journeys.

**What is nominally covered but weakly protective** (a passing test today would not reliably
catch a real regression): anything asserting only element visibility rather than a completed
business outcome (flagged generally in the master prompt's own Section 11 principle, and
concretely true of several `[class*="..."]`-based checks catalogued in `DATA_QA_ID_GAPS.md` —
a locator that quietly starts matching zero elements after a refactor produces a clean skip/fail
that looks identical to "feature removed," not "feature broken").

---

## 7. Coverage Gap Analysis

Concrete, evidenced gaps — not hypothetical ones:

| Gap | Evidence | Why it matters |
|---|---|---|
| **Checkpoints under-tested relative to its own defect history** | 19 tests vs. 101 historical bugs (Section 21) | Highest-value gap in the entire suite to close |
| **Planning mode has zero automated coverage and zero `data-qa-id`** | `00_PROGRESS_PLAN.md` scope restriction; `DATA_QA_ID_GAPS.md` finding #2 | A meaningful share of Checkpoint/Compass-Reports historical defects originate here (Section 12) — currently unreachable by this suite by design |
| **No visual regression testing anywhere** | Grep-confirmed absence of `toHaveScreenshot`/snapshot tooling | The single largest *category* of historical bugs (broken images, overlapping elements, misalignment — Section 12) is structurally invisible to functional assertions |
| **AfL/Compass Reports (16 historical bugs, several Highest priority) has no matching spec file at all** | `compass.spec.js` only covers Teaching-mode AnalyseIt/ExploreIt/Revision Tests, not the Reports surface bugs like `TCN-I16599`/`TCN-I16602` describe | Either this is out of Teaching-mode scope (needs client confirmation) or it's a silent zero-coverage area |
| **Camera-dependent flows are permanently blocked, not just untested** | Quiz's "Launch AIR Card" flow (`PLR-QZ-RECONCILE-01`), Learning Shorts recording — both confirmed to require real camera access Playwright's default context can't provide | `--use-fake-device-for-media-stream` is flagged in `LIVE_FINDINGS.md` as untried — a concrete, low-effort next step that would unblock a large swath of currently-`test.fail()`'d Quiz cases |
| **No file-upload, network-interception, or multi-tab/multi-account simultaneous-session tooling** | Repeatedly cited across `00_PROGRESS_PLAN.md`'s "Tooling gaps hit repeatedly this pass" | Blocks Drop It's real transfer flow, several Security/IDOR-style rows, and any genuine concurrent-session test |
| **Desktop-client mode only pilot-verified on 2/20 modules** | README's own "Known follow-ups" | Every other module's pass/fail history predates the switch from browser-mode to the real Electron client — webview-specific quirks (already found once, for PIN-09/PIN-10's CSS class) may exist elsewhere undetected |
| **Duplicated/fragile locators for shared elements** (`toolbar-user-avatar`, `player-close-btn` target, Magnet icon) redefined 3-5× across page objects | `DATA_QA_ID_GAPS.md` systemic findings 1, 3, 6 | A real app change to any of these requires hunting down and fixing multiple independent copies instead of one |

---

## 8. Real-World Teacher Workflows

Reconstructed from the app flow (Section 3) plus the 10 primary + 33 supplementary journeys
already named in `User_Journeys.xlsx` (full list in Section 18):

- **Starting a class and delivering a lesson**: Sign in → pick class → navigate to today's
  chapter/topic → open a resource (quiz/video/worksheet) → annotate on the whiteboard while
  discussing it.
- **Using multiple resource types in one sitting**: open a video, close it, open a worksheet, use
  its annotation/zoom tools, close it, launch a quiz, walk students through it.
- **Switching class/topic mid-day**: teach period 1 with Class 8R, switch to Class 11A for period
  2 — and the app must not carry over period 1's playlist/whiteboard/current-topic state (this is
  exactly where several confirmed real bugs live — Section 12).
- **Using a cross-cutting tool mid-lesson**: open Magnet → take Attendance, or compose an AI
  Notice from something just written on the whiteboard, or generate AI Homework to assign before
  the bell — all without losing the lesson's own in-progress state.
- **Recovering from an interruption**: app crash, forced logout, or a 15-minute inactivity
  timeout mid-lesson, then signing back in and resuming exactly where the lesson left off.
- **A full-day, multi-period session**: many class switches, many resource opens/closes, repeated
  Magnet/Compass use — the stress case where session-timeout, state-leakage, and
  performance-degradation bugs actually surface (this is precisely what `User_Journeys.xlsx`'s
  "Full lesson simulation with every module touched once" and "Rapid multi-module context switch
  stress" journeys are designed to catch).

---

## 9. Complete Scenario Inventory

Rather than re-list the ~969 documented rows, this section names the scenario *classes* that
matter most given what's actually been found, with a concrete example of each already confirmed
in this app (not hypothetical):

- **Positive**: full AI Homework generate→assign flow (confirmed working end-to-end on Class
  11A Mathematics).
- **Negative**: submitting an untouched required field in Add Resource's Create form shows zero
  validation feedback (confirmed real gap, live-confirmed, `00_PROGRESS_PLAN.md`).
- **Edge/Boundary**: a 211-character User ID accepted with no maxlength and no error (`PWD-17`).
- **State transition**: Toolbar's Shapes tool silently reverts to needing re-arm after one
  insert — no visible UI signal (`LIVE_FINDINGS.md`).
- **Persistence**: Whiteboard content missing on reopening a topic (`TCN-I15458`); erased
  annotation not restored by Undo after re-login (`CWR-I767`, currently open/"To do").
- **Recovery**: the AUTH-GAP-01 15-minute inactivity warning modal, confirmed to resume cleanly
  with "Stay Signed In."
- **Session**: rapid sign-in/sign-out cycling on the same account measurably degrades login
  reliability within the same short window (`LIVE_FINDINGS.md`, Authentication verification pass).
- **Cross-module**: Whiteboard History (profile menu) is scoped per teacher-*account*, not
  per-class — a saved drawing from Class 5A is visible (and restorable) while teaching Class 11A
  (`TB-EXP-14`/`UJ-EXP-14`, live-confirmed CRITICAL bug).
- **Regression**: the Playlist/Contents/+ button vanish-after-close bug (`PL-BUG-01`), reproduced
  independently twice — exactly the kind of fixed-then-silently-reintroduced defect a regression
  suite exists to catch.

---

## 10. Historical Zoho Bug Analysis

**Source**: `ItemExport_50966000002530901.xlsx`, exported 2026-09-12, view "CEP & TC Issues,"
1,037 total tracker items across two Zoho projects — **"Teacher Connect (New)"** (857 items,
`TCN-I*` ids) and **"CE6 WEB Revamp"** (180 items, `CWR-I*` ids). Filtering to `Item Type = Bug`
gives **693 bugs**, the population this section analyzes.

**Status distribution** (693 bugs): 515 QA Sign-off/Closed, 59 Invalid, **54 To do (still
open)**, 25 Closed, 15 Duplicate, 11 Ready for Testing, **8 Reopened**, 3 On Hold, 2 Done, 1
Rejected.

**Priority distribution**: 415 Highest, 204 High — i.e. **89% of all logged bugs were rated
Highest or High priority**, which is either a genuinely defect-prone app history or (more likely,
worth flagging rather than assuming) a triage culture where "Highest" is the default rather than
a true top tier. Either reading argues for treating priority labels in this tracker as a weak
signal on their own — corroborate with recurrence/reopen data instead (Section 12).

**Classification method**: each bug was mapped to one of this project's 20 modules first via its
Zoho `Epic` field (present on 463/693 bugs) using a direct name mapping (e.g. `Epic = "CEP
Attendance"` → Attendance), then via keyword matching on title/description for the 230 bugs with
no `Epic` set. 68 bugs remain `Unclassified` after both passes — genuinely ambiguous or
cross-cutting (e.g. broken-image reports with no feature context in the title). Treat all counts
as directionally reliable, not a certified audit — see Section 30.

**⚠️ Important caveat found during classification, not to be glossed over**: many bug titles
explicitly say "V1" or "V2" (e.g. `CWR-I768`: *"...Sign in V1 With Pin 90005..."*; `CWR-I418`:
*"V2-Grade/Subject Selection Screen..."*), and these don't cleanly separate by Zoho project —
both projects contain both version tags, and the majority of bugs carry neither tag at all. This
suite drives one specific real-world surface (`ce-qa-school.devstudi.com/teach/`, the Electron
desktop client). **Before fully trusting the module-level regression-risk conclusions below,
confirm with the product/QA lead which of "V1"/"V2" (and which Zoho project) this automation's
actual target corresponds to** — a V2-only historical bug in a surface this suite doesn't drive
would otherwise inflate a module's apparent risk score for no real reason.

**Module-level historical bug density** (top 12 by count, this report's classification):

| Module (this report's bucket) | Bug count | Highest/High priority | Currently Reopened |
|---|---|---|---|
| Playlist | 108 | 94 | 2 |
| Players — Checkpoint | 101 | 94 | 1 |
| Attendance | 91 | 84 | 0 |
| Authentication | 79 | 52 | 0 |
| *Unclassified* | 68 | 53 | 2 |
| Whiteboard | 51 | 38 | 1 |
| Ops/Infra (not feature-specific) | 27 | 26 | 0 |
| Players — Quiz | 26 | 22 | 0 |
| Magnet entry-point (feeds Attendance/AI Homework/AI Notices/Learning Shorts) | 26 | 22 | 0 |
| Players — Code Editor | 21 | 15 | 0 |
| Compass — Reports (AfL) | 16 | 16 | 1 |
| Toolbar | 16 | 9 | 0 |

---

## 11. Bug-to-Regression Mapping

This is the core "if this bug returns tomorrow, would we catch it" exercise, applied to the
highest-value bugs (Highest/High priority, non-Invalid/Duplicate, and every currently-Reopened
bug regardless of priority) rather than all 693 — a curated set is more useful than an exhaustive
one nobody will read. Full per-module title lists are available on request; this table picks the
most instructive representative per pattern.

| Zoho Bug | Module | Failure Description | Existing Automated Test? | Would It Be Detected Today? | Required Regression Scenario |
|---|---|---|---|---|---|
| `CWR-I768` (To do) | Playlist | Previous class/subject's playlist content persists and keeps running after switching to a new class/subject | `navigation.page.js`'s `resetToClass` and `cross-cutting.spec.js` files test *some* state-reset paths | **Partial** — no test found that specifically opens an asset, switches class, and asserts the old content is gone | Add an explicit "open asset → switch class → assert previous asset is not still open/playing" case to Playlist's cross-cutting suite |
| `TB-EXP-14`/`UJ-EXP-14` (already found by this suite) | Whiteboard | Whiteboard History scoped per-account, leaks across classes | **Yes — already caught**, `LIVE_FINDINGS.md` | **Yes** | Already exists; keep as a permanent regression case, do not let it be "fixed" by narrowing scope instead of the real bug |
| `CWR-I767` (To do) | Whiteboard/Authentication | Undo doesn't restore erased annotation data after sign-out/re-login | No spec found combining erase→undo *across* a sign-out/re-login boundary (existing Undo tests are same-session only) | **No** | New cross-cutting case: draw → sign out → sign in → erase → Undo → assert restoration |
| `TCN-I14965` | Players-Checkpoint (Planning-mode origin) | Test created in Plan Mode not visible in Teach Mode for same Grade/Division | Out of scope — Planning mode excluded entirely | **No, by design** | Needs either a scope change or an explicit, documented "known gap" sign-off |
| `TCN-I14966`/`67`/`69`/`70` | Players-Checkpoint (Planning-mode) | "Create Test" button enable/disable logic doesn't match the real assignment/grade state (4 related bugs) | Out of scope | **No, by design** | Same as above — this exact button-gating logic bug recurring 4× in the tracker is a strong argument for at least a light Planning-mode smoke check even under the current scope restriction |
| `TCN-I15085`, `TCN-I14957`, `TCN-I16636` | Players-Checkpoint / Quiz | Broken/blank question images while preview shows content correctly | No visual-diff tooling exists; a `toBeVisible()`-style check on an `<img>` element passes even when the image is visually broken (broken alt-text state can still report a non-zero bounding box) | **No** — this exact failure mode is invisible to the suite's current assertion style | See Section 14: needs either a `naturalWidth > 0` / network-response-status check per image, or real visual regression |
| `CWR-I751` (Auth-classified but really Admin/Sync) | Authentication (misclassified — likely Admin Panel, out of this app's scope) | "Sync Functionality Not Working from Admin Panel" | N/A — Admin Panel is a different surface entirely | N/A | Flag as likely out-of-scope for this suite; don't let it inflate Authentication's risk score |
| `CWR-I492` | Authentication | User forcefully logged out after successful login | `authentication/session.spec.js` (7 tests) covers session-timeout paths | **Partial** — depends whether this exact "logged out immediately post-login" shape is one of the 7, not just idle-timeout | Add an explicit "assert session survives immediately after login, no forced logout within N seconds" case if not already present |
| `CWR-I299` | Whiteboard/Compass | Other widgets become unclickable after closing a widget | Matches the *already-found* "Add Resources picker: `pointer-events: none` across the whole popup subtree" bug class (`LIVE_FINDINGS.md`) — same failure signature, different trigger | **Partially** — the underlying click-through defect class is known and has a workaround (`openPickerReliably`), but this specific widget-close trigger isn't confirmed tested | Extend the existing click-through regression case to explicitly cover "close a widget, then try to click an unrelated control" |
| `CWR-I629`/`I628`/`I553`/`I467`/`I439` (Magnet→AI Homework generation) | AI Homework | AI question generation failures/duplication/validation-error cluster (5 related bugs under the Magnet epic) | `ai-homework.spec.js` (27 tests) covers the happy-path generation flow | **Partial** — happy path is covered; the specific failure modes (duplicate serial numbers, validation error above a count limit, generation silently failing) are not confirmed as individual negative cases | Add explicit negative cases for: count-above-limit validation, duplicate-numbering check on generated output, and a forced-failure/retry path |
| `TCN-I16599`–`I16911` (AfL/Compass Reports cluster, 12+ bugs) | Compass-Reports | Filter/rendering/data-count defects across the AfL Report screen | **None** — no spec file targets this screen at all | **No** | Either scope this in explicitly (new spec file) or document it as a confirmed, deliberate gap |
| `TCN-I15318`, `TCN-I15260`, `TCN-I15262` | Players-Quiz | Quiz fails to open / infinite spinner / "No Valid Question Found" | `quiz.spec.js` (30 tests) — but the majority of Quiz's Q1-dependent tests are already blocked by the camera-gated AIR Card screen (`LIVE_FINDINGS.md`) | **No, currently** — blocked by the same camera limitation, not by these tests being absent | Resolving the fake-camera-device gap (Section 7) would very likely also unblock verifying this exact cluster |
| `CWR-I323` | Attendance | Single student details duplicated during ongoing attendance | `attendance.spec.js` (35 tests) — but the module's own live-confirmed blocker (`ATT-PANEL-01`, infinite spinner) may prevent reaching this state at all in the current environment | **Unknown / blocked** | Once `ATT-PANEL-01` itself is resolved, add this specific duplication check to the regression set |

**Reading this table honestly**: of the ~20 highest-value historical defects sampled here, roughly
**a third are already caught or partially caught**, **a third fall into scope areas this suite
deliberately excludes (Planning mode) or a tooling gap it can't currently close (camera,
network-interception)**, and **a third are genuine, closable gaps in Teaching-mode coverage that
should be added as new regression cases**. That ratio — not a single "% covered" headline number
— is the real state of historical-defect regression protection.

---

## 12. Defect Pattern Analysis

Grouping the historical bug population (not just the sampled table above) into recurring failure
*classes*, each with a concrete example and the module(s) it recurs across:

1. **State doesn't reset/refresh on class/subject/topic switch.** `CWR-I768` (Playlist content
   persists across class switch), `TCN-I16308` (last-accessed topic not reopening after login,
   *Reopened*), `CWR-I299`/click-through bug family, the already-found Whiteboard-History
   cross-class leak. Recurs across Playlist, Whiteboard, Compass, Navigation.
2. **Annotation/content persistence and Undo don't agree with each other.** `CWR-I755` (erased
   shapes reappear after navigating topics), `CWR-I767` (Undo doesn't restore erasure after
   re-login), `TCN-I15458` (whiteboard content missing on reopen), `TCN-I15317` (content position
   resets on reopen). All Whiteboard-adjacent; the underlying theme is *save/restore timing is
   inconsistent with what Undo/Redo believes happened*.
3. **Broken/missing images and rendering artifacts, across nearly every content-bearing module.**
   `TCN-I15085`, `TCN-I14957`/`58`, `CWR-I736`, `TCN-I15367`, `TCN-I16636`, `CWR-I758` — spans
   Checkpoint, Quiz, Grade/Subject/Division, Compass. This is very likely a **content-pipeline/CMS
   issue** (missing or misconfigured image assets at the data layer) rather than N separate app
   bugs — worth confirming with the content team, since automated tests can catch *symptom*
   ("image failed to load") but not the underlying *cause* (bad content authoring).
4. **Overlapping/z-index/layout collisions when two UI surfaces compete for the same screen
   region.** `CWR-I663` (More-symbols hidden behind Playlist), `CWR-I712` (Playlist overlaps
   split-screen Quiz), `CWR-I734` (Resource Tray overlaps Widget screen), `TCN-I16605`/`I16904`
   (Report screen text overlaps), `CWR-I305` (Add Resource overlaps Toolbar), `TCN-I16052`
   (Student Test popup overlaps Resource Tray). At least 8 independent instances of the same
   underlying class of bug across 6 different modules — strong evidence this is a systemic
   CSS-stacking/responsive-layout weakness in the app, not isolated incidents.
5. **A gating/validation button's enabled state doesn't match the real business rule.**
   `TCN-I14966`/`67`/`69`/`70` (Checkpoint's Create Test button, 4 variants of the same root
   defect class), `CWR-I361` (Quiz's Submit Answer enabled without a selection), `CWR-I628`
   (Homework's question-count validation). Recurs specifically wherever a form/action needs to be
   conditionally disabled based on assignment/grade/selection state.
6. **AI-generation content-quality defects**, distinct from AI-generation *availability*
   failures: chemical equations rendering wrong (`CWR-I553`), duplicate serial numbers
   (`CWR-I467`), stale/mismatched placeholder text (already found independently by this suite,
   `AIA-EXERCISE-02`). Spans AI Homework, AI Assist, AI Notices — the shared theme is *the
   generation call succeeds, but its output has a quality defect a simple "did content render"
   check won't catch*.
7. **Resume/progress-state tracking failures in long-running, multi-step flows.** Attendance's
   "Resume Attendance Starts from First Student Instead of Last Progress" (`TCN-I15138`),
   Checkpoint's premature auto-submit before confirmation (`TCN-I14971`), Code Editor's
   settings-persistence contradiction already found by this suite (`PLR-CODE-15`). Any
   multi-step, resumable teacher workflow is a higher-risk area for this exact pattern.

---

## 13. Proactive Regression Scenarios

Derived directly from the 7 patterns above — these are scenarios *not yet individually named* in
any current workbook or spec file, proposed because the pattern that produced a known bug in one
place plausibly exists in a sibling location too:

- Pattern 1 (state-reset-on-switch): if Playlist/Whiteboard/Compass all show this defect class,
  test the same "switch away and back" shape for **Add Resource's picker state**, **AI Assist's
  in-progress exercise**, and **TCE Search Library's last search term** — none of these are
  confirmed clean, none are confirmed broken.
- Pattern 2 (annotation/Undo inconsistency): test whether **Toolbar's shape/text objects** (not
  just pen strokes) also fail to restore correctly via Undo after a re-login boundary — the
  existing confirmed bug is pen-stroke-specific.
- Pattern 3 (broken images): a lightweight, cheap regression check — assert `naturalWidth > 0` (or
  a successful network response) for every rendered content image across Checkpoint, Quiz, and
  Grade/Subject/Division question previews, rather than waiting for a human/QA to spot each one
  individually.
- Pattern 4 (layout collisions): a systematic sweep opening every documented "Tray/Tool/Panel"
  combination two-at-a-time (Playlist+Quiz split-screen, Add Resource+Toolbar, Resource Tray+any
  popup) and asserting no bounding-box overlap between their primary action controls — this
  pattern has already recurred 8 times independently, so a general-purpose overlap-detection
  helper is higher leverage than chasing each instance one by one.
- Pattern 5 (validation-gating): audit every "enabled iff X" button across Checkpoint, Quiz, and
  Homework for a matching negative test that asserts it stays disabled when X is false — not just
  a positive test that it works when X is true.
- Pattern 6 (AI content quality): for every AI-generation surface (Homework, Assist, Notices),
  add an assertion beyond "content rendered" — e.g., no duplicate item numbering, no leftover
  placeholder text matching a known stale-string list.
- Pattern 7 (resume/progress state): for Checkpoint, Attendance, and Code Editor specifically, add
  an explicit "start → interrupt (navigate away or close) → resume → assert exact same progress
  point" case, since this exact shape has already produced 3 independent confirmed defects.

---

## 14. Automation Feasibility

| Scenario class | Classification | Rationale |
|---|---|---|
| Sign-in, navigation cascade, resource open/close, toolbar tool selection, form validation | **AUTOMATE** | Already proven reliable in this suite; pure DOM/state assertions |
| Broken-image / visual-layout-collision detection (Patterns 3 & 4, Section 12) | **AUTOMATE, but needs new tooling** | Not covered by `expect(locator).toBeVisible()`-style checks today; needs either lightweight `naturalWidth`/response-status checks (cheap, fast) or a real visual-regression baseline (`toHaveScreenshot`) for true layout-collision detection. Given how much of the historical bug volume this affects (Section 12, patterns 3+4 alone touch 6+ modules), this is the single highest-leverage new automation investment available. |
| Quiz's camera-gated AIR Card flow, Learning Shorts recording | **INVESTIGATE** | `--use-fake-device-for-media-stream` + granted `camera` permission, untried per `LIVE_FINDINGS.md` — plausible unlock, needs a technical spike before committing |
| Drop It's real device-pairing transfer, multi-tab/multi-account concurrent sessions, network-level interception (throttle/abort) | **INVESTIGATE** | Needs tooling this session's environment doesn't have (confirmed repeatedly, `00_PROGRESS_PLAN.md`) — feasible with a different test runner configuration or a device farm, not a quick fix |
| Physical-keyboard PIN entry vs. virtual keypad discrepancy | **MANUAL** | Requires a real human on real hardware — already flagged as a hard automation limit |
| Planning-mode Checkpoint/Question-Bank authoring flows | **MANUAL for now, INVESTIGATE for a future scope change** | Zero `data-qa-id` instrumentation and an explicit current scope exclusion — automating it is possible but requires a deliberate decision to both change scope *and* request instrumentation from developers first |
| AI-generated content *subjective* quality (is this a good homework question) | **MANUAL** | Automatable checks stop at "did it render, is it duplicate-free, does it match a known-bad pattern" — genuine pedagogical quality judgment stays human |
| Content-authoring/CMS-level defects (Pattern 3's root cause) | **MANUAL / dev-team, not QA automation** | The *symptom* (broken image) is automatable to detect; the *fix* is a content/data problem, not a test-coverage problem |

---

## 15. Test Data Strategy

Already well-designed in the current suite — summarized, not redesigned:

- **Accounts**: two real QA teacher accounts (`VALID_PIN`, `VALID_PIN_2`) in `.env`, deliberately
  kept separate so some suites can run without colliding on shared per-account state.
- **Class/chapter/topic combinations**: centralized in `config/moduleClassMap.js` for the modules
  wired into it (Navigation, Compass, Playlist, AI Homework, AI Notices, Players) — a genuinely
  good pattern (structured `knownIssues` array per entry, dated correction comments showing active
  maintenance) that should be **extended to the remaining modules still using inline, unrouted
  class-setup calls** (README's own "Known follow-ups") rather than replaced.
- **Special/edge data**: explicitly avoids fixed literal PINs like `'11111'` in shared-environment
  tests (documented rationale: could accidentally be a real valid account) — generates random PINs
  instead. A 211-char User ID and a hardcoded leading-zero PIN (`'00583'`) are the only deliberate
  literal edge values found, both legitimate.
- **Gap**: no dedicated "zero-data" account/class (empty Subject list, zero Recent Classes, a
  class with genuinely zero Checkpoints) is centrally defined — several found issues (`USR-SUBJ-01`,
  empty-picker states) were discovered incidentally rather than via a deliberately-provisioned
  empty-state fixture. Worth adding one to `moduleClassMap.js` explicitly.

---

## 16. Playwright Automation Quality Assessment

Full detail already in `AUTOMATION_REVIEW.md` (architecture diagram, scorecard, 3-phase remediation
plan) and `DATA_QA_ID_GAPS.md` (152 non-qa-id locators catalogued, 6 systemic findings). This
report's own addition: **the quality gaps in those two documents and the coverage gaps in this one
compound each other in Checkpoints and Attendance specifically** — `player.page.js`'s Checkpoint
locators are among the least-instrumented in `DATA_QA_ID_GAPS.md`'s findings, in the exact module
this report's own Section 21 flags as the single highest historical-defect area. Fixing the
locator instrumentation gap there isn't just a maintainability nicety — it's a prerequisite for
being able to write the additional Checkpoint regression coverage Section 11 calls for at all.

---

## 17. Test Suite Strategy

Building on the existing category-tag convention (`@negative`, `@security`, per-file
`adversarial`/`cross-cutting`/`extended-coverage` naming) already in place:

- **Smoke Suite** (P0 only, must pass before any deploy): PIN sign-in, class selection, open one
  resource of each core type (Quiz/Video/Worksheet), Whiteboard draw+save, Attendance reaches its
  panel without hanging, AI Homework happy path, one full User Journey (Journey 10: sign-in → pick
  class → navigate contents → play a quiz resource).
- **Module Regression**: current per-module spec files, as-is — this layer is already reasonably
  mature.
- **Cross-Module Regression**: the existing 43 User Journeys, expanded per Section 13's new
  proactive scenarios (state-reset-on-switch across sibling modules).
- **Historical Bug Regression**: a new, explicitly-named block (could be a `@historical-regression`
  tag) containing the ~15-20 closable gaps identified in Section 11's mapping table, so this
  category is visible and trackable as its own thing rather than folded anonymously into
  `extended-coverage.spec.js` files.
- **Extended Regression**: current edge/boundary/recovery/long-session coverage, as-is.

---

## 18. Teacher Journey Matrix

| Teacher Journey | Modules Touched | Business Goal | Existing Coverage | Gap | Risk | Automation |
|---|---|---|---|---|---|---|
| J1: Sign-In → Switch Class → Confirm Persistence | Auth, Grade/Subject/Division | Start teaching the right class | Covered | Cross-check against `CWR-I768`'s Playlist-persistence pattern (Section 11) | Medium | Automate |
| J2: Sign-In → Magnet → Generate AI Homework → Discard | Auth, Magnet, AI Homework | Assign homework without disrupting class | Covered (happy path) | Negative cases from the Magnet-Entry bug cluster (Section 11) | High | Automate |
| J3: Sign-In → Compose AI Notice from Whiteboard Text | Auth, Whiteboard, AI Notices | Send a quick class notice | Covered | None major | Low-Medium | Automate |
| J4: Sign-In → Compass AnalyseIt/ExploreIt → Refresh Recovery | Auth, Compass | Review AI-assisted analysis mid-lesson | Covered (Teaching mode only) | Compass-Reports entirely unaddressed (Section 11) | Medium | Automate |
| J5: Sign-In → Add Resource via Library → Playlist-Vanishing Bug | Auth, Add Resource, Playlist | Bring in outside content | Covered, and this journey *documents a known bug on purpose* | None — correctly modeled as a regression case | High (known bug) | Automate |
| J6: Sign-In → Customize Pen → Draw → Clear (Confirmed Dialog) | Auth, Toolbar, Whiteboard | Annotate and reset the board | Covered | None major | Medium | Automate |
| J7: Sign-In → Attendance via Magnet → Panel Hang → Reload | Auth, Magnet, Attendance | Take attendance | Covered, and documents the live `ATT-PANEL-01` blocker | **This IS the P0 release blocker** (Section 1) | **Critical** | Automate (already is) |
| J8: Sign-In → AI Assist Exercise → Add to Playlist → Close | Auth, AI Assist, Playlist | Generate a quick exercise | Covered | None major | Low | Automate |
| J9: Sign-In → Account Settings → Change Password → Sign Out | Auth, User Profile | Manage own account | Covered | None major | Low-Medium | Automate |
| J10: Sign-In → Pick Class → Navigate Contents → Play Quiz | Auth, Grade/Subject/Division, Playlist, Players | The single most representative "core teaching" journey | Covered, but blocked downstream by the camera-gated AIR Card screen for most real question content | Camera-permission spike (Section 14) | **Highest — this is the smoke-suite anchor** | Automate |
| Full-lesson simulation (every module touched once) | All | Realistic worst-case session load | Named in `User_Journeys.xlsx`, verification status unconfirmed | Confirm this journey is actually run regularly, not just documented | High | Automate |
| Cross-tenant data isolation, end-to-end IDOR check | Auth → Gallery/Library | Security: one teacher can't see another's/another school's data | Named but flagged elsewhere as needing tooling this session lacks (multi-account concurrent) | Needs the concurrency tooling gap closed first (Section 7) | High (security) | Investigate |

---

## 19. Coverage Matrix

| Module | Existing Automated Tests | Effective Coverage (business-outcome-level, not just "test exists") | Missing Scenarios | Historical Bugs | New Scenarios Recommended | Priority |
|---|---|---|---|---|---|---|
| Authentication | ~119 | High | Cross-session Undo restoration (Section 11) | 79 | 1 | P0 |
| Grade/Subject/Division | ~80 | High | — | 14 | 0 | P0 |
| Playlist | ~83 | Medium-High | State-not-reset-on-switch explicit case | 108 | 2 (Section 11, 13) | P0 |
| Add Resource | ~53 | Medium | Picker-state-persistence-on-switch | 2 (likely undercounted) | 1 | P1 |
| Toolbar | ~72 | Medium-High | Shape/text-object Undo-after-relogin | 16 | 1 | P1 |
| Compass | ~37 | Medium (Teaching mode only) | Reports surface entirely | 31 (15+16) | 1 major (new file) | P1 |
| Players | ~184 | **Low for Checkpoint specifically, Medium-High elsewhere** | Checkpoint depth, broken-image detection, camera-gated Quiz unlock | 155 | 4+ | **P0** |
| Whiteboard | ~28 | Medium | Cross-module Undo/persistence patterns | 51 | 2 | P0 |
| AI Assist | 33 | Medium-High | — | 3 | 0 | P2 |
| AI Notices | ~26 | Medium-High | — | 3 | 0 | P1 |
| Attendance | ~40 | **Blocked by a live P0 bug** | Resume-progress accuracy once unblocked | 91 | 1 (post-fix) | **P0** |
| Drop It | ~22 | Low-Medium (device-dependent) | Real transfer flow | 3 | 0 (tooling-gated) | P2 |
| Gallery | ~25 | Medium | — | 0 | 0 | P3 |
| Learning Shorts | ~27 | Low-Medium (camera-gated) | Real recording flow | 0 | 0 (tooling-gated) | P2 |
| Minimap | ~25 | Medium | — | 0 | 0 | P3 |
| TCE Search Library | ~32 | Medium-High | — | 2 | 0 | P2 |
| User Profile | ~59 | Medium-High | — | 1 | 0 | P1 |
| AI Homework | ~31 | Medium | Negative/validation cases from Magnet-Entry cluster | 3 (+ shared Magnet-Entry) | 3 | P0 |
| Core UI | ~19 | Medium | — | 5 | 0 | P3 |
| User Journeys | ~47 (43 named) | High conceptually, verification-status mixed | Confirm regular execution, not just existence | N/A | 0 | P0 |

---

## 20. Gap Matrix

| Gap ID | Module | Missing Coverage | Business Impact | Risk | Recommended Scenario | Automation |
|---|---|---|---|---|---|---|
| GAP-01 | Attendance | No coverage possible past the panel hang until `ATT-PANEL-01` is fixed | Teacher literally cannot take attendance | Critical | Re-run full Attendance suite immediately once the app fix ships; treat as a release blocker until then | Automate (already written, just blocked) |
| GAP-02 | Players/Checkpoint | Only 19 tests against 101 historical bugs, and Planning-mode-origin defects are out of scope | Highest historical-defect density in the app, thinnest relative coverage | Critical | Expand `checkpoints.spec.js`; decide explicitly on Planning-mode scope | Automate (Teaching-mode part); scope decision needed for the rest |
| GAP-03 | Cross-cutting | No visual regression tooling against a bug population dominated by visual/layout defects | Broken images and overlapping UI ship undetected | High | Add `naturalWidth`/response-status image checks + evaluate `toHaveScreenshot` baselines | Automate (new tooling) |
| GAP-04 | Compass | AfL Reports surface has zero spec coverage | 16 historical bugs, several Highest priority, entirely unaddressed | High | New spec file, or explicit scope exclusion documented | Automate or explicit scope-out |
| GAP-05 | Players/Quiz | Camera-gated AIR Card screen blocks most real question-content verification | Masks whatever regressions exist past that screen | High | Fake-camera-device spike | Investigate → Automate |
| GAP-06 | All modules | Desktop-client mode pilot-verified on only 2/20 modules | Unknown webview-specific quirks may exist elsewhere (one already found for PIN-09/10) | Medium-High | Extend the pilot systematically, module by module | Automate (re-run existing suite against the real client) |
| GAP-07 | Playlist, Whiteboard, Compass | State-not-reset-on-switch pattern confirmed in 2+ places, unconfirmed in siblings | Silent cross-lesson data leakage | Medium-High | Section 13's pattern-1 scenarios | Automate |
| GAP-08 | AI Homework/Assist/Notices | AI-generated content quality (duplication, stale text) not asserted | Visible to students/parents, reputational | Medium | Section 13's pattern-6 scenarios | Automate |
| GAP-09 | Drop It, Learning Shorts, multi-account security | Tooling gaps (file upload, network interception, multi-tab/account) | Real transfer/security flows unverifiable | Medium | Tooling investment (Section 14) | Investigate |
| GAP-10 | Duplicated locators (`toolbar-user-avatar`, Magnet icon, player close button) | Maintenance risk, not a coverage gap per se | A single app change breaks multiple independent test copies | Medium | Centralize per `DATA_QA_ID_GAPS.md`'s systemic findings | N/A (refactor, not new tests) |

---

## 21. Historical Bug Matrix

(Curated — see Section 11 for the full reasoning behind each row; this restates it as the
requested standalone matrix format.)

| Zoho Bug | Module | Failure Pattern | Existing Test | Actually Protected? | Required Regression Scenario | Priority |
|---|---|---|---|---|---|---|
| `CWR-I768` | Playlist | State-not-reset-on-switch | Partial (`resetToClass` helper exists) | **No** | Explicit switch-and-assert-cleared case | Critical |
| `TB-EXP-14` | Whiteboard | Cross-class data leak | Yes | **Yes** | Already exists — keep permanent | Critical |
| `CWR-I767` | Whiteboard | Undo/persistence mismatch across re-login | No | **No** | New cross-boundary case | High |
| `TCN-I14965`–`70` | Checkpoint (Planning-mode) | Business-rule gating logic | Out of scope | **No, by design** | Scope decision required | High |
| `TCN-I15085` et al. | Checkpoint/Quiz | Broken image, content-preview mismatch | No | **No** | Image-integrity check (Section 14) | High |
| `CWR-I492` | Authentication | Forced logout post-login | Partial | **Uncertain** | Explicit assertion needed | High |
| `CWR-I299` | Whiteboard/Compass | Click-through after widget close | Partial (same bug class known) | **Partial** | Extend existing regression case | Medium-High |
| `CWR-I629` et al. (5 bugs) | AI Homework | Generation failure/validation/duplication cluster | Partial (happy path only) | **Partial** | Negative-case set (Section 11) | High |
| `TCN-I16599`–`I16911` (12+ bugs) | Compass-Reports | Filter/rendering defects | None | **No** | New spec file or scope-out | High |
| `TCN-I15318`/`60`/`62` | Quiz | Open/spinner/no-question failures | Blocked by camera gate | **No, currently blocked** | Camera spike unblocks verification | High |
| `CWR-I323` | Attendance | Data duplication mid-attendance | Blocked by `ATT-PANEL-01` | **Unknown/blocked** | Re-test once panel hang is fixed | Critical (downstream of GAP-01) |

---

## 22. Risk Matrix

Ranked by combined business importance × usage frequency × historical-defect density × current
automation gap:

| Rank | Area | Why it's here |
|---|---|---|
| 1 | **Attendance** | Daily mandatory workflow, live-confirmed CRITICAL blocker still present, 91 historical bugs |
| 2 | **Players/Checkpoint** | Highest historical-defect density in the app, thinnest test coverage relative to that history, partially out-of-scope (Planning mode) |
| 3 | **Playlist state-management** | Largest historical-bug volume of any module, and the specific "state not reset on switch" pattern recurs across 3+ modules |
| 4 | **Whiteboard persistence/Undo** | 2nd-largest historical-bug volume, core continuous-use surface, confirmed cross-class data leak already found once |
| 5 | **Visual/layout defect blindspot** | No tooling exists to catch the single largest *category* of historical bugs (broken images, overlapping UI) |
| 6 | **AI Homework/Assist/Notices content quality** | High visibility to students/parents when wrong, generation-quality defects not currently asserted |
| 7 | **Camera-gated Quiz content** | Masks unknown volume of real regressions behind a solvable tooling gap |
| 8 | **Desktop-client-mode pilot gap** | 18/20 modules' pass/fail history predates the real client switch; unknown webview quirks may exist |
| 9 | **Compass-Reports** | Zero coverage, 16 historical bugs, but plausibly out of Teaching-mode scope — needs a decision, not just effort |
| 10 | **Locator duplication/fragility** | Maintenance risk that compounds every other gap above rather than being independently severe |

---

## 23. Release Sign-Off Coverage

**Pre-release Smoke** (must pass, every release, no exceptions): Sign-in (PIN + Password),
Grade/Subject/Division cascade, Playlist open of one resource per core type, Whiteboard
draw+save, **Attendance panel reaches its screen without hanging** (currently would fail —
this is the concrete, checkable definition of "Attendance is release-blocking" from Section 1),
AI Homework happy path, Journey 10 end-to-end.

**Release Regression (P0 + P1)**: everything in Section 5's P0/P1 rows — Authentication,
Grade/Subject/Division, Playlist, Players, Whiteboard, AI Homework, User Journeys (P0), plus Add
Resource, Toolbar, Compass, AI Notices, User Profile (P1).

**Full Regression**: the complete current 87-file suite, plus the new Section 11/13 scenarios
once written.

**Historical Defect Regression (mandatory, not optional)**: the 8 currently-**Reopened** Zoho
bugs (Section 10) at minimum — a bug that has already regressed once in production is the
single strongest signal that it needs a permanent, explicitly-labeled automated case, not just
inclusion in a generic module suite. Cross-reference against Section 11's mapping before every
release: are all 8 reopened bugs' failure conditions represented by a named test today?

**The concrete release question this report answers**: *"If this release deployed to schools
tomorrow, what must pass first?"* — Attendance not hanging, Whiteboard not leaking cross-class
data, Checkpoint's four gating-button variants behaving correctly, and the smoke suite above. Any
release where Attendance's panel hang is still reproducible should not ship, independent of every
other metric in this report.

---

## 24. Automation Roadmap

**Phase 1 — Critical Business Workflows (do first, this sprint)**
- Confirm current live status of `ATT-PANEL-01` (Attendance hang) — this is a release gate, not a
  backlog item.
- Add the ~15-20 closable historical-bug regression cases identified in Section 11.
- Add the lightweight image-integrity check (`naturalWidth`/response-status) across
  Checkpoint/Quiz/Grade-Subject-Division — cheap, and directly addresses the largest historical
  bug category.

**Phase 2 — Core Application Modules**
- Expand Checkpoint coverage to match its historical-defect density (Section 11, GAP-02).
- Extend the Section 13 pattern-1 (state-reset-on-switch) scenarios to Add Resource, AI Assist,
  TCE Search Library.
- Make an explicit scope decision on Compass-Reports and Planning-mode Checkpoint (automate,
  scope-out-and-document, or defer) rather than leaving it an implicit gap.

**Phase 3 — Major Teaching Resources**
- Camera-permission spike to unblock Quiz's AIR Card screen and Learning Shorts recording.
- Extend the desktop-client-mode pilot from 2/20 to all 20 modules.

**Phase 4 — Cross-Module Teacher Journeys**
- Confirm the 43 named `User_Journeys.xlsx` journeys actually run regularly (not just exist), and
  extend with Section 13's new sibling-pattern scenarios.

**Phase 5 — Historical Defect Regression**
- Build out the full Section 11 bug-to-regression mapping (this report sampled ~20 of 693 bugs
  deliberately; a fuller pass through the remaining Highest/High/Reopened population is the next
  logical increment of this exact exercise).

**Phase 6 — Recovery / State / Edge / Long-Session**
- Section 12 patterns 2 and 7 (Undo/persistence consistency, resume/progress-state accuracy).

**Phase 7 — Coverage Optimization and Stability**
- `AUTOMATION_REVIEW.md`'s own Phase 2/3 items (worker-scoped fixture for runtime, CI, locator
  centralization per `DATA_QA_ID_GAPS.md`) — necessary for this roadmap's earlier phases to be
  sustainable, not just a one-time push.

---

## 25. Final Senior Automation Engineer Assessment

**Current automation maturity**: Advanced for a suite this size, specifically in traceability,
documentation-of-why, and page-object discipline. Immature in exactly the three places that
matter most for release confidence: CI/execution speed, visual-defect detection, and
historical-defect-driven regression coverage (as opposed to feature-driven coverage).

**Major strengths**: root-cause documentation culture that prevents re-breaking already-fixed
workarounds; real, working traceability between test cases and workbook rows; honest test
discipline (`test.fail()` with documented reasons instead of silent skips).

**Major weaknesses**: no CI (a suite that only runs when someone remembers to run it isn't a
release gate, it's a reference); zero visual regression tooling against a historical-bug
population dominated by visual defects; desktop-client-mode (the actually-correct way to test
this app) only pilot-verified on 2/20 modules.

**Critical coverage gaps**: Checkpoints (defect-density-vs-coverage mismatch), Attendance
(live-confirmed blocker), Compass-Reports (zero coverage), camera-gated Quiz content (tooling-
blocked, not test-absent).

**Highest-risk areas**: Attendance, Checkpoints, Playlist/Whiteboard state-management, the
visual-defect blindspot — in that order (Section 22).

**Historical bugs requiring regression protection now**: the 8 currently-Reopened bugs (Section
10) are non-negotiable; the ~15-20 sampled in Section 11 are the next tier; the remaining
Highest/High population is Phase 5's ongoing work, not a one-time task.

**Recommended next priorities**: (1) confirm Attendance's live status and treat it as a release
gate either way, (2) close the Checkpoint coverage gap, (3) stand up the cheap image-integrity
check, (4) make an explicit scope call on Planning-mode/Compass-Reports rather than leaving it
implicit.

**Manual testing areas that should stay manual**: physical-keyboard PIN entry, pedagogical
quality of AI-generated content, any flow genuinely requiring a second physical device (Drop It's
real phone pairing).

**Release-critical coverage**: the Section 23 smoke suite, with Attendance's panel-hang status as
a hard go/no-go signal.

**Overall confidence level**: **Medium** — strong foundation, real and specific gaps, all of them
closable without a rewrite. Not yet a "ship with confidence" suite; on track to become one if
Phases 1-3 above are executed in order.

---

## 30. A note on data quality in this report's own inputs (challenging the numbers, per this
exercise's own principle)

In the spirit of not accepting reported numbers at face value: this project's own documentation
already disagrees with itself on basic totals — `TEST_SUITE_GAP_ANALYSIS.md` says 969 total test
cases, `00_PROGRESS_PLAN.md`'s own running tally says 951, `AUTOMATION_REVIEW.md`'s independent
recount of the same workbooks says 1,045, and the README's headline claims "1,016... all
live-verified" when the same workbooks' own Status column shows only 732 (70%) as `Verified Live`.
None of these numbers is obviously "the" correct one without a fresh, authoritative recount — this
report deliberately did not attempt to adjudicate between them, and neither should any release
decision rest on any single one of them in isolation. Similarly, this report's own Zoho
classification (Section 10) is a best-effort mapping, not a certified audit — the "Unclassified"
bucket (68 bugs) and the V1/V2 ambiguity flagged in Section 10 are known soft spots, named rather
than hidden.
