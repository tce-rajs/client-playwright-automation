// Page Object for the Player module -- every resource-type player opened
// from a Playlist card: Quiz, Video, Worksheet, Image, Weblink, Code
// Editor, Ebook, Checkpoints, TCE, Notes, Unsupported.
//
// Locator strategy: cross-checked heavily against a mature Cypress
// reference project's own per-type page objects (automation-cep-cypress),
// which already confirmed working class/chapter/topic locations for every
// sub-type. Selectors below are taken from there where no data-qa-id
// exists; live-reconfirmed for this project where noted.

class PlayerPage {
  constructor(page) {
    this.page = page;

    // --- Generic player chrome (shared across most sub-types) ---
    this.closeIcon = page.locator('img[alt="close-btn"], img[src*="closeIcon.png"], button.closeIcon').filter({ visible: true });

    // --- Quiz ---
    // Confirmed (cross-checked against automation-cep-cypress's own
    // QuizPlayerPage.js): the real quiz-card wrapper is
    // playlist-quiz-card, a DIFFERENT data-qa-id from the generic
    // playlist-resource-card/-asset-card used by other resource types --
    // and the wrapper itself is a no-op, the actual click target is the
    // inner .resource-card div.
    this.quizCards = page.locator('[data-qa-id="playlist-quiz-card"] .resource-card');
    this.quizLaunchScreenBtn = page.getByRole('button', { name: /launch air card/i });
    // CONFIRMED LIVE (this pass): an UNDOCUMENTED intermediate screen sits
    // between "Launch AIR Card" and the real first question -- "Enter the
    // class strength to kick off the quiz adventure!" with a
    // student-count slider/input and a "Start" button. The workbook's own
    // PLR-QZ-01/02 rows only describe launch-screen -> Q1 directly; this
    // extra step was not documented anywhere.
    this.quizClassStrengthStartBtn = page.getByRole('button', { name: /start/i });
    this.quizRenderer = page.locator('lib-quiz-renderer');
    this.quizCloseBtn = page.locator('button.closeIcon.btn:not(.m-r4)').first();
    this.quizSplitScreenBtn = page.locator('button.closeIcon.btn.m-r4').first();
    this.quizQuestion = page.locator('.qb-mcq.qb-tempalete');
    this.quizOptions = page.locator('.quiz-options-group .option-content');
    this.quizOptionLabels = page.locator('.quiz-options-group .option-content .option-label');
    this.quizCorrectOptions = page.locator('.quiz-options-group .option-content.correct');
    this.quizIncorrectOptions = page.locator('.quiz-options-group .option-content.incorrect');
    this.quizSubmitBtn = page.getByRole('button', { name: 'Submit Answer' });
    this.quizShowAnswerBtn = page.getByRole('button', { name: 'Show Answer' });
    this.quizNextQuestionBtn = page.getByRole('button', { name: 'Next Question' });
    this.quizQuestionNumbers = page.locator('li.page-item.number-item');
    this.quizCurrentQuestionNumber = page.locator('li.page-item.number-item.current');
    this.quizPrevControl = page.locator('li.page-item.previous-item');
    this.quizNextControl = page.locator('li.page-item.next-item');

    // --- Video ---
    // Confirmed (cross-checked against VideoPlayerPage.js): identify Video
    // resources by their type-icon, not the Playlist's own "Video" filter
    // (per the workbook's PLR-VID-12, that filter can silently no-op).
    this.videoCards = page.locator('[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="ic.AVMediaVideo.svg"]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="ic.AVMediaVideo.svg"])');
    this.videoFrame = page.locator('iframe').first();
    this.videoPlayToggle = page.locator('.vjs-play-control');
    this.videoProgressBar = page.locator('.vjs-progress-control .vjs-progress-holder');
    this.videoMuteToggle = page.locator('.vjs-mute-control');
    this.videoFullscreenToggle = page.locator('.vjs-fullscreen-control');
    // The confirmed systemic crash source (see LIVE_FINDINGS.md / workbook
    // PLR-VID-02..05/11): tceplayer-two/tce-player-hybrid.js throws
    // "ReferenceError: targetContainer is not defined" for tcevideo-routed
    // resources. Caught via page.on('pageerror') in the spec, not a locator.

    // --- Worksheet (PDF) ---
    this.worksheetCards = page.locator('[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="ic.Worksheet.svg"]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="ic.Worksheet.svg"])');
    this.worksheetHeader = page.locator('.pdf-header, .worksheet-header').first();
    this.worksheetPrevPage = page.locator('li.page-item.previous-item .mypage-link, .previous-item');
    this.worksheetNextPage = page.locator('li.page-item.next-item .mypage-link, .pagination-next .mypage-link');
    this.worksheetGoToPageInput = page.locator('input[placeholder*="page" i], input[type="number"]').first();
    this.worksheetGoBtn = page.getByRole('button', { name: /^go$/i });
    this.worksheetZoomInBtn = page.locator('[class*="zoom-in" i], [aria-label*="zoom in" i]').first();
    this.worksheetZoomOutBtn = page.locator('[class*="zoom-out" i], [aria-label*="zoom out" i]').first();
    this.worksheetOrientationToggle = page.locator('.portraitLandscapeToggleIcon');
    this.worksheetPrintIcon = page.locator('.printIcon');
    this.worksheetAnswerKeyBtn = page.locator('.worksheet_btn');
    this.worksheetAnnotationLayer = page.locator('svg.annotation-layer, .annotation-layer');

    // --- Image ---
    this.imageCards = page.locator('[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="ic.image" i]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="ic.image" i])');
    this.imageWrapper = page.locator('.player.image-player');
    this.imageGalleryImg = page.locator('.image-gallery img.g-image-item');
    this.imageCloseBtn = page.locator(".image-close-btn img, img[alt='close-btn']").filter({ visible: true });

    // --- Weblink ---
    this.weblinkCards = page.locator('[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="weblink" i]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="weblink" i])');
    this.weblinkWrapper = page.locator('.player.weblink-player');
    this.weblinkIframe = page.locator('.weblink-wrapper iframe');
    this.weblinkCloseBtn = page.locator(".weblink-close-btn, img[alt='close-btn']").filter({ visible: true });
    this.weblinkPlayIconOverlay = this.weblinkWrapper.locator('[class*="play-icon" i], [class*="play-overlay" i]').first();
    // CONFIRMED LIVE (verifier pass): "Watch on YouTube" is rendered
    // INSIDE the cross-origin YouTube embed iframe itself (YouTube's own
    // native embed chrome), NOT the app's own DOM -- confirmed via
    // elementFromPoint at the button's own screen coordinates resolving to
    // the <iframe> element. IMPORTANT: unlike Cypress (which this
    // workbook's PLR-WL-09 row correctly notes cannot see into a
    // cross-origin iframe at all), Playwright CAN read/query into it via
    // frameLocator() -- confirmed live (frame.evaluate() successfully read
    // "Watch on" text from inside it). Scoped to the weblink iframe
    // specifically since other iframes may exist elsewhere on the page.
    this.weblinkWatchOnYoutubeBtn = page.frameLocator('.weblink-wrapper iframe').getByText(/watch on/i);
    this.weblinkChainIcon = this.weblinkWrapper.locator('[class*="link-icon" i], [class*="chain" i]').first();

    // --- Code Editor ---
    this.codeEditorComponent = page.locator('tce-code-main');
    this.monacoEditor = page.locator('.monaco-editor').first();
    this.monacoViewLines = page.locator('.view-lines').first();
    this.codeLanguageTabs = page.locator('.webdev-tab');
    this.codeRunBtn = page.locator('.generalBtns.runBtn');
    this.codeOutputFrame = this.codeEditorComponent.locator('iframe');
    this.codeSettingsGear = page.locator('.gear-icon');
    this.codeSettingsPanel = page.locator('.settingView.floatingMenu');
    this.codeTextSizeSelect = page.locator('select#fontSize');
    this.codeThemeSelect = page.locator('select#themeSelect');

    // --- Ebook ---
    this.ebookTriggerBtn = page.locator('[data-qa-id="playlist-e-book-btn"]');
    this.ebookLaunchBtn = page.locator('[data-qa-id="playlist-e-book-launch-btn"]');
    this.ebookChapterItems = page.locator('[data-qa-id^="player-ebook-chapter-"]');
    this.ebookSelectedChapter = page.locator('[data-qa-id^="player-ebook-chapter-"].selected');
    this.ebookChapterDrawerToggle = page.locator('[data-qa-id="player-ebook-chapter-drawer-toggle"]');
    this.ebookResourceDrawerToggle = page.locator('[data-qa-id="player-ebook-resource-drawer-toggle"]');
    this.ebookResourceCards = page.locator('.resources_list_right [data-qa-id="playlist-resource-card"], .resources_list_right [data-qa-id="playlist-asset-card"], .resources_list_right [data-qa-id="playlist-quiz-card"]');
    this.ebookScrollUpBtn = page.locator('[data-qa-id="player-ebook-resource-scroll-up"]');
    this.ebookScrollDownBtn = page.locator('[data-qa-id="player-ebook-resource-scroll-down"]');
    this.ebookNoResourcesMsg = page.getByText('No resources found!');

    // --- Checkpoints ---
    this.checkpointDialog = page.locator('.checkpoint-dashboard, mat-dialog-container, .checkpoint-dialog-panel');
    this.checkpointModeOnlineBtn = page.locator('[data-qa-id="player-checkpoint-mode-online"]');
    this.checkpointModeOfflineBtn = page.locator('[data-qa-id="player-checkpoint-mode-offline"]');
    this.checkpointStartBtn = page.locator('[data-qa-id="player-checkpoint-start-btn"]');
    this.checkpointResumeBtn = page.locator('[data-qa-id="player-checkpoint-resume-btn"]');
    this.checkpointEndBtn = page.locator('[data-qa-id="player-checkpoint-end-btn"]');
    this.checkpointLockTestBtn = page.locator('[data-qa-id="player-checkpoint-lock-test-btn"]');
    this.checkpointEndTestCloseBtn = page.locator('[data-qa-id="player-checkpoint-endtest-close-btn"]');
    this.checkpointConfirmPauseBtn = page.locator('[data-qa-id="player-checkpoint-confirm-pause-btn"]');
    this.checkpointTimerBadge = page.locator('[data-qa-id="player-checkpoint-timer-badge"]');
    this.checkpointTimerHideBtn = page.locator('[data-qa-id="player-checkpoint-timer-hide-btn"]');
    this.checkpointStudentRows = page.locator('[data-qa-id^="player-checkpoint-student-stu-"]');
    this.checkpointConceptTags = page.locator('[data-qa-id^="player-checkpoint-concept-tp-"]');
    this.checkpointGeneratePdfBtn = page.locator('[data-qa-id="player-checkpoint-generate-pdf-btn"]');
    this.checkpointCloseBtn = page.locator('[data-qa-id="player-checkpoint-close-btn"]');
    this.checkpointExcelExportBtn = page.getByText(/export.*excel|download.*excel|excel.*export/i);
    this.checkpointExcelUploadInput = page.locator('input[type="file"]');
  }

  /** CONFIRMED LIVE (verifier pass): a plain force-click on the close icon
   * intermittently does not register (confirmed via an isolated repro on a
   * Worksheet resource: elementFromPoint at the button's own center
   * correctly resolved to the button's own inner <svg>, ruling out a
   * click-through/overlay issue -- a genuine "first click after opening
   * doesn't always land" timing flake, the same class already documented
   * elsewhere in this app for Pen/Insert-Text/dock-toggle). Verify the
   * close actually took effect and retry with a plain (non-force) click,
   * which settles/waits for actionability on its own, if not. */
  async closePlayer() {
    for (let attempt = 0; attempt < 3; attempt++) {
      const stillOpenBefore = await this.closeIcon.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (!stillOpenBefore) return;
      await this.closeIcon.first().click({ force: true, timeout: 5000 }).catch(() => {});
      await this.page.waitForTimeout(1000);
      const closedNow = !(await this.closeIcon.first().isVisible({ timeout: 1500 }).catch(() => false));
      if (closedNow) return;
      // Retry with a plain click (confirmed more reliable live) before giving up.
      await this.closeIcon.first().click({ timeout: 5000 }).catch(() => {});
      await this.page.waitForTimeout(1000);
    }
  }

  /** Confirmed live: on a heavily-populated Playlist strip (60+ resource
   * cards accumulated from other tests), a target card can sit a few px
   * below the viewport's bottom edge regardless of viewport size --
   * Playwright's own actionability-checked click then never lands, even
   * with force:true. A plain JS scrollIntoView + native DOM click bypasses
   * this reliably. */
  async openResourceCard(cardLocator) {
    await cardLocator.first().evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      el.click();
    });
  }

  async isPlayerOpen(timeout = 15000) {
    return this.closeIcon.first().isVisible({ timeout }).catch(() => false);
  }

  /** Confirmed live: clicking a resource card can silently fail to open the
   * player on the first attempt (same class of post-navigation timing
   * flakiness seen elsewhere in this app) -- verify the Monaco editor
   * actually mounted and retry the card click once if not. */
  async openCodeEditorCard(cardLocator) {
    await this.openResourceCard(cardLocator);
    const mounted = await this.monacoEditor.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    if (!mounted) {
      await this.openResourceCard(cardLocator);
      await this.monacoEditor.waitFor({ state: 'visible', timeout: 15000 });
    }
  }

  /** Types into the Monaco editor without clicking its textarea directly --
   * confirmed live that the textarea sits behind Monaco's own rendered
   * syntax-highlight spans, which intercept a plain Playwright click.
   * Clicking the wrapping .monaco-editor container instead reliably
   * focuses it. */
  async typeInCodeEditor(text) {
    await this.monacoEditor.click({ force: true });
    await this.page.keyboard.press('End');
    await this.page.keyboard.type(text, { delay: 10 });
  }

  /** Console-kind Code Editor output lives in a plain (non-iframe) split
   * pane -- read its text directly rather than searching the whole page,
   * which can miss text inside a scrolled/virtualized pane. */
  async codeOutputPaneText() {
    return this.codeEditorComponent.evaluate((host) => {
      const areas = Array.from(host.querySelectorAll('as-split-area'));
      const pane = areas.find((el) => !el.querySelector('.monaco-editor')) || areas[areas.length - 1];
      return pane ? pane.textContent.replace(/\s+/g, ' ').trim() : '';
    });
  }
}

module.exports = { PlayerPage };
