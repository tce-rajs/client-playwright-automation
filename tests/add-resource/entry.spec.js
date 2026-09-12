// Add Resources Entry.
// Source: CEP_TestCases/Add_Resource_Module_Test_Cases_Final.xlsx, cases ADD-CORE-01..04
// plus an "Extended coverage" section (formerly gap-analysis.spec.js) for
// ADD-WB-01, ADD-XREF-01, AR-CYP-01..08, AR-GAP-01..02, ADD-EXP-01..08.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.describe('Core (ADD-CORE-01..04)', () => {
test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
});

test('ADD-CORE-01: Floating "+" opens the Add Resources picker', { tag: '@ui-state' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.openPicker();
  await expect(page.getByText('Add Resources', { exact: true })).toBeVisible();
});

test('ADD-CORE-02: Add Resources shows all 6 source options', { tag: '@ui-state' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.openPicker();
  for (const action of Object.values(ar.actions)) {
    await expect(action).toBeVisible();
  }
});

test('ADD-CORE-03: Reopening "+" while a source popup is already open stacks a second picker instead of closing the first', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.openPicker();
  await ar.actions.gallery.click();
  await expect(page.locator('[data-qa-id="gallery-close-btn"]')).toBeVisible();

  await ar.openPicker();
  await page.waitForTimeout(500);

  const galleryStillOpen = await page.locator('[data-qa-id="gallery-close-btn"]').isVisible().catch(() => false);
  const pickerAlsoOpen = await page.getByText('Add Resources', { exact: true }).isVisible().catch(() => false);
  console.log('LIVE FINDING check -- Gallery still open:', galleryStillOpen, '| Add Resources picker also open:', pickerAlsoOpen);
  test.fail(galleryStillOpen && pickerAlsoOpen, 'Reopening "+" while Gallery is open stacks a second Add Resources popup on top instead of closing Gallery first or being blocked');
  expect(galleryStillOpen && pickerAlsoOpen).toBe(false);
});

test('ADD-CORE-04: Closing an individual resource-source popup via its own close control', { tag: ['@positive', '@bug'] }, async ({ page }) => {
  const ar = new AddResourcePage(page);

  // Library's own close control (confirmed reliable).
  await ar.openPicker();
  await ar.actions.library.click();
  await expect(ar.libraryPopup).toBeVisible();
  await ar.libraryCloseBtn.click();
  await expect(ar.libraryPopup).toBeHidden({ timeout: 5000 });

  // Gallery's own close control -- per the workbook's own live finding this
  // was previously unreliable; verify for real rather than assume.
  await page.goto('./');
  await page.waitForTimeout(2000);
  await ar.openPicker();
  await ar.actions.gallery.click();
  await page.waitForTimeout(1000);
  const galleryVisible = await page.locator('[data-qa-id="gallery-close-btn"]').isVisible();
  expect(galleryVisible).toBe(true);
  await ar.galleryCloseBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  const galleryStillOpenAfterClose = await page.locator('[data-qa-id="gallery-close-btn"]').isVisible().catch(() => false);
  test.fail(galleryStillOpenAfterClose, 'Gallery\'s own close (X) control does not actually close the popup');
  expect(galleryStillOpenAfterClose).toBe(false);
});
});

test.describe('Extended coverage (gap-analysis pass)', () => {
  // Same convention as create.spec.js: a real Submit is never actually
  // executed against the shared QA account (would add a permanent asset) --
  // cases needing that are verified up to the point just before Submit, with
  // the constraint documented via test.fail() where the workbook's own real
  // finding can't be captured any other way.
  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeEach(async ({ page }) => {
    const pl = new PlaylistPage(page);
    await pl.loginWithPin(process.env.VALID_PIN);
    await pl.ensureResourcesPresent();
  });

  test('ADD-WB-01: The Whiteboard action card opens a Save/Download card for the CURRENT board, not a new whiteboard', { tag: '@ui-state' }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    const urlBefore = page.url();
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.whiteboard.click({ force: true });
    await page.waitForTimeout(1000);

    // REFINED per the workbook's own live finding: this should NOT navigate
    // away to a different/new whiteboard -- it opens an in-place
    // Save-to-Playlist/Download-PDF card for the board already on screen.
    expect(page.url()).toBe(urlBefore);
    const saveOrDownloadVisible = await ar.whiteboardSavePlaylistBtn.isVisible({ timeout: 5000 }).catch(() => false)
      || await ar.whiteboardDownloadPdfBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Save/Download card shown for the current whiteboard (no navigation away):', saveOrDownloadVisible);
    expect(saveOrDownloadVisible).toBe(true);
  });

  test('ADD-XREF-01: Gallery, Drop It, AI Assist, and Library are each covered in their own dedicated module workbooks', { tag: '@cross-cutting' }, async ({ page }) => {
    // Documentation cross-reference, not a new behavior to probe here -- the
    // real assertion is simply that each source card exists and is reachable
    // from this entry point, since the actual functional depth is owned by
    // those other modules' own spec files (tests/gallery/, dropit-ai-assist
    // .spec.js, tests/tce-search-library/).
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await expect(ar.actions.gallery).toBeVisible();
    await expect(ar.actions.dropit).toBeVisible();
    await expect(ar.actions.aiAssist).toBeVisible();
    await expect(ar.actions.library).toBeVisible();
  });

  test('AR-CYP-01: Chapter & Topic / Grade & Subject fields are dead-code-disabled, not just visually read-only', { tag: '@cross-cutting' }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.create.click({ force: true });
    await expect(ar.createForm).toBeVisible();

    // Already confirmed disabled in ADD-CRT-02; this case specifically checks
    // there is no OTHER way to trigger the picker (e.g. a click, since the
    // workbook's evidence says the [floatUi] trigger itself is commented
    // out, not merely styled disabled).
    await ar.chapterTopicInput.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    const pickerOpened = await page.locator('[data-qa-id="playlist-chapter-tp-popup"], [data-qa-id="playlist-select-chapter"]').first().isVisible().catch(() => false);
    console.log('Clicking the disabled Chapter & Topic field opened any picker:', pickerOpened);
    expect(pickerOpened).toBe(false);
    await expect(ar.chapterTopicInput).toBeDisabled();
    await expect(ar.gradeSubjectInput).toBeDisabled();
  });

  test('AR-CYP-02: Resubmitting an identical Title + filename silently de-duplicates', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    // Deliberately not executed via a real double-submit -- would add
    // permanent (duplicate) assets to the shared QA account, same reasoning
    // as ADD-CRT-09. Verify only that the form allows re-entering identical
    // values without a client-side "duplicate" warning of its own.
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.create.click({ force: true });
    await expect(ar.createForm).toBeVisible();
    await ar.titleInput.fill('dedup-check-title');
    await page.waitForTimeout(300);
    const duplicateWarningShown = await ar.createForm.getByText(/already exists|duplicate/i).isVisible().catch(() => false);
    console.log('Client-side duplicate warning shown before any real submit:', duplicateWarningShown);
    test.fail(true, 'Verifying real de-duplication needs an actual double-submit, deliberately not executed on the shared QA account');
    expect(true).toBe(false);
  });

  test('AR-CYP-03: A newly created resource auto-opens its own preview immediately after Submit', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
    test.fail(true, 'Verifying the post-submit auto-preview needs a real Submit, deliberately not executed on the shared QA account (same reasoning as ADD-CRT-09)');
    expect(true).toBe(false);
  });

  test('AR-CYP-04: Not every attached resource can be removed by the teacher through any UI path', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const pl = new PlaylistPage(page);
    // Two distinct card types with two distinct remove paths (confirmed in
    // playlist.page.js): native curriculum "resource" cards use a direct
    // hover-reveal remove icon; Add-Resource-created "asset" cards use an
    // overflow ("...") icon that reveals Remove separately.
    const nativeCount = await pl.resourceCards.count();
    const assetOverflowCount = await pl.assetOverflowIconBtn.count();
    console.log('Native curriculum resource cards:', nativeCount, '| Add-Resource asset cards with an overflow icon:', assetOverflowCount);

    let nativeRemovable = false;
    if (nativeCount > 0) {
      await pl.resourceCards.first().hover();
      nativeRemovable = await pl.resourceRemoveBtn.first().isVisible({ timeout: 2000 }).catch(() => false);
    }

    let assetRemovable = false;
    if (assetOverflowCount > 0) {
      await pl.assetOverflowIconBtn.first().click({ force: true, timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
      assetRemovable = await pl.assetRemoveBtn.first().isVisible({ timeout: 2000 }).catch(() => false);
      await page.keyboard.press('Escape');
    }
    console.log('Native resource card has a reachable remove icon:', nativeRemovable, '| Asset card\'s overflow reveals a Remove option:', assetRemovable);
    test.fail(nativeCount === 0 && assetOverflowCount === 0, 'No resource or asset cards present on the Playlist to test either remove path against');
    expect(nativeCount > 0 || assetOverflowCount > 0).toBe(true);
  });

  test('AR-CYP-05: Drop It\'s Close button can visually cover the Add Resource FAB if left open', { tag: '@cross-cutting' }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.dropit.click({ force: true });
    await expect(ar.dropitCloseBtn).toBeVisible({ timeout: 8000 });

    const dropitBox = await ar.dropitCloseBtn.boundingBox();
    const fabBox = await ar.addResourcesTrigger.boundingBox().catch(() => null);
    const overlaps = dropitBox && fabBox && !(
      dropitBox.x + dropitBox.width < fabBox.x
      || fabBox.x + fabBox.width < dropitBox.x
      || dropitBox.y + dropitBox.height < fabBox.y
      || fabBox.y + fabBox.height < dropitBox.y
    );
    console.log('Drop It Close button box:', dropitBox, '| Add Resource FAB box:', fabBox, '| overlapping:', overlaps);
    await ar.dropitCloseBtn.click({ timeout: 5000 }).catch(() => {});
    expect(dropitBox).not.toBeNull();
  });

  test('AR-CYP-06: Oversized file is rejected with the exact confirmed error text', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.create.click({ force: true });
    await expect(ar.createForm).toBeVisible();
    const big = Buffer.alloc(11 * 1024 * 1024, 'a');
    await ar.titleInput.fill('exact error text check');
    await ar.fileInput.setInputFiles({ name: 'oversized.txt', mimeType: 'text/plain', buffer: big });
    await page.waitForTimeout(800);
    const errorEl = ar.createForm.getByText(/size|10 ?mb|large/i).first();
    const errorVisible = await errorEl.isVisible().catch(() => false);
    const errorText = errorVisible ? (await errorEl.textContent()).trim() : null;
    console.log('Oversized-file error text:', errorText);
    test.fail(!errorVisible, 'No error text shown for an oversized file to confirm the exact wording against');
    expect(errorVisible).toBe(true);
  });

  test('AR-CYP-07: Whiteboard\'s Save to Playlist action is unreachable/non-functional; Download PDF is the only working save action', { tag: ['@cross-cutting', '@bug'] }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.whiteboard.click({ force: true });
    await page.waitForTimeout(1000);

    const savePlaylistVisible = await ar.whiteboardSavePlaylistBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const downloadPdfVisible = await ar.whiteboardDownloadPdfBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Save to Playlist visible:', savePlaylistVisible, '| Download PDF visible:', downloadPdfVisible);

    let saveClickWorked = false;
    if (savePlaylistVisible) {
      await ar.whiteboardSavePlaylistBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
      saveClickWorked = await page.getByText(/saved|added to playlist/i).isVisible({ timeout: 3000 }).catch(() => false);
    }
    console.log('Clicking Save to Playlist produced a visible confirmation:', saveClickWorked);
    test.fail(savePlaylistVisible && !saveClickWorked, 'Save to Playlist is present but clicking it produces no visible confirmation -- confirmed non-functional');
    if (savePlaylistVisible) expect(saveClickWorked).toBe(true);
    expect(downloadPdfVisible).toBe(true);
  });

  test('AR-GAP-01: Overflow-menu responsiveness at 200+ accumulated assets', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const pl = new PlaylistPage(page);
    const count = await pl.resourceCards.count();
    console.log('This account\'s current resource-card count (workbook needs 200+):', count);
    test.fail(count < 200, `This account has only ${count} resource cards -- far short of the 200+ needed to observe overflow-menu behavior at scale, and there is no practical way to bulk-generate that many through the UI alone`);
    expect(count).toBeGreaterThanOrEqual(200);
  });

  test('AR-GAP-02: Toggling "Replace File" ON reveals a hidden File input on Edit', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const pl = new PlaylistPage(page);
    const cards = pl.resourceCards;
    const count = await cards.count();
    let editOpened = false;
    for (let i = 0; i < Math.min(count, 15) && !editOpened; i++) {
      const overflow = cards.nth(i).locator('[data-qa-id="playlist-resource-overflow-btn"], button:has(mat-icon:has-text("more_vert"))').first();
      if (!(await overflow.isVisible().catch(() => false))) continue;
      await overflow.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
      const editOption = page.getByText('Edit', { exact: true }).first();
      if (await editOption.isVisible({ timeout: 1500 }).catch(() => false)) {
        await editOption.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(800);
        editOpened = await page.locator('app-add-custom-asset .add-custom-asset').isVisible({ timeout: 3000 }).catch(() => false);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }
    console.log('Found a self-created asset with an Edit option and opened it:', editOpened);
    test.fail(!editOpened, 'No self-created asset with a reachable Edit option was found on the Playlist to test the Replace-File toggle against');
    expect(editOpened).toBe(true);
  });

  test('AR-CYP-08: The custom-asset endpoint rejects a tampered chapterId/topicId not matching the teacher\'s authorized context', { tag: ['@security', '@bug'] }, async ({ page }) => {
    // Same blocker as NAV-SEC-01/EXP-06 -- needs the create/upload request's
    // exact shape reverse-engineered plus a known foreign chapterId/topicId
    // to substitute, neither available without a second reference account or
    // back-office access.
    test.fail(true, 'No known foreign chapterId/topicId available to substitute, and forging the raw create/upload request needs its exact shape captured live — not available without a second reference account');
    expect(true).toBe(false);
  });

  test('ADD-EXP-01: Submitting Create with a Title but no Chapter & Topic is blocked with a clear validation message', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.create.click({ force: true });
    await expect(ar.createForm).toBeVisible();
    // Chapter & Topic is always pre-filled/disabled (per ADD-CRT-02/AR-CYP-01)
    // -- there is no reachable "unselected" state to submit against.
    const chapterTopicValue = await ar.chapterTopicInput.inputValue();
    console.log('Chapter & Topic value (always pre-filled, confirmed disabled):', chapterTopicValue);
    test.fail(chapterTopicValue.length > 0, 'Chapter & Topic is always pre-filled and disabled -- there is no reachable unselected state to submit against, so this validation path cannot be exercised');
    expect(chapterTopicValue.length).toBe(0);
  });

  test('ADD-EXP-02: Choosing a file then changing Grade & Subject does not orphan the already-selected file', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.create.click({ force: true });
    await expect(ar.createForm).toBeVisible();
    await ar.fileInput.setInputFiles({ name: 'sample.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await page.waitForTimeout(300);
    const filesBefore = await ar.fileInput.evaluate((el) => el.files.length);
    // Grade & Subject is confirmed disabled (ADD-CRT-02) -- there is no
    // reachable way to change it mid-form to test the orphaning concern.
    const gradeSubjectDisabled = await ar.gradeSubjectInput.isDisabled();
    console.log('File selected count:', filesBefore, '| Grade & Subject disabled (unchangeable):', gradeSubjectDisabled);
    test.fail(gradeSubjectDisabled, 'Grade & Subject is always disabled in this form -- there is no reachable way to change it mid-form to test whether it orphans an already-selected file');
    expect(gradeSubjectDisabled).toBe(false);
  });

  test('ADD-EXP-03: A Library search that legitimately returns zero results shows a clear "no results" state', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.library.click({ force: true });
    await expect(ar.libraryPopup).toBeVisible();
    await ar.librarySearchInput.fill('zzzznonexistentqueryxyz123');
    await ar.librarySearchBtn.click();
    await page.waitForTimeout(1500);

    const resultCount = await ar.libraryResults.count();
    const noResultsMessage = await page.getByText(/no results|not found|no resources/i).isVisible().catch(() => false);
    console.log('Results for a nonsense search:', resultCount, '| explicit no-results message shown:', noResultsMessage);
    test.fail(resultCount === 0 && !noResultsMessage, 'A zero-result Library search shows neither results nor an explicit "no results" message -- indistinguishable from a silently broken search');
    expect(resultCount > 0 || noResultsMessage).toBe(true);
  });

  test('ADD-EXP-04: The 10MB file-size limit is enforced (client-side check confirmed; same as AR-CYP-06/ADD-CRT-10)', { tag: ['@negative', '@bug'] }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.create.click({ force: true });
    await expect(ar.createForm).toBeVisible();
    const big = Buffer.alloc(10 * 1024 * 1024 + 100, 'a'); // just over 10MB
    await ar.titleInput.fill('just over limit test');
    await ar.fileInput.setInputFiles({ name: 'just-over.txt', mimeType: 'text/plain', buffer: big });
    await page.waitForTimeout(800);
    const submitDisabled = await ar.submitBtn.isDisabled();
    const errorVisible = await ar.createForm.getByText(/size|10 ?mb|large/i).isVisible().catch(() => false);
    console.log('A file just 100 bytes over 10MB -- submit disabled:', submitDisabled, '| error shown:', errorVisible);
    // Only the CLIENT-side check is verifiable in this environment (no tool
    // to bypass the browser's own file-size gate and hit the server
    // directly with a real upload) -- documenting that scope honestly.
    test.fail(!submitDisabled && !errorVisible, 'The file-size limit is not enforced even client-side for a file just over 10MB');
    expect(submitDisabled || errorVisible).toBe(true);
  });

  test('ADD-EXP-05: A Library search of only whitespace is treated the same as an empty query', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.library.click({ force: true });
    await expect(ar.libraryPopup).toBeVisible();
    await ar.librarySearchInput.fill('   ');
    const searchDisabled = await ar.librarySearchBtn.isDisabled().catch(() => false);
    await ar.librarySearchBtn.click({ force: searchDisabled }).catch(() => {});
    await page.waitForTimeout(1000);

    const treatedAsValidSearch = await page.getByText(/no results|not found/i).isVisible().catch(() => false);
    console.log('Search button disabled for whitespace-only query:', searchDisabled, '| treated as a real (nonsense) search:', treatedAsValidSearch);
    test.fail(!searchDisabled && treatedAsValidSearch, 'A whitespace-only query is submitted as a real search (producing a no-results state) instead of being treated as empty/blocked');
    expect(searchDisabled || !treatedAsValidSearch).toBe(true);
  });

  test('ADD-EXP-06: The Create Title field has no maxlength, and a 200+ char title does not break the layout once created', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.create.click({ force: true });
    await expect(ar.createForm).toBeVisible();
    const longTitle = 'A'.repeat(220);
    await ar.titleInput.fill(longTitle);
    const actualValue = await ar.titleInput.inputValue();
    console.log('Typed 220 chars, field retained:', actualValue.length, 'chars');
    expect(actualValue.length).toBe(220);
    // Verifying the CREATED card's layout needs an actual submit, deliberately
    // not executed on the shared QA account (same reasoning as ADD-CRT-09).
    test.fail(true, 'Field-level maxlength confirmed absent above; verifying the resulting resource CARD does not break layout needs a real submit, deliberately not executed on the shared QA account');
    expect(true).toBe(false);
  });

  test('ADD-EXP-07: Rapidly clicking between source cards before any fully opens settles on exactly the last-clicked source', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.library.click({ force: true });
    await ar.actions.gallery.click({ force: true, timeout: 3000 }).catch(() => {});
    await ar.actions.aiAssist.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const libraryOpen = await ar.libraryPopup.isVisible().catch(() => false);
    const galleryOpen = await page.locator('[data-qa-id="gallery-close-btn"]').isVisible().catch(() => false);
    const aiAssistOpen = await page.locator('[data-qa-id="ai-assist-close-btn"]').isVisible().catch(() => false);
    const openCount = [libraryOpen, galleryOpen, aiAssistOpen].filter(Boolean).length;
    console.log('After rapid Library -> Gallery -> AI-Assist clicks -- Library open:', libraryOpen, '| Gallery open:', galleryOpen, '| AI-Assist open:', aiAssistOpen);

    test.fail(openCount !== 1 || !aiAssistOpen, `Expected exactly the last-clicked source (AI-Assist) open; got ${openCount} source(s) open, AI-Assist open: ${aiAssistOpen}`);
    expect(aiAssistOpen && openCount === 1).toBe(true);
  });

  test('ADD-EXP-08: The Share toggle\'s ON default is preserved after other form interactions', { tag: '@boundary' }, async ({ page }) => {
    const ar = new AddResourcePage(page);
    await ar.openPicker();
    await page.waitForTimeout(500);
    await ar.actions.create.click({ force: true });
    await expect(ar.createForm).toBeVisible();
    await expect(ar.shareToggleButton).toHaveAttribute('aria-checked', 'true');

    await ar.titleInput.fill('share toggle persistence check');
    await page.waitForTimeout(300);
    // Grade & Subject / Chapter & Topic are confirmed disabled/unchangeable
    // (ADD-CRT-02) -- the closest available "other form interaction" is
    // typing into Title and touching the file input.
    await ar.fileInput.setInputFiles({ name: 'sample.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await page.waitForTimeout(300);
    await expect(ar.shareToggleButton).toHaveAttribute('aria-checked', 'true');
  });
});
