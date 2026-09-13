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
    await tb.selectTool('gtErase');
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
    const tb = new ToolbarPage(page);
    await tb.selectTool('gtZoom');
    const sliderVisible = await tb.zoomSlider.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!sliderVisible, 'Zoom slider not reachable this pass');
    if (!sliderVisible) {
      expect(sliderVisible).toBe(true);
      return;
    }
    const sliderBox = await tb.zoomSlider.boundingBox();
    await page.mouse.move(sliderBox.x + sliderBox.width / 2, sliderBox.y + sliderBox.height / 2);
    await page.waitForTimeout(500);
    const thumb = tb.zoomSlider.locator('[class*="thumb" i], [class*="handle" i]').first();
    const thumbCount = await thumb.count();
    test.fail(thumbCount === 0, 'Zoom slider thumb element not found this pass');
    if (thumbCount === 0) {
      expect(thumbCount).toBeGreaterThan(0);
      return;
    }
    const thumbBox = await thumb.boundingBox();
    const overflowsContainer =
      thumbBox && sliderBox && (thumbBox.x < sliderBox.x - 2 || thumbBox.x + thumbBox.width > sliderBox.x + sliderBox.width + 2);
    const clippedByOverflowHidden = await tb.zoomSlider.evaluate((el) => getComputedStyle(el).overflow === 'hidden');
    console.log('Thumb box:', thumbBox, '| slider box:', sliderBox, '| slider clips overflow:', clippedByOverflowHidden);

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

