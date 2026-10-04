import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Placement: swipe ~60 words sampled across frequency bands, estimate your passive vocabulary,
// and optionally mark the bands you clearly know as known (they come back later as spot checks).
import { useMemo, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { gradeCard, markKnownCard, placementBands, saveCards, shuffle, wKey } from '../../lib/lingua.js';
import { navigate } from '../../lib/router.js';
import { Button, Progress, Screen, TopBar } from '../../ui/components.js';
import { IconCheck, IconClose } from '../../ui/icons.js';
import { isCtx, SwipeCard, useLingua } from './lingua-ui.js';
import { toast } from '../../ui/dialogs.js';
const PER_BAND = 8;
const PASS = 0.75;
export function LinguaPlacementScreen({ cid }) {
    const ctx = useLingua(cid);
    if (!isCtx(ctx))
        return ctx;
    return _jsx(Placement, { ctx: ctx });
}
function Placement({ ctx }) {
    const t = useT();
    const { course, content, prog } = ctx;
    const ranked = useMemo(() => content.words.filter((w) => !w.user).sort((a, b) => a.rank - b.rank), [content]);
    const bands = useMemo(() => placementBands(ranked.length), [ranked.length]);
    const [sample] = useState(() => bands.flatMap((b, bi) => shuffle(ranked.slice(b.from, b.to)).slice(0, PER_BAND).map((w) => ({ w, band: bi }))));
    const [i, setI] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [answers, setAnswers] = useState({});
    const [started, setStarted] = useState(false);
    const [applied, setApplied] = useState(false);
    const done = i >= sample.length;
    const answer = (ok) => {
        const s = sample[i];
        setAnswers((a) => ({ ...a, [s.w.id]: ok }));
        setFlipped(false);
        setI((x) => x + 1);
    };
    const result = useMemo(() => {
        const per = bands.map((b, bi) => {
            const xs = sample.filter((s) => s.band === bi);
            const known = xs.filter((s) => answers[s.w.id]).length;
            return { band: b, pct: xs.length ? known / xs.length : 0 };
        });
        const estimate = Math.round(per.reduce((sum, p) => sum + (p.band.to - p.band.from) * p.pct, 0));
        let upTo = 0;
        for (const p of per) {
            if (p.pct >= PASS)
                upTo = p.band.to;
            else
                break;
        }
        return { per, estimate, upTo };
    }, [answers, bands, sample]);
    const apply = async (markBands) => {
        const rows = [];
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const unknown = new Set(sample.filter((s) => answers[s.w.id] === false).map((s) => s.w.id));
        const known = new Set(sample.filter((s) => answers[s.w.id]).map((s) => s.w.id));
        if (markBands)
            for (const w of ranked.slice(0, result.upTo))
                if (!unknown.has(w.id))
                    known.add(w.id);
        for (const id of known) {
            const k = wKey(id, 'r');
            if (prog.get(k)?.state === 'known')
                continue;
            rows.push(markKnownCard(prog.get(k), course.id, k, todayKey, 14, 90));
        }
        for (const id of unknown) {
            const k = wKey(id, 'r');
            if (!prog.has(k))
                rows.push({ ...gradeCard(undefined, course.id, k, false), miss: false, lw: undefined });
        }
        await saveCards(rows);
        setApplied(true);
        toast(t('lang.placementSaved', { n: known.size }));
    };
    if (!started) {
        return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.placement'), eyebrow: course.title, backTo: `/lang/${course.id}` }), _jsxs("div", { className: "card stack", children: [_jsx("p", { children: t('lang.placementIntro', { n: sample.length }) }), _jsx("p", { className: "small muted", children: t('lang.placementHonest') })] }), _jsx(Button, { variant: "lingua", full: true, size: "lg", className: "mt-lg", onClick: () => setStarted(true), children: t('lang.start') })] }));
    }
    if (done) {
        return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.placementResult'), backTo: `/lang/${course.id}` }), _jsxs("div", { className: "card lang-result", children: [_jsxs("div", { className: "result-big", children: ["~", result.estimate.toLocaleString()] }), _jsx("div", { className: "muted", children: t('lang.placementEstimate') })] }), _jsx("div", { className: "card mt", children: result.per.map((p, k) => (_jsxs("div", { className: "band-row", children: [_jsx("span", { className: "small muted band-label", children: t('lang.bandLabel', { from: p.band.from + 1, to: p.band.to }) }), _jsx("div", { className: "band-bar", children: _jsx("span", { style: { width: `${p.pct * 100}%`, background: p.pct >= PASS ? 'var(--meals)' : 'var(--lingua)' } }) }), _jsxs("span", { className: "small num", children: [Math.round(p.pct * 100), "%"] })] }, k))) }), !applied ? (_jsxs("div", { className: "stack mt-lg", children: [result.upTo > 0 && _jsx(Button, { variant: "lingua", full: true, onClick: () => apply(true), children: t('lang.markBands', { n: result.upTo.toLocaleString() }) }), _jsx(Button, { variant: result.upTo > 0 ? 'secondary' : 'lingua', full: true, onClick: () => apply(false), children: t('lang.markSampleOnly') }), _jsx("p", { className: "small muted", children: t('lang.markBandsHint') })] })) : (_jsx(Button, { variant: "lingua", full: true, className: "mt-lg", onClick: () => navigate(`/lang/${course.id}`, { replace: true }), children: t('lang.toCourse') }))] }));
    }
    const s = sample[i];
    return (_jsxs(Screen, { className: "screen-no-tabs lingua cards-screen", children: [_jsx(TopBar, { title: `${i + 1} / ${sample.length}`, eyebrow: t('lang.placement'), onBack: () => navigate(`/lang/${course.id}`, { replace: true }) }), _jsx(Progress, { value: i, max: sample.length, color: "var(--lingua)", height: 6 }), _jsx(SwipeCard, { showBoth: false, flipped: flipped, onFlip: () => setFlipped((f) => { if (!f && course.autoSpeak)
                    say(s.w.t, course.target.tts, course.rate); return !f; }), onAnswer: answer, hintLeft: t('lang.dontKnow'), hintRight: t('lang.iKnowIt'), front: _jsxs(_Fragment, { children: [_jsx("div", { className: "face-word", children: s.w.t }), _jsx("div", { className: "face-q", children: t('lang.placementQ') })] }), back: _jsxs(_Fragment, { children: [_jsx("div", { className: "face-word small-word", children: s.w.t }), _jsx("div", { className: "face-meaning", children: s.w.s })] }) }, s.w.id), _jsxs("div", { className: "card-actions", children: [_jsx("button", { type: "button", className: "round-btn no", "aria-label": t('lang.dontKnow'), onClick: () => answer(false), children: _jsx(IconClose, { size: 26 }) }), _jsx("button", { type: "button", className: "flip-btn", onClick: () => setFlipped((f) => !f), children: t('lang.checkMeaning') }), _jsx("button", { type: "button", className: "round-btn yes", "aria-label": t('lang.iKnowIt'), onClick: () => answer(true), children: _jsx(IconCheck, { size: 26 }) })] })] }));
}
