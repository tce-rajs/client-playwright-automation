// Page Object for the Minimap panel, reached via the Zoom tool's submenu.
// Selectors confirmed live and cross-checked against the mature Cypress
// suite (per CEP_TestCases/Minimap_Module_Test_Cases_Final.xlsx).
//
// IMPORTANT (MM-DOM-01, cross-repo confirmed): [data-qa-id="minimap-container"]
// is ALWAYS present in the DOM regardless of open/closed state -- visibility
// is a `.visible` CSS class toggle, not element presence. Always check
// visibility, never mere existence, to determine "is Minimap open".

const { ToolbarPage } = require('./toolbar.page');

class MinimapPage {
  constructor(page) {
    this.page = page;
    this.toolbar = new ToolbarPage(page);

    this.zoomMinimapBtn = page.locator('[data-qa-id="toolbar-zoom-minimap-btn"]');
    this.container = page.locator('[data-qa-id="minimap-container"]');
    this.canvas = page.locator('[data-qa-id="minimap-canvas"]');
    this.togglePlayersBtn = page.locator('[data-qa-id="minimap-toggle-players-btn"]');
    this.resetBtn = page.locator('[data-qa-id="minimap-reset-btn"]');
    this.closeBtn = page.locator('[data-qa-id="minimap-close-btn"]');
  }

  /** Open via the confirmed real path: Zoom tool -> Zoom submenu -> Minimap
   * panel toggle button. Returns whether it actually opened -- confirmed
   * live the zoom-minimap-btn can be unreachable at narrow (mobile)
   * viewports, and an unbounded click there hangs the whole test's default
   * actionability timeout instead of surfacing as a real finding. */
  async open() {
    const alreadyVisible = await this.container.evaluate((el) => el.classList.contains('visible')).catch(() => false);
    if (alreadyVisible) return true;
    await this.toolbar.openToolPanel('gtZoom');
    const clicked = await this.zoomMinimapBtn.click({ force: true, timeout: 5000 }).then(() => true).catch(() => false);
    await this.page.waitForTimeout(700);
    return clicked;
  }

  async isOpen() {
    return this.container.evaluate((el) => el.classList.contains('visible')).catch(() => false);
  }

  async close() {
    const open = await this.isOpen();
    if (open) await this.closeBtn.click({ force: true });
  }
}

module.exports = { MinimapPage };
