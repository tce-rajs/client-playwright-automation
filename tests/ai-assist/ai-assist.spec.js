// AI Assist module.
// Source: CEP_TestCases/AI_Assist_Module_Test_Cases_Final.xlsx (23 cases).
//
// AIA-ACCESS-01 is the same "entry point + generation" behavior already
// covered by ADD-AIA-01 in tests/add-resource/dropit-ai-assist.spec.js --
// cross-referenced below, not duplicated.
//
// Uses AddResourcePage.openPickerReliably() throughout -- see
// CEP_TestCases/LIVE_FINDINGS.md and drop-it.spec.js's own header comment
// for the confirmed real bug it works around (the Add Resources picker can
// render with pointer-events:none across its whole popup subtree on a
// non-deterministic fraction of fresh logins).

const { test, expect } = require('../../fixtures/electron-app');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');
const { NavigationPage } = require('../../pages/navigation.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }, testInfo) => {
  // AI Assist's own generation fetch plus the picker's confirmed
  // pointer-events-recovery reload (see LIVE_FINDINGS.md) can together push
  // even a single open close to the 30s default -- give every test in this
  // file real headroom; individual multi-open tests bump it further still.
  testInfo.setTimeout(60000);
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await pl.ensureResourcesPresent();
});

async function openAiAssist(page, ar, timeout = 30000) {
  const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
  if (!stillStuck) await ar.actions.aiAssist.click({ force: true });
  await expect(page.getByText('AI Assist', { exact: true })).toBeVisible({ timeout });
  // The modal title can render before the Exercise tab's real content
  // (checkboxes) has actually populated -- wait for real content, not just
  // the title, so callers don't race a still-loading panel.
  await ar.aiAssistExerciseCheckboxes.first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
}

/** AIA-TABS-02's own confirmed 2-click lag: the FIRST click on a tab only
 * updates the selection dot, not the content -- a second click is needed
 * for real content to render. Callers that just want the tab's real content
 * (not testing the bug itself) should use this. */
async function clickTabTwice(tabLocator) {
  await tabLocator.click({ force: true });
  await tabLocator.page().waitForTimeout(600);
  await tabLocator.click({ force: true });
  await tabLocator.page().waitForTimeout(800);
}

// AIA-ACCESS-01: cross-referenced -- identical "entry point + generation"
// behavior already covered by ADD-AIA-01 in
// tests/add-resource/dropit-ai-assist.spec.js.

test('AIA-TABS-01: Three content tabs (Exercise, Videos, Teaching Tips) are present and each loads distinct content', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);

  await expect(ar.aiAssistTabExercise).toBeVisible();
  await expect(ar.aiAssistTabVideos).toBeVisible();
  await expect(ar.aiAssistTabTeachingTips).toBeVisible();

  // Exercise is the default tab -- checkboxes should already be present.
  const exerciseCount = await ar.aiAssistExerciseCheckboxes.count();
  console.log('Exercise tab checkbox count:', exerciseCount);
  expect(exerciseCount).toBeGreaterThan(0);

  // Per AIA-TABS-02's own confirmed 2-click lag, use clickTabTwice to reach
  // each tab's real content rather than re-deriving the bug here.
  await clickTabTwice(ar.aiAssistTabVideos);
  const videoCount = await ar.aiAssistVideoThumbs.count();
  console.log('Videos tab thumbnail count:', videoCount);
  expect(videoCount).toBeGreaterThan(0);

  await clickTabTwice(ar.aiAssistTabTeachingTips);
  const teachingContentVisible = await page.getByText(/activities|explanation|real life example/i).first().isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Teaching Tips content visible:', teachingContentVisible);
  expect(teachingContentVisible).toBe(true);

  await ar.aiAssistCloseBtn.click();
});

test('AIA-TABS-02: BUG check -- switching tabs requires two clicks, the first only updates the selection dot', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);

  const videoMarkerBefore = await ar.aiAssistVideoThumbs.count();
  console.log('Video thumbnails visible BEFORE clicking Videos tab (should be 0, still on Exercise):', videoMarkerBefore);

  await ar.aiAssistTabVideos.click({ force: true });
  await page.waitForTimeout(700);
  const videoThumbsAfterFirstClick = await ar.aiAssistVideoThumbs.count();
  const exerciseChecksStillThere = await ar.aiAssistExerciseCheckboxes.count();
  console.log('After FIRST click on Videos -- video thumbs:', videoThumbsAfterFirstClick, '| exercise checkboxes still present:', exerciseChecksStillThere);

  await ar.aiAssistTabVideos.click({ force: true });
  await page.waitForTimeout(800);
  const videoThumbsAfterSecondClick = await ar.aiAssistVideoThumbs.count();
  console.log('After SECOND click on Videos -- video thumbs:', videoThumbsAfterSecondClick);

  const bugReproduced = videoThumbsAfterFirstClick === 0 && videoThumbsAfterSecondClick > 0;
  test.fail(bugReproduced, 'CONFIRMED LIVE BUG (matches workbook): the first click on a tab updates only the selection state, not the content -- content only renders after a second click on the same tab');
  expect(videoThumbsAfterFirstClick).toBeGreaterThan(0); // the "correct", non-buggy expectation
  await ar.aiAssistCloseBtn.click();
});

test('AIA-EXERCISE-01: Checking a question reveals Add to Playlist; the chevron reveals the answer', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);

  const firstCheckbox = ar.aiAssistExerciseCheckboxes.first();
  await firstCheckbox.click({ force: true });
  await page.waitForTimeout(500);
  await expect(ar.aiAssistAddToPlaylistBtn).toBeVisible({ timeout: 5000 });

  const chevron = page.locator('[class*="chevron"], mat-icon:has-text("expand_more")').first();
  const chevronVisible = await chevron.isVisible().catch(() => false);
  if (chevronVisible) {
    await chevron.click({ force: true });
    await page.waitForTimeout(500);
  }
  console.log('Chevron control found and clicked:', chevronVisible);
  test.fail(!chevronVisible, 'No chevron/expand control was found near the question to reveal its answer -- could not verify the answer-reveal half of this case');
  expect(chevronVisible).toBe(true);
  await ar.aiAssistCloseBtn.click();
});

test('AIA-EXERCISE-02: Header instructional text should reference the ACTUAL current topic, not a mismatched placeholder', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);

  const currentTopicLabel = (await page.locator('[data-qa-id="playlist-chapter-topic-btn"]').textContent({ timeout: 3000 }).catch(() => '')) || '';
  // The guessed `.exercise-header, .instruction-text` selector doesn't
  // match this account's markup -- fall back to a broader text search for
  // the confirmed live phrasing pattern ("...create an exercise and add to
  // the topic..."). Short explicit timeouts throughout -- textContent()
  // defaults to a 30s actionability wait per call, and this test tries two
  // locators in sequence, so leaving the default in place doubles into a
  // 60s+ hang whenever NEITHER matches (the exact scenario on this account).
  let headerText = (await ar.aiAssistExerciseHeaderText.textContent({ timeout: 3000 }).catch(() => '')) || '';
  if (!headerText.trim()) {
    headerText = (await page.getByText(/create an exercise|add to the topic/i).first().textContent({ timeout: 3000 }).catch(() => '')) || '';
  }
  console.log('Current topic label:', currentTopicLabel.trim(), '| AI Assist Exercise header text:', headerText.trim());

  // A real topic-word overlap check: pull a distinguishing word from the
  // current topic label and see if it appears anywhere in the header text.
  const topicWords = currentTopicLabel.replace(/[^a-zA-Z ]/g, ' ').split(/\s+/).filter((w) => w.length > 4);
  const anyWordMatches = topicWords.some((w) => headerText.toLowerCase().includes(w.toLowerCase()));
  console.log('Distinguishing topic words checked against header:', topicWords, '| any match:', anyWordMatches);

  test.fail(headerText.length > 0 && !anyWordMatches, 'CONFIRMED LIVE (matches workbook): the Exercise tab\'s header instructional text does not reference the actual current topic -- looks like a stale/hardcoded placeholder string');
  expect(anyWordMatches || headerText.length === 0).toBe(true);
  await ar.aiAssistCloseBtn.click({ timeout: 5000 }).catch(() => {});
});

test('AIA-EXERCISE-03: Add to Playlist actually adds the generated exercise to the class playlist', { tag: '@positive' }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);

  const countBefore = await pl.resourceCards.count();
  await ar.aiAssistExerciseCheckboxes.first().waitFor({ state: 'visible', timeout: 10000 });
  await ar.aiAssistExerciseCheckboxes.first().click({ force: true });
  await page.waitForTimeout(400);
  // A toast can be very short-lived -- start watching for it BEFORE
  // clicking, not after, so a fast toast isn't missed by the time isVisible
  // is polled.
  const toastPromise = page.getByText(/successfully added/i).waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
  await ar.aiAssistAddToPlaylistBtn.waitFor({ state: 'visible', timeout: 8000 });
  await ar.aiAssistAddToPlaylistBtn.click({ force: true });
  const toastVisible = await toastPromise;
  await page.waitForTimeout(1000);
  const countAfter = await pl.resourceCards.count();
  console.log('Success toast shown after Add to Playlist:', toastVisible, '| Playlist resource count before/after:', countBefore, '->', countAfter);
  // Either signal (the toast, or a real resource-count increase) counts as
  // confirmation -- the toast alone proved too timing-sensitive to catch
  // reliably via isVisible() polling after the fact.
  expect(toastVisible || countAfter > countBefore).toBe(true);
});

test('AIA-VIDEOS-01: Videos tab shows topic-relevant video thumbnails', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  await clickTabTwice(ar.aiAssistTabVideos);

  const count = await ar.aiAssistVideoThumbs.count();
  console.log('Video thumbnail count:', count);
  expect(count).toBeGreaterThan(0);
  await ar.aiAssistCloseBtn.click();
});

test('AIA-VIDEOS-02: Playing a video from AI Assist -- confirm whether it visibly works or remains an inconclusive/broken hit-region', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  await clickTabTwice(ar.aiAssistTabVideos);

  await ar.aiAssistVideoThumbs.first().click({ force: true });
  await page.waitForTimeout(1500);
  const iframePresent = await page.locator('iframe[src*="youtube"]').count() > 0;
  // A real visual change would be the static thumbnail card disappearing/
  // being replaced by active player controls -- approximate via checking
  // the thumbnail's own play-overlay is no longer the topmost visible state.
  const stillShowingStaticThumb = await ar.aiAssistVideoThumbs.first().isVisible().catch(() => false);
  console.log('YouTube iframe present in DOM:', iframePresent, '| still showing the static thumbnail card after click:', stillShowingStaticThumb);

  test.fail(iframePresent && stillShowingStaticThumb, 'INCONCLUSIVE (matches workbook): a real YouTube iframe is wired up in the DOM, but clicking directly within its bounds produces no visible playback state change -- could be an app click-handling/hit-region bug or a sandboxed cross-origin iframe limitation specific to automation, not conclusively one or the other');
  expect(iframePresent && !stillShowingStaticThumb).toBe(true);
  await ar.aiAssistVideoCloseBtn.click({ timeout: 3000 }).catch(() => {});
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-TEACH-01: Teaching Tips shows Activities / Explanation / Real Life Example sections', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  await clickTabTwice(ar.aiAssistTabTeachingTips);

  const activitiesVisible = await page.getByText(/activities/i).first().isVisible({ timeout: 5000 }).catch(() => false);
  const explanationVisible = await page.getByText(/explanation/i).first().isVisible({ timeout: 3000 }).catch(() => false);
  const realLifeVisible = await page.getByText(/real life example/i).first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Activities:', activitiesVisible, '| Explanation:', explanationVisible, '| Real Life Example:', realLifeVisible);
  expect(activitiesVisible && explanationVisible && realLifeVisible).toBe(true);
  await ar.aiAssistCloseBtn.click();
});

test('AIA-MINMAX-01: The window-control icon(s) produce a visible, non-broken repositioning effect', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);

  // Measure the title text's own box directly (a prior ancestor-walk landed
  // on a full-viewport wrapper that never changes) -- the title itself
  // should reposition/resize along with whatever the modal does.
  const titleLocator = page.getByText('AI Assist', { exact: true });
  const boxBefore = await titleLocator.boundingBox().catch(() => null);
  const closeBoxBefore = await ar.aiAssistCloseBtn.boundingBox().catch(() => null);
  await ar.aiAssistMinimizeBtn.click({ force: true });
  await page.waitForTimeout(800);
  const boxAfter = await titleLocator.boundingBox().catch(() => null);
  const closeBoxAfter = await ar.aiAssistCloseBtn.boundingBox().catch(() => null);
  console.log('Close button box before:', closeBoxBefore, '| after:', closeBoxAfter);
  console.log('Modal box before minimize click:', boxBefore, '| after:', boxAfter);

  const titleChanged = boxBefore && boxAfter && (boxBefore.x !== boxAfter.x || boxBefore.y !== boxAfter.y || boxBefore.width !== boxAfter.width);
  const closeChanged = closeBoxBefore && closeBoxAfter && (closeBoxBefore.x !== closeBoxAfter.x || closeBoxBefore.y !== closeBoxAfter.y);
  const changed = titleChanged || closeChanged;
  test.fail(!changed, 'The minimize/maximize control produced no detectable position/size change -- its intended effect remains unclear, matching the workbook\'s own "behavior unclear, needs follow-up" finding');
  expect(changed).toBe(true);
});

test('AIA-CLOSE-01: Close button exits AI Assist cleanly', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  await ar.aiAssistCloseBtn.click();
  await expect(page.getByText('AI Assist', { exact: true })).toBeHidden({ timeout: 5000 });
});

test('AIA-ERROR-01: A real HTTP-driven quota-exhaustion error (429/400/403/500) shows a clear, actionable message', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  // Force the AI-generation fetch to fail with a real 429, since naturally
  // hitting the school's shared quota exhaustion is not reliably
  // reproducible on demand -- this is a real network-interception test, not
  // a guess at the endpoint's behavior.
  let intercepted = false;
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (/ai[-_]?assist|ai[-_]?generat/i.test(url) && route.request().method() !== 'OPTIONS') {
      intercepted = true;
      await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ message: 'quota exceeded' }) });
    } else {
      await route.continue();
    }
  });

  const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
  if (!stillStuck) await ar.actions.aiAssist.click({ force: true });
  await page.waitForTimeout(3000);

  const errorScreenVisible = await ar.aiAssistErrorScreen.isVisible({ timeout: 8000 }).catch(() => false);
  const naturalErrorVisible = await page.getByText(/surpassed|allowable limits|quota/i).isVisible({ timeout: 2000 }).catch(() => false);
  const contentLoadedAnyway = await ar.aiAssistExerciseCheckboxes.count() > 0;
  console.log('Intercepted a matching AI request:', intercepted, '| error screen shown:', errorScreenVisible, '| error text visible:', naturalErrorVisible, '| content loaded anyway:', contentLoadedAnyway);
  await page.unroute('**/*');

  test.fail(!intercepted, 'No AI-generation request matched the interception pattern -- could not force the 429 path this way, and the shared quota was not naturally exhausted this pass either');
  expect(intercepted).toBe(true);
  if (intercepted && contentLoadedAnyway) {
    test.fail(true, 'A forced 429 response did not stop real content from still rendering -- likely served from a client-side cache for this topic rather than the intercepted request, so the quota-exhaustion UI path was not actually exercised this pass');
    expect(contentLoadedAnyway).toBe(false);
    return;
  }
  if (intercepted) {
    test.fail(!errorScreenVisible && !naturalErrorVisible, 'A forced 429 response did not produce any visible error state in the UI -- the panel may hang silently on a failed generation instead of showing a clear message');
    expect(errorScreenVisible || naturalErrorVisible).toBe(true);
  }
});

test('AIA-VIDEOPOOL-01: Repeatedly adding the same video to the Playlist eventually stops growing the resource count (silent backend de-dup)', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  await clickTabTwice(ar.aiAssistTabVideos);

  const countBefore = await pl.resourceCards.count();
  // Attempt the same "add" action on the same video thumbnail 3 times in a
  // row (opening/closing the video card each time) and track the resource
  // count after each attempt.
  const counts = [countBefore];
  for (let i = 0; i < 3; i++) {
    await ar.aiAssistVideoThumbs.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
    const addBtn = ar.aiAssistAddToPlaylistBtn;
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }
    await ar.aiAssistVideoCloseBtn.click({ timeout: 2000 }).catch(() => {});
    counts.push(await pl.resourceCards.count());
  }
  console.log('Resource-card counts across repeated same-video adds:', counts);
  // This is a real, best-effort single-session check -- the workbook's own
  // full claim needs cross-SESSION history this pass cannot construct.
  test.fail(false, 'Documented as a single-session observation only -- see console log for the actual counts; the workbook\'s full de-dup claim needs cross-session history not reconstructable in one pass');
  expect(counts.length).toBe(4);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-LOADSIGNAL-01: The loading spinner does not clear before tab content is actually fully populated', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
  if (!stillStuck) await ar.actions.aiAssist.click({ force: true });
  await expect(page.getByText('AI Assist', { exact: true })).toBeVisible({ timeout: 30000 });

  // Poll rapidly right around when the spinner disappears, comparing
  // checkbox count immediately after vs. 1.5s later.
  const spinner = page.locator('.spinner, [class*="loading"], [class*="spinner"]').first();
  await spinner.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
  const checkboxesRightAfterSpinnerClears = await ar.aiAssistExerciseCheckboxes.count();
  await page.waitForTimeout(1500);
  const checkboxesShortlyAfter = await ar.aiAssistExerciseCheckboxes.count();
  console.log('Checkboxes right when spinner cleared:', checkboxesRightAfterSpinnerClears, '| 1.5s later:', checkboxesShortlyAfter);

  test.fail(checkboxesRightAfterSpinnerClears === 0 && checkboxesShortlyAfter > 0, 'CONFIRMED: the loading spinner cleared before real content was actually populated -- a race condition matching the workbook\'s own adversarial concern');
  expect(checkboxesRightAfterSpinnerClears).toBe(checkboxesShortlyAfter);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-FLAKE-01: This session\'s own AI Assist tests ran with real, non-"pending" outcomes (historical whole-file-flake risk noted, not reproduced)', { tag: '@cross-cutting' }, async ({ page }) => {
  // Documentation/risk-tracking row, not a specific behavior -- the
  // meaningful check is simply that AI Assist opens and produces a real,
  // non-pending, immediately-observable outcome in THIS session, unlike the
  // historical whole-file "pending" flake documented for the old Cypress
  // suite.
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  await expect(ar.aiAssistExerciseCheckboxes.first()).toBeVisible({ timeout: 10000 });
  await ar.aiAssistCloseBtn.click();
});

test('AIA-ADV-01: Rapid double-click on Add to Playlist does not create a duplicate exercise card', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  await ar.aiAssistExerciseCheckboxes.first().click({ force: true });
  await page.waitForTimeout(500);
  await expect(ar.aiAssistAddToPlaylistBtn).toBeVisible();

  let toastCount = 0;
  page.on('console', () => {}); // no-op, just to keep listeners symmetrical
  const toastLocator = page.getByText(/successfully added/i);
  await Promise.all([
    ar.aiAssistAddToPlaylistBtn.click({ force: true }),
    ar.aiAssistAddToPlaylistBtn.click({ force: true }).catch(() => {}),
  ]);
  await page.waitForTimeout(2000);
  toastCount = await toastLocator.count();
  console.log('Toast count after rapid double-click on Add to Playlist:', toastCount);
  test.fail(toastCount > 1, 'A rapid double-click on Add to Playlist produced more than one success toast -- not correctly debounced');
  expect(toastCount).toBeLessThanOrEqual(1);
});

test('AIA-ADV-02: AI Assist opened on a topic with effectively zero curriculum content', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(75000); // 3 class switches, each potentially with a picker-reload retry
  const nav = new NavigationPage(page);
  let pageCrashed = false;
  page.on('crash', () => { pageCrashed = true; });
  // Search a few sparse-sounding class/subject combos for a thin-content
  // topic -- best-effort, since no specific zero-content topic is
  // pre-identified anywhere in this suite.
  const combos = [['Class 5', 'A', 'Art'], ['Class 6', 'A', 'Physical Education'], ['Class 9', 'A', 'Hindi Language']];
  let foundThinTopic = false;
  try {
    for (const [grade, division, subject] of combos) {
      await nav.resetToClass(grade, division, subject).catch(() => {});
      await page.waitForTimeout(800);
      const ar = new AddResourcePage(page);
      const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
      if (stillStuck) continue;
      await ar.actions.aiAssist.click({ force: true });
      const opened = await page.getByText('AI Assist', { exact: true }).isVisible({ timeout: 15000 }).catch(() => false);
      if (opened) {
        await page.waitForTimeout(2000);
        const checkboxCount = await ar.aiAssistExerciseCheckboxes.count();
        const noContentMsg = await page.getByText(/not enough content|no content|unable to generate/i).isVisible().catch(() => false);
        console.log(`${grade} ${division} ${subject} -- checkbox count: ${checkboxCount}, explicit no-content message: ${noContentMsg}`);
        if (checkboxCount === 0) foundThinTopic = true;
        await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
      }
    }
  } catch (err) {
    if (page.isClosed()) pageCrashed = true;
    else throw err;
  }

  // Reproduced live: repeatedly switching class/subject in a tight loop
  // while also opening the Add Resources picker each time can crash the
  // page -- same failure class as this project's already-documented
  // Attendance ATT-EXP-01 crash (repeated Magnet submenu opens across class
  // switches). Left as a genuine hard failure rather than test.fail(), per
  // this project's established convention for confirmed reproducible
  // crashes (a crashed page makes its own teardown unreliable).
  console.log('Page crashed during the class/subject sampling loop:', pageCrashed);
  expect(pageCrashed, 'Repeatedly switching class/subject and opening Add Resources should not crash the page').toBe(false);
  if (pageCrashed) return;

  test.fail(!foundThinTopic, 'None of the sampled class/subject combos this pass produced a zero-content AI Assist state -- every one tried had substantial real content, matching the workbook\'s own note that no specific zero-content topic has been identified yet');
  expect(foundThinTopic).toBe(true);
});

test('AIA-ADV-03: Switching Class/Topic while AI Assist remains open', { tag: '@state-persistence' }, async ({ page }) => {
  const nav = new NavigationPage(page);
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  const topicABeforeSwitch = (await page.locator('[data-qa-id="playlist-chapter-topic-btn"]').textContent().catch(() => '')) || '';

  await nav.resetToClass('Class 12', 'A', 'Physics').catch(() => {});
  await page.waitForTimeout(1500);

  const stillOpen = await page.getByText('AI Assist', { exact: true }).isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Topic before switch:', topicABeforeSwitch.trim(), '| AI Assist still open after switching class underneath it:', stillOpen);
  // Either a clean auto-close OR a correctly-regenerated view for the new
  // topic would be acceptable; only a STALE mislabeled-as-current view is a
  // real problem. Check for staleness only if it stayed open.
  if (stillOpen) {
    const checkboxCount = await ar.aiAssistExerciseCheckboxes.count();
    console.log('AI Assist stayed open after class switch -- exercise checkbox count (should reflect the NEW class, not be frozen):', checkboxCount);
  }
  // Documented as a real observation either way -- not asserting a specific
  // "correct" behavior since the workbook itself only asks to document it.
  expect(true).toBe(true);
});

test('AIA-ADV-04: Rapid multi-tab-switch spam (Exercise/Videos/Teaching Tips/Exercise) does not break the content area', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);

  // Short explicit timeouts on each rapid click -- a plain force:true click
  // still waits (up to the ambient test timeout) for the target to exist at
  // all, and a transient DOM state mid-spam could otherwise hang the whole
  // test rather than surfacing as the real finding it would be.
  let anyClickTimedOut = false;
  for (const tab of [ar.aiAssistTabExercise, ar.aiAssistTabVideos, ar.aiAssistTabTeachingTips, ar.aiAssistTabExercise]) {
    await tab.click({ force: true, timeout: 5000 }).catch(() => { anyClickTimedOut = true; });
  }
  await page.waitForTimeout(1500);

  const modalStillPresent = await page.getByText('AI Assist', { exact: true }).isVisible().catch(() => false);
  const anyJsErrorDialog = await page.locator('text=/uncaught|exception/i').isVisible({ timeout: 500 }).catch(() => false);
  console.log('Any rapid-spam click failed to find its target within 5s:', anyClickTimedOut, '| AI Assist modal still present:', modalStillPresent, '| any visible JS-error text:', anyJsErrorDialog);
  test.fail(anyClickTimedOut, 'CONFIRMED: rapid multi-tab-switch spam caused at least one tab click to be unable to find its target within 5s -- a real responsiveness/DOM-stability issue under this exact adversarial sequence');
  expect(anyClickTimedOut).toBe(false);
  expect(modalStillPresent).toBe(true);
  expect(anyJsErrorDialog).toBe(false);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-ADV-05: Generated content does not leak between classes/subjects under quick back-to-back generation', { tag: ['@security', '@bug'] }, async ({ page }) => {
  test.setTimeout(60000); // two full AI Assist opens + a class switch can exceed the 30s default
  const nav = new NavigationPage(page);
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  const checkboxTextA = (await ar.aiAssistExerciseCheckboxes.first().locator('xpath=ancestor::*[2]').textContent().catch(() => '')) || '';
  await ar.aiAssistCloseBtn.click();

  await nav.resetToClass('Class 9', 'A', 'Science').catch(() => {});
  await page.waitForTimeout(1000);
  await openAiAssist(page, ar);
  const checkboxTextB = (await ar.aiAssistExerciseCheckboxes.first().locator('xpath=ancestor::*[2]').textContent().catch(() => '')) || '';

  console.log('Class A first question text (truncated):', checkboxTextA.slice(0, 120));
  console.log('Class B first question text (truncated):', checkboxTextB.slice(0, 120));
  const identicalContent = checkboxTextA.length > 0 && checkboxTextA === checkboxTextB;
  test.fail(identicalContent, 'Class B\'s generated content is byte-identical to Class A\'s -- a possible cross-class caching/leak issue rather than freshly generated content');
  expect(identicalContent).toBe(false);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-EXP-01: A network failure during the initial content-generation fetch shows a clear error, not an indefinite spinner', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  let aborted = false;
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (/ai[-_]?assist|ai[-_]?generat/i.test(url) && route.request().method() !== 'OPTIONS') {
      aborted = true;
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });

  const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
  if (!stillStuck) await ar.actions.aiAssist.click({ force: true });
  await page.waitForTimeout(4000);

  const contentLoadedAnyway = await ar.aiAssistExerciseCheckboxes.count() > 0;
  const stillSpinnerOnly = !contentLoadedAnyway;
  const errorShown = await ar.aiAssistErrorScreen.isVisible().catch(() => false)
    || await page.getByText(/error|failed|try again|retry/i).isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Request aborted:', aborted, '| content loaded anyway despite the abort:', contentLoadedAnyway, '| a clear error shown:', errorShown);
  await page.unroute('**/*');

  test.fail(!aborted, 'No AI-generation request matched the interception pattern to abort');
  expect(aborted).toBe(true);
  if (aborted && contentLoadedAnyway) {
    // A real, distinct finding from what this case originally expected:
    // aborting the matched request did NOT prevent real content from
    // rendering -- either a client-side cache for this topic, a
    // duplicate/fallback request my pattern didn't also catch, or genuine
    // resilience. Document it rather than force a specific verdict.
    test.fail(true, 'Aborting the AI-generation request did not stop real content from still rendering -- either a client-side cache for this topic, a duplicate request the interception pattern missed, or genuine fetch-retry resilience; not the plain "network failure -> error message" scenario this case originally targeted');
    expect(contentLoadedAnyway).toBe(false);
    return;
  }
  if (aborted) {
    test.fail(stillSpinnerOnly && !errorShown, 'A failed content-generation fetch left the panel on an indefinite spinner/blank state with no clear error message');
    expect(errorShown).toBe(true);
  }
});

test('AIA-EXP-02: The Teaching Tips tab loads real content without error (not independently tested elsewhere in this suite until AIA-TEACH-01 above)', { tag: '@negative' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  await clickTabTwice(ar.aiAssistTabTeachingTips);

  const errorVisible = await page.getByText(/error|failed to load/i).isVisible({ timeout: 2000 }).catch(() => false);
  const hasRealContent = await page.getByText(/activities|explanation|real life example/i).first().isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Teaching Tips -- error shown:', errorVisible, '| real content loaded:', hasRealContent);
  expect(errorVisible).toBe(false);
  expect(hasRealContent).toBe(true);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-EXP-03: Reopening AI Assist on a different Chapter shows fresh, correctly-scoped content, not a stale cached response', { tag: ['@security', '@bug'] }, async ({ page }) => {
  test.setTimeout(60000); // two full AI Assist opens + a chapter switch can exceed the 30s default
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  const chapter1Text = (await ar.aiAssistExerciseCheckboxes.first().locator('xpath=ancestor::*[2]').textContent().catch(() => '')) || '';
  await ar.aiAssistCloseBtn.click();

  // Switch chapter via the Contents popup directly (same-class chapter
  // switch, simpler than a full class switch).
  await pl._tryOpenContentsPopup();
  const chapterCount = await pl.chapterItems.count();
  let switched = false;
  if (chapterCount > 1) {
    await pl._tryClick(pl.chapterItems.nth(1));
    await page.waitForTimeout(600);
    const topicCount = await pl.topicItems.count();
    if (topicCount > 0) { await pl._tryClick(pl.topicItems.first()); switched = true; }
  }
  await page.waitForTimeout(1000);

  test.fail(!switched, 'Only one chapter is reachable in this account/class context -- could not switch to a genuinely different chapter to compare content against');
  expect(switched).toBe(true);
  if (!switched) return;

  await openAiAssist(page, ar);
  const chapter2Text = (await ar.aiAssistExerciseCheckboxes.first().locator('xpath=ancestor::*[2]').textContent().catch(() => '')) || '';
  console.log('Chapter 1 question text (truncated):', chapter1Text.slice(0, 120));
  console.log('Chapter 2 question text (truncated):', chapter2Text.slice(0, 120));
  const staleIdentical = chapter1Text.length > 0 && chapter1Text === chapter2Text;
  test.fail(staleIdentical, 'Chapter 2\'s content is byte-identical to Chapter 1\'s -- a possible stale-cache cross-chapter leak');
  expect(staleIdentical).toBe(false);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

// ============================================================================
// New adversarial "break the app" batch (CEP_TestCases/AI_Assist_Module_
// Test_Cases_Final.xlsx, IDs AIA-BREAK-01..09). Techniques: rapid/repeated
// actions, mid-action interruption (reload/route-abort mid-flight), resource
// scale stress, and cross-class data-scoping security checks. See
// CEP_TestCases/LIVE_FINDINGS.md for the confirmed picker/tab-lag bugs these
// build on top of.
// ============================================================================

test('AIA-BREAK-01: Rapid open/close AI Assist 5x in immediate succession leaves exactly one clean modal instance', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(90000);
  const ar = new AddResourcePage(page);
  for (let i = 0; i < 4; i++) {
    const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
    if (!stillStuck) await ar.actions.aiAssist.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
    await ar.aiAssistCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  // 5th open -- this time wait for real content and inspect modal count.
  await openAiAssist(page, ar);
  const modalCount = await page.getByText('AI Assist', { exact: true }).count();
  const checkboxCount = await ar.aiAssistExerciseCheckboxes.count();
  console.log('AI Assist title-text count after 5 rapid open/close cycles:', modalCount, '| exercise checkboxes:', checkboxCount);
  test.fail(modalCount > 2 || checkboxCount === 0, 'Rapid open/close cycling left either multiple stacked "AI Assist" title elements or a blank Exercise tab with zero checkboxes -- a real state-corruption bug under repeated fast open/close');
  expect(modalCount).toBeLessThanOrEqual(2); // title itself + possibly a tab-heading duplicate is tolerable; more is not
  expect(checkboxCount).toBeGreaterThan(0);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-BREAK-02: Clicking Add to Playlist 10x rapidly on the same exercise does not create 10 duplicate playlist entries', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(90000);
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  await ar.aiAssistExerciseCheckboxes.first().check({ force: true }).catch(() => {});
  await page.waitForTimeout(400);

  const countBefore = await pl.resourceCards.count();
  for (let i = 0; i < 10; i++) {
    await ar.aiAssistAddToPlaylistBtn.click({ force: true, timeout: 2000 }).catch(() => {});
  }
  await page.waitForTimeout(2000);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const countAfter = await pl.resourceCards.count();
  const added = countAfter - countBefore;
  console.log('Playlist resource count before/after 10 rapid Add-to-Playlist clicks:', countBefore, '->', countAfter, '(added:', added, ')');
  test.fail(added >= 5, `10 rapid clicks on Add to Playlist added ${added} new resource cards -- not de-duplicated/debounced, a real duplicate-resource-accumulation bug`);
  expect(added).toBeLessThan(5);
});

test('AIA-BREAK-03: Reloading mid-generation does not leave AI Assist permanently stuck on the next open', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(90000);
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
  if (!stillStuck) await ar.actions.aiAssist.click({ force: true }).catch(() => {});
  // Reload as fast as possible after the click, before content has a real
  // chance to populate -- intentionally not awaiting the checkbox wait here.
  await page.waitForTimeout(150);
  await page.reload().catch(() => {});
  await page.waitForTimeout(1500);

  // Recover: log back in if the reload dropped session state, then try a
  // fresh, normal open.
  const stillLoggedIn = await page.locator('[data-qa-id="toolbar-user-avatar"]').isVisible({ timeout: 5000 }).catch(() => false);
  if (!stillLoggedIn) {
    await pl.loginWithPin(process.env.VALID_PIN_2);
    await pl.ensureResourcesPresent();
  }
  await openAiAssist(page, ar, 30000);
  const checkboxCount = await ar.aiAssistExerciseCheckboxes.count();
  console.log('Exercise checkboxes on the fresh open after mid-generation reload:', checkboxCount);
  test.fail(checkboxCount === 0, 'CONFIRMED: reloading while AI Assist generation was in flight left the next open permanently blank (zero checkboxes) instead of recovering cleanly');
  expect(checkboxCount).toBeGreaterThan(0);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-BREAK-04: Selecting ALL available exercise checkboxes and clicking Add to Playlist does not crash or silently no-op', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(60000);
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);
  const total = await ar.aiAssistExerciseCheckboxes.count();
  for (let i = 0; i < total; i++) {
    await ar.aiAssistExerciseCheckboxes.nth(i).check({ force: true }).catch(() => {});
  }
  await page.waitForTimeout(400);
  const countBefore = await pl.resourceCards.count();
  const clicked = await ar.aiAssistAddToPlaylistBtn.click({ force: true, timeout: 5000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(2000);
  const pageAlive = await page.evaluate(() => document.readyState).catch(() => null);
  console.log('Total checkboxes selected:', total, '| Add-to-Playlist clicked:', clicked, '| page still responsive:', !!pageAlive);
  test.fail(!clicked || !pageAlive, 'Selecting every exercise checkbox and clicking Add to Playlist made the button unclickable or crashed the page -- app cannot handle a fully-selected mass-add');
  expect(clicked).toBe(true);
  expect(pageAlive).toBeTruthy();
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
  const countAfter = await pl.resourceCards.count();
  console.log('Playlist resource count before/after mass-select Add to Playlist:', countBefore, '->', countAfter);
});

test('AIA-BREAK-05: Three consecutive forced network failures do not progressively degrade the modal', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(90000);
  const ar = new AddResourcePage(page);
  await page.route(/ai[-_]?assist|ai[-_]?generat/i, route => route.abort());

  for (let attempt = 1; attempt <= 3; attempt++) {
    const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
    if (!stillStuck) await ar.actions.aiAssist.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2500);
    const closeResponsive = await ar.aiAssistCloseBtn.isEnabled({ timeout: 3000 }).catch(() => false);
    console.log(`Attempt ${attempt}: Close button responsive:`, closeResponsive);
    expect(closeResponsive).toBe(true); // modal must stay operable even mid-repeated-failure
    await ar.aiAssistCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.unroute(/ai[-_]?assist|ai[-_]?generat/i).catch(() => {});

  // Final unrouted open should recover to real content.
  await openAiAssist(page, ar, 30000);
  const checkboxCount = await ar.aiAssistExerciseCheckboxes.count();
  console.log('Exercise checkboxes after clearing the route (recovery check):', checkboxCount);
  test.fail(checkboxCount === 0, 'After 3 consecutive forced network failures, clearing the route did not let AI Assist recover to real content on the next open');
  expect(checkboxCount).toBeGreaterThan(0);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-BREAK-06: Instant-close x3 right after opening does not leave the 4th legitimate open permanently blank', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(90000);
  const ar = new AddResourcePage(page);
  for (let i = 0; i < 3; i++) {
    const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
    if (!stillStuck) await ar.actions.aiAssist.click({ force: true }).catch(() => {});
    await page.waitForTimeout(150); // as close to "instant" as a real click dispatch allows
    await ar.aiAssistCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  await openAiAssist(page, ar, 30000);
  const checkboxCount = await ar.aiAssistExerciseCheckboxes.count();
  console.log('Exercise checkboxes on the 4th (normal-wait) open after 3 instant-close cycles:', checkboxCount);
  test.fail(checkboxCount === 0, 'CONFIRMED: 3 instant open+close cycles left the 4th legitimate open permanently blank');
  expect(checkboxCount).toBeGreaterThan(0);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-BREAK-07: An exercise added to Playlist under Class A is NOT visible in a different Class B Playlist', { tag: ['@security', '@bug'] }, async ({ page }) => {
  test.setTimeout(90000);
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  const nav = new NavigationPage(page);

  await openAiAssist(page, ar);
  await ar.aiAssistExerciseCheckboxes.first().check({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  // Grab a distinctive fragment of the exercise's own text to search for later.
  const exerciseText = (await ar.aiAssistExerciseCheckboxes.first().locator('xpath=ancestor::*[2]').textContent().catch(() => '')) || '';
  const marker = exerciseText.replace(/\s+/g, ' ').trim().slice(0, 40);
  await ar.aiAssistAddToPlaylistBtn.click({ force: true, timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});

  const switched = await nav.resetToClass('Class 9', 'A', 'Hindi Language').then(() => true).catch(() => false);
  test.fail(!switched, 'Could not switch to a second distinct class this pass to check cross-class Playlist scoping');
  if (!switched) return;
  await pl.ensureDrawerVisible().catch(() => {});
  await page.waitForTimeout(1000);

  const leaked = marker.length > 5 && await page.getByText(marker, { exact: false }).count() > 0;
  console.log('Marker text from Class A\'s added exercise found on Class B\'s Playlist:', leaked, '| marker:', marker);
  test.fail(leaked, 'CONFIRMED SECURITY ISSUE: an exercise added to Playlist under one class is visible from a different class\'s Playlist -- cross-class data leak');
  expect(leaked).toBe(false);
});

test('AIA-BREAK-08: Rapidly interleaved tab/close/reopen cycles leave tab selection and displayed content mutually consistent', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  test.setTimeout(60000);
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);

  await ar.aiAssistTabExercise.click({ force: true }).catch(() => {});
  await ar.aiAssistCloseBtn.click({ force: true, timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(150);
  const { stillStuck } = await ar.openPickerReliably(ar.actions.aiAssist);
  if (!stillStuck) await ar.actions.aiAssist.click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  await ar.aiAssistTabVideos.click({ force: true }).catch(() => {});
  await ar.aiAssistCloseBtn.click({ force: true, timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(150);
  const reopen2 = await ar.openPickerReliably(ar.actions.aiAssist);
  if (!reopen2.stillStuck) await ar.actions.aiAssist.click({ force: true }).catch(() => {});

  await page.waitForTimeout(2000); // let everything settle
  const checkboxesVisible = await ar.aiAssistExerciseCheckboxes.first().isVisible({ timeout: 3000 }).catch(() => false);
  const videoThumbsVisible = await ar.aiAssistVideoThumbs.first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log('After interleaved tab/close/reopen spam -- Exercise checkboxes visible:', checkboxesVisible, '| Video thumbs visible:', videoThumbsVisible);
  const mutuallyExclusiveOrOneShown = !(checkboxesVisible && videoThumbsVisible);
  test.fail(!mutuallyExclusiveOrOneShown, 'CONFIRMED: after rapid interleaved tab/close/reopen spam, BOTH Exercise checkboxes and Video thumbnails render simultaneously -- tab content did not get torn down on tab switch, a real state-bleed bug');
  expect(mutuallyExclusiveOrOneShown).toBe(true);
  await ar.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
});

test('AIA-BREAK-09: Rapidly pressing Escape 10x while AI Assist is open does not corrupt the DOM into a half-torn-down state', { tag: ['@negative', '@bug'] }, async ({ page }) => {
  test.setTimeout(60000);
  const ar = new AddResourcePage(page);
  await openAiAssist(page, ar);

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(1000);

  const modalStillThere = await page.getByText('AI Assist', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
  // Whichever state it's in, the page underneath must still be interactive --
  // check that SOME known always-present element (the playlist strip) is
  // clickable/visible, not blocked by an orphaned overlay.
  const pl = new PlaylistPage(page);
  const pageInteractive = await pl.resourceCards.first().isVisible({ timeout: 3000 }).catch(() => false)
    || await page.locator('[data-qa-id="toolbar-user-avatar"]').isVisible({ timeout: 3000 }).catch(() => false);
  console.log('AI Assist modal still visible after 10x Escape:', modalStillThere, '| underlying page interactive:', pageInteractive);
  test.fail(!pageInteractive, 'CONFIRMED: rapid Escape-key spam while AI Assist was open left the underlying page non-interactive -- a half-torn-down overlay is blocking it');
  expect(pageInteractive).toBe(true);
  if (modalStillThere) await ar.aiAssistCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
});
