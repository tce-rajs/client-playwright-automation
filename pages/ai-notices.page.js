// Page Object for AI Notices (Magnet -> Notice).
// Source: CEP_TestCases/AI_Notices_Module_Test_Cases_Final.xlsx (22 cases).
//
// Entry point: toolbar-tool-gtMagnet -> "Notice" menu item -> a
// drag-select mode activates directly on the whiteboard SVG (an
// instruction banner reads "Capture the text area to add as your notice's
// description"). Dragging draws a raw-SVG selection rectangle with resize
// handles plus green-check Approve / red-X Discard controls -- per the
// workbook's own note, this whole selection UI has NO stable data-qa-id
// (raw SVG, cross-repo-confirmed), so it's targeted by role/icon/class
// heuristics below, not IDs.
//
// The compose dialog that opens after a successful OCR Approve DOES have
// confirmed data-qa-id selectors (the workbook spells out
// "ai-notices-title-input" explicitly) -- this file follows that same
// "ai-notices-<field>-<control>" naming convention for the other controls
// the workbook references only as a bare suffix (e.g. "-send-btn"), since
// no fuller name was given; these inferred ones are marked below and
// should be corrected by the verifier pass if they don't match live.

class AiNoticesPage {
  constructor(page) {
    this.page = page;

    // --- Entry (Magnet -> Notice) ---
    this.magnetTool = page.locator('[data-qa-id="toolbar-tool-gtMagnet"]');
    this.noticeMenuItem = page.getByText('Notice', { exact: true }).first();
    this.captureInstructionBanner = page.getByText(/capture the text area/i);

    // --- Selection rectangle controls (raw SVG, no data-qa-id per the
    // workbook) ---
    this.selectionRect = page.locator('svg rect, svg [class*="selection"]').first();
    // CONFIRMED LIVE (verifier pass, via a full DOM dump of the toolbar row
    // that appears above an active drag-selection): the Approve (green
    // check) and Discard (red X) controls are completely unlabeled raw SVG
    // <g> elements -- no class, no id, no data-qa-id, no aria-label at all
    // (className reads as an empty SVGAnimatedString). The ORIGINAL
    // heuristic selectors here ([class*="approve"] etc.) matched ZERO
    // elements, so every test that clicked approveBtn/discardBtn was
    // silently clicking nothing -- this was the root cause of the entire
    // OCR-success-dependent test group ("compose dialog not reachable")
    // reporting blocked, not a real app gap. The only reliable
    // identification found: `g[cursor="pointer"]` matches exactly 0
    // elements with no selection active and exactly 2 while a selection
    // rectangle is showing, in stable DOM order (Approve first, Discard
    // second, matching their left-to-right visual order).
    this.approveBtn = page.locator('g[cursor="pointer"]').nth(0);
    this.discardBtn = page.locator('g[cursor="pointer"]').nth(1);

    // --- Compose dialog ---
    // CONFIRMED (workbook's own exact text): ai-notices-title-input.
    this.titleInput = page.locator('[data-qa-id="ai-notices-title-input"]');
    // Quill.js rich-text editor -- confirmed by class (ql-editor/ql-*
    // toolbar buttons are Quill's own standard classes, not app-specific).
    this.bodyEditor = page.locator('.ql-editor');
    this.boldBtn = page.locator('.ql-bold');
    this.italicBtn = page.locator('.ql-italic');
    this.underlineBtn = page.locator('.ql-underline');
    // INFERRED (workbook gives only the bare suffix, e.g. "-paraphrase-btn")
    // -- following this file's own "ai-notices-<x>" convention used for
    // the confirmed title-input id. Correct in a later pass if these don't
    // match the live DOM.
    this.paraphraseBtn = page.locator('[data-qa-id="ai-notices-paraphrase-btn"], [class*="paraphrase-btn"]').first();
    this.translateBtn = page.locator('[data-qa-id="ai-notices-translate-btn"], [class*="translate-btn"]').first();
    this.grammarBtn = page.locator('[data-qa-id="ai-notices-grammar-btn"], [class*="grammar-btn"]').first();
    this.recaptureBtn = page.getByText('Recapture', { exact: false });
    this.closeBtn = page.getByText('Close', { exact: true }).first();
    this.sendBtn = page.locator('[data-qa-id="ai-notices-send-btn"], [class*="send-btn"]').first().or(page.getByText('Ready to Send', { exact: false }));

    // --- Share with... class targeting ---
    this.shareClassCheckbox = (label) => page.locator('input[type="checkbox"]').filter({ hasText: label }).first();
    this.shareSection = page.getByText(/share with/i);
    // Fallback: any checkbox within the Share section area.
    this.anyClassCheckbox = page.locator('input[type="checkbox"]');

    // --- Toasts ---
    this.successToast = page.getByText(/touched it up for you|success/i);
    this.errorToast = page.getByText(/unable to process|please try again/i);
  }

  /** Open the Magnet -> Notice drag-select mode. */
  async openNoticeCapture() {
    await this.magnetTool.click({ force: true });
    await this.page.waitForTimeout(700);
    const noticeVisible = await this.noticeMenuItem.isVisible({ timeout: 3000 }).catch(() => false);
    if (!noticeVisible) return false;
    await this.noticeMenuItem.click({ force: true });
    await this.page.waitForTimeout(700);
    return true;
  }

  /** Drag a selection rectangle over a region of the whiteboard canvas. */
  async dragSelect(wbBox, from, to) {
    await this.page.mouse.move(wbBox.x + from.x, wbBox.y + from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(wbBox.x + to.x, wbBox.y + to.y, { steps: 8 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(500);
  }

  /** CONFIRMED LIVE (verifier pass): the compose dialog only exists after a
   * REAL successful OCR round-trip (Magnet -> Notice -> drag-select over
   * real text -> Approve) -- every test in this file that assumed
   * titleInput would already be visible (with no setup step of its own,
   * since each test gets a fresh login via beforeEach and nothing carries
   * over from a prior test) was structurally guaranteed to report "not
   * reachable" regardless of whether the feature actually works. This
   * helper reproduces AIN-OCR-02's own real setup (place real text via the
   * Insert Text tool, then capture it) so every compose-dialog-dependent
   * test gets a genuine attempt. Returns true if the compose dialog opened. */
  async openComposeDialogWithRealText(tb) {
    await tb.selectTool('gtInserttext');
    const box = await tb.wbSvg.boundingBox();
    await this.page.mouse.click(box.x + 300, box.y + 300);
    await this.page.waitForTimeout(1000);
    const editorVisible = await tb.textEditor.isVisible({ timeout: 3000 }).catch(() => false);
    if (!editorVisible) return false;
    await this.page.keyboard.type('Photosynthesis is important');
    // CONFIRMED LIVE: Escape reliably commits+deselects the text object
    // (verified the Text formatting panel is gone afterward) -- clicking
    // elsewhere on the canvas was observed to sometimes leave that panel
    // open, adding uncertainty to the steps that follow.
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(1000);

    const opened = await this.openNoticeCapture();
    if (!opened) return false;
    await this.dragSelect(box, { x: 250, y: 270 }, { x: 550, y: 340 });
    await this.approveBtn.click({ force: true, timeout: 5000 }).catch(() => {});
    // CONFIRMED LIVE: this is a real OCR backend call (POST
    // .../ocr/text-recognition/check_text) that can take upward of 10-15s.
    // IMPORTANT: Locator.isVisible({timeout}) does NOT actually poll/wait in
    // Playwright -- it's a near-instant single check, so a loop of
    // isVisible({timeout: N}) calls does NOT accumulate N*iterations of real
    // wall-clock waiting (confirmed live: a "15-iteration x 2s timeout" loop
    // finished in under 2s total). Use waitFor(), which genuinely polls.
    return this.titleInput.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
  }
}

module.exports = { AiNoticesPage };
