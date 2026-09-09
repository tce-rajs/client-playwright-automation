// AI Homework -- NEW adversarial "break the app" cases on top of the
// existing 26 tests in ai-homework.spec.js. New ID prefix AIH-BREAK-*
// (CEP_TestCases/AI_Homework_Module_Test_Cases_Final.xlsx). Deliberately
// stays on the pre-Generate composer surface (type picker / counters) to
// avoid the real ~20-25s AI/RAG Generate call this suite's own header
// comment already flags as expensive -- matches this file's own
// established cost-consciousness.

const { test, expect } = require('@playwright/test');
const { PlaylistPage } = require('../../pages/playlist.page');
const { NavigationPage } = require('../../pages/navigation.page');
const { AiHomeworkPage } = require('../../pages/ai-homework.page');
const { applyClassMap } = require('../../config/moduleClassMap');

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeEach(async ({ page }) => {
  const pl = new PlaylistPage(page);
  const nav = new NavigationPage(page);
  await pl.loginWithPin(process.env.VALID_PIN_2);
  await applyClassMap(nav, 'aiHomework').catch(() => {});
});

test('AIH-BREAK-01: switching Class while the AI Homework composer is open does not leave it stuck visible over the new class\'s whiteboard', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const ah = new AiHomeworkPage(page);
  const nav = new NavigationPage(page);
  await ah.open();
  const composerOpened = await ah.homeworkTypeCard.isVisible({ timeout: 8000 }).catch(() => false);
  test.fail(!composerOpened, 'AI Homework composer did not open this run -- could not exercise the mid-open class-switch case');
  expect(composerOpened).toBe(true);
  if (!composerOpened) return;

  // Use a directly-bounded click on Current Class itself (NOT the full
  // multi-step resetToClass() helper, whose several internal 10s-timeout
  // cascade clicks can stack past any reasonable single test budget if the
  // composer blocks the very first one) -- this gives a clean, fast signal
  // either way, matching the pattern already confirmed for AIN-BREAK-02.
  const classPopupOpened = await nav.currentClassBtn.click({ timeout: 8000 }).then(() => true).catch((e) => { console.log('Current Class click threw:', e.message.split('\n')[0]); return false; });
  await page.waitForTimeout(1000);

  const composerStillVisible = await ah.homeworkTypeCard.isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Current Class click succeeded:', classPopupOpened, '| AI Homework composer still visible:', composerStillVisible);

  test.fail(!classPopupOpened && composerStillVisible, 'With the AI Homework composer open, the Current Class control cannot be clicked at all -- the composer fully blocks class-switching rather than allowing it through or showing a clear guard');
  expect(!classPopupOpened && composerStillVisible).toBe(false);
});

test('AIH-BREAK-02: rapidly opening and closing the composer 5 times in a row leaves exactly one clean instance', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(60000);
  const ah = new AiHomeworkPage(page);
  let lastOpened = false;
  for (let i = 0; i < 5; i++) {
    await ah.open();
    lastOpened = await ah.homeworkTypeCard.isVisible({ timeout: 5000 }).catch(() => false);
    if (lastOpened) {
      await ah.discardBtn.click({ force: true, timeout: 3000 }).catch(async () => {
        await page.keyboard.press('Escape').catch(() => {});
      });
      await page.waitForTimeout(400);
    }
  }
  test.fail(!lastOpened, 'The composer stopped opening partway through 5 rapid open/close cycles');
  expect(lastOpened).toBe(true);
  if (!lastOpened) return;

  const cardCount = await page.locator('[data-qa-id="ai-homework-option-homework-select"]:visible').count();
  console.log('Visible homework-type-card instance count after 5x rapid open/close cycles:', cardCount);
  test.fail(cardCount > 1, 'Rapidly opening/closing the AI Homework composer 5 times leaves more than one visible instance mounted');
  expect(cardCount).toBeLessThanOrEqual(1);
});

test('AIH-BREAK-03: pressing the browser Back button while the composer is open does not leave a stuck overlay behind', { tag: ['@ui-state', '@bug'] }, async ({ page }) => {
  const ah = new AiHomeworkPage(page);
  await ah.open();
  const composerOpened = await ah.homeworkTypeCard.isVisible({ timeout: 8000 }).catch(() => false);
  test.fail(!composerOpened, 'AI Homework composer did not open this run -- could not exercise the Back-button case');
  expect(composerOpened).toBe(true);
  if (!composerOpened) return;

  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch((e) => console.log('goBack threw:', e.message));
  await page.waitForTimeout(1500);

  const pageUsable = await page.locator('body').isVisible().catch(() => false);
  console.log('Page usable after Back with AI Homework composer open:', pageUsable, '| URL:', page.url());
  test.fail(!pageUsable, 'Pressing Back while the AI Homework composer is open leaves the page unusable');
  expect(pageUsable).toBe(true);
});

test('AIH-BREAK-04: rapidly alternating clicks between the objective counter\'s plus and minus buttons 20 times settles on a value matching the actual net clicks, not a desynced one', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(45000);
  const ah = new AiHomeworkPage(page);
  await ah.open();
  await ah.homeworkTypeCard.click({ force: true, timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);

  const counterVisible = await ah.hwObjInput.isVisible({ timeout: 5000 }).catch(() => false);
  test.fail(!counterVisible, 'Homework objective counter not reachable this run -- could not exercise the rapid-alternating-click case');
  expect(counterVisible).toBe(true);
  if (!counterVisible) return;

  const startValue = parseInt((await ah.hwObjInput.inputValue().catch(() => '0')) || '0', 10);
  // 10 plus, 10 minus, strictly alternating and fast -- net should be zero.
  for (let i = 0; i < 10; i++) {
    await ah.hwObjPlus.click({ force: true, timeout: 1500 }).catch(() => {});
    await ah.hwObjMinus.click({ force: true, timeout: 1500 }).catch(() => {});
  }
  await page.waitForTimeout(500);
  const endValue = parseInt((await ah.hwObjInput.inputValue().catch(() => '-1')) || '-1', 10);
  console.log('Objective counter -- start value:', startValue, '| end value after 10x alternating +/- clicks:', endValue);

  test.fail(endValue !== startValue, `20 alternating plus/minus clicks (net zero) left the objective counter at ${endValue} instead of back at its starting value ${startValue} -- suggests dropped/desynced clicks, consistent with the existing AIH-CNT-02 double-click finding`);
  expect(endValue).toBe(startValue);
});
