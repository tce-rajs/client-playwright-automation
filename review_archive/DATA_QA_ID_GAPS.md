# Master List — Elements Missing `data-qa-id`

Generated: 2026-09-13
Purpose: hand to the app development team so `data-qa-id` attributes can be added to these
elements. Once added, the corresponding locator in the file/line noted should be switched over to
`[data-qa-id="..."]`, matching the rest of the suite's existing convention.

## Methodology & scope

This project's own convention (stated in `README.md` and `pages/login.page.js`) is: **prefer
`[data-qa-id="..."]`, fall back to Playwright's own locators (`getByText`/`getByRole`/CSS) only
where no id exists.** This document lists every locator in the codebase that takes the fallback
path today.

Two sources were scanned:

1. **`pages/*.page.js`** — the canonical, reusable element definitions (152 non-qa-id locators
   found here). This is the primary list — fixing these fixes every test that uses that page object.
2. **`tests/**/*.spec.js`** — spec files that define a locator inline instead of going through a
   page object (105 raw matches; filtered down to the ones below — generic sanity checks like
   `page.locator('body')` used only to confirm "the app hasn't crashed," and open-ended regex text
   hunts like `text=/error|failed|try again/i` used to catch _any_ possible error message, were
   excluded because they're not really naming one fixed element a `data-qa-id` could attach to).

**Priority key:**

- 🔴 **Critical** — actively blocks a test, or is a pattern repeated fragile-ly across many files/screens
- 🟠 **High** — a real, frequently-used interactive control with a fragile selector today
- 🟡 **Medium** — works today but relies on Angular/library internals (`formcontrolname`, `mat-*`, wildcard `[class*="..."]` matches) that can break on unrelated refactors
- ⚪ **Low** — acceptable as-is per Playwright's own best practices (e.g. `getByRole` with an accessible name, or a purely cosmetic/static element) — a qa-id would be a nice-to-have, not urgent

## Three page objects are already 100% compliant — no action needed

`pages/ai-homework.page.js`, `pages/minimap.page.js`, `pages/playlist.page.js` use
`data-qa-id` for every locator already. Worth pointing developers to these as "what good looks
like" alongside this gap list.

## 🔴 Systemic findings (read this section first)

These aren't single-line fixes — they're patterns repeated across many files, or gaps big enough
to change how a whole screen is instrumented. Fixing these has outsized impact compared to the
line-by-line list below.

1. **The toolbar position-toggle button has no selector at all — not fragile, _absent_.**
   `tests/toolbar/canvas-controls.spec.js` (TB-TOGGLE-01) is currently `test.fail()`'d with the
   reason _"No confirmed selector exists for the toolbar-position toggle control."_ The suite falls
   back to guessing `.leftRightBtn.left button` / `.leftRightBtn.right button` in three different
   spec files (`tests/core-ui/core-ui.spec.js`, `tests/toolbar/extended-coverage.spec.js`,
   `tests/whiteboard/whiteboard.spec.js`) to indirectly infer the toggle's effect instead of testing
   it directly. **Ask for:** `data-qa-id="toolbar-position-toggle-btn"` on the button itself, plus
   `data-qa-id="toolbar-container"` on `.toolbar-container` so its left/right state can be read
   directly instead of via class-name guessing.

2. **The entire Planning-mode app (`/plan/#/canvas`) has zero `data-qa-id` attributes anywhere.**
   Confirmed in `pages/compass.page.js`'s own comments via a full `querySelectorAll('[data-qa-id]')`
   returning empty. Every Planning-mode locator (`questionBankNavItem`, `contentLibraryNavItem`,
   `createQuizBtn`, `createRevisionTestBtn`, etc.) is text/tag-based as a result. This is a separate
   Angular/Nebular app from the Teaching app the rest of the suite drives — worth flagging to
   developers as its own instrumentation gap, not just a handful of missing ids.

3. **The player "close" control has ~8 different fragile selectors guessing at the same button.**
   `pages/player.page.js`'s shared `closeIcon` (`img[alt="close-btn"], img[src*="closeIcon.png"],
button.closeIcon`) already ORs three guesses together, and `PlayerPage.closePlayer()` needs a
   3-attempt retry loop because clicks on it are unreliable. Three more spec files
   (`tests/players/cross-cutting.spec.js` x3, `weblinkCloseBtn` variants) guess again independently.
   **Ask for:** one `data-qa-id="player-close-btn"` used consistently by every player sub-type. This
   single id would let the retry-loop workaround in `closePlayer()` likely be simplified too.

4. **Loading/spinner indicators are guessed via `[class*="spinner"], [class*="loading"]` in at
   least 5 different files** (`tests/attendance/`, `tests/authentication/extended-coverage.spec.js`,
   `tests/playlist/extended-coverage.spec.js`, `tests/user-journeys/user-journeys.spec.js` x2). A
   single `data-qa-id="app-loading-spinner"` on whatever shared spinner component the app uses would
   remove all of these at once.

5. **The Worksheet player screen is the least-instrumented single screen in the app.** Beyond the
   11 items listed under `player.page.js` below, `tests/players/worksheet.spec.js` independently
   guesses at 6 _more_ controls inline (audio/TTS icon, annotation pencil tool, color palette, zoom,
   page navigation) using wildcard `[class*="..."]` matches, because nothing on this screen has an
   id to build a page-object method around. Recommend treating this as one dedicated ask to the dev
   team: "instrument the Worksheet player toolbar," rather than 15+ separate line items.

6. **`ai-notices.page.js`'s `approveBtn`/`discardBtn` are selected by position, not identity**
   (`g[cursor="pointer"]`, `.nth(0)` / `.nth(1)`) — two SVG elements with _identical_ attributes,
   distinguished only by DOM order. If the app ever reorders them, the test silently clicks the
   wrong one instead of failing. This is the single most fragile locator found in the project.

## Page-object-by-page-object list

### `pages/account-management.page.js`

| Line | Current locator              | Element                                    | Suggested `data-qa-id`      | Priority  |
| ---- | ---------------------------- | ------------------------------------------ | --------------------------- | --------- |
| 59   | `mat-chip, .subject-chip`    | Subject chip in Account tab's subject list | `user-profile-subject-chip` | 🟡 Medium |
| 66   | `getByText(/signed in as/i)` | "Signed in as X" row in outer popover      | `toolbar-signed-in-as-row`  | ⚪ Low    |

### `pages/add-resource.page.js`

| Line | Current locator                             | Element                                                                                                           | Suggested `data-qa-id`                    | Priority                                                                                           |
| ---- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 29   | `app-add-custom-asset .add-custom-asset`    | Create Resource form container (also re-typed inline at `tests/add-resource/entry.spec.js:273` — fix both places) | `add-resource-create-form`                | 🟠 High                                                                                            |
| 30   | `.sub-title`                                | Create form subtitle text                                                                                         | `add-resource-create-subtitle`            | ⚪ Low                                                                                             |
| 31   | `input[formcontrolname="title"]`            | Title field                                                                                                       | `add-resource-create-title-input`         | 🟡 Medium                                                                                          |
| 32   | `.invalid-file` (filtered by text)          | "Title required" validation message                                                                               | `add-resource-create-title-error`         | 🟡 Medium                                                                                          |
| 33   | `input[formcontrolname="grade_subject"]`    | Grade & Subject field                                                                                             | `add-resource-create-grade-subject-input` | 🟡 Medium                                                                                          |
| 34   | `input[formcontrolname="chapter_topic"]`    | Chapter & Topic field                                                                                             | `add-resource-create-chapter-topic-input` | 🟡 Medium                                                                                          |
| 35   | `input[type="file"]`                        | File picker input                                                                                                 | `add-resource-create-file-input`          | 🟠 High (generic type selector, could match the wrong input if the form gains a second file field) |
| 36   | `mat-slide-toggle[formcontrolname="share"]` | Share toggle                                                                                                      | `add-resource-create-share-toggle`        | 🟡 Medium                                                                                          |
| 37   | `button[role="switch"]` (nested in above)   | Share toggle's inner button                                                                                       | (covered by the id above once added)      | 🟡 Medium                                                                                          |
| 42   | `.tce-search-library-wrapper`               | Library popup container                                                                                           | `add-resource-library-popup`              | 🟠 High                                                                                            |
| 71   | `.qrcode canvas`                            | Drop It QR code                                                                                                   | `dropit-qr-canvas`                        | 🟡 Medium                                                                                          |
| 72   | `.status.connection-state`                  | Drop It connection status                                                                                         | `dropit-connection-status`                | 🟡 Medium                                                                                          |
| 73   | `.status.transfer-status`                   | Drop It transfer status                                                                                           | `dropit-transfer-status`                  | 🟡 Medium                                                                                          |
| 74   | `.status.upload-status`                     | Drop It upload status                                                                                             | `dropit-upload-status`                    | 🟡 Medium                                                                                          |
| 92   | `getByText('Exercise', exact)`              | AI Assist "Exercise" tab                                                                                          | `ai-assist-tab-exercise`                  | ⚪ Low                                                                                             |
| 93   | `getByText('Videos', exact)`                | AI Assist "Videos" tab                                                                                            | `ai-assist-tab-videos`                    | ⚪ Low                                                                                             |
| 94   | `getByText('Teaching Tips', exact)`         | AI Assist "Teaching Tips" tab                                                                                     | `ai-assist-tab-teaching-tips`             | ⚪ Low                                                                                             |
| 95   | `.exercise-header, .instruction-text`       | AI Assist exercise header                                                                                         | `ai-assist-exercise-header`               | ⚪ Low                                                                                             |
| 99   | `.aierrorscreen`                            | AI Assist error screen                                                                                            | `ai-assist-error-screen`                  | 🟡 Medium                                                                                          |
| 100  | `.aierrorscreen-message`                    | AI Assist error message text                                                                                      | `ai-assist-error-message`                 | 🟡 Medium                                                                                          |

### `pages/ai-notices.page.js`

| Line  | Current locator                                | Element                                            | Suggested `data-qa-id`                                                                          | Priority                                                                                                                                                         |
| ----- | ---------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 27    | `getByText('Notice', exact)`                   | Notice menu item                                   | `toolbar-notice-menu-item`                                                                      | ⚪ Low                                                                                                                                                           |
| 28    | `getByText(/capture the text area/i)`          | Capture instruction banner                         | `ai-notices-capture-banner`                                                                     | ⚪ Low                                                                                                                                                           |
| 32    | `svg rect, svg [class*="selection"]`           | The drag-selection rectangle on the capture canvas | `ai-notices-selection-rect`                                                                     | 🟠 High                                                                                                                                                          |
| 47    | `g[cursor="pointer"]` `.nth(0)`                | Approve button                                     | `ai-notices-approve-btn`                                                                        | 🔴 Critical — see systemic finding #6                                                                                                                            |
| 48    | `g[cursor="pointer"]` `.nth(1)`                | Discard button                                     | `ai-notices-discard-btn`                                                                        | 🔴 Critical — see systemic finding #6                                                                                                                            |
| 55    | `.ql-editor`                                   | Notice body editor (Quill, third-party)            | wrap container as `ai-notices-body-editor` — do not expect a qa-id inside Quill's own internals | 🟡 Medium                                                                                                                                                        |
| 56-58 | `.ql-bold` / `.ql-italic` / `.ql-underline`    | Quill formatting buttons (third-party)             | same note as above                                                                              | ⚪ Low                                                                                                                                                           |
| 66    | `getByText('Recapture')`                       | Recapture button                                   | `ai-notices-recapture-btn`                                                                      | 🟡 Medium                                                                                                                                                        |
| 67    | `getByText('Close', exact)`                    | Close button                                       | `ai-notices-close-btn`                                                                          | 🟡 Medium                                                                                                                                                        |
| 71    | `input[type="checkbox"]` filtered by `hasText` | "Share with [class]" checkbox                      | `ai-notices-share-class-checkbox-{id}`                                                          | 🟠 High — also flag to dev separately: a checkbox usually has no text _children_ to filter by, so this locator may not be matching what it's meant to even today |
| 72    | `getByText(/share with/i)`                     | "Share with" section heading                       | `ai-notices-share-section`                                                                      | ⚪ Low                                                                                                                                                           |
| 74    | `input[type="checkbox"]` (unfiltered)          | Any class-share checkbox                           | `ai-notices-share-any-class-checkbox`                                                           | 🟠 High (fully generic — matches any checkbox on the page)                                                                                                       |
| 77    | `getByText(/touched it up for you              | success/i)`                                        | Success toast                                                                                   | `ai-notices-success-toast`                                                                                                                                       | 🟡 Medium |
| 78    | `getByText(/unable to process                  | please try again/i)`                               | Error toast                                                                                     | `ai-notices-error-toast`                                                                                                                                         | 🟡 Medium |

### `pages/attendance.page.js`

| Line                                                    | Current locator                                    | Element                          | Suggested `data-qa-id`       | Priority                |
| ------------------------------------------------------- | -------------------------------------------------- | -------------------------------- | ---------------------------- | ----------------------- |
| 23                                                      | `.attendance-container .loader-container .spinner` | Loading spinner                  | `attendance-loading-spinner` | 🟡 Medium               |
| 28                                                      | `.date_box, .date-controls .current-date`          | Current date display             | `attendance-date-box`        | 🟠 High                 |
| 29                                                      | `.btn-start`                                       | "Play Attendance" primary action | `attendance-play-btn`        | 🟠 High                 |
| 33                                                      | `.grid-cell`                                       | Attendance grid cell             | `attendance-grid-cell`       | 🟡 Medium               |
| 34                                                      | `.attendance-summary-table`                        | Summary table                    | `attendance-summary-table`   | 🟡 Medium               |
| 40                                                      | `.drag-text`                                       | Drag instruction text            | `attendance-drag-text`       | ⚪ Low                  |
| 41                                                      | `.tce-icon-btn:has(.arrow_left)`                   | Date-back navigation             | `attendance-date-nav-prev`   | 🟠 High                 |
| 42                                                      | `.tce-icon-btn:has(.arrow_right)`                  | Date-forward navigation          | `attendance-date-nav-next`   | 🟠 High                 |
| 43                                                      | `.table-box .row`                                  | Summary table row                | `attendance-summary-row`     | 🟡 Medium               |
| _(spec file)_ `tests/attendance/attendance.spec.js:381` | `text=/Pending                                     | Submitted                        | Marked/i`                    | Attendance status badge | `attendance-status-badge` | 🟠 High |

### `pages/compass.page.js`

| Line | Current locator                                                                     | Element                                   | Suggested `data-qa-id`                                          | Priority  |
| ---- | ----------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------- | --------- |
| 33   | `getByText('Open Widgets')`                                                         | ExploreIt "Open Widgets" link             | `compass-open-widgets-link`                                     | ⚪ Low    |
| 34   | `getByText(/no homework available/i)`                                               | Empty-state message                       | `compass-no-homework-message`                                   | ⚪ Low    |
| 35   | `getByText(/create a new homework/i)`                                               | Empty-state CTA                           | `compass-no-homework-create-link`                               | ⚪ Low    |
| 39   | `getByText('Planning', exact)`                                                      | Planning mode switch option               | see systemic finding #2                                         | 🟠 High   |
| 40   | `getByText('Teaching', exact)`                                                      | Teaching mode switch option               | see systemic finding #2                                         | 🟠 High   |
| 52   | `a` filtered by `hasText: 'Question Bank'`                                          | Planning-mode sidebar nav                 | see systemic finding #2                                         | 🟠 High   |
| 53   | `a` filtered by `hasText: 'Content Library'`                                        | Planning-mode sidebar nav                 | see systemic finding #2                                         | 🟠 High   |
| 54   | `getByText(/create quiz/i)`                                                         | Create Quiz button                        | see systemic finding #2                                         | 🟡 Medium |
| 55   | `getByText(/create revision test/i)`                                                | Create Revision Test button               | see systemic finding #2                                         | 🟡 Medium |
| 56   | `[class*="question-card"], [class*="questionCard"]`                                 | Question bank card                        | see systemic finding #2                                         | 🟡 Medium |
| 57   | `getByRole('button', { name: 'Add Quiz' })`                                         | Add Quiz button                           | acceptable as-is                                                | ⚪ Low    |
| 58   | `input[formcontrolname="title"], input[placeholder*="Title"]`                       | Quiz title input                          | see systemic finding #2                                         | 🟡 Medium |
| 104  | `.compass-menu.open` (also duplicated in `tests/compass/adversarial.spec.js` twice) | Teaching-mode Compass popover, open state | `compass-menu` (with an `open`/`aria-expanded` state attribute) | 🟠 High   |

### `pages/learning-shorts.page.js`

| Line | Current locator                                                         | Element                     | Suggested `data-qa-id`           | Priority  |
| ---- | ----------------------------------------------------------------------- | --------------------------- | -------------------------------- | --------- |
| 30   | `.magnet-submenu, [class*="magnet"]` filtered by "Learning Shorts" text | Magnet submenu entry        | `magnet-submenu-learning-shorts` | 🟡 Medium |
| 87   | `getByText('AI Assist', exact)`                                         | AI Assist confirmation text | `magnet-submenu-ai-assist`       | ⚪ Low    |

### `pages/login.page.js`

| Line | Current locator                                        | Element                                                          | Suggested `data-qa-id`            | Priority                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 36   | `.btn-close`                                           | Modal dismiss ("X")                                              | `login-auth-close-btn`            | 🟠 High                                                                                                                                                                                                    |
| 37   | `getByRole('link', { name: 'Terms' })`                 | Terms link                                                       | acceptable as-is                  | ⚪ Low                                                                                                                                                                                                     |
| 38   | `getByRole('link', { name: 'Privacy Policy' })`        | Privacy Policy link                                              | acceptable as-is                  | ⚪ Low                                                                                                                                                                                                     |
| 40   | `.left-col`                                            | Modal left panel                                                 | `login-auth-left-panel`           | ⚪ Low                                                                                                                                                                                                     |
| 41   | `.right-col`                                           | Modal right panel                                                | `login-auth-right-panel`          | ⚪ Low                                                                                                                                                                                                     |
| 48   | `.keyboard-wrapper` filtered by absence of "Tab" text  | Numeric virtual keypad                                           | `login-numeric-keypad`            | 🔴 Critical — the file's own comment documents having to tell two identical-by-CSS keyboard instances apart by scanning for a "Tab" key; a direct id removes this workaround entirely                      |
| 49   | `.keyboard-wrapper` filtered by presence of "Tab" text | QWERTY virtual keyboard                                          | `login-qwerty-keyboard`           | 🔴 Critical — same as above                                                                                                                                                                                |
| 87   | `xpath=ancestor::mat-form-field`                       | PIN box's wrapping form-field (for the red-border invalid state) | `login-pin-form-field-{i}`        | 🟠 High — an xpath ancestor traversal is one of the most change-fragile locator types possible                                                                                                             |
| 105  | `svg` (`.first()`)                                     | Keypad minimize button icon                                      | `login-pin-keypad-minimize-btn`   | 🟠 High — this exact control is separately documented as reporting "not visible" despite occupying real layout space (PIN-17); a real id would help clarify whether that's a real bug or a locator problem |
| 161  | `.ng-option` filtered by regex                         | School dropdown option                                           | `login-pwd-school-option`         | 🟡 Medium                                                                                                                                                                                                  |
| 164  | `.ng-value`                                            | Selected school chip                                             | `login-pwd-school-selected-value` | ⚪ Low                                                                                                                                                                                                     |

### `pages/navigation.page.js`

| Line | Current locator                                | Element            | Suggested `data-qa-id` | Priority |
| ---- | ---------------------------------------------- | ------------------ | ---------------------- | -------- |
| 23   | `getByRole('tab', { name: 'Recent Classes' })` | Recent Classes tab | acceptable as-is       | ⚪ Low   |
| 24   | `getByRole('tab', { name: 'All My Classes' })` | All My Classes tab | acceptable as-is       | ⚪ Low   |

### `pages/player.page.js` (largest gap concentration — 44 locators)

| Line       | Current locator                                                                                 | Element                                                       | Suggested `data-qa-id`                                                                                                                                                                                   | Priority                              |
| ---------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 16         | `img[alt="close-btn"], img[src*="closeIcon.png"], button.closeIcon`                             | Shared player close control                                   | `player-close-btn`                                                                                                                                                                                       | 🔴 Critical — see systemic finding #3 |
| 26         | `getByRole('button', { name: /launch air card/i })`                                             | Quiz launch button                                            | acceptable as-is                                                                                                                                                                                         | ⚪ Low                                |
| 33         | `getByRole('button', { name: /start/i })`                                                       | Quiz class-strength "Start" button                            | acceptable as-is                                                                                                                                                                                         | ⚪ Low                                |
| 34         | `lib-quiz-renderer`                                                                             | Quiz renderer root                                            | `player-quiz-renderer`                                                                                                                                                                                   | 🟡 Medium                             |
| 35         | `button.closeIcon.btn:not(.m-r4)`                                                               | Quiz close button                                             | covered by `player-close-btn` once added                                                                                                                                                                 | 🟡 Medium                             |
| 36         | `button.closeIcon.btn.m-r4`                                                                     | Quiz split-screen button                                      | `player-quiz-split-screen-btn`                                                                                                                                                                           | 🟡 Medium                             |
| 37         | `.qb-mcq.qb-tempalete`                                                                          | Quiz question container                                       | `player-quiz-question`                                                                                                                                                                                   | 🟠 High                               |
| 38-41      | `.quiz-options-group .option-content*` (4 variants)                                             | Quiz answer options / correct / incorrect                     | `player-quiz-option`, with a `data-state` for correct/incorrect                                                                                                                                          | 🟠 High                               |
| 42-44      | `getByRole('button', {name: 'Submit Answer'/'Show Answer'/'Next Question'})`                    | Quiz controls                                                 | acceptable as-is                                                                                                                                                                                         | ⚪ Low                                |
| 45-48      | `li.page-item.number-item*`, `.previous-item`, `.next-item`                                     | Quiz question pager                                           | `player-quiz-page-{n}`, `player-quiz-page-prev`, `player-quiz-page-next`                                                                                                                                 | 🟡 Medium                             |
| 55         | `iframe` (`.first()`)                                                                           | Video iframe                                                  | `player-video-iframe`                                                                                                                                                                                    | 🟡 Medium                             |
| 56-59      | `.vjs-play-control`, `.vjs-progress-control...`, `.vjs-mute-control`, `.vjs-fullscreen-control` | Video.js controls (third-party)                               | wrap the player container as `player-video-wrapper`; video.js's own internal classes aren't realistic to replace                                                                                         | ⚪ Low (third-party)                  |
| 67         | `.pdf-header, .worksheet-header`                                                                | Worksheet header                                              | see systemic finding #5                                                                                                                                                                                  | 🟠 High                               |
| 68-77      | Worksheet nav/zoom/print/answer-key/annotation (10 locators)                                    | Worksheet toolbar                                             | see systemic finding #5                                                                                                                                                                                  | 🟠 High                               |
| 81-83      | `.player.image-player`, `.image-gallery img...`, image close btn                                | Image player                                                  | `player-image-wrapper`, `player-image-gallery-item`, covered by `player-close-btn`                                                                                                                       | 🟡 Medium                             |
| 87-90, 102 | Weblink wrapper/iframe/close/play-overlay/chain-icon                                            | Weblink player                                                | `player-weblink-wrapper`, etc.; covered by `player-close-btn` for the close control                                                                                                                      | 🟡 Medium                             |
| 101        | `frameLocator(...).getByText(/watch on/i)`                                                      | "Watch on YouTube" text inside the cross-origin YouTube embed | not actionable — this DOM is YouTube's own, not the app's                                                                                                                                                | ⚪ Not applicable                     |
| 105        | `tce-code-main`                                                                                 | Code editor component root                                    | `player-code-editor`                                                                                                                                                                                     | 🟡 Medium                             |
| 106-107    | `.monaco-editor`, `.view-lines`                                                                 | Monaco editor internals (third-party)                         | wrap container only; Monaco's internals aren't realistic to id                                                                                                                                           | ⚪ Low (third-party)                  |
| 108-114    | Language tabs, run button, output frame, settings gear/panel, font/theme selects                | Code editor toolbar                                           | `player-code-lang-tab`, `player-code-run-btn`, `player-code-output-frame`, `player-code-settings-gear`, `player-code-settings-panel` (font/theme `<select>` already have real HTML ids — lower priority) | 🟡 Medium                             |
| 126        | `getByText('No resources found!')`                                                              | Ebook empty state                                             | `player-ebook-no-resources`                                                                                                                                                                              | ⚪ Low                                |
| 129        | `.checkpoint-dashboard, mat-dialog-container, .checkpoint-dialog-panel`                         | Checkpoint dialog root                                        | `player-checkpoint-dialog`                                                                                                                                                                               | 🟡 Medium                             |
| 144        | `getByText(/export.*excel.../i)`                                                                | Excel export button                                           | `player-checkpoint-excel-export-btn`                                                                                                                                                                     | 🟡 Medium                             |
| 145        | `input[type="file"]`                                                                            | Excel upload input                                            | `player-checkpoint-excel-upload-input`                                                                                                                                                                   | 🟠 High (generic type selector)       |

### `pages/toolbar.page.js`

| Line  | Current locator                                                     | Element                                                                         | Suggested `data-qa-id`                                                 | Priority                                                                                     |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 18    | `.toolbar-container`                                                | Toolbar container (docked left/right)                                           | `toolbar-container`                                                    | 🔴 Critical — see systemic finding #1                                                        |
| 23    | `.toolbar-submenu-floating-ui .float-ui-container:visible`          | Open tool sub-panel                                                             | `toolbar-submenu-panel`                                                | 🟡 Medium                                                                                    |
| 27-28 | `svg`, `svg path`                                                   | Whiteboard drawing surface / drawn strokes                                      | not really instrumentable per-stroke; low value to request             | ⚪ Low                                                                                       |
| 31-32 | `.penColorOption`, `.penColorOption.selected`                       | Pen color swatch                                                                | `toolbar-pen-color-option` (with a selected-state attribute)           | 🟡 Medium                                                                                    |
| 46    | `.text-input-container[contenteditable="true"]`                     | Text object editor (duplicated in `whiteboard.page.js` too — DRY issue as well) | `toolbar-text-editor`                                                  | 🟡 Medium                                                                                    |
| 81-82 | `getByText(/saving whiteboard/i)`, `getByText(/whiteboard saved/i)` | Autosave toast                                                                  | `toolbar-autosave-saving-toast`, `toolbar-autosave-saved-toast`        | ⚪ Low                                                                                       |
| 115   | `.toolpadding.changecolor`                                          | "is this tool active" state check                                               | an `aria-pressed` attribute (or qa-id-based state) on each tool button | 🟠 High — comments confirm this exact class-combination check was already found fragile once |

### `pages/whiteboard.page.js`

| Line    | Current locator                                                 | Element                                             | Suggested `data-qa-id`                                                                | Priority  |
| ------- | --------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- | --------- |
| 27      | `.choose-class`                                                 | "Choose a class" primary CTA                        | `whiteboard-choose-class-btn`                                                         | 🟠 High   |
| 28      | `.first-time-user-message`                                      | First-time user message                             | `whiteboard-first-time-message`                                                       | ⚪ Low    |
| 36-37   | `svg`, `svg path`                                               | Drawing surface (duplicated from `toolbar.page.js`) | same as toolbar's, plus: consider sharing one definition instead of two               | ⚪ Low    |
| 38      | `g.svg-pan-zoom_viewport, g#panGroup`                           | Pan/zoom group                                      | `whiteboard-pan-group`                                                                | 🟡 Medium |
| 41      | `foreignObject.text-element`                                    | Text object on canvas                               | `whiteboard-text-object` (may need dev discussion — dynamically-rendered SVG content) | 🟡 Medium |
| 42, 106 | `.text-input-container[contenteditable="true"]`                 | Text editor (duplicated from `toolbar.page.js`)     | `whiteboard-text-editor`                                                              | 🟡 Medium |
| 47-48   | `getByRole('button', {name: /clear whiteboard/i or /cancel/i})` | Clear-confirm dialog buttons                        | acceptable as-is                                                                      | ⚪ Low    |

## Additional cross-cutting gaps found only in spec files (not in any page object)

These bypass the Page Object Model entirely — worth flagging to your own team too, independent of
the qa-id ask, since they mean a future selector change has to be hunted down across spec files
rather than fixed in one page object.

| File:line                                                                                                                     | Current locator                                                           | Element                                           | Suggested `data-qa-id`                                                 | Priority    |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- | ----------- |
| `add-resource/adversarial.spec.js:27,53`                                                                                      | `.invalid-file`                                                           | File validation error                             | `add-resource-create-file-error`                                       | 🟡 Medium   |
| `add-resource/cross-cutting.spec.js:48,55`; `playlist/cross-cutting.spec.js:43,52,69`                                         | `button` filtered by "finish editing" text (5 occurrences across 2 files) | "Finish Editing" button                           | `finish-editing-btn`                                                   | 🟠 High     |
| `ai-assist/ai-assist.spec.js:203`                                                                                             | `iframe[src*="youtube"]`                                                  | AI Assist YouTube embed                           | `ai-assist-youtube-iframe`                                             | 🟡 Medium   |
| `authentication/password-login.spec.js:62`                                                                                    | `.ng-option` filtered by "No items found"                                 | School dropdown empty state                       | `login-pwd-school-no-results`                                          | 🟡 Medium   |
| `compass/compass.spec.js:143`                                                                                                 | `[title="Next"]`                                                          | Compass "Next" control                            | `compass-next-btn`                                                     | 🟡 Medium   |
| `compass/compass.spec.js:545`                                                                                                 | `.openWidget-list`                                                        | ExploreIt widget list                             | `compass-open-widget-list`                                             | 🟡 Medium   |
| `core-ui/core-ui.spec.js:52,75`; `toolbar/extended-coverage.spec.js:316,320,569,570`; `whiteboard/whiteboard.spec.js:628,635` | `.toolbar-container.left` / `.toolbar-container.right`                    | Toolbar docked-side state                         | see systemic finding #1                                                | 🔴 Critical |
| `core-ui/core-ui.spec.js:71`; `toolbar/extended-coverage.spec.js:317,563`; `whiteboard/whiteboard.spec.js:629`                | `.leftRightBtn.left button, .leftRightBtn.right button`                   | Toolbar position toggle                           | see systemic finding #1                                                | 🔴 Critical |
| `gallery/gallery.spec.js:81,277`                                                                                              | `mat-option`                                                              | Gallery dropdown option                           | `gallery-filter-option`                                                | 🟡 Medium   |
| `gallery/gallery.spec.js:108`                                                                                                 | `[class*="pagination"], mat-paginator, .pagination`                       | Gallery pagination                                | `gallery-pagination`                                                   | 🟠 High     |
| `players/code-editor.spec.js` (5 occurrences)                                                                                 | `.editor-wrapper`, `.minimap`                                             | Code editor wrapper state / Monaco minimap        | `player-code-editor-wrapper`; Monaco minimap is third-party, low value | 🟡 Medium   |
| `players/worksheet.spec.js` (6 occurrences)                                                                                   | Various `[class*="..."]` wildcard guesses (audio/pencil/color/zoom)       | Worksheet toolbar controls                        | see systemic finding #5                                                | 🟠 High     |
| `players/ebook.spec.js:184,201,209`                                                                                           | `input[placeholder*="page"]`, `[aria-label*="prev"]`                      | Ebook page-nav controls                           | `player-ebook-goto-page-input`, `player-ebook-prev-btn`                | 🟡 Medium   |
| `playlist/extended-coverage.spec.js:80,152`                                                                                   | `[class*="active"], [class*="selected"]`                                  | Selected/active state indicator                   | prefer `aria-selected` or a qa-id state attribute                      | 🟡 Medium   |
| `playlist/extended-coverage.spec.js:213,217`                                                                                  | `[role="dialog"], .mat-dialog-container`                                  | Generic modal dialog                              | acceptable (Material's own ARIA role)                                  | ⚪ Low      |
| `tce-search-library/tce-search-library.spec.js:323`                                                                           | `img.type-icon`                                                           | Resource type icon                                | `tce-search-result-type-icon`                                          | ⚪ Low      |
| `toolbar/adversarial.spec.js:60`                                                                                              | `foreignObject.text-element, .text-element`                               | Text object (duplicate of whiteboard.page.js gap) | `whiteboard-text-object`                                               | 🟡 Medium   |
| `user-journeys/edge-cases.spec.js:386`                                                                                        | `mat-dialog-container, [class*="feedback"]`                               | Feedback dialog                                   | `feedback-dialog`                                                      | 🟡 Medium   |
| `user-journeys/user-journeys.spec.js:294`                                                                                     | `[class*="close"]`                                                        | Generic close-icon guess                          | covered by `player-close-btn`-style fix                                | 🟠 High     |

## Summary counts

| Priority            | Count (page objects) | Count (spec-file-only)                       |
| ------------------- | -------------------- | -------------------------------------------- |
| 🔴 Critical         | 5                    | 3 (all covered by the same 2 systemic fixes) |
| 🟠 High             | ~28                  | ~6                                           |
| 🟡 Medium           | ~75                  | ~12                                          |
| ⚪ Low / acceptable | ~44                  | ~3                                           |

**If you can only ask developers for a handful of fixes right now**, prioritize the 6 items in the
"Systemic findings" section above — they resolve the Critical items and remove the largest number
of fragile/duplicated selectors per fix.
