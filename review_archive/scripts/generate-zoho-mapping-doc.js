// One-off generator: reads config/zohoBugMap.js and writes ZOHO_BUG_MAPPING.md at the project
// root -- a human-readable version of the same data, grouped by module, for review/sharing.
// Re-run this after updating matchedTestId entries in config/zohoBugMap.js.
const fs = require('fs');
const path = require('path');
const { TEACH_MODE_BUGS, EXCLUDED_PLAN_MODE_BUGS, OPEN_STATUSES } = require('../config/zohoBugMap');

const PRIORITY_ORDER = { Highest: 0, High: 1, Medium: 2, Low: 3 };
function sortBugs(bugs) {
  return [...bugs].sort((a, b) => {
    const openA = OPEN_STATUSES.includes(a.status) ? 0 : 1;
    const openB = OPEN_STATUSES.includes(b.status) ? 0 : 1;
    if (openA !== openB) return openA - openB;
    const pa = PRIORITY_ORDER[a.priority] ?? 9;
    const pb = PRIORITY_ORDER[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
}

function byModule(bugs) {
  const map = {};
  bugs.forEach((b) => {
    map[b.module] = map[b.module] || [];
    map[b.module].push(b);
  });
  return map;
}

function row(b) {
  const matched = b.matchedTestId ? '`' + b.matchedTestId + '`' : '—';
  const status = OPEN_STATUSES.includes(b.status) ? '**' + b.status + '**' : b.status;
  return `| ${b.id} | ${b.title.replace(/\|/g, '\\|')} | ${b.priority} | ${status} | ${matched} |`;
}

const lines = [];
lines.push('# Zoho Historical Bug Mapping');
lines.push('');
lines.push(
  'Generated from `config/zohoBugMap.js` (source: `CEP_TestCases/Zoho_Bugs_TeachMode.xlsx`) by ' +
    '`scripts/generate-zoho-mapping-doc.js`. Re-run that script after updating `matchedTestId` ' +
    'entries in the config file, rather than hand-editing this file directly.'
);
lines.push('');
lines.push(
  `**${TEACH_MODE_BUGS.length} Teach Mode bugs** (in this suite's scope) + ` +
    `**${EXCLUDED_PLAN_MODE_BUGS.length} excluded Plan Mode bugs** (out of scope, kept for reference) ` +
    `= ${TEACH_MODE_BUGS.length + EXCLUDED_PLAN_MODE_BUGS.length} total, from the original 693-bug Zoho export.`
);
lines.push('');
const openCount = TEACH_MODE_BUGS.filter((b) => OPEN_STATUSES.includes(b.status)).length;
const matchedCount = TEACH_MODE_BUGS.filter((b) => b.matchedTestId).length;
lines.push(
  `**${openCount} currently open** (To do / Reopened / Ready for Testing / On Hold) of the ${TEACH_MODE_BUGS.length} Teach Mode bugs. ` +
    `**${matchedCount} matched to a live-verifying Playwright test so far.**`
);
lines.push('');
lines.push('Within each module below, currently-open bugs are listed first (bold status), then by priority.');
lines.push('');

const teachByModule = byModule(TEACH_MODE_BUGS);
const moduleNames = Object.keys(teachByModule).sort((a, b) => teachByModule[b].length - teachByModule[a].length);

lines.push('## Summary by module');
lines.push('');
lines.push('| Module | Total | Open | Matched |');
lines.push('|---|---|---|---|');
moduleNames.forEach((m) => {
  const bugs = teachByModule[m];
  const open = bugs.filter((b) => OPEN_STATUSES.includes(b.status)).length;
  const matched = bugs.filter((b) => b.matchedTestId).length;
  lines.push(`| ${m} | ${bugs.length} | ${open} | ${matched} |`);
});
lines.push('');
lines.push('---');
lines.push('');
lines.push('## Teach Mode bugs, by module');
lines.push('');

moduleNames.forEach((m) => {
  const bugs = sortBugs(teachByModule[m]);
  lines.push(`### ${m} (${bugs.length})`);
  lines.push('');
  lines.push('| Zoho ID | Title | Priority | Status | Matched test |');
  lines.push('|---|---|---|---|---|');
  bugs.forEach((b) => lines.push(row(b)));
  lines.push('');
});

lines.push('---');
lines.push('');
lines.push(`## Excluded — Plan Mode bugs (${EXCLUDED_PLAN_MODE_BUGS.length}, out of this suite's current scope)`);
lines.push('');
const planByModule = byModule(EXCLUDED_PLAN_MODE_BUGS);
Object.keys(planByModule)
  .sort((a, b) => planByModule[b].length - planByModule[a].length)
  .forEach((m) => {
    const bugs = sortBugs(planByModule[m]);
    lines.push(`### ${m} (${bugs.length})`);
    lines.push('');
    lines.push('| Zoho ID | Title | Priority | Status |');
    lines.push('|---|---|---|---|');
    bugs.forEach((b) => {
      const status = OPEN_STATUSES.includes(b.status) ? '**' + b.status + '**' : b.status;
      lines.push(`| ${b.id} | ${b.title.replace(/\|/g, '\\|')} | ${b.priority} | ${status} |`);
    });
    lines.push('');
  });

const outPath = path.join(__dirname, '..', 'ZOHO_BUG_MAPPING.md');
fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
console.log('Wrote', outPath);
