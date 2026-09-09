// Page Object for the AI Homework module (Magnet -> Homework composer).
// Selectors cross-checked against automation-cep-cypress's own
// cypress/pages/AiHomeworkPage.js and the QA reference doc.
//
// "Ready to Send" (ai-homework-assign-send-btn) is a real, destructive send
// action per this session's own established rule -- never actually clicked.

class AiHomeworkPage {
  constructor(page) {
    this.page = page;

    this.magnetToolBtn = page.locator('[data-qa-id="toolbar-tool-gtMagnet"]');
    this.magnetHomeworkItem = page.locator('[data-qa-id="toolbar-magnet-gtAIWorksheet"]');

    // --- Type picker ---
    this.selectChapterBtn = page.locator('[data-qa-id="ai-homework-option-select-chapter-btn"]');
    // CONFIRMED LIVE: this app keeps stale/duplicate copies of this card
    // mounted at least twice (same pattern documented elsewhere in this
    // suite for float-ui popups) -- a strict-mode violation without
    // .first().
    this.homeworkTypeCard = page.locator('[data-qa-id="ai-homework-option-homework-select"]').first();
    this.reviseTypeCard = page.locator('[data-qa-id="ai-homework-option-revise-select"]').first();
    this.worksheetTypeCard = page.locator('[data-qa-id="ai-homework-option-worksheet-select"]').first();

    // --- Counters ---
    this.hwObjMinus = page.locator('[data-qa-id="ai-homework-option-homework-objective-minus"]');
    this.hwObjInput = page.locator('[data-qa-id="ai-homework-option-homework-objective-input"]');
    this.hwObjPlus = page.locator('[data-qa-id="ai-homework-option-homework-objective-plus"]');
    this.revObjPlus = page.locator('[data-qa-id="ai-homework-option-revise-objective-plus"]');
    this.revSubjPlus = page.locator('[data-qa-id="ai-homework-option-revise-subjective-plus"]');

    // CONFIRMED LIVE: this app can mount TWO copies of these buttons at
    // once, one enabled and one disabled (confirmed for next-btn) -- a
    // strict-mode violation with a plain locator, and a plain .first()
    // risks landing on whichever DOM order happens to put the disabled one
    // first. Filter to the non-disabled copy explicitly.
    this.generateBtn = page.locator('[data-qa-id="ai-homework-option-generate-btn"]:not([disabled])').first();
    this.regenerateBtn = page.locator('[data-qa-id="ai-homework-option-regenerate-btn"]:not([disabled])').first();
    this.discardBtn = page.locator('[data-qa-id="ai-homework-option-discard-btn"]:not([disabled])').first();
    this.nextBtn = page.locator('[data-qa-id="ai-homework-option-next-btn"]:not([disabled])').first();

    // --- Topics picker ---
    this.topicsGradeSelect = page.locator('[data-qa-id="ai-homework-topics-grade-select"]');
    this.topicsSubjectSelect = page.locator('[data-qa-id="ai-homework-topics-subject-select"]');
    this.topicsChapter = (i) => page.locator(`[data-qa-id="ai-homework-topics-chapter-${i}"]`);
    this.topicsChapterCheckbox = (i) => page.locator(`[data-qa-id="ai-homework-topics-chapter-checkbox-${i}"]`);
    this.topicsUpdateBtn = page.locator('[data-qa-id="ai-homework-topics-update-btn"]');
    this.topicsCloseBtn = page.locator('[data-qa-id="ai-homework-topics-close-btn"]');

    // --- Question Builder ---
    this.builderQuestions = page.locator('[data-qa-id^="ai-homework-builder-scq-question-"], [data-qa-id^="ai-homework-builder-mcq-question-"], [data-qa-id^="ai-homework-builder-subjective-question-"]');
    this.swipeLeft = (kind, i) => page.locator(`[data-qa-id="ai-homework-builder-${kind}-swipe-left-${i}"]`);
    this.swipeRight = (kind, i) => page.locator(`[data-qa-id="ai-homework-builder-${kind}-swipe-right-${i}"]`);

    // --- Assign step ---
    this.assignTitleInput = page.locator('[data-qa-id="ai-homework-assign-title-input"]');
    this.assignClassOption = (i) => page.locator(`[data-qa-id="ai-homework-assign-class-option-${i}"]`);
    this.assignClassCheckbox = (i) => page.locator(`[data-qa-id="ai-homework-assign-class-checkbox-${i}"]`);
    this.assignDueOption = (i) => page.locator(`[data-qa-id="ai-homework-assign-due-option-${i}"]`);
    this.assignDueRadio = (i) => page.locator(`[data-qa-id="ai-homework-assign-due-radio-${i}"]`);
    this.assignPreviousBtn = page.locator('[data-qa-id="ai-homework-assign-previous-btn"]').first();
    this.assignDiscardBtn = page.locator('[data-qa-id="ai-homework-assign-discard-btn"]').first();
    this.assignSendBtn = page.locator('[data-qa-id="ai-homework-assign-send-btn"]').first(); // NEVER click -- real send.

    // --- Dead code (confirmed cross-repo, AIH-DEAD-01) ---
    this.selectHomeworkBtn = page.locator('[data-qa-id="ai-homework-select-homework-btn"]');
    this.previewBackBtn = page.locator('[data-qa-id="ai-homework-preview-back-btn"]');
  }

  async openMagnetSubmenu() {
    await this.magnetToolBtn.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  /** CONFIRMED LIVE: the Magnet submenu's own open animation can leave its
   * items resolved-in-DOM but computed-not-visible for a beat after the
   * 800ms settle wait -- a plain force-click intermittently throws "Element
   * is not visible" (not the pointer-events:none bug documented elsewhere,
   * a genuine transient layout/animation state). Wait for real visibility
   * with a bounded retry (reopening the submenu once) before clicking. */
  async open() {
    await this.openMagnetSubmenu();
    let ready = await this.magnetHomeworkItem.isVisible({ timeout: 5000 }).catch(() => false);
    if (!ready) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(500);
      await this.openMagnetSubmenu();
      ready = await this.magnetHomeworkItem.isVisible({ timeout: 8000 }).catch(() => false);
    }
    await this.magnetHomeworkItem.click({ force: true, timeout: 10000 });
    await this.page.waitForTimeout(1500);
  }

  /** Idempotently ensure the Assign step is showing (click Next if the
   * builder is still showing instead). Used by Assign-step-dependent tests
   * that may run after a self-heal rebuilt just the Question Builder. */
  async ensureAssignStep() {
    const onAssign = await this.assignTitleInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (!onAssign) {
      await this.nextBtn.click({ force: true, timeout: 8000 });
      await this.page.waitForTimeout(1500);
    }
  }

  /** Click Generate and wait for the real, slow AI/RAG backend call
   * (confirmed live: ~20-25s) to produce Question Builder content. */
  async generateAndWait(timeoutMs = 60000) {
    await this.generateBtn.click({ force: true });
    await this.builderQuestions.first().waitFor({ state: 'visible', timeout: timeoutMs });
    await this.page.waitForTimeout(500);
  }
}

module.exports = { AiHomeworkPage };
