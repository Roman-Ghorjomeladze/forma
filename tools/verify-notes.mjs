// Headless walkthrough of the Notes app + a backup round-trip check. Run: node tools/verify-notes.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './serve.mjs';

const PORT = 5199;
const shots = path.resolve('shots');
fs.mkdirSync(shots, { recursive: true });
const server = serve(path.resolve('docs'), PORT);
const browser = await chromium.launch();
const errors = [];
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg); };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'], serviceWorkers: 'block' });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const go = async (hash) => { await page.goto(`http://localhost:${PORT}/#${hash}`); await page.waitForTimeout(350); };
const shot = async (name) => page.screenshot({ path: path.join(shots, name + '.png') });
const setTheme = (theme) => page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);

await go('/');
await page.waitForSelector('.app-card');
check(await page.locator('.app-notes').count() === 1, 'launcher shows the Notes card');
check((await page.locator('.quick').count()) === 4, 'launcher has 4 quick-add buttons');
await shot('01-home');

// Notes home, empty state with the seeded General group
await go('/notes');
await page.waitForSelector('.group-tile');
check((await page.locator('.group-tile').count()) === 2, 'one seeded group + "new group" tile');
await shot('02-notes-empty');

// Create a group via the sheet
await page.locator('.topbar .iconbtn-notes').click();
await page.fill('.sheet input', 'Links to read');
await page.locator('.swatch').nth(1).click();
await page.locator('.icon-pick').nth(10).click();
await page.locator('.sheet-footer .btn-notes').click();
await page.waitForTimeout(400);
check(page.url().includes('/notes/group/'), 'new group opens its screen');
await shot('03-group-empty');

// New note in that group (from the FAB)
await page.locator('.fab-notes').click();
await page.waitForSelector('.note-title-input');
await page.fill('.note-title-input', 'Reading list');
const body = page.locator('.note-editor');
await body.fill('Articles for the weekend\nhttps://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API\nwww.example.com/some/page\n[ ] Read the IndexedDB one\n[x] Skim the example');
// tag input: type + Enter, then comma
const tagInput = page.locator('.tag-input input');
await tagInput.fill('web');
await tagInput.press('Enter');
await tagInput.type('reading,');
await page.locator('.note-tools .chip-notes').click(); // pin
await shot('04-editor');
await page.locator('.topbar .btn-notes').click();
await page.waitForSelector('.note-view-title');
check(page.url().match(/\/notes\/note\/[a-z0-9_]+$/) !== null, 'saving a new note opens its view');
check((await page.locator('.note-check').count()) === 2, 'two checklist lines rendered');
check((await page.locator('.link-row').count()) === 2, 'two links detected');
check((await page.locator('.note-meta .tag').allInnerTexts()).join(' ') === '#web #reading', 'two tags shown, comma stripped');
check(await page.locator('.check-summary').innerText().then((s) => s.includes('1/2')), 'checklist progress 1/2');
await page.locator('.note-check').first().click();
await page.waitForTimeout(300);
check(await page.locator('.check-summary').innerText().then((s) => s.includes('2/2')), 'tapping a checkbox persists (2/2)');
await shot('05-note-view');
const noteUrl = page.url();

// Second note in General via the launcher quick-add
await go('/');
await page.locator('.quick').nth(3).click();
await page.waitForSelector('.note-title-input');
await body.fill('[ ] milk\n[ ] eggs\n[ ] bread');
await page.locator('.note-tools .chip').first().click(); // toggle checkbox on the current line (caret at end -> line 3 loses its box)
await page.waitForTimeout(100);
check((await body.inputValue()).split('\n')[2] === 'bread', 'checkbox tool toggles the current line');
await page.locator('.note-tools .chip').first().click();
await page.waitForTimeout(100);
await body.press('End');
await body.press('Enter');
await body.type('butter');
check((await body.inputValue()).endsWith('[ ] butter'), 'Enter continues a checklist');
await page.locator('.topbar .btn-notes').click();
await page.waitForSelector('.note-view-title');
check((await page.locator('.note-view-title').innerText()) === 'milk', 'untitled note uses its first line as title');

// Notes home: pinned + recent + search
await go('/notes');
await page.waitForSelector('.note-row');
check((await page.locator('.section-label').first().innerText()).toLowerCase().includes('pinned'), 'pinned section shown first');
await shot('06-notes-home');
await page.fill('.searchbar input', 'indexeddb');
await page.waitForTimeout(400);
check((await page.locator('.note-row').count()) === 1, 'search "indexeddb" finds 1 note (link text)');
check((await page.locator('mark.hl').count()) > 0, 'matches are highlighted');
await shot('07-search');
await page.fill('.searchbar input', 'eggs bread');
await page.waitForTimeout(300);
check((await page.locator('.note-row').count()) === 1, 'multi-word search requires every word');
await page.fill('.searchbar input', 'reading');
await page.waitForTimeout(300);
check((await page.locator('.note-row').count()) === 1, 'search matches tags');
await page.fill('.searchbar input', 'general');
await page.waitForTimeout(300);
check((await page.locator('.note-row').count()) === 1, 'search matches group names');
await page.fill('.searchbar input', 'zzzz');
await page.waitForTimeout(300);
check((await page.locator('.empty').count()) === 1, 'no-results state');
await page.locator('.searchbar .clear').click();
await page.waitForTimeout(400);
check(page.url().endsWith('#/notes'), 'clearing the search resets the url');

// Group screen with tag filter
await page.locator('.group-tile').nth(1).click();
await page.waitForURL(/\/notes\/group\//);
await page.waitForSelector('.fab-notes');
await page.waitForTimeout(300);
console.log('   chips:', await page.locator('.chips .chip').allInnerTexts(), page.url());
check((await page.locator('.chips .chip').count()) === 3, 'group screen shows All + 2 tag chips');
await shot('08-group');

// Edit an existing note and discard guard
await go(noteUrl.replace(/^.*#/, ''));
await page.waitForSelector('.note-view-title');
await page.locator('.topbar .iconbtn-notes').last().click();
await page.waitForSelector('.note-editor');
await body.type(' extra');
await page.locator('.topbar .iconbtn').first().click();
await page.waitForSelector('.dialog');
check(true, 'discard dialog appears for unsaved edits');
await page.locator('.dialog .btn-secondary').click();
await page.locator('.topbar .btn-notes').click();
await page.waitForSelector('.note-view-title');

// Dark + Georgian
await setTheme('dark');
await go('/notes');
await page.waitForSelector('.note-row');
await shot('09-notes-dark');
await go(noteUrl.replace(/^.*#/, ''));
await page.waitForSelector('.note-view-title');
await shot('10-note-dark');
await page.evaluate(async () => {
  const { prefsStore } = await import('./app/lib/hooks.js');
  await prefsStore.update({ language: 'ka' });
});
await page.waitForTimeout(300);
await go('/notes');
await page.waitForSelector('.note-row');
check((await page.locator('.title-large').innerText()).includes('ჩანაწერები'), 'Georgian title');
await shot('11-notes-ka');
await go('/');
await shot('12-home-ka-dark');
await page.evaluate(async () => { const { prefsStore } = await import('./app/lib/hooks.js'); await prefsStore.update({ language: 'en' }); });
await setTheme('light');

// ---- Backup round trip: export -> erase -> import -> compare every table ----------------------
const before = await page.evaluate(async () => {
  const db = await import('./app/lib/db.js');
  const out = {};
  for (const t of db.ALL_TABLES) out[t] = await db.getAll(t);
  return out;
});
const backup = await page.evaluate(async () => (await import('./app/lib/backup.js')).exportBackup());
check(backup.tables.notes.length === 2 && backup.tables.noteGroups.length === 2, 'backup contains notes + groups');
check(Array.isArray(backup.tables.settings) && backup.tables.settings.some((r) => r.key === 'notes:lastGroup'), 'backup contains settings');
check(backup.dbVersion === 5, 'backup records dbVersion 5');
// erase the database like Settings > Erase does, then reload and import
await page.evaluate(async () => { const db = await import('./app/lib/db.js'); await db.deleteDatabase(); });
await page.goto(`http://localhost:${PORT}/#/notes`);
await page.waitForTimeout(600);
const afterErase = await page.evaluate(async () => { const db = await import('./app/lib/db.js'); return (await db.getAll('notes')).length; });
check(afterErase === 0, 'erase removed the notes');
await page.evaluate(async (file) => { const b = await import('./app/lib/backup.js'); await b.importBackup(file, 'replace'); }, backup);
await page.waitForTimeout(300);
const after = await page.evaluate(async () => {
  const db = await import('./app/lib/db.js');
  const out = {};
  for (const t of db.ALL_TABLES) out[t] = await db.getAll(t);
  return out;
});
const sortById = (rows) => [...rows].sort((a, b) => String(a.id ?? a.key ?? a.weekday).localeCompare(String(b.id ?? b.key ?? b.weekday)));
for (const t of Object.keys(before)) {
  if (t === 'blobs') { check(before[t].length === after[t].length, `blobs count restored (${after[t].length})`); continue; }
  const same = JSON.stringify(sortById(before[t])) === JSON.stringify(sortById(after[t]));
  check(same, `table "${t}" identical after export → erase → import (${after[t].length} rows)`);
}
await go('/notes');
await page.waitForSelector('.note-row');
await shot('13-after-restore');

// Merge-import of a backup without the notes tables (as written by v1.2) must not throw
const old = { ...backup, tables: { ...backup.tables } };
delete old.tables.notes; delete old.tables.noteGroups; delete old.dbVersion;
const mergeOk = await page.evaluate(async (file) => { try { const b = await import('./app/lib/backup.js'); await b.importBackup(file, 'merge'); return true; } catch (e) { return String(e); } }, old);
check(mergeOk === true, 'older backup without notes tables imports (merge) without error');
const stillThere = await page.evaluate(async () => { const db = await import('./app/lib/db.js'); return (await db.getAll('notes')).length; });
check(stillThere === 2, 'merge-importing an old backup keeps the notes');

console.log('\nconsole errors:', errors.length ? errors : 'none');
console.log('failures:', failures.length ? failures : 'none');
await browser.close();
server.close();
process.exit(failures.length || errors.length ? 1 : 0);
