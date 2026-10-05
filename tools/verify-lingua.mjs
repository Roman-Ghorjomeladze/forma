// Headless walkthrough of Lingua + a backup round-trip check. Run: node tools/verify-lingua.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './serve.mjs';

const PORT = 5197;
const shots = path.resolve('shots');
fs.mkdirSync(shots, { recursive: true });
const server = serve(path.resolve('docs'), PORT);
const browser = await chromium.launch();
const errors = [];
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg); };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
await ctx.addInitScript(() => {
  window.__spoken = [];
  const orig = window.speechSynthesis && window.speechSynthesis.speak.bind(window.speechSynthesis);
  if (window.speechSynthesis) window.speechSynthesis.speak = (u) => { window.__spoken.push(u.text); try { orig && orig(u); } catch {} };
});
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const go = async (hash) => { await page.goto(`http://localhost:${PORT}/#${hash}`); await page.waitForTimeout(400); };
const shot = async (name, full = true) => page.screenshot({ path: path.join(shots, name + '.png'), fullPage: full });
const setTheme = (th) => page.evaluate((x) => document.documentElement.setAttribute('data-theme', x), th);
const progCount = () => page.evaluate(() => new Promise((res) => { const r = indexedDB.open('forma'); r.onsuccess = () => { const q = r.result.transaction('langProgress').objectStore('langProgress').count(); q.onsuccess = () => res(q.result); }; }));

await go('/');
await page.waitForSelector('.app-card');
check(await page.locator('.app-lingua').count() === 1, 'launcher shows the Lingua card');
await page.waitForTimeout(800);
await shot('l00-launcher');
await go('/lang');
await page.waitForSelector('.course-card');
check(await page.locator('.course-card').count() === 2, 'two built-in courses (Russian, English)');
await shot('l01-courses');

// ---- Russian dashboard
await go('/lang/ru-en');
await page.waitForSelector('.lang-hero');
check((await page.locator('.phrase-row').count()) === 5, 'five phrases of the day');
check(await page.locator('.lang-tip').count() === 1, 'placement tip shown on a fresh course');
await shot('l02-dashboard');

// ---- daily cards: first card is a new word; swipe right (know) by dragging, then "learn it" via button
await page.locator('.lang-hero .btn-lingua').click();
await page.waitForSelector('.swipe-card');
await page.waitForTimeout(300);
const firstWord = await page.locator('.flip-face.front .face-word').first().textContent();
check(firstWord === 'я', `daily queue starts with the most frequent word (got ${firstWord})`);
await shot('l03-card-front', false);
await page.waitForTimeout(400);
check((await page.evaluate(() => window.__spoken.length)) === 0, 'cards are quiet when a card appears (default)');
await page.locator('.flip-btn').click(); await page.waitForTimeout(450);
check((await page.evaluate(() => window.__spoken.length)) === 0, 'flipping stays quiet while sound is off');
await page.locator('.topbar-right .iconbtn').click(); await page.waitForTimeout(200);
await page.locator('.flip-btn').click(); await page.waitForTimeout(450);
check((await page.evaluate(() => window.__spoken.length)) === 0, 'turning sound on does not read the front');
await page.locator('.flip-btn').click(); await page.waitForTimeout(450);
check((await page.evaluate(() => window.__spoken)).join() === 'я', 'with sound on, the word is read after flipping');
await page.locator('.topbar-right .iconbtn').click(); await page.waitForTimeout(200);
await page.locator('.flip-btn').click(); await page.waitForTimeout(450);
const box = await page.locator('.swipe-card').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + 100);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 60, box.y + 100, { steps: 4 });
await page.mouse.move(box.x + box.width / 2 + 180, box.y + 100, { steps: 4 });
await page.mouse.up();
await page.waitForTimeout(500);
check(await page.locator('.flip-face.front .face-word').first().textContent() !== 'я', 'drag right advances to the next card');
// real touch swipe (what iOS sends): the card must move, the page must not
{
  const cdp = await ctx.newCDPSession(page);
  const before = await page.locator('.flip-face.front .face-word').first().textContent();
  const b2 = await page.locator('.swipe-card').boundingBox();
  const y = b2.y + 150; let x = b2.x + 80;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  let maxShift = 0;
  for (let k = 0; k < 10; k++) {
    x += 20;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 2 }] });
    await page.waitForTimeout(16);
    if (k === 5) maxShift = await page.evaluate(() => { const m = getComputedStyle(document.querySelector('.swipe-card')).transform; return m === 'none' ? 0 : new DOMMatrix(m).m41; });
  }
  const scrollX = await page.evaluate(() => window.scrollX);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(500);
  const after = await page.locator('.flip-face.front .face-word').first().textContent();
  check(maxShift > 60 && scrollX === 0, `touch drag moves the card (${Math.round(maxShift)}px), not the page (scrollX ${scrollX})`);
  check(after !== before, 'touch swipe right answers and shows the next card');
  // a tap (touch without movement) flips
  const b3 = await page.locator('.swipe-card').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b3.x + 60, y: b3.y + 300 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(450);
  check(await page.locator('.flip.is-flipped').count() === 1, 'touch tap flips the card');
  await page.locator('.flip-btn').click(); await page.waitForTimeout(400);
}
// tap to flip
await page.locator('.flip-btn').click();
await page.waitForTimeout(450);
check(await page.locator('.flip.is-flipped').count() === 1, 'flip button turns the card');
await shot('l04-card-back', false);
// don't know -> reveal + continue
await page.locator('.round-btn.no').click();
await page.waitForTimeout(250);
check(await page.locator('.card-actions .btn-lingua').count() === 1, 'wrong answer shows Continue');
await page.locator('.card-actions .btn-lingua').click();
// answer the rest: alternate
for (let k = 0; k < 200; k++) {
  if (await page.locator('.lang-result').count()) break;
  if (await page.locator('.card-actions .btn-lingua').count()) { await page.locator('.card-actions .btn-lingua').click(); continue; }
  await page.locator(k % 5 === 0 ? '.round-btn.no' : '.round-btn.yes').click();
  await page.waitForTimeout(260);
}
await page.waitForSelector('.lang-result');
await shot('l05-cards-result');
const pc = await progCount();
check(pc > 10, `progress rows saved (${pc})`);

// ---- setup screen, direction s2t, show both
await go('/lang/ru-en/cards');
await page.waitForSelector('.mode-card');
await page.locator('.segmented-item', { hasText: 'EN → RU' }).click();
await page.locator('.segmented-item', { hasText: 'Show both' }).click();
await page.waitForTimeout(200);
await shot('l06-cards-setup');
await page.locator('.mode-card', { hasText: 'Next most frequent' }).click();
await page.locator('.btn-lingua', { hasText: 'Start' }).click();
await page.waitForSelector('.both-face');
check(await page.locator('.both-face .face-meaning').count() >= 1 && await page.locator('.both-face .face-word').count() >= 1, 'show-both mode renders meaning and word together');
await shot('l07-card-both', false);
await go('/lang/ru-en/cards');
await page.locator('.segmented-item', { hasText: 'Mixed' }).click();
await page.locator('.segmented-item', { hasText: 'One side' }).click();

// ---- sentence builder: build the right answer from tiles
await go('/lang/ru-en/build');
await page.locator('.btn-lingua', { hasText: 'Start' }).click();
await page.waitForSelector('.tile-bank');
const solve = async () => page.evaluate(() => 0);
// read the correct sentence from the app's data via the DOM: tap tiles in the order of the hidden answer is unknown -> do a wrong build first
await page.locator('.tile-bank .tile').first().click();
await page.locator('.btn-lingua', { hasText: 'Check' }).click();
await page.waitForSelector('.build-feedback');
const correct = (await page.locator('.feedback-sentence').textContent()).trim();
check(correct.length > 0, `builder shows the correct sentence after a mistake ("${correct}")`);
await shot('l08-build-wrong', false);
await page.locator('.btn-lingua', { hasText: 'Continue' }).click();
// next question: solve it using the content file
const sents = JSON.parse(fs.readFileSync('docs/lang/ru-en/sentences.json', 'utf8'));
const src = (await page.locator('.build-source').textContent()).trim();
const target = sents.find((s) => s.s === src);
check(!!target, 'prompt matches a sentence from the pack');
const words = target.t.split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')).filter(Boolean);
for (const w of words) {
  const tile = page.locator('.tile-bank .tile:not(.tile-used)', { hasText: new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first();
  await tile.click();
}
await shot('l09-build-filled', false);
await page.locator('.btn-lingua', { hasText: 'Check' }).click();
await page.waitForSelector('.build-feedback.right');
check(true, 'tiles in the right order are accepted');

// ---- speak
await go('/lang/ru-en/speak?daily=1');
await page.waitForSelector('.speak-source');
await page.locator('.btn-lingua', { hasText: 'Reveal' }).click();
await page.waitForSelector('.speak-answer');
await shot('l10-speak', false);
await page.locator('.btn-lingua', { hasText: 'I said it right' }).click();

// ---- quiz (listening)
await go('/lang/ru-en/quiz?mode=listen');
await page.waitForSelector('.quiz-opt');
check(await page.locator('.quiz-opt').count() === 4, 'quiz shows four options');
await page.locator('.quiz-opt').first().click();
await page.waitForTimeout(200);
check(await page.locator('.quiz-opt.right').count() === 1, 'quiz marks the right answer');
await shot('l11-quiz', false);

// ---- grammar
await go('/lang/ru-en/grammar');
await page.waitForSelector('.unit-num');
check(await page.locator('.row-tappable').count() === 50, '50 Russian grammar units');
await shot('l12-grammar-list');
await go('/lang/ru-en/grammar/ru-a2-genitive');
await page.waitForSelector('.gtable');
await shot('l13-unit');
await page.locator('.unit-cta .btn-lingua').click();
await page.waitForSelector('.drill-screen');
const gram = JSON.parse(fs.readFileSync('docs/lang/ru-en/grammar.json', 'utf8')).find((u) => u.id === 'ru-a2-genitive');
for (const d of gram.drills) {
  if (d.type === 'choice') {
    await page.locator('.quiz-opt', { hasText: new RegExp(`^${d.options[d.answer].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();
  } else {
    const ws = d.t.split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')).filter(Boolean);
    for (const w of ws) await page.locator('.tile-bank .tile:not(.tile-used)', { hasText: new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();
    await page.locator('.btn-lingua', { hasText: 'Check' }).click();
  }
  await page.waitForTimeout(120);
  if (await page.locator('.build-feedback.wrong, .quiz-opt.wrong').count()) console.log('    drill wrong:', JSON.stringify(d));
  if (await page.locator('.drill-screen').count() && await page.locator('.btn-lingua', { hasText: 'Continue' }).count()) {
    if (gram.drills.indexOf(d) === 2) await shot('l14-drill', false);
    await page.locator('.btn-lingua', { hasText: 'Continue' }).click();
  }
}
await page.waitForSelector('.result-big');
await page.waitForTimeout(400);
await shot('l14b-drill-result');
const pctTxt = await page.locator('.result-big').textContent();
check(pctTxt === '100%', `all drills of a unit answered right → 100% (${pctTxt})`);
await go('/lang/ru-en/grammar');
check(await page.locator('.unit-num.done').count() === 1, 'unit marked done in the list');

// ---- mistakes
await go('/lang/ru-en/mistakes');
await page.waitForSelector('.section-label');
check(await page.locator('.dir-pill').count() >= 1, 'missed words are in the mistakes bank');
await shot('l15-mistakes');

// ---- words library + sheet
await go('/lang/ru-en/words');
await page.waitForSelector('.row-tappable');
await page.fill('.search-field input', 'работа');
await page.waitForTimeout(200);
await page.locator('.row-tappable').first().click();
await page.waitForSelector('.word-sheet');
await shot('l16-word-sheet', false);
await page.keyboard.press('Escape');

// ---- placement
await go('/lang/en-ka/placement');
await page.locator('.btn-lingua', { hasText: 'Start' }).click();
for (let k = 0; k < 80; k++) {
  if (await page.locator('.result-big').count()) break;
  await page.locator(k < 24 ? '.round-btn.yes' : '.round-btn.no').click();
  await page.waitForTimeout(40);
}
await page.waitForSelector('.result-big');
await shot('l17-placement');
const markBtn = page.locator('.btn-lingua', { hasText: 'Mark the first' });
check(await markBtn.count() === 1, 'placement offers to mark the known bands');
await markBtn.click();
await page.waitForTimeout(600);
await go('/lang/en-ka');
await page.waitForSelector('.lang-hero');
const passiveTxt = await page.locator('.goal').first().textContent();
check(/1500/.test(passiveTxt.replace(/,/g, '')), `passive count reflects placement (${passiveTxt})`);

// ---- manage: add a word, a sentence; import + export pack
await go('/lang/ru-en/manage');
await page.waitForSelector('.segmented');
await page.locator('.link-btn', { hasText: 'Add' }).click();
await page.locator('.sheet input').nth(0).fill('пожарная тревога');
await page.locator('.sheet input').nth(1).fill('fire alarm');
await page.locator('.sheet .btn-lingua').click();
await page.waitForTimeout(300);
check(await page.locator('.row-title', { hasText: 'пожарная тревога' }).count() === 1, 'own word added');
const pack = { lingua: 1, words: [{ t: 'дедлайн', s: 'deadline', l: 'B1' }, ['x', 'пулл-реквест', 'pull request', 'noun', 'B1', '', '', '']], sentences: [{ t: 'Я посмотрю твой код вечером.', s: "I'll look at your code tonight.", l: 'A2', dy: true }] };
fs.writeFileSync(path.join(shots, 'test.lingua.json'), JSON.stringify(pack));
await page.locator('input[type=file]').setInputFiles(path.join(shots, 'test.lingua.json'));
await page.waitForTimeout(500);
check(await page.locator('.segmented-item', { hasText: 'Words · 3' }).count() === 1, 'pack import adds words');
await shot('l18-manage');
await go('/lang/ru-en/cards?mode=new&level=B1');
await page.waitForSelector('.face-word');
const firstNew = await page.locator('.flip-face.front .face-word').first().textContent();
check(['пожарная тревога', 'дедлайн', 'пулл-реквест'].includes(firstNew), `own words come first in new words (${firstNew})`);

// ---- English course (Georgian UI), dark mode
await go('/settings');
await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('forma'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); const st = tx.objectStore('settings'); const g = st.get('prefs'); g.onsuccess = () => { st.put({ key: 'prefs', value: { ...(g.result?.value ?? {}), language: 'ka' } }); }; tx.oncomplete = res; }; }));
await go('/lang/en-ka');
await page.waitForSelector('.lang-hero');
await setTheme('dark');
await page.waitForTimeout(200);
await shot('l19-en-dashboard-ka-dark');
await go('/lang/en-ka/grammar/en-b1-pp-vs-past');
await page.waitForSelector('.unit-section');
await setTheme('dark');
await shot('l20-en-unit-ka-dark');
await go('/lang/en-ka/cards?mode=new&level=B2');
await page.waitForSelector('.swipe-card');
await setTheme('dark');
await page.locator('.flip-btn').click();
await page.waitForTimeout(450);
await shot('l21-en-card-dark', false);
await go('/lang/en-ka/stats');
await page.waitForSelector('.goal-card');
await setTheme('dark');
await shot('l22-stats-dark');
await go('/');
await page.waitForSelector('.app-lingua');
await page.waitForTimeout(800);
await setTheme('dark');
await shot('l23-launcher-dark');

// ---- backup round trip
const before = await page.evaluate(async () => {
  const { exportBackup } = await import('./app/lib/backup.js');
  return exportBackup();
});
check(before.tables.langProgress.length > 700 && before.tables.langItems.length === 4 && before.tables.langCourses.length === 2 && before.tables.langLogs.length >= 1, `backup carries lingua tables (progress ${before.tables.langProgress.length}, items ${before.tables.langItems.length})`);
await page.evaluate(async (b) => {
  const { importBackup } = await import('./app/lib/backup.js');
  const { deleteDatabase } = await import('./app/lib/db.js');
  await deleteDatabase();
  await importBackup(b, 'replace');
}, before);
const after = await page.evaluate(async () => { const { exportBackup } = await import('./app/lib/backup.js'); return exportBackup(); });
const same = ['langCourses', 'langItems', 'langProgress', 'langLogs'].every((t) => JSON.stringify(before.tables[t].sort((a, b) => a.id.localeCompare(b.id))) === JSON.stringify(after.tables[t].sort((a, b) => a.id.localeCompare(b.id))));
check(same, 'lingua tables identical after export → wipe → import');

console.log(`\n${failures.length} failures, ${errors.length} console errors`);
for (const e of errors.slice(0, 20)) console.log('  console:', e);
await browser.close();
server.close();
process.exit(failures.length || errors.length ? 1 : 0);
