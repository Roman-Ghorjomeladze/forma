import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Swipe cards: right = I know it, left = I don't. Tap to flip (or show both sides).
// Modes: today's mix, due reviews, new words, mistakes, browse a level.
import { useEffect, useMemo, useRef, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { dailyQueue, dueCards, gradeCard, logActivity, markKnownCard, mistakeCards, newProduction, newWords, saveCards, shuffle, wKey, LEVELS, } from '../../lib/lingua.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Chip, Progress, Screen, Segmented, TopBar } from '../../ui/components.js';
import { IconCheck, IconClose, IconRepeat } from '../../ui/icons.js';
import { isCtx, LevelTag, posLabel, SpeakButton, SwipeCard, useLingua, useStopwatch } from './lingua-ui.js';
export function LinguaCardsScreen({ cid }) {
    const ctx = useLingua(cid);
    const route = useRoute();
    if (!isCtx(ctx))
        return ctx;
    const mode = route.query.get('mode');
    if (!mode)
        return _jsx(CardsSetup, { ctx: ctx });
    return _jsx(CardsSession, { ctx: ctx, mode: mode, level: route.query.get('level') || 'A1', dirParam: route.query.get('dir'), ids: route.query.get('ids') }, route.path + route.query.toString());
}
function CardsSetup({ ctx }) {
    const t = useT();
    const { course, content, prog } = ctx;
    const [mode, setMode] = useState('daily');
    const [level, setLevel] = useState('A1');
    const due = useMemo(() => dueCards(content, prog, course.direction).length, [content, prog, course.direction]);
    const mistakes = useMemo(() => mistakeCards(content, prog, course.direction).length, [content, prog, course.direction]);
    const levels = LEVELS.filter((l) => content.words.some((w) => w.l === l));
    const tl = course.target.code.toUpperCase();
    const sl = course.source.code.toUpperCase();
    const start = () => navigate(`/lang/${course.id}/cards?mode=${mode}${mode === 'level' || mode === 'new' ? `&level=${level}` : ''}`);
    return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.cards'), eyebrow: course.title, backTo: `/lang/${course.id}` }), _jsx("div", { className: "section-label", children: t('lang.whatToPractise') }), _jsx("div", { className: "stack", children: [
                    ['daily', t('lang.modeDaily'), t('lang.modeDailySub')],
                    ['review', t('lang.modeReview'), t('lang.nDue', { n: due })],
                    ['new', t('lang.modeNew'), t('lang.modeNewSub')],
                    ['mistakes', t('lang.modeMistakes'), t('lang.toFix', { n: mistakes })],
                    ['level', t('lang.modeLevel'), t('lang.modeLevelSub')],
                ].map(([m, title, sub]) => (_jsxs("button", { type: "button", className: `card card-tappable mode-card ${mode === m ? 'selected' : ''}`, onClick: () => setMode(m), children: [_jsx("span", { className: "radio" }), _jsxs("span", { className: "flex1", children: [_jsx("span", { className: "bold", children: title }), _jsx("span", { className: "small muted block", children: sub })] })] }, m))) }), (mode === 'new' || mode === 'level') && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-label mt-lg", children: t('lang.level') }), _jsx("div", { className: "chips", children: levels.map((l) => _jsx(Chip, { tone: "lingua", active: level === l, onClick: () => setLevel(l), children: l }, l)) })] })), _jsx("div", { className: "section-label mt-lg", children: t('lang.direction') }), _jsx(Segmented, { value: course.direction, onChange: (v) => put('langCourses', { ...course, direction: v }), options: [{ value: 't2s', label: `${tl} → ${sl}` }, { value: 's2t', label: `${sl} → ${tl}` }, { value: 'mix', label: t('lang.mixed') }] }), _jsx("div", { className: "section-label mt-lg", children: t('lang.cardFace') }), _jsx(Segmented, { value: course.showBoth ? 'both' : 'flip', onChange: (v) => put('langCourses', { ...course, showBoth: v === 'both' }), options: [{ value: 'flip', label: t('lang.tapToFlip') }, { value: 'both', label: t('lang.showBoth') }] }), _jsx("p", { className: "small muted mt", children: t('lang.swipeHelp') }), _jsx(Button, { variant: "lingua", full: true, size: "lg", className: "mt-lg", onClick: start, children: t('lang.start') })] }));
}
function buildQueue(ctx, mode, level, dir, ids) {
    const { course, content, prog } = ctx;
    const size = course.sessionSize;
    if (ids) {
        return ids.split(',').map((id) => content.wordById.get(id)).filter(Boolean).map((word) => ({ word: word, dir: dir === 's2t' ? 'p' : 'r', kind: prog.has(wKey(word.id, 'r')) ? 'review' : 'new' }));
    }
    const pickDir = () => (dir === 'mix' ? (Math.random() < 0.5 ? 'r' : 'p') : dir === 's2t' ? 'p' : 'r');
    switch (mode) {
        case 'daily': return dailyQueue(content, prog, course, { direction: dir });
        case 'review': return dueCards(content, prog, dir).slice(0, size);
        case 'mistakes': return shuffle(mistakeCards(content, prog, dir)).slice(0, size);
        case 'new': {
            const w = newWords(content, prog, size, level).map((word) => ({ word, dir: dir === 's2t' ? 'p' : 'r', kind: 'new' }));
            if (w.length >= size || dir === 't2s')
                return w;
            return [...w, ...newProduction(content, prog, size - w.length).filter((x) => x.l === level).map((word) => ({ word, dir: 'p', kind: 'newp' }))];
        }
        case 'level': {
            const pool = shuffle(content.words.filter((w) => w.l === level)).slice(0, size);
            return pool.map((word) => {
                const d = pickDir();
                return { word, dir: d, kind: prog.has(wKey(word.id, d)) ? 'review' : 'new' };
            });
        }
    }
}
function CardsSession({ ctx, mode, level, dirParam, ids }) {
    const t = useT();
    const { course } = ctx;
    const dir = dirParam ?? course.direction;
    const local = useRef(new Map(ctx.prog));
    const [queue, setQueue] = useState(() => buildQueue(ctx, mode, level, dir, ids).map((c, i) => ({ ...c, tries: 0, qid: i })));
    const [pos, setPos] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [reveal, setReveal] = useState(false); // after a wrong answer: show the answer, wait for "Continue"
    const [tally, setTally] = useState({ answers: 0, correct: 0, learned: 0, known: 0 });
    const [missed, setMissed] = useState([]);
    const elapsed = useStopwatch();
    const logged = useRef(false);
    const total = queue.length;
    const item = queue[pos];
    const done = pos >= total;
    const firstPass = new Set(queue.slice(0, pos).map((q) => q.qid)).size;
    // speak the target-language side when it becomes visible
    useEffect(() => {
        if (!item || !course.autoSpeak)
            return;
        const targetVisible = item.dir === 'r' ? true : flipped || course.showBoth || reveal;
        if (targetVisible && (item.dir === 'r' ? !flipped : true))
            say(item.word.t, course.target.tts, course.rate);
    }, [item?.qid, flipped, reveal]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!done || logged.current || tally.answers === 0)
            return;
        logged.current = true;
        logActivity(course.id, { answers: tally.answers, correct: tally.correct, learned: tally.learned, seconds: elapsed() });
    }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const onKey = (e) => {
            if (done)
                return;
            if (e.key === 'ArrowRight')
                answer(true);
            else if (e.key === 'ArrowLeft')
                answer(false);
            else if (e.key === ' ') {
                e.preventDefault();
                setFlipped((f) => !f);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });
    const advance = () => { setFlipped(false); setReveal(false); setPos((p) => p + 1); };
    const answer = (ok) => {
        if (!item || reveal)
            return;
        const m = local.current;
        const rows = [];
        const k = wKey(item.word.id, item.dir);
        const prev = m.get(k);
        let learnedNow = 0;
        if (item.kind === 'new' && !prev) {
            if (ok) {
                rows.push(markKnownCard(m.get(wKey(item.word.id, 'r')), course.id, wKey(item.word.id, 'r')));
                // producing it implies recognising it; recognising doesn't imply producing
                if (item.dir === 'p')
                    rows.push(markKnownCard(m.get(k), course.id, k));
            }
            else {
                const row = gradeCard(undefined, course.id, k, false);
                rows.push({ ...row, miss: false, lw: undefined });
                learnedNow = 1;
            }
        }
        else if (item.kind === 'newp' && !prev) {
            const row = gradeCard(undefined, course.id, k, ok, { firstSight: true });
            rows.push(ok ? row : { ...row, miss: false, lw: undefined });
        }
        else {
            rows.push(gradeCard(prev, course.id, k, ok));
        }
        for (const r of rows)
            m.set(r.key, r);
        saveCards(rows);
        setTally((x) => ({ answers: x.answers + 1, correct: x.correct + (ok ? 1 : 0), learned: x.learned + learnedNow, known: x.known + (ok && item.kind === 'new' ? 1 : 0) }));
        if (!ok) {
            if (!missed.includes(item.word.id))
                setMissed((x) => [...x, item.word.id]);
            if (item.tries < 3)
                setQueue((q) => { const nq = [...q]; nq.splice(Math.min(nq.length, pos + 4), 0, { ...item, kind: 'review', tries: item.tries + 1 }); return nq; });
            setFlipped(true);
            setReveal(true);
            return;
        }
        advance();
    };
    if (done) {
        const pct = tally.answers ? Math.round((tally.correct / tally.answers) * 100) : 0;
        return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.roundDone'), backTo: `/lang/${course.id}` }), total === 0 ? (_jsxs("div", { className: "card lang-result", children: [_jsx("div", { className: "bold", children: t('lang.nothingHere') }), _jsx("div", { className: "small muted", children: t('lang.nothingHereText') })] })) : (_jsxs("div", { className: "card lang-result", children: [_jsxs("div", { className: "result-big", children: [pct, "%"] }), _jsx("div", { className: "muted", children: t('lang.resultLine', { answers: tally.answers, correct: tally.correct }) }), _jsxs("div", { className: "lang-result-stats", children: [_jsxs("div", { children: [_jsx("b", { children: tally.learned }), _jsx("span", { children: t('lang.learnedNew') })] }), _jsxs("div", { children: [_jsx("b", { children: tally.known }), _jsx("span", { children: t('lang.alreadyKnew') })] }), _jsxs("div", { children: [_jsx("b", { children: missed.length }), _jsx("span", { children: t('lang.toFixLater') })] })] })] })), missed.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-label mt-lg", children: t('lang.missedWords') }), _jsx("div", { className: "card card-flush", children: missed.map((id) => {
                                const w = ctx.content.wordById.get(id);
                                return (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: w.t }), _jsx("div", { className: "row-sub", children: w.s })] }), _jsx(SpeakButton, { text: w.t, tag: course.target.tts, rate: course.rate })] }, id));
                            }) })] })), _jsxs("div", { className: "stack mt-lg", children: [_jsx(Button, { variant: "lingua", full: true, icon: _jsx(IconRepeat, { size: 18 }), onClick: () => navigate(`/lang/${course.id}/cards?mode=${mode}&level=${level}&dir=${dir}&r=${Date.now()}`, { replace: true }), children: t('lang.anotherRound') }), missed.length > 0 && _jsx(Button, { variant: "secondary", full: true, onClick: () => navigate(`/lang/${course.id}/cards?mode=review&dir=${dir}&ids=${missed.join(',')}&r=${Date.now()}`, { replace: true }), children: t('lang.drillMissed') }), _jsx(Button, { variant: "ghost", full: true, onClick: () => navigate(`/lang/${course.id}`, { replace: true }), children: t('common.done') })] })] }));
    }
    const w = item.word;
    const pos_ = posLabel(t, w.pos);
    const target = (_jsxs("div", { className: "face-target", children: [_jsx("div", { className: "face-word", children: w.t }), _jsx(SpeakButton, { text: w.t, tag: course.target.tts, rate: course.rate, size: 22 })] }));
    const meaning = _jsx("div", { className: "face-meaning", children: w.s });
    const details = (_jsxs("div", { className: "face-details", children: [w.info && _jsx("div", { className: "face-info", children: w.info }), w.ex && (_jsxs("div", { className: "face-ex", children: [_jsxs("div", { className: "hstack", style: { gap: 6, alignItems: 'flex-start' }, children: [_jsx("span", { className: "flex1", children: w.ex }), _jsx(SpeakButton, { text: w.ex, tag: course.target.tts, rate: course.rate, size: 16 })] }), w.exs && _jsx("div", { className: "muted", children: w.exs })] }))] }));
    const meta = (_jsxs("div", { className: "face-meta", children: [_jsx(LevelTag, { level: w.l }), pos_ && _jsx("span", { children: pos_ }), item.kind === 'new' && _jsx("span", { className: "new-pill", children: t('lang.new') }), item.kind === 'newp' && _jsx("span", { className: "new-pill", children: t('lang.sayIt') }), item.kind === 'mistake' && _jsx("span", { className: "miss-pill", children: t('lang.mistake') })] }));
    const front = item.dir === 'r'
        ? _jsxs(_Fragment, { children: [meta, target, _jsx("div", { className: "face-q", children: t('lang.qMeaning') })] })
        : _jsxs(_Fragment, { children: [meta, meaning, _jsx("div", { className: "face-q", children: t('lang.qSay', { lang: course.title }) })] });
    const back = item.dir === 'r' ? _jsxs(_Fragment, { children: [_jsx("div", { className: "face-word small-word", children: w.t }), meaning, details] }) : _jsxs(_Fragment, { children: [target, details] });
    const isNew = item.kind === 'new';
    return (_jsxs(Screen, { className: "screen-no-tabs lingua cards-screen", children: [_jsx(TopBar, { title: `${Math.min(firstPass + 1, total)} / ${total}`, eyebrow: course.title, onBack: () => navigate(`/lang/${course.id}`, { replace: true }) }), _jsx(Progress, { value: pos, max: total, color: "var(--lingua)", height: 6 }), _jsx(SwipeCard, { front: front, back: back, showBoth: course.showBoth, flipped: flipped, onFlip: () => setFlipped((f) => !f), onAnswer: answer, disabled: reveal, hintLeft: isNew ? t('lang.learnIt') : t('lang.dontKnow'), hintRight: isNew ? t('lang.iKnowIt') : t('lang.know') }), reveal ? (_jsx("div", { className: "card-actions", children: _jsx(Button, { variant: "lingua", full: true, size: "lg", onClick: advance, children: t('lang.continue') }) })) : (_jsxs("div", { className: "card-actions", children: [_jsx("button", { type: "button", className: "round-btn no", "aria-label": t('lang.dontKnow'), onClick: () => answer(false), children: _jsx(IconClose, { size: 26 }) }), !course.showBoth && _jsx("button", { type: "button", className: "flip-btn", onClick: () => setFlipped((f) => !f), children: flipped ? t('lang.front') : t('lang.flip') }), _jsx("button", { type: "button", className: "round-btn yes", "aria-label": t('lang.know'), onClick: () => answer(true), children: _jsx(IconCheck, { size: 26 }) })] })), _jsx("div", { className: "small muted center", children: isNew ? t('lang.newHelp') : t('lang.swipeShort') })] }));
}
