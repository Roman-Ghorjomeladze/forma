// Headless walkthrough of the Meds app + a backup round-trip check. Run: node tools/verify-meds.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './serve.mjs';

const PORT = 5196;
const shots = path.resolve('shots');
fs.mkdirSync(shots, { recursive: true });
const server = serve(path.resolve('docs'), PORT);
const browser = await chromium.launch();
const errors = [];
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg); };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const go = async (hash) => { await page.goto(`http://localhost:${PORT}/#${hash}`); await page.waitForTimeout(350); };
const shot = async (name) => page.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });
const setTheme = (theme) => page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const hhmm = (offsetMin) => { const d = new Date(now.getTime() + offsetMin * 60e3); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return key(d); };

await go('/');
await page.waitForSelector('.app-card');
check((await page.locator('.app-meds').count()) === 1, 'launcher shows the Meds card');
await go('/meds');
await page.waitForSelector('.empty');
await shot('m01-empty');

// ---- Create a 2-phase antibiotic course via the editor -------------------------------------------
await page.locator('.empty .btn-meds').click();
await page.waitForSelector('.phase-card');
await page.fill('input[placeholder="Ibuprofen, Vitamin D…"]', 'Amoxicillin');
await page.fill('input[placeholder="500 mg"]', '500 mg');
// phase 1: 5 days, two times: one that is due now, one 6 h later
const phase1 = page.locator('.phase-card').nth(0);
await phase1.locator('.input-num').fill('5');
await phase1.locator('input[type="time"]').nth(0).fill(hhmm(-5));
await phase1.locator('.amount-input').nth(0).fill('2');
await phase1.locator('.slot-more select').nth(0).selectOption('afterMeal');
await phase1.locator('.phase-actions .chip').nth(0).click(); // add time
await phase1.locator('input[type="time"]').nth(1).fill('21:30');
// phase 2 copied from phase 1
await phase1.locator('.phase-actions .chip').nth(2).click(); // add next phase
await page.waitForSelector('.phase-card >> nth=1');
const phase2 = page.locator('.phase-card').nth(1);
await phase2.locator('input[placeholder^="Phase 2"]').fill('Maintenance');
await phase2.locator('.input-num').fill('9');
check((await phase2.locator('.slot-card').count()) === 2, 'new phase copies the previous phase\'s times');
await phase2.locator('.slot-actions button').last().click(); // remove second time in phase 2
check((await phase2.locator('.slot-card').count()) === 1, 'time removed from phase 2');
check((await page.locator('.small.muted.mb').last().innerText()).includes('14'), 'whole course = 14 days');
// stock
await page.locator('.settings-row .toggle').first().click();
await shot('m02-editor');
await page.locator('.topbar .btn-meds').click();
await page.waitForSelector('.med-hero');
check(/\/meds\/med_[a-z0-9]+$/.test(page.url()), 'saving opens the detail screen');
check((await page.locator('.sched-list').count()) === 2, 'detail shows both phases');
check((await page.locator('.med-hero .med-status-pill').innerText()).length > 0, 'status pill present');
await shot('m03-detail');
const medUrl = page.url();

// ---- Second medication chained 30 min after the first -----------------------------------------
await go('/meds/new');
await page.waitForSelector('.phase-card');
await page.fill('input[placeholder="Ibuprofen, Vitamin D…"]', 'Probiotic');
await page.locator('.segmented-item').nth(1).click(); // supplement
await page.locator('.phase-card .input-num').first().fill('0');
await page.locator('.phase-card input[type="time"]').first().fill(hhmm(25));
await page.locator('.slot-more select').nth(1).selectOption({ index: 1 });
await page.locator('.gap-input').fill('30');
await page.locator('.topbar .btn-meds').click();
await page.waitForSelector('.med-hero');
check((await page.locator('.sched-list .row-sub').last().innerText()).includes('30 min after Amoxicillin'), 'chain text "30 min after Amoxicillin"');

// ---- Today timeline ------------------------------------------------------------------------------
await go('/meds');
await page.waitForSelector('.timeline');
const times = await page.locator('.tl-time').allInnerTexts();
check(times.length === 3 && times[0] === hhmm(-5) && times[1] === hhmm(25), `timeline grouped by time in order: ${times.join(', ')}`);
check((await page.locator('.dose-row.due').count()) >= 1, 'a dose is marked due');
check((await page.locator('.next-card .next-when').innerText()).toLowerCase().includes('late') || (await page.locator('.next-card .next-when').innerText()).toLowerCase().includes('now'), 'next card shows the due dose');
await shot('m04-today');
await page.locator('.next-card .btn-meds').click(); // Taken from the hero
await page.waitForTimeout(300);
check((await page.locator('.dose-row.taken').count()) === 1, 'hero "Taken" marks the dose');
check((await page.locator('.dose-row.taken .dose-check svg').count()) === 1, 'taken row shows a check');
// skip the second, then undo
await page.locator('.dose-row').nth(1).locator('.dose-skip').click();
await page.waitForTimeout(200);
check((await page.locator('.dose-row.skipped').count()) === 1, 'skip works');
await page.locator('.dose-row.skipped .dose-check').click();
await page.waitForTimeout(200);
check((await page.locator('.dose-row.skipped').count()) === 0, 'tapping the circle undoes a skip');
const stockTag = await page.locator('.med-card .tag').first().innerText();
check(stockTag.includes('28'), `stock decremented by the dose amount (2): ${stockTag}`);
await shot('m05-today-marked');

// ---- Detail: adherence + calendar export content ---------------------------------------------------
await go(medUrl.replace(/^.*#/, ''));
await page.waitForSelector('.adh-grid');
check((await page.locator('.adh-grid .stat').nth(1).innerText()).startsWith('1'), 'adherence counts 1 taken');
const ics = await page.evaluate(async () => {
  const db = await import('./app/lib/db.js'); const meds = await import('./app/lib/meds.js');
  const all = await db.getAll('medications');
  return meds.medicationToIcs(all.find((m) => m.name === 'Amoxicillin'), all);
});
check(ics.includes('BEGIN:VCALENDAR') && (ics.match(/BEGIN:VEVENT/g) || []).length === 3, 'ics has one event per phase × time (3)');
check(ics.includes('RRULE:FREQ=DAILY;COUNT=5') && ics.includes('RRULE:FREQ=DAILY;COUNT=9'), 'ics repeats for each phase length');
check(ics.includes('BEGIN:VALARM') && ics.includes('TRIGGER:PT0M'), 'ics events carry alarms');
check(ics.includes('After meal'), 'ics description carries the hint');
await shot('m06-detail-stats');

// ---- Engine checks through the library --------------------------------------------------------------
const engine = await page.evaluate(async (today) => {
  const db = await import('./app/lib/db.js'); const meds = await import('./app/lib/meds.js');
  const all = await db.getAll('medications');
  const amox = all.find((m) => m.name === 'Amoxicillin');
  const d = (n) => { const x = new Date(today + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  return {
    p1: meds.phaseOn(amox, d(0))?.phaseIndex, p1day: meds.phaseOn(amox, d(4))?.dayInPhase, p2: meds.phaseOn(amox, d(5))?.phaseIndex, p2day: meds.phaseOn(amox, d(13))?.dayInPhase,
    after: meds.phaseOn(amox, d(14)), end: meds.endDate(amox), total: meds.totalDays(amox), doses5: meds.dosesOn([amox], d(4)).length, doses6: meds.dosesOn([amox], d(5)).length,
  };
}, key(now));
check(engine.p1 === 0 && engine.p1day === 5 && engine.p2 === 1 && engine.p2day === 9 && engine.after === null, `phase engine: day1→p1, day5→p1/5, day6→p2, day14→p2/9, day15→over (${JSON.stringify(engine)})`);
check(engine.total === 14 && engine.doses5 === 2 && engine.doses6 === 1, 'phase 1 has 2 doses/day, phase 2 has 1');

// ---- Dark + Georgian -----------------------------------------------------------------------------
await setTheme('dark');
await go('/meds');
await page.waitForSelector('.timeline');
await shot('m07-today-dark');
await page.evaluate(async () => { const { prefsStore } = await import('./app/lib/hooks.js'); await prefsStore.update({ language: 'ka' }); });
await page.waitForTimeout(300);
await go('/meds');
await page.waitForSelector('.timeline');
check((await page.locator('.title-large').innerText()).includes('წამლები'), 'Georgian title');
await shot('m08-today-ka');
await go(medUrl.replace(/^.*#/, ''));
await page.waitForSelector('.med-hero');
await shot('m09-detail-ka');
await go('/');
await page.waitForSelector('.app-meds');
check((await page.locator('.app-meds .app-line').innerText()).length > 5, 'launcher line for Meds present (KA)');
await shot('m10-home-ka-dark');
await page.evaluate(async () => { const { prefsStore } = await import('./app/lib/hooks.js'); await prefsStore.update({ language: 'en' }); });
await setTheme('light');

// ---- Backup round trip incl. the new tables ----------------------------------------------------------
const before = await page.evaluate(async () => { const db = await import('./app/lib/db.js'); const out = {}; for (const t of db.ALL_TABLES) out[t] = await db.getAll(t); return out; });
const backup = await page.evaluate(async () => (await import('./app/lib/backup.js')).exportBackup());
check(backup.tables.medications.length === 2 && backup.tables.doseLogs.length === 1, 'backup contains medications + dose logs');
check(backup.dbVersion === 6, 'backup records dbVersion 6');
await page.evaluate(async () => { const db = await import('./app/lib/db.js'); await db.deleteDatabase(); });
await page.goto(`http://localhost:${PORT}/#/meds`);
await page.waitForTimeout(600);
await page.evaluate(async (file) => { const b = await import('./app/lib/backup.js'); await b.importBackup(file, 'replace'); }, backup);
await page.waitForTimeout(300);
const after = await page.evaluate(async () => { const db = await import('./app/lib/db.js'); const out = {}; for (const t of db.ALL_TABLES) out[t] = await db.getAll(t); return out; });
const sortById = (rows) => [...rows].sort((a, b) => String(a.id ?? a.key ?? a.weekday).localeCompare(String(b.id ?? b.key ?? b.weekday)));
let allSame = true;
for (const t of Object.keys(before)) { if (t === 'blobs') continue; if (JSON.stringify(sortById(before[t])) !== JSON.stringify(sortById(after[t]))) { allSame = false; check(false, `table "${t}" differs after round trip`); } }
check(allSame, `all ${Object.keys(before).length} tables identical after export → erase → import`);
await go('/meds');
await page.waitForSelector('.timeline');
check((await page.locator('.dose-row.taken').count()) === 1, 'taken state survives the round trip');
check(daysAgo(0) === key(now), 'sanity');

console.log('\nconsole errors:', errors.length ? errors : 'none');
console.log('failures:', failures.length ? failures : 'none');
await browser.close();
server.close();
process.exit(failures.length || errors.length ? 1 : 0);
