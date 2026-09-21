// Notes helpers: default group, body parsing (checklists + links), search with snippets.
import { bulkRemove, count, getAll, getByIndex, put, remove } from './db.js';
import { uid } from './ids.js';
import { tGlobal } from './i18n.js';
import { CATEGORY_COLORS } from './models.js';
export const GENERAL_GROUP_ID = 'ng_general';
export const NOTE_GROUP_COLORS = CATEGORY_COLORS;
/** The seeded group keeps its English name in the DB; show the localized one unless renamed. */
export function groupName(g) {
    if (!g)
        return '';
    if (g.id === GENERAL_GROUP_ID && g.name === 'General')
        return tGlobal('notes.generalGroup');
    return g.name;
}
export async function seedNoteGroupsIfEmpty() {
    if ((await count('noteGroups')) > 0)
        return;
    const now = Date.now();
    await put('noteGroups', { id: GENERAL_GROUP_ID, name: 'General', color: '#D9488A', icon: 'doc', order: 0, createdAt: now, updatedAt: now });
}
export function newGroup(partial = {}) {
    const now = Date.now();
    return { id: uid('ng'), name: '', color: NOTE_GROUP_COLORS[0], icon: 'doc', order: 0, createdAt: now, updatedAt: now, ...partial };
}
export function newNote(groupId, partial = {}) {
    const now = Date.now();
    return { id: uid('note'), groupId, title: '', body: '', tags: [], pinned: false, createdAt: now, updatedAt: now, ...partial };
}
/** Deletes a group and every note in it. */
export async function deleteGroup(id) {
    const rows = await getByIndex('notes', 'groupId', id);
    await bulkRemove('notes', rows.map((r) => r.id));
    await remove('noteGroups', id);
}
export async function noteCounts() {
    const m = new Map();
    for (const n of await getAll('notes'))
        m.set(n.groupId, (m.get(n.groupId) ?? 0) + 1);
    return m;
}
// ---- body parsing --------------------------------------------------------------------------
const CHECK_RE = /^(\s*(?:[-*]\s+)?)\[( |x|X)\]\s?(.*)$/;
export function parseBody(body) {
    return body.split('\n').map((line, index) => {
        const m = CHECK_RE.exec(line);
        if (m)
            return { kind: 'check', index, text: m[3], checked: m[2].toLowerCase() === 'x' };
        return { kind: 'text', index, text: line };
    });
}
/** Flips the checkbox on the given line; returns the new body (unchanged if that line isn't a checkbox). */
export function toggleCheck(body, index) {
    const lines = body.split('\n');
    const m = CHECK_RE.exec(lines[index] ?? '');
    if (!m)
        return body;
    lines[index] = `${m[1]}[${m[2] === ' ' ? 'x' : ' '}] ${m[3]}`;
    return lines.join('\n');
}
export function checkProgress(body) {
    let done = 0, total = 0;
    for (const l of parseBody(body))
        if (l.kind === 'check') {
            total++;
            if (l.checked)
                done++;
        }
    return { done, total };
}
/** Title to show for a note without one: its first non-empty line, trimmed of checklist markup. */
export function displayTitle(n) {
    if (n.title.trim())
        return n.title.trim();
    const first = parseBody(n.body).find((l) => l.text.trim());
    return first ? first.text.trim().slice(0, 80) : tGlobal('notes.untitled');
}
/** Short preview: first lines after the one used as title, single-spaced. */
export function excerpt(n, max = 110) {
    const lines = parseBody(n.body).filter((l) => l.text.trim());
    const rest = n.title.trim() ? lines : lines.slice(1);
    const s = rest.map((l) => (l.kind === 'check' ? (l.checked ? '☑ ' : '☐ ') + l.text.trim() : l.text.trim())).join(' · ');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
// ---- links ---------------------------------------------------------------------------------
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"')\]]+[^\s<>"'.,;:!?)\]])/gi;
export function splitLinks(text) {
    const out = [];
    let last = 0;
    for (const m of text.matchAll(URL_RE)) {
        const i = m.index ?? 0;
        if (i > last)
            out.push({ kind: 'text', text: text.slice(last, i) });
        const raw = m[1];
        out.push({ kind: 'link', text: raw, href: /^https?:\/\//i.test(raw) ? raw : 'https://' + raw });
        last = i + raw.length;
    }
    if (last < text.length)
        out.push({ kind: 'text', text: text.slice(last) });
    return out;
}
export function extractLinks(body) {
    const seen = new Set();
    const out = [];
    for (const seg of splitLinks(body)) {
        if (seg.kind !== 'link' || seen.has(seg.href))
            continue;
        seen.add(seg.href);
        out.push({ href: seg.href, label: linkLabel(seg.href) });
    }
    return out;
}
export function linkLabel(href) {
    try {
        const u = new URL(href);
        const host = u.hostname.replace(/^www\./, '');
        const path = u.pathname === '/' ? '' : u.pathname;
        return (host + path).length > 48 ? host + path.slice(0, 44 - host.length) + '…' : host + path;
    }
    catch {
        return href;
    }
}
// ---- tags ----------------------------------------------------------------------------------
export function normalizeTag(s) {
    return s.trim().replace(/[#,]/g, '').replace(/\s+/g, '-').toLowerCase();
}
export function allTags(notes) {
    const m = new Map();
    for (const n of notes)
        for (const t of n.tags)
            m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag));
}
export function tokens(q) {
    return q.toLowerCase().split(/\s+/).map((s) => s.trim()).filter(Boolean);
}
/** Every token must appear somewhere in title, body, tags or group name. Ranked: title > tag > group > body, pinned and recent as tie-breakers. */
export function searchNotes(notes, groups, q) {
    const toks = tokens(q);
    if (toks.length === 0)
        return [];
    const hits = [];
    for (const n of notes) {
        const title = n.title.toLowerCase();
        const body = n.body.toLowerCase();
        const tagStr = n.tags.join(' ').toLowerCase();
        const group = groupName(groups.get(n.groupId)).toLowerCase();
        let score = 0;
        let where = 'body';
        let ok = true;
        for (const t of toks) {
            if (title.includes(t)) {
                score += 10;
                if (where === 'body')
                    where = 'title';
            }
            else if (tagStr.includes(t)) {
                score += 6;
                if (where === 'body')
                    where = 'tag';
            }
            else if (group.includes(t)) {
                score += 3;
                if (where === 'body')
                    where = 'group';
            }
            else if (body.includes(t)) {
                score += 1;
            }
            else {
                ok = false;
                break;
            }
        }
        if (!ok)
            continue;
        if (n.pinned)
            score += 1;
        score += Math.max(0, 1 - (Date.now() - n.updatedAt) / (365 * 86400e3));
        hits.push({ note: n, where, snippet: snippetAround(n.body, toks) || excerpt(n), score });
    }
    return hits.sort((a, b) => b.score - a.score);
}
function snippetAround(body, toks, radius = 48) {
    const flat = body.replace(/\s+/g, ' ');
    const low = flat.toLowerCase();
    let at = -1;
    for (const t of toks) {
        const i = low.indexOf(t);
        if (i >= 0 && (at < 0 || i < at))
            at = i;
    }
    if (at < 0)
        return '';
    const start = Math.max(0, at - radius);
    const end = Math.min(flat.length, at + radius * 2);
    return (start > 0 ? '…' : '') + flat.slice(start, end).trim() + (end < flat.length ? '…' : '');
}
/** Splits text into plain / highlighted pieces for every token occurrence (case-insensitive). */
export function highlight(text, q) {
    const toks = tokens(q).filter((t) => t.length > 0);
    if (toks.length === 0 || !text)
        return [{ text, hit: false }];
    const pattern = toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const splitter = new RegExp(`(${pattern})`, 'gi');
    const tester = new RegExp(`^(?:${pattern})$`, 'i');
    return text.split(splitter).filter((s) => s !== '').map((s) => ({ text: s, hit: tester.test(s) }));
}
// ---- sharing -------------------------------------------------------------------------------
export function noteToText(n, group) {
    const head = [displayTitle(n), group ? `(${groupName(group)})` : ''].filter(Boolean).join(' ');
    const tags = n.tags.length ? '\n' + n.tags.map((t) => '#' + t).join(' ') : '';
    return `${head}\n\n${n.body.trim()}${tags}`.trim();
}
export function relativeTime(ts) {
    const mins = Math.floor((Date.now() - ts) / 60e3);
    if (mins < 1)
        return tGlobal('notes.justNow');
    if (mins < 60)
        return tGlobal('notes.minsAgo', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24)
        return tGlobal('notes.hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    if (days === 1)
        return tGlobal('tree.yesterday');
    if (days < 30)
        return tGlobal('tree.daysAgo', { n: days });
    const d = new Date(ts);
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
