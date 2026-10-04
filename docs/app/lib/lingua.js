// Lingua engine: course content (static packs + the user's own items), spaced repetition,
// session queues and progress statistics. No UI in here.
import { useEffect, useMemo, useState } from 'react';
import { bulkPut, get, getAll, getByIndex, put, remove, bulkRemove } from './db.js';
import { useLiveQuery } from './hooks.js';
import { addDays, todayKey, fromKey } from './dates.js';
import { uid } from './ids.js';
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
export const CORE_LEVELS = ['A1', 'A2', 'B1', 'B2'];
/** A card counts as "known" once it survives an interval of a week (or was marked known). */
export const MATURE_DAYS = 7;
// ---- built-in courses ------------------------------------------------------------------------
const BUILTIN = [
    {
        id: 'ru-en', title: 'Russian', pack: 'ru-en',
        target: { code: 'ru', name: 'Русский', tts: 'ru-RU' }, source: { code: 'en', name: 'English', tts: 'en-US' },
        goals: { active: 3500, passive: 7500 }, dailyNew: 15, sessionSize: 25, direction: 'mix', showBoth: false, autoSpeak: false, rate: 0.9, order: 0,
    },
    {
        id: 'en-ka', title: 'English', pack: 'en-ka',
        target: { code: 'en', name: 'English', tts: 'en-US' }, source: { code: 'ka', name: 'ქართული', tts: 'ka-GE' },
        goals: { active: 3500, passive: 7500 }, dailyNew: 15, sessionSize: 25, direction: 'mix', showBoth: false, autoSpeak: false, rate: 0.95, order: 1,
    },
];
export async function seedLangCoursesIfEmpty() {
    const existing = await getAll('langCourses');
    const have = new Set(existing.map((c) => c.id));
    const missing = BUILTIN.filter((b) => !have.has(b.id));
    // Only seed on a fresh install (or if the user never deleted a built-in one — we remember deletions).
    const removed = (await get('settings', 'lang:removedBuiltins'))?.value ?? [];
    const toAdd = missing.filter((b) => !removed.includes(b.id)).map((b) => ({ ...b, createdAt: Date.now() }));
    if (toAdd.length)
        await bulkPut('langCourses', toAdd);
    // v1.5.1: cards are quiet by default — switch off auto-speak once for courses created before.
    if (!(await get('settings', 'lang:quietCards'))) {
        const all = await getAll('langCourses');
        await bulkPut('langCourses', all.map((c) => ({ ...c, autoSpeak: false })));
        await put('settings', { key: 'lang:quietCards', value: true });
    }
}
export function restorableBuiltins(courses) {
    return BUILTIN.filter((b) => !courses.some((c) => c.id === b.id));
}
export async function restoreBuiltin(id) {
    const b = BUILTIN.find((x) => x.id === id);
    if (!b)
        return;
    const removed = (await get('settings', 'lang:removedBuiltins'))?.value ?? [];
    await put('settings', { key: 'lang:removedBuiltins', value: removed.filter((x) => x !== id) });
    await put('langCourses', { ...b, createdAt: Date.now() });
}
export function newCourse(partial) {
    return {
        id: uid('lc'), title: 'New language',
        target: { code: '', name: '', tts: '' }, source: { code: 'en', name: 'English', tts: 'en-US' },
        goals: { active: 2000, passive: 5000 }, dailyNew: 10, sessionSize: 20, direction: 'mix', showBoth: false, autoSpeak: false, rate: 0.95,
        order: 99, createdAt: Date.now(), ...partial,
    };
}
export async function deleteCourse(course) {
    const [items, prog, logs] = await Promise.all([getByIndex('langItems', 'courseId', course.id), getByIndex('langProgress', 'courseId', course.id), getByIndex('langLogs', 'courseId', course.id)]);
    await bulkRemove('langItems', items.map((i) => i.id));
    await bulkRemove('langProgress', prog.map((p) => p.id));
    await bulkRemove('langLogs', logs.map((l) => l.id));
    await remove('langCourses', course.id);
    if (course.pack) {
        const removed = (await get('settings', 'lang:removedBuiltins'))?.value ?? [];
        await put('settings', { key: 'lang:removedBuiltins', value: [...new Set([...removed, course.id])] });
    }
}
export async function resetProgress(courseId) {
    const [prog, logs] = await Promise.all([getByIndex('langProgress', 'courseId', courseId), getByIndex('langLogs', 'courseId', courseId)]);
    await bulkRemove('langProgress', prog.map((p) => p.id));
    await bulkRemove('langLogs', logs.map((l) => l.id));
}
const packCache = new Map();
function loadPack(pack) {
    let p = packCache.get(pack);
    if (!p) {
        const base = `./lang/${pack}/`;
        const j = (f) => fetch(base + f).then((r) => { if (!r.ok)
            throw new Error(`${f}: ${r.status}`); return r.json(); });
        p = Promise.all([j('course.json'), j('words.json'), j('sentences.json'), j('grammar.json')]).then(([meta, w, s, g]) => ({
            credits: meta.credits,
            words: w.map((r, i) => ({ id: r[0], t: r[1], s: r[2], pos: r[3], l: r[4], info: r[5] || undefined, ex: r[6] || undefined, exs: r[7] || undefined, rank: i + 1 })),
            sentences: s.map((x) => ({ ...x, dy: !!x.dy })),
            grammar: g,
        }));
        p.catch(() => packCache.delete(pack));
        packCache.set(pack, p);
    }
    return p;
}
function merge(pack, items) {
    const own = [...items].sort((a, b) => a.createdAt - b.createdAt);
    const words = [
        ...own.filter((i) => i.kind === 'word').map((i) => ({ ...i.data, id: i.id, rank: 0, user: true })),
        ...(pack?.words ?? []),
    ];
    const sentences = [...(pack?.sentences ?? []), ...own.filter((i) => i.kind === 'sentence').map((i) => ({ ...i.data, id: i.id, user: true }))];
    const grammar = [...(pack?.grammar ?? []), ...own.filter((i) => i.kind === 'grammar').map((i) => ({ ...i.data, id: i.id, user: true }))];
    return {
        words, sentences, grammar, credits: pack?.credits,
        wordById: new Map(words.map((w) => [w.id, w])),
        sentById: new Map(sentences.map((s) => [s.id, s])),
        unitById: new Map(grammar.map((u) => [u.id, u])),
    };
}
export function useCourses() {
    return useLiveQuery(async () => (await getAll('langCourses')).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt), ['langCourses']);
}
export function useCourse(id) {
    return useLiveQuery(async () => (id ? (await get('langCourses', id)) ?? null : null), ['langCourses'], [id]);
}
/** Merged content of a course; `null` while loading, `{error}` if the pack can't be fetched. */
export function useCourseContent(course) {
    const itemsQ = useLiveQuery(async () => ({ for: course?.id ?? '', rows: course ? await getByIndex('langItems', 'courseId', course.id) : [] }), ['langItems'], [course?.id]);
    const items = itemsQ && itemsQ.for === (course?.id ?? '') ? itemsQ.rows : undefined;
    // Remember which course the loaded pack belongs to, so a render between "course arrived" and
    // "its pack arrived" never sees an empty (or another course's) word list.
    const [pack, setPack] = useState(null);
    const want = course ? `${course.id}:${course.pack ?? ''}` : '';
    useEffect(() => {
        let alive = true;
        if (!course)
            return;
        if (!course.pack) {
            setPack({ for: want, p: { words: [], sentences: [], grammar: [] } });
            return;
        }
        loadPack(course.pack).then((p) => alive && setPack({ for: want, p })).catch((e) => alive && setPack({ for: want, p: { error: String(e?.message ?? e) } }));
        return () => { alive = false; };
    }, [want]); // eslint-disable-line react-hooks/exhaustive-deps
    return useMemo(() => {
        if (!pack || pack.for !== want || !items)
            return null;
        if ('error' in pack.p)
            return pack.p;
        return merge(pack.p, items);
    }, [pack, items, want]);
}
export async function loadCourseContent(course) {
    const [pack, items] = await Promise.all([course.pack ? loadPack(course.pack) : Promise.resolve(null), getByIndex('langItems', 'courseId', course.id)]);
    return merge(pack, items);
}
export async function loadProgress(courseId) {
    const rows = await getByIndex('langProgress', 'courseId', courseId);
    return new Map(rows.map((r) => [r.key, r]));
}
export function useProgress(courseId) {
    const q = useLiveQuery(async () => ({ for: courseId ?? '', m: courseId ? await loadProgress(courseId) : new Map() }), ['langProgress'], [courseId]);
    return q && q.for === (courseId ?? '') ? q.m : undefined;
}
export function useLogs(courseId) {
    return useLiveQuery(async () => (courseId ? (await getByIndex('langLogs', 'courseId', courseId)).sort((a, b) => a.date.localeCompare(b.date)) : []), ['langLogs'], [courseId]);
}
// ---- text helpers ----------------------------------------------------------------------------
export const plain = (s) => s.replace(/́/g, '');
export const norm = (s) => plain(s).toLowerCase().replace(/ё/g, 'е').replace(/[’`]/g, "'").trim();
/** Word tiles for the sentence builder (punctuation stripped, case kept). */
export function tilesOf(sentence) {
    return sentence.split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')).filter(Boolean);
}
export function sameSequence(a, b) {
    return a.length === b.length && a.every((x, i) => norm(x) === norm(b[i]));
}
export function sameBag(a, b) {
    if (a.length !== b.length)
        return false;
    const x = a.map(norm).sort();
    const y = b.map(norm).sort();
    return x.every((v, i) => v === y[i]);
}
export function shuffle(arr, rnd = Math.random) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
/** Deterministic PRNG (for "phrases of the day" that stay the same all day). */
export function seeded(seed) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
// ---- spaced repetition -----------------------------------------------------------------------
export const pid = (courseId, key) => `${courseId}|${key}`;
export const wKey = (wordId, dir) => `w:${wordId}:${dir}`;
function base(courseId, key, today) {
    return { id: pid(courseId, key), courseId, key, state: 'learning', ivl: 0, ease: 2.5, reps: 0, lapses: 0, due: today, last: 0, created: today };
}
function daysBetween(a, b) {
    return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}
/** Grade one answer. `firstSight` = right on a card never seen before (start with a longer gap). */
export function gradeCard(prev, courseId, key, ok, opts = {}) {
    const today = opts.today ?? todayKey();
    const b = prev ? { ...prev } : base(courseId, key, today);
    b.last = Date.now();
    if (!b.created)
        b.created = today;
    if (ok) {
        let ivl;
        if (!prev && opts.firstSight)
            ivl = 4;
        else if (b.ivl <= 0)
            ivl = 1;
        else {
            const late = Math.max(0, daysBetween(b.due, today));
            ivl = Math.max(b.ivl + 1, Math.round((b.ivl + late / 2) * b.ease));
            b.ease = Math.min(3, b.ease + 0.05);
        }
        b.ivl = Math.min(365, ivl);
        b.reps += 1;
        if (b.state !== 'known')
            b.state = 'review';
        if (b.miss && b.lw !== today) {
            b.miss = false;
        }
    }
    else {
        if (prev)
            b.lapses += 1;
        b.ease = Math.max(1.3, b.ease - 0.2);
        b.ivl = 0;
        b.state = 'learning';
        b.miss = true;
        b.lw = today;
    }
    b.due = addDays(today, b.ivl);
    return b;
}
/** "I already know this" — long first interval, spread out so verifications trickle back. */
export function markKnownCard(prev, courseId, key, today = todayKey(), minDays = 21, maxDays = 60) {
    const b = prev ? { ...prev } : base(courseId, key, today);
    const ivl = Math.max(b.ivl, minDays + Math.floor(Math.random() * (maxDays - minDays + 1)));
    return { ...b, state: 'known', ivl, ease: Math.max(b.ease, 2.6), reps: Math.max(1, b.reps), due: addDays(today, ivl), last: Date.now(), miss: false };
}
export function isMature(p) {
    return !!p && p.state !== 'suspended' && (p.state === 'known' || p.ivl >= MATURE_DAYS);
}
export async function saveCards(cards) {
    await bulkPut('langProgress', cards);
}
// ---- activity log ----------------------------------------------------------------------------
export async function logActivity(courseId, patch) {
    const date = todayKey();
    const id = `${courseId}|${date}`;
    const cur = (await get('langLogs', id)) ?? { id, courseId, date, answers: 0, correct: 0, learned: 0, sentences: 0, drills: 0, seconds: 0 };
    const next = { ...cur };
    for (const k of Object.keys(patch))
        next[k] = (cur[k] ?? 0) + (patch[k] ?? 0);
    await put('langLogs', next);
}
export function streak(logs, today = todayKey()) {
    const active = new Set(logs.filter((l) => l.answers > 0).map((l) => l.date));
    let d = active.has(today) ? today : addDays(today, -1);
    let n = 0;
    while (active.has(d)) {
        n++;
        d = addDays(d, -1);
    }
    return n;
}
export function vocabStats(c, prog, today = todayKey()) {
    const perLevel = {};
    let passive = 0, active = 0, learning = 0;
    for (const w of c.words) {
        const L = perLevel[w.l] ?? (perLevel[w.l] = { total: 0, passive: 0, active: 0, seen: 0 });
        L.total++;
        const r = prog.get(wKey(w.id, 'r'));
        const p = prog.get(wKey(w.id, 'p'));
        if (r || p)
            L.seen++;
        const act = isMature(p);
        const pas = act || isMature(r);
        if (pas) {
            passive++;
            L.passive++;
        }
        if (act) {
            active++;
            L.active++;
        }
        if (!pas && (r || p))
            learning++;
    }
    let due = 0, mistakes = 0, learnedToday = 0, producedToday = 0;
    for (const p of prog.values()) {
        if (p.state === 'suspended')
            continue;
        if (p.key.startsWith('w:') && p.due <= today)
            due++;
        if (p.miss)
            mistakes++;
        if (p.created === today && p.key.startsWith('w:')) {
            if (p.key.endsWith(':r') && p.state !== 'known')
                learnedToday++;
            if (p.key.endsWith(':p'))
                producedToday++;
        }
    }
    return { passive, active, learning, due, mistakes, learnedToday, producedToday, perLevel };
}
/** The level to focus on: the first core level whose words or grammar are under 70 % done. */
export function focusLevel(c, stats, prog) {
    for (const lv of LEVELS) {
        const ws = stats.perLevel[lv];
        const units = c.grammar.filter((u) => u.level === lv);
        const done = units.filter((u) => prog.get(`g:${u.id}`)?.state === 'known').length;
        const wordsOk = !ws || ws.total === 0 || ws.passive / ws.total >= 0.7;
        const gramOk = units.length === 0 || done / units.length >= 0.7;
        if (!wordsOk || !gramOk)
            return lv;
    }
    return 'B2';
}
export function levelIndex(l) { return LEVELS.indexOf(l); }
function dirAllowed(direction, d) {
    return direction === 'mix' || (direction === 't2s' ? d === 'r' : d === 'p');
}
export function dueCards(c, prog, direction, today = todayKey()) {
    const out = [];
    for (const p of prog.values()) {
        if (!p.key.startsWith('w:') || p.state === 'suspended' || p.due > today)
            continue;
        const [, id, d] = p.key.split(':');
        const word = c.wordById.get(id);
        if (!word || !dirAllowed(direction, d))
            continue;
        out.push({ item: { word, dir: d, kind: 'review' }, due: p.due, rank: word.rank });
    }
    // Overdue first (oldest), then by frequency so the important words win.
    out.sort((a, b) => a.due.localeCompare(b.due) || a.rank - b.rank);
    return out.map((o) => o.item);
}
/** Words never seen in any direction, most frequent first (the user's own words come first). */
export function newWords(c, prog, n, level) {
    const out = [];
    for (const w of c.words) {
        if (level && level !== 'all' && w.l !== level)
            continue;
        if (prog.has(wKey(w.id, 'r')) || prog.has(wKey(w.id, 'p')))
            continue;
        out.push(w);
        if (out.length >= n)
            break;
    }
    return out;
}
/** Words you can recognise but have never been asked to produce — the speaking gap. */
export function newProduction(c, prog, n) {
    const out = [];
    for (const w of c.words) {
        if (prog.has(wKey(w.id, 'p')))
            continue;
        const r = prog.get(wKey(w.id, 'r'));
        if (!r || r.state === 'suspended' || (r.state !== 'known' && r.ivl < 1))
            continue;
        out.push(w);
        if (out.length >= n)
            break;
    }
    return out;
}
export function mistakeCards(c, prog, direction = 'mix') {
    const out = [];
    for (const p of prog.values()) {
        if (!p.miss || !p.key.startsWith('w:'))
            continue;
        const [, id, d] = p.key.split(':');
        const word = c.wordById.get(id);
        if (word && dirAllowed(direction, d))
            out.push({ word, dir: d, kind: 'mistake' });
    }
    return out;
}
/** Today's mixed session: due reviews, then new words, then first production cards. */
export function dailyQueue(c, prog, course, opts = {}) {
    const direction = opts.direction ?? course.direction;
    const size = opts.size ?? course.sessionSize;
    const stats = vocabStats(c, prog);
    const reviews = dueCards(c, prog, direction).slice(0, size);
    const room = Math.max(0, size - reviews.length);
    const newLeft = Math.max(0, course.dailyNew - stats.learnedToday);
    const prodLeft = direction === 't2s' ? 0 : Math.max(0, course.dailyNew - stats.producedToday);
    // New words: we show more candidates than the quota because many will be swiped "already know".
    const fresh = newWords(c, prog, Math.min(room, newLeft * 3)).map((word) => ({ word, dir: direction === 's2t' ? 'p' : 'r', kind: 'new' }));
    const prod = newProduction(c, prog, Math.min(prodLeft, Math.max(0, room - fresh.length))).map((word) => ({ word, dir: 'p', kind: 'newp' }));
    return [...reviews, ...interleave(fresh, prod)].slice(0, size);
}
function interleave(a, b) {
    const out = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i])
            out.push(a[i]);
        if (b[i])
            out.push(b[i]);
    }
    return out;
}
// sentences ------------------------------------------------------------------------------------
export function sentenceQueue(c, prog, prefix, level, n, opts = {}) {
    const today = opts.today ?? todayKey();
    if (opts.mistakesOnly)
        return c.sentences.filter((s) => prog.get(`${prefix}:${s.id}`)?.miss).slice(0, n);
    const due = c.sentences.filter((s) => { const p = prog.get(`${prefix}:${s.id}`); return p && p.state !== 'suspended' && p.due <= today; })
        .sort((a, b) => (prog.get(`${prefix}:${a.id}`).due).localeCompare(prog.get(`${prefix}:${b.id}`).due));
    const lvOk = (s) => level === 'all' || s.l === level;
    const fresh = shuffle(c.sentences.filter((s) => lvOk(s) && !prog.has(`${prefix}:${s.id}`) && (!opts.dailyOnly || s.dy)));
    // own sentences first, then the level's sentences
    fresh.sort((a, b) => Number(!!b.user) - Number(!!a.user));
    return [...due.filter(lvOk), ...fresh].slice(0, n);
}
/** Five phrases for today: stable for the whole day, unseen ones first, at or below the focus level. */
export function phrasesOfTheDay(c, prog, focus, today = todayKey(), n = 5) {
    const max = levelIndex(focus);
    const pool = c.sentences.filter((s) => s.dy && levelIndex(s.l) <= max);
    const rnd = seeded(today + ':' + c.sentences.length);
    const unseen = shuffle(pool.filter((s) => !prog.has(`sp:${s.id}`)), rnd);
    const seen = shuffle(pool.filter((s) => prog.has(`sp:${s.id}`)), rnd);
    // lean towards the focus level
    unseen.sort((a, b) => Math.abs(levelIndex(a.l) - max) - Math.abs(levelIndex(b.l) - max));
    return [...unseen, ...seen].slice(0, n);
}
// grammar ------------------------------------------------------------------------------------------
export const drillKey = (unitId, i) => `gd:${unitId}#${i}`;
export function unitDone(prog, unitId) { return prog.get(`g:${unitId}`)?.state === 'known'; }
export function nextUnit(c, prog) {
    return c.grammar.find((u) => !unitDone(prog, u.id));
}
export async function completeUnit(courseId, unitId, score, prev) {
    const today = todayKey();
    const key = `g:${unitId}`;
    const b = prev ? { ...prev } : base(courseId, key, today);
    const best = Math.max(b.score ?? 0, score);
    const row = { ...b, score: best, last: Date.now(), reps: b.reps + 1, state: best >= 80 ? 'known' : 'learning', ivl: best >= 80 ? 30 : 0, due: addDays(today, best >= 80 ? 30 : 0) };
    await put('langProgress', row);
    return row;
}
export function drillMistakes(c, prog) {
    const out = [];
    for (const p of prog.values()) {
        if (!p.miss || !p.key.startsWith('gd:'))
            continue;
        const [uidPart, idx] = p.key.slice(3).split('#');
        const unit = c.unitById.get(uidPart);
        const drill = unit?.drills[Number(idx)];
        if (unit && drill)
            out.push({ unit, index: Number(idx), drill });
    }
    return out;
}
export function placementBands(total) {
    const edges = [0, 300, 700, 1500, 2500, 3500, 5000, 7000, total].filter((e, i, a) => e <= total && (i === 0 || e > a[i - 1]));
    const out = [];
    for (let i = 1; i < edges.length; i++)
        out.push({ from: edges[i - 1], to: edges[i] });
    return out;
}
export function exportPack(course, items) {
    const strip = (d) => { const o = { ...d }; delete o.id; delete o.user; delete o.rank; return o; };
    return {
        lingua: 1,
        course: { title: course.title, target: course.target, source: course.source },
        words: items.filter((i) => i.kind === 'word').map((i) => strip(i.data)),
        sentences: items.filter((i) => i.kind === 'sentence').map((i) => strip(i.data)),
        grammar: items.filter((i) => i.kind === 'grammar').map((i) => strip(i.data)),
    };
}
const asLevel = (l) => (LEVELS.includes(l) ? l : 'A1');
/** Turns a pack file into items for a course, skipping things that already exist (same text). */
export function packToItems(courseId, file, existing) {
    if (!file || file.lingua !== 1)
        throw new Error('not a Lingua pack');
    const now = Date.now();
    const haveW = new Set(existing?.words.map((w) => norm(w.t)) ?? []);
    const haveS = new Set(existing?.sentences.map((s) => norm(s.t)) ?? []);
    const haveG = new Set(existing?.grammar.map((g) => norm(g.title)) ?? []);
    const out = [];
    let k = 0;
    for (const raw of file.words ?? []) {
        const w = Array.isArray(raw) ? { t: raw[1], s: raw[2], pos: raw[3], l: raw[4], info: raw[5], ex: raw[6], exs: raw[7] } : raw;
        if (!w.t || !w.s || haveW.has(norm(w.t)))
            continue;
        haveW.add(norm(w.t));
        out.push({ id: uid('lw'), courseId, kind: 'word', createdAt: now + k++, data: { t: w.t, s: w.s, pos: w.pos || 'other', l: asLevel(w.l), info: w.info || undefined, ex: w.ex || undefined, exs: w.exs || undefined } });
    }
    for (const s of file.sentences ?? []) {
        if (!s.t || !s.s || haveS.has(norm(s.t)))
            continue;
        haveS.add(norm(s.t));
        out.push({ id: uid('ls'), courseId, kind: 'sentence', createdAt: now + k++, data: { t: s.t, s: s.s, l: asLevel(s.l), tp: s.tp, d: Array.isArray(s.d) ? s.d : undefined, dy: !!s.dy } });
    }
    for (const g of file.grammar ?? []) {
        if (!g.title || haveG.has(norm(g.title)))
            continue;
        haveG.add(norm(g.title));
        out.push({ id: uid('lg'), courseId, kind: 'grammar', createdAt: now + k++, data: { level: asLevel(g.level), title: g.title, summary: g.summary ?? '', sections: Array.isArray(g.sections) ? g.sections : [], tips: g.tips ?? [], drills: Array.isArray(g.drills) ? g.drills : [] } });
    }
    return out;
}
export async function courseItems(courseId) {
    return getByIndex('langItems', 'courseId', courseId);
}
