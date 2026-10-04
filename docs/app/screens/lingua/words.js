import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Word library: search, filter by level and status, open a word for its forms, example and actions.
import { useMemo, useState } from 'react';
import { bulkRemove, remove } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { todayKey } from '../../lib/dates.js';
import { isMature, LEVELS, markKnownCard, norm, pid, saveCards, wKey } from '../../lib/lingua.js';
import { Button, Chip, Screen, Sheet, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { isCtx, LevelTag, posLabel, SpeakButton, useLingua } from './lingua-ui.js';
import { WordForm } from './manage.js';
export function wordStatus(r, p) {
    if (isMature(p))
        return 'active';
    if (isMature(r))
        return 'passive';
    if (r || p)
        return 'learning';
    return 'new';
}
export function LinguaWordsScreen({ cid }) {
    const t = useT();
    const ctx = useLingua(cid);
    const [q, setQ] = useState('');
    const [level, setLevel] = useState('all');
    const [status, setStatus] = useState('all');
    const [limit, setLimit] = useState(80);
    const [open, setOpen] = useState(null);
    const [adding, setAdding] = useState(false);
    const list = useMemo(() => {
        if (!isCtx(ctx))
            return [];
        const nq = norm(q);
        return ctx.content.words.filter((w) => {
            if (level !== 'all' && w.l !== level)
                return false;
            if (status === 'mine' && !w.user)
                return false;
            if (status !== 'all' && status !== 'mine' && wordStatus(ctx.prog.get(wKey(w.id, 'r')), ctx.prog.get(wKey(w.id, 'p'))) !== status)
                return false;
            return !nq || norm(w.t).includes(nq) || w.s.toLowerCase().includes(nq);
        });
    }, [ctx, q, level, status]);
    if (!isCtx(ctx))
        return ctx;
    const { course, content } = ctx;
    const levels = LEVELS.filter((l) => content.words.some((w) => w.l === l));
    return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.words'), eyebrow: course.title, backTo: `/lang/${cid}`, right: _jsx("button", { type: "button", className: "iconbtn iconbtn-lingua", "aria-label": t('lang.addWord'), onClick: () => setAdding(true), children: _jsx(IconPlus, {}) }) }), _jsxs("div", { className: "search-field", children: [_jsx(IconSearch, { size: 18, className: "muted" }), _jsx(TextInput, { value: q, onChange: (v) => { setQ(v); setLimit(80); }, placeholder: t('lang.searchWords') })] }), _jsxs("div", { className: "chips mt", children: [_jsx(Chip, { tone: "lingua", active: level === 'all', onClick: () => setLevel('all'), children: t('lang.all') }), levels.map((l) => _jsx(Chip, { tone: "lingua", active: level === l, onClick: () => setLevel(l), children: l }, l))] }), _jsx("div", { className: "chips", children: ['all', 'new', 'learning', 'passive', 'active', 'mine'].map((s) => _jsx(Chip, { active: status === s, onClick: () => setStatus(s), children: t(`lang.status.${s}`) }, s)) }), _jsx("div", { className: "small muted mb", children: t('lang.nWords', { n: list.length.toLocaleString() }) }), _jsx("div", { className: "card card-flush", children: list.slice(0, limit).map((w) => {
                    const st = wordStatus(ctx.prog.get(wKey(w.id, 'r')), ctx.prog.get(wKey(w.id, 'p')));
                    return (_jsxs("button", { type: "button", className: "row row-tappable", onClick: () => setOpen(w), children: [_jsx("span", { className: `st-dot st-${st}` }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: w.t }), _jsx("div", { className: "row-sub", children: w.s })] }), _jsx(LevelTag, { level: w.l })] }, w.id));
                }) }), list.length > limit && _jsx(Button, { variant: "secondary", full: true, className: "mt", onClick: () => setLimit((l) => l + 200), children: t('lang.showMore') }), _jsx(WordSheet, { ctx: ctx, word: open, onClose: () => setOpen(null) }), _jsx(WordForm, { courseId: course.id, open: adding, onClose: () => setAdding(false) })] }));
}
export function WordSheet({ ctx, word, onClose }) {
    const t = useT();
    const [editing, setEditing] = useState(false);
    const { course, prog } = ctx;
    if (!word)
        return null;
    const r = prog.get(wKey(word.id, 'r'));
    const p = prog.get(wKey(word.id, 'p'));
    const st = wordStatus(r, p);
    const suspended = r?.state === 'suspended' || p?.state === 'suspended';
    const known = (dir) => {
        const rows = [markKnownCard(r, course.id, wKey(word.id, 'r'))];
        if (dir === 'p')
            rows.push(markKnownCard(p, course.id, wKey(word.id, 'p')));
        saveCards(rows);
    };
    const reset = () => bulkRemove('langProgress', [pid(course.id, wKey(word.id, 'r')), pid(course.id, wKey(word.id, 'p'))]);
    const suspend = () => {
        const today = todayKey();
        const mk = (prev, key) => ({ ...(prev ?? { id: pid(course.id, key), courseId: course.id, key, ivl: 0, ease: 2.5, reps: 0, lapses: 0, due: today, last: Date.now() }), state: suspended ? 'review' : 'suspended', miss: false });
        saveCards([mk(r, wKey(word.id, 'r')), mk(p, wKey(word.id, 'p'))]);
    };
    const del = async () => {
        if (!(await confirmDialog({ title: t('lang.deleteWord', { w: word.t }), danger: true, confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') })))
            return;
        await reset();
        await remove('langItems', word.id);
        onClose();
    };
    return (_jsxs(_Fragment, { children: [_jsx(Sheet, { open: !!word && !editing, onClose: onClose, title: _jsxs("span", { className: "hstack", style: { gap: 8 }, children: [_jsx(LevelTag, { level: word.l }), posLabel(t, word.pos)] }), children: _jsxs("div", { className: "word-sheet", children: [_jsxs("div", { className: "hstack", children: [_jsx("div", { className: "face-word flex1", style: { textAlign: 'left' }, children: word.t }), _jsx(SpeakButton, { text: word.t, tag: course.target.tts, rate: course.rate, size: 24 })] }), _jsx("div", { className: "face-meaning", style: { textAlign: 'left' }, children: word.s }), word.info && _jsx("div", { className: "face-info", children: word.info }), word.ex && _jsxs("div", { className: "face-ex", children: [_jsxs("div", { className: "hstack", style: { gap: 6 }, children: [_jsx("span", { className: "flex1", children: word.ex }), _jsx(SpeakButton, { text: word.ex, tag: course.target.tts, rate: course.rate, size: 16 })] }), word.exs && _jsx("div", { className: "muted", children: word.exs })] }), _jsxs("div", { className: "word-status", children: [_jsx("span", { className: `st-dot st-${st}` }), " ", t(`lang.status.${st}`), r && _jsxs("span", { className: "muted small", children: [" \u00B7 ", t('lang.nextReview', { date: r.due })] }), suspended && _jsxs("span", { className: "muted small", children: [" \u00B7 ", t('lang.suspended')] })] }), _jsxs("div", { className: "grid-2 mt", children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: () => known('r'), children: t('lang.iUnderstandIt') }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => known('p'), children: t('lang.iCanSayIt') }), _jsx(Button, { variant: "secondary", size: "sm", onClick: reset, children: t('lang.resetWord') }), _jsx(Button, { variant: "secondary", size: "sm", onClick: suspend, children: suspended ? t('lang.unsuspend') : t('lang.suspend') })] }), word.user && (_jsxs("div", { className: "grid-2 mt", children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: () => setEditing(true), children: t('common.edit') }), _jsx(Button, { variant: "danger", size: "sm", onClick: del, children: t('common.delete') })] }))] }) }), editing && _jsx(WordForm, { courseId: course.id, word: word, open: true, onClose: () => { setEditing(false); onClose(); } })] }));
}
