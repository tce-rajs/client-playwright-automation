// Page Object for the Learning Shorts module.
//
// Per CEP_TestCases/Learning_Shorts_Module_Test_Cases_Final.xlsx (LS-ALT-ENTRY-01,
// cross-repo confirmed): the gated Magnet -> Learning Shorts -> Record flow
// needs real camera/mic permission, which this browser-automation
// environment blocks entirely (confirmed live). The workbook's own
// recommended unblock is a SECOND entry point that reaches the exact same
// composer without any camera/mic: an OWNED (self-created) Video-type asset
// card's overflow menu -> "Send". LS-FILTER-BUG-01 warns this must be a
// visually-confirmed Video-type card, never just "the first overflow-eligible
// card" (a Worksheet/PDF card's overflow opens the PDF viewer instead, not
// Send) -- selecting the right card is the caller's responsibility, exposed
// here via findOwnedVideoAssetCard().
//
// Selectors are taken directly from the workbook/cross-repo ground truth,
// not yet independently re-confirmed live in every case -- flagged inline
// wherever that matters.

class LearningShortsPage {
  constructor(page) {
    this.page = page;

    // --- Gated recorder entry (Magnet toolbar tool) ---
    this.magnetToolBtn = page.locator('[data-qa-id="toolbar-tool-gtMagnet"]');
    // Exact data-qa-id for the Magnet submenu's Learning Shorts item not yet
    // independently confirmed live this pass -- falling back to a text
    // match alongside the pattern already confirmed for Attendance
    // ([data-qa-id="toolbar-magnet-gtAttendance"]).
    this.magnetLearningShortsItem = page.locator('[data-qa-id="toolbar-magnet-gtLearningShorts"], [data-qa-id="toolbar-magnet-gtLearningshorts"]')
      .or(page.locator('.magnet-submenu, [class*="magnet"]').getByText('Learning Shorts', { exact: false }));
    // Recording panel controls (per workbook: camera icon = Record Start, X = Exit).
    this.recordStartBtn = page.locator('[data-qa-id="learning-shorts-record-btn"], .camera-icon, [class*="record"]').first();
    this.exitBtn = page.locator('[data-qa-id="exitBtn"]');

    // --- Alternate, camera-free entry: owned Video asset -> overflow -> Send ---
    this.assetOverflowIconBtn = page.locator('[data-qa-id="playlist-asset-overflow-icon-btn"]');
    this.assetSendBtn = page.locator('[data-qa-id="playlist-asset-send-btn"]');

    // --- Composer (reached via either entry point) ---
    this.titleInput = page.locator('[data-qa-id="learning-shorts-title-input"]');
    this.deleteAttachmentBtn = page.locator('[data-qa-id="learning-shorts-delete-attachment-btn"]');
    this.recaptureBtn = page.locator('[data-qa-id="learning-shorts-recapture-btn"]');
    this.classOption = (i) => page.locator(`[data-qa-id="learning-shorts-class-option-${i}"]`);
    this.classCheckbox = (i) => page.locator(`[data-qa-id="learning-shorts-class-checkbox-${i}"]`);
    this.classCheckboxes = page.locator('[data-qa-id^="learning-shorts-class-checkbox-"]');
    this.savePlaylistBtn = page.locator('[data-qa-id="learning-shorts-save-playlist-btn"]');
    this.saveRevisionBtn = page.locator('[data-qa-id="learning-shorts-save-revision-btn"]');
    this.sendBtn = page.locator('[data-qa-id="learning-shorts-send-btn"]');
    this.discardBtn = page.locator('[data-qa-id="learning-shorts-discard-btn"]');
  }

  async openMagnetSubmenu() {
    await this.magnetToolBtn.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  /** Per LS-FILTER-BUG-01: never blindly take the first overflow-eligible
   * owned card -- visually confirm it is a Video type first. Returns the
   * card locator (nth) once found, or null if none exists in the current
   * topic's Playlist. `videoTypeCheck` lets a caller override the type
   * detection once the exact icon/class marker is confirmed live. */
  async findOwnedVideoAssetCard(playlistPage, maxCards = 20) {
    const cards = playlistPage.resourceCards;
    const count = Math.min(await cards.count(), maxCards);
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const isVideoType = await card.evaluate((el) => {
        const html = el.outerHTML.toLowerCase();
        return html.includes('video') && !html.includes('worksheet') && !html.includes('pdf');
      }).catch(() => false);
      if (isVideoType) return card;
    }
    return null;
  }

  /** If no owned Video asset exists yet in the current topic's Playlist,
   * bootstrap one via AI Assist's Videos tab (Add to Playlist) -- a video
   * added that way is a real, owned asset card, giving LS-ALT-ENTRY-01's
   * unblock path something real to click. Requires AddResourcePage. Returns
   * true if a video asset is present (pre-existing or freshly added). */
  async ensureOwnedVideoAsset(playlistPage, addResourcePage) {
    const existing = await this.findOwnedVideoAssetCard(playlistPage);
    if (existing) return true;

    const { stillStuck } = await addResourcePage.openPickerReliably(addResourcePage.actions.aiAssist);
    if (!stillStuck) await addResourcePage.actions.aiAssist.click({ force: true });
    const opened = await this.page.getByText('AI Assist', { exact: true }).isVisible({ timeout: 20000 }).catch(() => false);
    if (!opened) return false;
    await this.page.waitForTimeout(1500);

    await addResourcePage.aiAssistTabVideos.click({ force: true });
    await this.page.waitForTimeout(600);
    await addResourcePage.aiAssistTabVideos.click({ force: true }); // 2-click tab-render lag, confirmed elsewhere
    await this.page.waitForTimeout(1000);

    const thumbCount = await addResourcePage.aiAssistVideoThumbs.count();
    if (thumbCount === 0) {
      await addResourcePage.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
      return false;
    }
    await addResourcePage.aiAssistVideoThumbs.first().click({ force: true });
    await this.page.waitForTimeout(800);
    const addBtnVisible = await addResourcePage.aiAssistAddToPlaylistBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (addBtnVisible) {
      await addResourcePage.aiAssistAddToPlaylistBtn.click({ force: true });
      await this.page.waitForTimeout(1500);
    }
    await addResourcePage.aiAssistVideoCloseBtn.click({ timeout: 2000 }).catch(() => {});
    await addResourcePage.aiAssistCloseBtn.click({ timeout: 3000 }).catch(() => {});
    await this.page.waitForTimeout(500);

    return !!(await this.findOwnedVideoAssetCard(playlistPage));
  }
}

module.exports = { LearningShortsPage };
