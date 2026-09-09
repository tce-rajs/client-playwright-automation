# new approch playwright

A fresh, beginner-friendly Playwright test suite for CEP v2 (Tata ClassEdge).
This is a clean rebuild — no code was copied from `../automation-cep-playwright`
or `../automation-cep-cypress`. Only credentials and the data-qa-id reference
doc are reused from those locations (see below).

## Setup (already done once)

```
npm install
npx playwright install chromium
```

## Running tests

```
npm test              # headless, runs everything in tests/
npm run test:headed   # watch the browser while it runs
npm run test:ui       # Playwright's interactive UI mode (great for debugging)
npm run report        # open the last HTML report
```

## Project layout

```
tests/    all test spec files (*.spec.js)
pages/    page objects (one file per screen, e.g. login.page.js)
docs/     notes, test case lists
.env      real credentials (gitignored, never commit)
```

## Credentials & reference docs

- Credentials live in `.env` (copy `.env.example` if you need to recreate it).
  Same QA account as the sibling projects — PIN login is the confirmed-working
  path; the password login is unconfirmed, see the note in `.env`.
- Element locators: use `data-qa-id` attributes. The full reference list is at
  `../cep2-workspace/docs/qa/DATA-QA-ID-REFERENCE.md` (read-only source, do not
  edit it here).

## Status

Scaffolding only — verified with a smoke test that Playwright installs and can
reach the QA site. Real test specs go in `tests/` once test cases are provided.
