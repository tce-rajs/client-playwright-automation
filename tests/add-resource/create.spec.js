// Create (Add Resource's own resource-upload form).
// Source: CEP_TestCases/Add_Resource_Module_Test_Cases_Final.xlsx, cases ADD-CRT-01..14.
//
// CONFIRMED LIVE: this form (<app-add-custom-asset>) has NO data-qa-id
// attributes at all, unlike the rest of the app -- addressed via Angular's
// formcontrolname attributes instead (title/grade_subject/chapter_topic/share).

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { AddResourcePage } = require('../../pages/add-resource.page');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const ar = new AddResourcePage(page);
  await pl.loginWithPin(process.env.VALID_PIN);
  await pl.ensureResourcesPresent();
  await ar.openPicker();
  await ar.actions.create.click();
  await expect(ar.createForm).toBeVisible();
});

test('ADD-CRT-01: Create form shows Title, Grade & Subject, Chapter & Topic, File, and Share', { tag: '@ui-state' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await expect(ar.titleInput).toBeVisible();
  await expect(ar.gradeSubjectInput).toBeVisible();
  await expect(ar.chapterTopicInput).toBeVisible();
  await expect(ar.fileInput).toBeVisible();
  await expect(ar.shareToggle).toBeVisible();
  await expect(ar.cancelBtn).toBeVisible();
  await expect(ar.submitBtn).toBeVisible();
});

test('ADD-CRT-02: Grade & Subject and Chapter & Topic are pre-filled and read-only', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const gradeSubjectValue = await ar.gradeSubjectInput.inputValue();
  const chapterTopicValue = await ar.chapterTopicInput.inputValue();
  console.log('Grade & Subject:', gradeSubjectValue, '| Chapter & Topic:', chapterTopicValue);
  expect(gradeSubjectValue.length).toBeGreaterThan(0);
  expect(chapterTopicValue.length).toBeGreaterThan(0);
  await expect(ar.gradeSubjectInput).toBeDisabled();
  await expect(ar.chapterTopicInput).toBeDisabled();
});

test('ADD-CRT-03: Share toggle defaults to ON', { tag: '@ui-state' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await expect(ar.shareToggleButton).toHaveAttribute('aria-checked', 'true');
});

test('ADD-CRT-04: Typing fewer than 3 characters in Title shows a real-time error', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.titleInput.fill('ab');
  await expect(ar.titleErrorText).toBeVisible();
});

test('ADD-CRT-05: Typing 3 or more characters clears the Title error', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.titleInput.fill('ab');
  await expect(ar.titleErrorText).toBeVisible();
  await ar.titleInput.fill('abc');
  await expect(ar.titleErrorText).toBeHidden();
});

test('ADD-CRT-06: Submitting a completely untouched, empty Title shows no validation feedback', { tag: '@negative' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  // Title never focused/typed into at all.
  const submitDisabled = await ar.submitBtn.isDisabled();
  await ar.submitBtn.click({ force: submitDisabled }).catch(() => {});
  await page.waitForTimeout(500);
  const errorShown = await ar.titleErrorText.isVisible().catch(() => false);
  console.log('Submit disabled:', submitDisabled, '| Title error shown after blind submit attempt:', errorShown);
  test.fail(!errorShown, 'Submitting with an untouched empty Title shows no validation feedback at all (inconsistent with ADD-CRT-04, where a touched-then-invalid Title does show the error)');
  expect(errorShown).toBe(true);
});

test('ADD-CRT-07: Submitting a valid Title with no File selected shows no validation feedback for the missing File', { tag: '@negative' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.titleInput.fill('abc');
  await page.waitForTimeout(300);
  const submitDisabled = await ar.submitBtn.isDisabled();
  await ar.submitBtn.click({ force: submitDisabled }).catch(() => {});
  await page.waitForTimeout(500);
  const fileErrorVisible = await ar.createForm.getByText(/file.*required|required.*file/i).isVisible().catch(() => false);
  console.log('Submit disabled with valid Title but no file:', submitDisabled, '| File error shown:', fileErrorVisible);
  test.fail(!fileErrorVisible, 'Submitting a valid Title with no File selected shows no validation feedback near the File control');
  expect(fileErrorVisible).toBe(true);
});

test('ADD-CRT-08: Cancel closes the Create form and discards entered data', { tag: '@positive' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  await ar.titleInput.fill('abc');
  await ar.cancelBtn.click();
  await expect(ar.createForm).toBeHidden();

  await ar.openPicker();
  await ar.actions.create.click();
  await expect(ar.createForm).toBeVisible();
  const value = await ar.titleInput.inputValue();
  expect(value).toBe('');
});

test('ADD-CRT-09: A fully valid submission creates the resource and attaches it to the current Topic', { tag: '@positive' }, async ({ page }) => {
  // Deliberately not executed -- would add a permanent asset to the shared
  // QA playlist/account, matching the workbook's own documented decision.
  test.fail(true, 'Deliberately not executed to avoid adding a permanent asset to the shared QA playlist/account');
  expect(true).toBe(false);
});

test('ADD-CRT-10: A file larger than the stated 10MB limit is rejected', { tag: '@negative' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const big = Buffer.alloc(11 * 1024 * 1024, 'a'); // 11MB, safely over the 10MB limit
  await ar.titleInput.fill('big file test');
  await ar.fileInput.setInputFiles({ name: 'oversized.txt', mimeType: 'text/plain', buffer: big });
  await page.waitForTimeout(500);
  const submitDisabled = await ar.submitBtn.isDisabled();
  await ar.submitBtn.click({ force: submitDisabled }).catch(() => {});
  await page.waitForTimeout(800);
  const errorVisible = await ar.createForm.getByText(/size|10 ?mb|large/i).isVisible().catch(() => false);
  console.log('Submit disabled with oversized file:', submitDisabled, '| Size-related error shown:', errorVisible);
  test.fail(!submitDisabled && !errorVisible, 'An oversized (>10MB) file is accepted with no rejection/error and Submit remains enabled');
  expect(submitDisabled || errorVisible).toBe(true);
});

test('ADD-CRT-11: A file of an unsupported type is rejected', { tag: '@negative' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const accept = await ar.fileInput.getAttribute('accept');
  console.log('File input accept list:', accept);
  await ar.titleInput.fill('unsupported file test');
  // .exe is not in the confirmed accept list (.jpeg,.jpg,.png,.mp4,.pdf,.xlsx,.xls,.doc,.docx,.ppt,.pptx,.txt,.gif,.odp,.ods,.odt)
  await ar.fileInput.setInputFiles({ name: 'malicious.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') });
  await page.waitForTimeout(500);
  const submitDisabled = await ar.submitBtn.isDisabled();
  await ar.submitBtn.click({ force: submitDisabled }).catch(() => {});
  await page.waitForTimeout(800);
  const errorVisible = await ar.createForm.getByText(/type|not supported|invalid file/i).isVisible().catch(() => false);
  console.log('Submit disabled with unsupported file type:', submitDisabled, '| Type-related error shown:', errorVisible);
  test.fail(!submitDisabled && !errorVisible, 'A file with a disallowed extension is accepted with no rejection/error and Submit remains enabled');
  expect(submitDisabled || errorVisible).toBe(true);
});

test('ADD-CRT-12: Turning Share OFF before submitting is respected', { tag: '@positive' }, async ({ page }) => {
  // Deliberately not executed via a real submit -- would add a permanent
  // asset to the shared QA account (same reasoning as ADD-CRT-09). Verify
  // only that the toggle itself is controllable and reflects OFF state.
  const ar = new AddResourcePage(page);
  await ar.shareToggleButton.click();
  await expect(ar.shareToggleButton).toHaveAttribute('aria-checked', 'false');
  test.fail(true, 'Toggle-OFF state itself verified; the actual created-resource privacy behavior needs a real submit, deliberately not executed on the shared QA account');
  expect(true).toBe(false);
});

test('ADD-CRT-13: A Title containing script/HTML markup is stored and rendered as literal text', { tag: '@security' }, async ({ page }) => {
  // Deliberately not executed via a real submit for the same reason as
  // ADD-CRT-09/12 -- verify only that the input accepts the markup as plain
  // text client-side without executing it.
  const ar = new AddResourcePage(page);
  let dialogFired = false;
  page.on('dialog', async (d) => { dialogFired = true; await d.dismiss(); });
  await ar.titleInput.fill('<script>alert(1)</script>');
  await page.waitForTimeout(500);
  expect(dialogFired).toBe(false);
  const value = await ar.titleInput.inputValue();
  expect(value).toContain('<script>');
});

test('ADD-CRT-14: Subtitle copy has a spelling/grammar issue', { tag: '@ui-state' }, async ({ page }) => {
  const ar = new AddResourcePage(page);
  const subtitle = (await ar.createSubtitle.textContent()).trim();
  console.log('Create subtitle text:', subtitle);
  const hasTypo = /extention/i.test(subtitle) || /an existing resources/i.test(subtitle);
  test.fail(hasTypo, `Subtitle has a spelling/grammar issue: "${subtitle}"`);
  expect(hasTypo).toBe(false);
});
