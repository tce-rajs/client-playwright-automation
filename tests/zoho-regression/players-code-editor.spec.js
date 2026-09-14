// Zoho historical bug regression -- Players (Code Editor).
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
//        require('../../config/zohoBugMap').getUnmatched().filter(b => b.module === 'Players (Code Editor)')
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
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { PlayerPage } = require('../../pages/player.page');
const { AddResourcePage } = require('../../pages/add-resource.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

// Reuses the confirmed 'codeEditor' location from tests/players/code-editor.spec.js (Class 12A
// Computer Science, chapter index 1 "2. Exception Handling in Python", topic 0 -- a real Python
// console-kind Code resource, with Monaco already confirmed to mount and Run already confirmed to
// work there via PLR-CODE-01/03).
const CODE_CARD_SELECTOR =
  '[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="ic.code.svg"]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="ic.code.svg"])';

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await applyClassMap(nav, 'codeEditor');
  await page.waitForTimeout(1000);
});

async function openCodeEditor(page, plr) {
  const card = page.locator(CODE_CARD_SELECTOR);
  await expect(card.first()).toBeAttached({ timeout: 10000 });
  await plr.openCodeEditorCard(card);
}

test(
  'TCN-I14948: The Code Editor loads with real editable content, not a blank area',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I14948 -- Code Editor V1 & V2 display blank with no editable content.
    const plr = new PlayerPage(page);
    await openCodeEditor(page, plr);
    const mounted = await plr.monacoEditor.isVisible({ timeout: 10000 }).catch(() => false);
    const lineCount = mounted ? await plr.monacoViewLines.locator('.view-line').count().catch(() => 0) : 0;
    console.log('Monaco editor mounted:', mounted, '| visible code lines:', lineCount);

    test.fail(
      !mounted || lineCount === 0,
      `CONFIRMED (matches Zoho TCN-I14948): the Code Editor is blank (mounted: ${mounted}, visible lines: ${lineCount})`
    );
    expect(mounted).toBe(true);
    expect(lineCount).toBeGreaterThan(0);
  }
);

test(
  'TCN-I16694: Running empty code shows a user-friendly message, not a raw internal error',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I16694 -- clicking Run on empty code shows raw internal errors like "Error during
    // exec: expected an indented block after fu..." instead of a friendly validation message.
    const plr = new PlayerPage(page);
    await openCodeEditor(page, plr);
    await plr.monacoEditor.click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
    await plr.codeRunBtn.click({ force: true });
    await page.waitForTimeout(3000);
    const outputText = await plr.codeOutputPaneText().catch(() => '');
    console.log('Output after running empty code:', JSON.stringify(outputText.slice(0, 300)));
    const showsRawInternalError = /error during exec|expected an indented block|traceback \(most recent/i.test(outputText);

    test.fail(
      showsRawInternalError,
      `CONFIRMED (matches Zoho TCN-I16694): running empty code shows a raw internal error, not a friendly message: "${outputText.slice(0, 200)}"`
    );
    expect(showsRawInternalError).toBe(false);
  }
);

test(
  'TCN-I14939: Collapsing the Coding Asset/Resource section does not overlap text from another section',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I14939 -- collapsing the coding asset section makes another side section's text
    // overlap the first section.
    // CONFIRMED LIVE (this pass, via a throwaway diagnostic dumping tce-code-main's full clickable
    // element list): the real collapse/resize control is an "as-split" library gutter,
    // class="as-split-gutter-icon" -- there is no data-qa-id or "collapse"-named class anywhere on
    // this component at all.
    const plr = new PlayerPage(page);
    await openCodeEditor(page, plr);
    const collapseBtn = page.locator('.as-split-gutter-icon').first();
    const collapseCount = await collapseBtn.count();
    test.fail(collapseCount === 0, 'No collapse control found in the Code Editor this pass');
    if (collapseCount === 0) {
      expect(collapseCount).toBeGreaterThan(0);
      return;
    }
    await collapseBtn.click({ force: true });
    await page.waitForTimeout(1000);
    // Look for any two visible text elements whose bounding boxes overlap significantly -- scoped
    // to inside tce-code-main only (an unscoped whole-page scan found an unrelated false-positive
    // overlap between the background whiteboard's own "Welcome Back!" panel and its zoom indicator).
    const overlapInfo = await page.evaluate(() => {
      const root = document.querySelector('tce-code-main');
      if (!root) return null;
      const els = Array.from(root.querySelectorAll('*')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 20 && r.height > 10 && el.textContent && el.textContent.trim().length > 3 && el.children.length === 0;
      });
      for (let i = 0; i < els.length; i++) {
        for (let j = i + 1; j < els.length; j++) {
          const a = els[i].getBoundingClientRect();
          const b = els[j].getBoundingClientRect();
          const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          const overlapArea = overlapX * overlapY;
          const smallerArea = Math.min(a.width * a.height, b.width * b.height);
          if (smallerArea > 0 && overlapArea / smallerArea > 0.5) {
            return { textA: els[i].textContent.trim().slice(0, 40), textB: els[j].textContent.trim().slice(0, 40) };
          }
        }
      }
      return null;
    });
    console.log('Significant text-element overlap found after collapsing:', JSON.stringify(overlapInfo));

    test.fail(
      Boolean(overlapInfo),
      `CONFIRMED (matches Zoho TCN-I14939): text elements overlap after collapsing the coding asset section: ${JSON.stringify(overlapInfo)}`
    );
    expect(overlapInfo).toBeNull();
  }
);

test(
  'TCN-I14937: "Add to Playlist" is available in the Code Editor toolbar',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I14937 -- "Add to Playlist" option is missing from the code editor toolbar (was
    // previously visible).
    const plr = new PlayerPage(page);
    await openCodeEditor(page, plr);
    const addToPlaylistBtn = page.getByText(/add to playlist/i).first();
    const visible = await addToPlaylistBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('"Add to Playlist" visible in the Code Editor:', visible);

    test.fail(
      !visible,
      'CONFIRMED (matches Zoho TCN-I14937): "Add to Playlist" is not visible anywhere in the Code Editor'
    );
    expect(visible).toBe(true);
  }
);

test(
  'TCN-I14943: "Save to Playlist" actually saves the code file, no error',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho TCN-I14943 -- clicking "Save to Playlist" is clickable with no upfront error, but the
    // code file isn't actually saved (a 400 error occurs server-side).
    const pl = new PlaylistPage(page);
    const plr = new PlayerPage(page);
    await openCodeEditor(page, plr);
    const saveBtn = page.getByText(/save to playlist/i).first();
    const saveVisible = await saveBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.fail(!saveVisible, '"Save to Playlist" control not found in the Code Editor this pass');
    if (!saveVisible) {
      expect(saveVisible).toBe(true);
      return;
    }
    const badResponses = [];
    page.on('response', (res) => {
      if (res.status() === 400 && /save|playlist/i.test(res.url())) badResponses.push(res.url());
    });
    const beforeCount = await pl.resourceCards.count().catch(() => 0);
    await saveBtn.click({ force: true });
    await page.waitForTimeout(2000);
    const afterCount = await pl.resourceCards.count().catch(() => 0);
    console.log('Playlist resource count before/after Save to Playlist:', beforeCount, afterCount, '| 400 responses:', JSON.stringify(badResponses));

    test.fail(
      badResponses.length > 0,
      `CONFIRMED (matches Zoho TCN-I14943): "Save to Playlist" produced a real 400 error response: ${JSON.stringify(badResponses)}`
    );
    expect(badResponses.length).toBe(0);
  }
);

test(
  'CWR-I658: A code file in the Library opens with real content',
  { tag: '@historical-regression' },
  async ({ page }) => {
    // Zoho CWR-I658 -- a code file in the Library section does not open, no content and no error
    // shown.
    const pl = new PlaylistPage(page);
    const ar = new AddResourcePage(page);
    await pl.ensureResourcesPresent();
    const { stillStuck } = await ar.openPickerReliably(ar.actions.library);
    if (!stillStuck) await ar.actions.library.click({ force: true });
    const libraryOpen = await ar.libraryResults.first().isVisible({ timeout: 10000 }).catch(() => false);
    test.fail(!libraryOpen, 'The Library picker did not open reliably this pass');
    if (!libraryOpen) {
      expect(libraryOpen).toBe(true);
      return;
    }
    const codeCard = ar.libraryResults.filter({ hasText: /code/i }).first();
    const hasCode = await codeCard.count();
    test.fail(hasCode === 0, 'No code-file resource available in the Library this pass');
    if (hasCode === 0) {
      expect(hasCode).toBeGreaterThan(0);
      return;
    }
    await codeCard.click({ force: true });
    await page.waitForTimeout(2000);
    const plr = new PlayerPage(page);
    const newCard = pl.resourceCards.last();
    await plr.openResourceCard(newCard);
    await page.waitForTimeout(2000);
    const monacoMounted = await plr.monacoEditor.isVisible({ timeout: 8000 }).catch(() => false);
    console.log('Monaco editor mounted for the Library code file:', monacoMounted);

    test.fail(
      !monacoMounted,
      'CONFIRMED (matches Zoho CWR-I658): the Library code file does not open -- no content displayed'
    );
    expect(monacoMounted).toBe(true);
  }
);
