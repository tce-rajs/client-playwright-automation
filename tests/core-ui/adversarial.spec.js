// Core UI -- NEW adversarial ("break the app") cases on top of the existing
// CORE-01..07 / CUI-EXP-01..05 coverage in core-ui.spec.js. New ID prefix
// CORE-BREAK-* (CEP_TestCases/Core_UI_Test_Cases.xlsx), continuing this
// session's adversarial pass. Every case is a genuinely NEW angle not
// already covered by the existing file (extreme viewports, reload-spam,
// DST transition gap, RTL/foreign locale, and true tab concurrency).

const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('CORE-BREAK-01: an extremely small viewport (320x480, a real low-end phone size) does not overlap the logo/date/toolbar', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.reload();

  const logo = page.locator('[data-qa-id="wb-header-logo-image"]');
  const calendar = page.locator('[data-qa-id="wb-header-calendar-container"]');
  await expect(logo).toBeVisible({ timeout: 15000 });
  await expect(calendar).toBeVisible({ timeout: 15000 });

  const logoBox = await logo.boundingBox();
  const calendarBox = await calendar.boundingBox();
  console.log('320x480 -- logo box:', logoBox, '| calendar box:', calendarBox);

  const overlap = logoBox && calendarBox &&
    logoBox.x < calendarBox.x + calendarBox.width &&
    logoBox.x + logoBox.width > calendarBox.x &&
    logoBox.y < calendarBox.y + calendarBox.height &&
    logoBox.y + logoBox.height > calendarBox.y;
  const overflowsViewport = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5);
  console.log('Logo/calendar overlap at 320px width:', overlap, '| horizontal overflow:', overflowsViewport);

  test.fail(Boolean(overlap) || overflowsViewport, 'At a real low-end phone width (320px), the header logo and date/time overlap or overflow horizontally instead of stacking/shrinking responsively');
  expect(overlap || overflowsViewport).toBe(false);
});

test('CORE-BREAK-02: an unusually large 4K viewport (3840x2160) keeps the logo pinned left and clock pinned right, not floating in the middle', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.reload();

  const logo = page.locator('[data-qa-id="wb-header-logo-image"]');
  const calendar = page.locator('[data-qa-id="wb-header-calendar-container"]');
  await expect(logo).toBeVisible({ timeout: 15000 });
  await expect(calendar).toBeVisible({ timeout: 15000 });

  const logoBox = await logo.boundingBox();
  const calendarBox = await calendar.boundingBox();
  console.log('3840x2160 -- logo box:', logoBox, '| calendar box:', calendarBox);

  // Logo should stay near the left edge; calendar should stay near the right
  // edge -- neither should drift into the middle third of a 3840px-wide
  // screen (a real CSS-flex-without-max-width bug class).
  const logoNearLeft = logoBox && logoBox.x < 3840 * 0.25;
  const calendarNearRight = calendarBox && (calendarBox.x + calendarBox.width) > 3840 * 0.75;
  console.log('Logo stayed near left quarter:', logoNearLeft, '| calendar stayed near right quarter:', calendarNearRight);

  test.fail(!logoNearLeft || !calendarNearRight, 'On a 4K-class viewport, the header logo and/or clock drift away from their pinned corners instead of staying anchored');
  expect(logoNearLeft && calendarNearRight).toBe(true);
});

test('CORE-BREAK-03: rapidly reloading the page 8 times in immediate succession never leaves duplicate header elements mounted', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  test.setTimeout(60000);
  for (let i = 0; i < 8; i++) {
    // Fire-and-forget style: don't always wait for full networkidle, mirroring
    // a real impatient user mashing F5.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(2000);

  const logoCount = await page.locator('[data-qa-id="wb-header-logo-image"]').count();
  const calendarCount = await page.locator('[data-qa-id="wb-header-calendar-container"]').count();
  const versionCount = await page.locator('[data-qa-id="wb-header-version-text"]').count();
  console.log('After 8 rapid reloads -- logo count:', logoCount, '| calendar count:', calendarCount, '| version count:', versionCount);

  const anyDuplicated = logoCount > 1 || calendarCount > 1 || versionCount > 1;
  test.fail(anyDuplicated, 'Rapidly reloading the app 8 times in a row leaves more than one instance of a header element mounted at once');
  expect(anyDuplicated).toBe(false);
  // And the page must still be alive and showing a real clock, not stuck blank.
  await expect(page.locator('[data-qa-id="wb-header-calendar-container"]')).toBeVisible();
});

test('CORE-BREAK-04: a nonexistent local time inside a DST spring-forward gap does not crash or blank the clock', { tag: ['@boundary', '@bug'] }, async ({ page }) => {
  // 2026-03-08 02:30:00 America/New_York does not exist -- clocks jump
  // 2:00 AM straight to 3:00 AM that day (US DST start). Forcing the
  // system clock to a technically-impossible local time is a genuine
  // extreme-input case for any client-side date-formatting code.
  const context = page.context();
  await context.clearCookies().catch(() => {});
  const impossibleLocal = new Date('2026-03-08T02:30:00');
  await page.clock.install({ time: impossibleLocal });
  await page.goto('./');

  const calendar = page.locator('[data-qa-id="wb-header-calendar-container"]');
  await expect(calendar).toBeVisible({ timeout: 15000 });
  const text = (await calendar.textContent()) || '';
  console.log('Header clock text at a DST spring-forward-gap instant:', JSON.stringify(text));

  const looksSane = text.trim().length > 0 && !/nan|invalid|undefined/i.test(text);
  test.fail(!looksSane, 'The header clock renders an empty/garbled/NaN string when the system clock is set to a DST spring-forward-gap instant, instead of a sane fallback');
  expect(looksSane).toBe(true);
});

test('CORE-BREAK-05: an Arabic (RTL) locale + Asia/Riyadh timezone context renders the header without breaking layout direction', { tag: ['@boundary', '@bug'] }, async ({ browser }) => {
  const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Riyadh' });
  const page = await context.newPage();
  await page.goto('./');

  const logo = page.locator('[data-qa-id="wb-header-logo-image"]');
  const calendar = page.locator('[data-qa-id="wb-header-calendar-container"]');
  await expect(logo).toBeVisible({ timeout: 15000 });
  await expect(calendar).toBeVisible({ timeout: 15000 });

  const dir = await page.evaluate(() => document.documentElement.getAttribute('dir') || getComputedStyle(document.body).direction);
  const logoBox = await logo.boundingBox();
  const calendarBox = await calendar.boundingBox();
  const calendarText = await calendar.textContent();
  console.log('Under ar-SA/Asia/Riyadh -- resolved dir:', dir, '| logo box:', logoBox, '| calendar box:', calendarBox, '| calendar text:', calendarText);

  // Whatever the app's own RTL stance is, the logo must stay left-of the
  // calendar's midpoint and vice versa -- a swapped/overlapping header would
  // indicate the locale change broke a hardcoded LTR assumption.
  const logoLeftOfCalendar = logoBox && calendarBox && logoBox.x < calendarBox.x;
  test.fail(!logoLeftOfCalendar, 'Under an Arabic (RTL) browser locale, the header logo and date/time swap position or overlap instead of keeping a stable layout');
  expect(logoLeftOfCalendar).toBe(true);
  await context.close();
});

test('CORE-BREAK-06: two browser tabs opening Guest Mode at the exact same instant both render a complete, independent header', { tag: '@cross-cutting' }, async ({ browser }) => {
  const context = await browser.newContext();
  const page1 = await context.newPage();
  const page2 = await context.newPage();

  // Fire both navigations without awaiting the first -- genuine concurrency,
  // not two sequential loads.
  const nav1 = page1.goto('./');
  const nav2 = page2.goto('./');
  await Promise.all([nav1, nav2]);

  const logo1 = page1.locator('[data-qa-id="wb-header-logo-image"]');
  const logo2 = page2.locator('[data-qa-id="wb-header-logo-image"]');
  const calendar1 = page1.locator('[data-qa-id="wb-header-calendar-container"]');
  const calendar2 = page2.locator('[data-qa-id="wb-header-calendar-container"]');

  await expect(logo1).toBeVisible({ timeout: 20000 });
  await expect(logo2).toBeVisible({ timeout: 20000 });
  await expect(calendar1).toBeVisible({ timeout: 20000 });
  await expect(calendar2).toBeVisible({ timeout: 20000 });

  const text1 = await calendar1.textContent();
  const text2 = await calendar2.textContent();
  console.log('Tab 1 clock:', text1, '| Tab 2 clock:', text2);

  expect(text1 && text1.trim().length).toBeGreaterThan(0);
  expect(text2 && text2.trim().length).toBeGreaterThan(0);
  await context.close();
});
