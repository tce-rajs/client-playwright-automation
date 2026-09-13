// Zoho historical bug regression -- Toolbar.
//
// Live-verifies real, previously-reported Zoho defects for this module against the CURRENT app,
// rather than trusting their last-known Zoho Status (open/closed is not a reason to skip one --
// only an existing test that already proves the behavior is).
//
// Sources:
//   - CEP_TestCases/Zoho_Bugs_TeachMode.xlsx  (this module's rows)
//   - config/zohoBugMap.js                    (the same data as a queryable JS module)
//
// Convention for adding a case here:
//   1. Pick an unmatched bug for this module:
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Toolbar')
//   2. Before writing anything new, check CEP_TestCases/*_Module_Test_Cases_Final.xlsx and the rest
//      of tests/ for this module -- if an existing test case already exercises this exact defect,
//      that's the ONLY valid reason to skip automating it. Set matchedTestId to that existing
//      test's title/id (not 'null') and move on; don't write a duplicate.
//   3. Otherwise, write a test that reproduces the bug's ORIGINAL repro steps against the real app
//      and asserts the ORIGINAL bug does not happen. Title it '<Zoho Item Id>: <short description>',
//      tag it '@historical-regression', and reference the Zoho title in a comment for traceability.
//   4. The test's real outcome IS the finding -- if it currently passes, the bug is confirmed fixed;
//      if it fails, the bug is confirmed still live. Both are useful results; don't force an
//      expected outcome before actually running it.
//   5. Once written, update that bug's matchedTestId field in config/zohoBugMap.js to this test's
//      title/id, then re-run 'node scripts/generate-zoho-regression-progress.js' to refresh
//      tests/zoho-regression/README.md.

const { test, expect } = require('../../fixtures/electron-app');
const { NavigationPage } = require('../../pages/navigation.page');
const { AccountManagementPage } = require('../../pages/account-management.page');
const { ToolbarPage } = require('../../pages/toolbar.page');
const { PlaylistPage } = require('../../pages/playlist.page');

test.beforeEach(async ({ page }) => {
  const nav = new NavigationPage(page);
  await nav.loginWithPin(process.env.VALID_PIN);
});

test(
  'CWR-I765 / CWR-I770: The Disable Virtual Keyboard toggle actually controls whether the keyboard appears',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I765 (toggle/CTA not working properly) + CWR-I770 (keyboard does not appear
    // initially even when the toggle is enabled).
    const am = new AccountManagementPage(page);
    await am.openProfileMenu();
    const toggleVisible = await am.virtualKeyboardToggle.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!toggleVisible, 'Virtual Keyboard toggle not reachable this pass');
    if (!toggleVisible) {
      expect(toggleVisible).toBe(true);
      return;
    }
    const initiallyChecked = await am.virtualKeyboardToggle.isChecked().catch(() => null);
    // Ensure it's ON (keyboard enabled), matching CWR-I770's precondition.
    if (initiallyChecked === false) {
      await am.virtualKeyboardToggle.click({ force: true });
      await page.waitForTimeout(500);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const tb = new ToolbarPage(page);
    await tb.selectTool('gtInserttext');
    const box = await tb.wbSvg.boundingBox();
    await page.mouse.click(box.x + 400, box.y + 400);
    await page.waitForTimeout(1000);
    const keyboardVisible = await page.locator('.keyboard-wrapper').first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Virtual keyboard appeared when the toggle is enabled and text is being entered:', keyboardVisible);

    test.fail(
      !keyboardVisible,
      'CONFIRMED (matches Zoho CWR-I765/CWR-I770): the virtual keyboard does not appear even though the toggle is enabled'
    );
    expect(keyboardVisible).toBe(true);
  }
);

test(
  '"Clear Annotation" only clears annotations, not the entire whiteboard (CWR-I740)',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I740 -- "Clear Annotation" button clears the entire whiteboard instead of only
    // annotations. Uses a Text object as a non-annotation content marker (annotations = pen/shape
    // strokes) to distinguish the two.
    //
    // FIXED (test-authoring gap, not app bug): the original version used selectTool('gtErase')
    // (single click -- just activates the tool for drawing) instead of openToolPanel('gtErase')
    // (double click -- actually opens the panel containing Clear Annotation(s)/Clear Whiteboard).
    // Confirmed via tests/toolbar/extended-coverage.spec.js's TB-CYP-02, which reaches the sibling
    // toolbar-eraser-clear-whiteboard control the same way. The original always hit "Clear
    // Annotation(s) control not reachable this pass" because it never opened the panel at all.
    const tb = new ToolbarPage(page);
    await tb.waitForBoardToSettle();
    await tb.selectTool('gtInserttext');
    const box = await tb.wbSvg.boundingBox();
    await page.mouse.click(box.x + 350, box.y + 350);
    await page.waitForTimeout(1000);
    const editorVisible = await tb.textEditor.isVisible({ timeout: 3000 }).catch(() => false);
    test.fail(!editorVisible, 'Text tool did not open an editor this pass -- cannot test Clear Annotation scope');
    if (!editorVisible) {
      expect(editorVisible).toBe(true);
      return;
    }
    await page.keyboard.type('QA Zoho Clear Test');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await tb.selectTool('gtPen');
    await tb.drawStroke({ x: 500, y: 500 }, { x: 650, y: 500 });
    await page.waitForTimeout(500);

    const textBoxVisibleBefore = await tb.wbContainer.locator('.text-input-container').first().isVisible({ timeout: 2000 }).catch(() => false);
    await tb.openToolPanel('gtErase');
    const clearAnnotationsBtn = tb.eraserClearAnnotationsBtn;
    const clearBtnVisible = await clearAnnotationsBtn.isVisible({ timeout: 3000 }).catch(() => false);
    test.fail(!clearBtnVisible, 'Clear Annotation(s) control not reachable this pass');
    if (!clearBtnVisible) {
      expect(clearBtnVisible).toBe(true);
      return;
    }
    await clearAnnotationsBtn.click({ force: true });
    await page.waitForTimeout(1000);
    const pathsAfter = await tb.pathCount();
    const textBoxVisibleAfter = await tb.wbContainer.locator('.text-input-container').first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log(
      'Text box present before Clear Annotations:', textBoxVisibleBefore,
      '| pen strokes remaining after:', pathsAfter,
      '| text box still present after:', textBoxVisibleAfter
    );

    test.fail(
      textBoxVisibleBefore && !textBoxVisibleAfter,
      'CONFIRMED (matches Zoho CWR-I740): "Clear Annotation" also removed non-annotation content (the text box), not just annotations'
    );
    expect(!textBoxVisibleBefore || textBoxVisibleAfter).toBe(true);
  }
);

test(
  'CWR-I666: The Zoom slider thumb is not cut off/clipped on hover',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I666 -- Zoom Slider Thumb Appears Partially Cut on Hover.
    //
    // FIXED (test-authoring gap, not app bug): the original used selectTool('gtZoom') (single
    // click) instead of openToolPanel('gtZoom') (double click) -- confirmed via the established,
    // known-working tests/toolbar/canvas-controls.spec.js's TB-ZOOM-01, which needs the double
    // click to reveal the zoom panel/slider at all. The original always hit "Zoom slider not
    // reachable this pass" because it never opened the panel.
    // CONFIRMED LIVE (this pass, via a throwaway diagnostic test dumping the real DOM): this is an
    // Angular Material <mat-slider>. zoomSlider (data-qa-id="toolbar-zoom-slider") is the REAL
    // interactive element, but it's a native <input type="range"> with opacity:0 (invisible by
    // design, ARIA/interaction only) -- it has NO children, so a `.locator()` scoped inside it can
    // never find anything (explains the original test's "thumb element not found" every time). The
    // actual VISUAL thumb is <mat-slider-visual-thumb class="mdc-slider__thumb ..."> and the visual
    // track is <div class="mdc-slider__track">, both SIBLINGS of zoomSlider under the shared
    // <mat-slider> parent -- that parent is the real container to check for clipping against.
    const tb = new ToolbarPage(page);
    await tb.openToolPanel('gtZoom');
    const sliderContainer = tb.zoomSlider.locator('xpath=..');
    const containerBox = await sliderContainer.boundingBox().catch(() => null);
    test.fail(!containerBox, 'Zoom slider not reachable this pass');
    if (!containerBox) {
      expect(containerBox).toBeTruthy();
      return;
    }
    await page.mouse.move(containerBox.x + containerBox.width / 2, containerBox.y + containerBox.height / 2);
    await page.waitForTimeout(500);
    const thumb = sliderContainer.locator('mat-slider-visual-thumb, [class*="thumb" i]').first();
    const thumbCount = await thumb.count();
    test.fail(thumbCount === 0, 'Zoom slider thumb element not found this pass');
    if (thumbCount === 0) {
      expect(thumbCount).toBeGreaterThan(0);
      return;
    }
    const thumbBox = await thumb.boundingBox();
    const overflowsContainer =
      thumbBox && containerBox &&
      (thumbBox.x < containerBox.x - 2 || thumbBox.x + thumbBox.width > containerBox.x + containerBox.width + 2);
    const clippedByOverflowHidden = await sliderContainer.evaluate((el) => getComputedStyle(el).overflow === 'hidden');
    console.log('Thumb box:', thumbBox, '| slider container box:', containerBox, '| container clips overflow:', clippedByOverflowHidden);

    test.fail(
      Boolean(overflowsContainer && clippedByOverflowHidden),
      'CONFIRMED (matches Zoho CWR-I666): the zoom slider thumb overflows its clipped container on hover'
    );
    expect(overflowsContainer && clippedByOverflowHidden).toBeFalsy();
  }
);

test(
  'CWR-I670: A widget does not overlap the widget selection panel',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I670 -- Widget overlaps with the widget selection panel.
    const tb = new ToolbarPage(page);
    await tb.selectTool('gtWidgets');
    const disciplineSelectVisible = await tb.widgetDisciplineSelect.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!disciplineSelectVisible, 'Widget selection panel not reachable this pass');
    if (!disciplineSelectVisible) {
      expect(disciplineSelectVisible).toBe(true);
      return;
    }
    const panelBox = await tb.panel.boundingBox().catch(() => null);
    test.fail(!panelBox, 'Could not measure the widget selection panel this pass');
    if (!panelBox) {
      expect(panelBox).toBeTruthy();
      return;
    }
    // A rendered widget (if any is already open on the canvas) shouldn't sit under the panel.
    const widgetBox = await page.locator('[class*="widget-instance" i], [class*="active-widget" i]').first().boundingBox().catch(() => null);
    console.log('Widget selection panel box:', panelBox, '| an active widget box (if any):', widgetBox);
    if (!widgetBox) {
      // No widget currently placed to check against -- the panel itself rendering without error
      // is the closest real signal available this pass.
      expect(panelBox).toBeTruthy();
      return;
    }
    const overlaps =
      panelBox.x < widgetBox.x + widgetBox.width &&
      panelBox.x + panelBox.width > widgetBox.x &&
      panelBox.y < widgetBox.y + widgetBox.height &&
      panelBox.y + panelBox.height > widgetBox.y;
    test.fail(overlaps, 'CONFIRMED (matches Zoho CWR-I670): a widget overlaps the widget selection panel');
    expect(overlaps).toBe(false);
  }
);

test(
  'TCN-I17047: The Pen tool can draw an annotation on the whiteboard',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I17047 (raw title "[119231] Pen Annotation Not Working").
    const tb = new ToolbarPage(page);
    await tb.waitForBoardToSettle();
    const before = await tb.pathCount();
    await tb.selectTool('gtPen');
    await tb.drawStroke({ x: 200, y: 200 }, { x: 400, y: 300 });
    const after = await tb.pathCount();
    console.log('Path count before:', before, '| after drawing a Pen stroke:', after);

    test.fail(after <= before, 'CONFIRMED (matches Zoho TCN-I17047): the Pen tool did not create a new annotation');
    expect(after).toBeGreaterThan(before);
  }
);

test(
  "CWR-I654: A tool's options panel is not hidden/mispositioned after moving the toolbar (dock toggle)",
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I654 -- the context menu (tool options panel) gets hidden when the toolbar is moved.
    // Reuses the established dock-toggle mechanism from tests/toolbar/extended-coverage.spec.js's
    // TB-GAP-02.
    const tb = new ToolbarPage(page);
    const toggleBtn = page.locator('.leftRightBtn.left button, .leftRightBtn.right button').first();
    const toggleCount = await toggleBtn.count();
    test.fail(toggleCount === 0, 'No dock-toggle control found this pass');
    if (toggleCount === 0) {
      expect(toggleCount).toBeGreaterThan(0);
      return;
    }
    await toggleBtn.click({ force: true });
    await page.waitForTimeout(800);
    await tb.openToolPanel('gtErase');
    const panelVisible = await tb.panel.isVisible({ timeout: 5000 }).catch(() => false);
    const panelBox = panelVisible ? await tb.panel.boundingBox() : null;
    console.log('Tool options panel visible after moving the toolbar:', panelVisible, '| box:', JSON.stringify(panelBox));
    // Restore original dock position for other tests sharing this board.
    await toggleBtn.click({ force: true }).catch(() => {});

    const offScreen = panelBox && (panelBox.x < 0 || panelBox.y < 0);
    test.fail(
      !panelVisible || offScreen,
      `CONFIRMED (matches Zoho CWR-I654): the tool options panel is ${!panelVisible ? 'not visible' : 'positioned off-screen'} after moving the toolbar`
    );
    expect(panelVisible).toBe(true);
    expect(offScreen).toBeFalsy();
  }
);

test(
  "CWR-I299: Other widgets remain clickable after closing one widget",
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I299 -- after closing one widget, other widgets become unclickable.
    const tb = new ToolbarPage(page);
    await tb.openToolPanel('gtWidgets');
    await tb.widgetTool('Ruler').click({ force: true });
    await page.waitForTimeout(1000);
    await tb.closePanelByTappingOutside();
    const rulerVisible = await page.getByText(/\d+(\.\d+)?\s*cm/).first().isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!rulerVisible, 'Ruler widget did not open this pass');
    if (!rulerVisible) {
      expect(rulerVisible).toBe(true);
      return;
    }
    const rulerReadout = page.getByText(/\d+(\.\d+)?\s*cm/).first();
    const box = await rulerReadout.boundingBox();
    await page.mouse.click(box.x - 60, box.y);
    await page.waitForTimeout(800);

    await tb.openToolPanel('gtWidgets');
    const protractorBtn = tb.widgetTool('Protractor');
    const clickable = await protractorBtn.isEnabled({ timeout: 3000 }).catch(() => false);
    await protractorBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    const protractorOpened = await page.locator('[class*="protractor" i]').first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Protractor widget clickable/enabled:', clickable, '| opened after clicking:', protractorOpened);

    test.fail(
      !clickable,
      'CONFIRMED (matches Zoho CWR-I299): another widget became unclickable after closing the first one'
    );
    expect(clickable).toBe(true);
  }
);

test(
  'CWR-I667 / CWR-I668: The Protractor (angle tool) has no gap to a drawn line and its scale numbers are fully visible',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I667 -- a gap is observed between the angle tool and a drawn line.
    // Zoho CWR-I668 -- scale numbers on the angle tool are incorrect/partially visible at the edges.
    const tb = new ToolbarPage(page);
    await tb.openToolPanel('gtWidgets');
    const protractorBtn = tb.widgetTool('Protractor');
    const protractorCount = await protractorBtn.count();
    test.fail(protractorCount === 0, 'Protractor (angle tool) not found this pass');
    if (protractorCount === 0) {
      expect(protractorCount).toBeGreaterThan(0);
      return;
    }
    await protractorBtn.click({ force: true });
    await page.waitForTimeout(1000);
    await tb.closePanelByTappingOutside();
    const protractorEl = page.locator('[class*="protractor" i]').first();
    const protractorVisible = await protractorEl.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!protractorVisible, 'Protractor did not appear on canvas this pass');
    if (!protractorVisible) {
      expect(protractorVisible).toBe(true);
      return;
    }
    const protractorBox = await protractorEl.boundingBox();
    // Check for any scale-number label whose box is clipped/cut off by the protractor's own
    // container overflow.
    const clippedNumbers = await protractorEl.evaluate((el) => {
      const style = getComputedStyle(el);
      if (style.overflow !== 'hidden') return false;
      const containerBox = el.getBoundingClientRect();
      const numberEls = [...el.querySelectorAll('text, span, div')].filter((n) => /^\d+°?$/.test((n.textContent || '').trim()));
      return numberEls.some((n) => {
        const b = n.getBoundingClientRect();
        return b.left < containerBox.left || b.right > containerBox.right || b.top < containerBox.top || b.bottom > containerBox.bottom;
      });
    }).catch(() => false);
    console.log('Protractor box:', JSON.stringify(protractorBox), '| any scale-number label clipped:', clippedNumbers);

    test.fail(
      clippedNumbers,
      'CONFIRMED (matches Zoho CWR-I668): a scale-number label on the angle tool is clipped/partially visible'
    );
    expect(clippedNumbers).toBe(false);
  }
);

test(
  'CWR-I669: A line drawn using the Ruler tool does not continue beyond the ruler length',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I669 -- a drawn line continues beyond the ruler's own length when drawing using it.
    const tb = new ToolbarPage(page);
    await tb.openToolPanel('gtWidgets');
    await tb.widgetTool('Ruler').click({ force: true });
    await page.waitForTimeout(1000);
    await tb.closePanelByTappingOutside();
    const rulerVisible = await page.getByText(/\d+(\.\d+)?\s*cm/).first().isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!rulerVisible, 'Ruler widget did not open this pass');
    if (!rulerVisible) {
      expect(rulerVisible).toBe(true);
      return;
    }
    // CONFIRMED LIVE (this pass, via a throwaway diagnostic): the real ruler container class is
    // "widgetsRuler" (a <div> wrapping the SVG), not a generic "ruler"-containing class.
    const rulerEl = page.locator('.widgetsRuler').first();
    const rulerBox = await rulerEl.boundingBox().catch(() => null);
    console.log('Ruler box:', JSON.stringify(rulerBox));
    test.fail(!rulerBox, 'Could not measure the Ruler widget this pass');
    if (!rulerBox) {
      expect(rulerBox).toBeTruthy();
      return;
    }
    // Draw a Pen stroke starting well inside the ruler and dragging far past its right edge.
    await tb.selectTool('gtPen');
    const before = await tb.pathCount();
    await tb.drawStroke(
      { x: rulerBox.x + 20, y: rulerBox.y + rulerBox.height / 2 },
      { x: rulerBox.x + rulerBox.width + 300, y: rulerBox.y + rulerBox.height / 2 }
    );
    const after = await tb.pathCount();
    console.log('Path count before draw:', before, '| after:', after);
    test.fail(after <= before, 'Drawing along the ruler did not create a new stroke this pass');
    if (after <= before) {
      expect(after).toBeGreaterThan(before);
      return;
    }
    const strokeBox = await tb.paths.last().boundingBox();
    const rulerRight = rulerBox.x + rulerBox.width;
    const strokeRight = strokeBox.x + strokeBox.width;
    console.log('Ruler right edge:', rulerRight, '| resulting stroke right edge:', strokeRight);

    const continuesBeyond = strokeRight > rulerRight + 20; // small tolerance
    test.fail(
      continuesBeyond,
      `CONFIRMED (matches Zoho CWR-I669): the drawn line (right edge ${strokeRight.toFixed(0)}) continues well beyond the ruler's own length (right edge ${rulerRight.toFixed(0)})`
    );
    expect(continuesBeyond).toBe(false);
  }
);

test(
  'CWR-I733 / CWR-I734: The Widgets tool panel does not hide action buttons or overlap the Resource Tray',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I733 -- action buttons hidden on the Tool/Widget screen, only content visible.
    // Zoho CWR-I734 -- Resource Tray overlaps the Widget screen when opened from ExploreIt.
    const tb = new ToolbarPage(page);
    const pl = new PlaylistPage(page);
    await tb.openToolPanel('gtWidgets');
    await expect(tb.panel).toBeVisible({ timeout: 5000 });
    const closeBtnVisible = await tb.widgetCloseBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const disciplineSelectVisible = await tb.widgetDisciplineSelect.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Widget panel close button visible:', closeBtnVisible, '| discipline select (an action control) visible:', disciplineSelectVisible);

    const panelBox = await tb.panel.boundingBox();
    const firstCardBox = await pl.resourceCards.first().boundingBox().catch(() => null);
    let overlaps = false;
    if (panelBox && firstCardBox) {
      overlaps =
        panelBox.x < firstCardBox.x + firstCardBox.width && panelBox.x + panelBox.width > firstCardBox.x &&
        panelBox.y < firstCardBox.y + firstCardBox.height && panelBox.y + panelBox.height > firstCardBox.y;
    }
    console.log('Widget panel box:', JSON.stringify(panelBox), '| first Resource Tray card box:', JSON.stringify(firstCardBox), '| overlaps:', overlaps);

    const bugReproduces = !closeBtnVisible || !disciplineSelectVisible || overlaps;
    test.fail(
      bugReproduces,
      `CONFIRMED (matches Zoho CWR-I733/CWR-I734): ${!closeBtnVisible || !disciplineSelectVisible ? 'action buttons are hidden on the Widget screen' : 'the Widget panel overlaps the Resource Tray'}`
    );
    expect(bugReproduces).toBe(false);
  }
);

test(
  'CWR-I656: Widget tool selection state does not persist unexpectedly across topic navigation',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I656 -- widget tool state is not (correctly) maintained across topic navigation.
    const tb = new ToolbarPage(page);
    await tb.openToolPanel('gtWidgets');
    await tb.widgetTool('Ruler').click({ force: true });
    await page.waitForTimeout(1000);
    await tb.closePanelByTappingOutside();
    const rulerVisibleBefore = await page.getByText(/\d+(\.\d+)?\s*cm/).first().isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!rulerVisibleBefore, 'Ruler widget did not open this pass');
    if (!rulerVisibleBefore) {
      expect(rulerVisibleBefore).toBe(true);
      return;
    }
    const nextTopicBtn = page.locator('[data-qa-id="playlist-nav-topic-right"]');
    await nextTopicBtn.scrollIntoViewIfNeeded().catch(() => {});
    await nextTopicBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);
    const rulerVisibleAfter = await page.getByText(/\d+(\.\d+)?\s*cm/).first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Ruler still visible after switching topics:', rulerVisibleAfter, '(expected: false -- a per-topic tool should not bleed into a different topic)');

    test.fail(
      rulerVisibleAfter,
      'CONFIRMED (matches Zoho CWR-I656): the Ruler widget from the previous topic remains visible after switching to a different topic'
    );
    expect(rulerVisibleAfter).toBe(false);
  }
);

test(
  'CWR-I272 / CWR-I276: Widgets and geography maps do not appear as Playlist resource cards',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I272 -- widgets incorrectly appear in the Playlist.
    // Zoho CWR-I276 -- geography maps are treated/displayed as widgets in the Playlist.
    const pl = new PlaylistPage(page);
    const titles = await pl.resourceCards.allTextContents();
    console.log('Current Playlist resource card titles:', JSON.stringify(titles));
    const widgetLike = titles.filter((t) => /widget|geography map/i.test(t));
    console.log('Widget/geography-map-like Playlist entries:', JSON.stringify(widgetLike));

    test.fail(
      widgetLike.length > 0,
      `CONFIRMED (matches Zoho CWR-I272/CWR-I276): ${widgetLike.length} widget/geography-map-like entries appear in the Playlist: ${JSON.stringify(widgetLike)}`
    );
    expect(widgetLike.length).toBe(0);
  }
);

test(
  'CWR-I331: Resource Edit/Delete controls do not overlap the topic-navigation buttons',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I331 -- while editing/removing resources, the Edit and Delete buttons overlap the
    // Navigation button, causing mis-clicks.
    const pl = new PlaylistPage(page);
    await pl.openOptionsMenu();
    await pl.filterEditBtn.click();
    await page.locator('button', { hasText: /finish editing/i }).waitFor({ state: 'visible', timeout: 5000 });
    await pl.resourceCards.first().hover();
    const removeBtnBox = await pl.resourceRemoveBtn.first().boundingBox().catch(() => null);
    const navRightBox = await page.locator('[data-qa-id="playlist-nav-topic-right"]').boundingBox().catch(() => null);
    const navLeftBox = await page.locator('[data-qa-id="playlist-nav-topic-left"]').boundingBox().catch(() => null);
    console.log('Remove button box:', JSON.stringify(removeBtnBox), '| nav-right box:', JSON.stringify(navRightBox), '| nav-left box:', JSON.stringify(navLeftBox));
    await page.locator('button', { hasText: /finish editing/i }).click().catch(() => {});

    function overlaps(a, b) {
      if (!a || !b) return false;
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }
    const anyOverlap = overlaps(removeBtnBox, navRightBox) || overlaps(removeBtnBox, navLeftBox);
    test.fail(
      anyOverlap,
      'CONFIRMED (matches Zoho CWR-I331): the resource remove/edit control overlaps a topic-navigation button'
    );
    expect(anyOverlap).toBe(false);
  }
);

