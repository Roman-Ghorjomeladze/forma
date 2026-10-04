import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Multiple-choice quiz: meaning, reverse (pick the foreign word) or listening. Tap only.
import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { focusLevel, gradeCard, logActivity, saveCards, shuffle, vocabStats, wKey } from '../../lib/lingua.js';
import { todayKey } from '../../lib/dates.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Progress, Screen, Segmented, TopBar } from '../../ui/components.js';
import { IconRepeat } from '../../ui/icons.js';
import { isCtx, LevelTag, posLabel, SpeakButton, useLingua, useStopwatch } from './lingua-ui.js';
export function LinguaQuizScreen({ cid }) {
    const ctx = useLingua(cid);
    const route = useRoute();
    if (!isCtx(ctx))
        return ctx;
    return _jsx(QuizSession, { ctx: ctx, initial: route.query.get('mode') || 'meaning' }, route.query.toString());
}
function buildQuiz(ctx, n = 12) {
    const { content, prog } = ctx;
    const today = todayKey();
    // words you've met (due ones first), topped up with the focus level
    const met = content.words.filter((w) => prog.has(wKey(w.id, 'r')) || prog.has(wKey(w.id, 'p')));
    const due = met.filter((w) => [wKey(w.id, 'r'), wKey(w.id, 'p')].some((k) => (prog.get(k)?.due ?? '9') <= today));
    const focus = focusLevel(content, vocabStats(content, prog), prog);
    const lvl = shuffle(content.words.filter((w) => w.l === focus)).slice(0, 60);
    const pool = [];
    for (const w of [...shuffle(due), ...shuffle(met), ...lvl]) {
        if (!pool.includes(w))
            pool.push(w);
        if (pool.length >= n)
            break;
    }
    return pool.map((word) => {
        const meaning = word.s.toLowerCase();
        const same = content.words.filter((x) => x.id !== word.id && x.pos === word.pos && x.s.toLowerCase() !== meaning && Math.abs(x.rank - word.rank) < 1500);
        const others = shuffle(same.length >= 3 ? same : content.words.filter((x) => x.id !== word.id)).slice(0, 3);
        return { word, options: shuffle([word, ...others]) };
    });
}
function QuizSession({ ctx, initial }) {
    const t = useT();
    const { course } = ctx;
    const [mode, setMode] = useState(initial);
    const [qs, setQs] = useState(() => buildQuiz(ctx));
    const [i, setI] = useState(0);
    const [picked, setPicked] = useState(null);
    const [wrong, setWrong] = useState([]);
    const [score, setScore] = useState(0);
    const local = useRef(new Map(ctx.prog));
    const elapsed = useStopwatch();
    const logged = useRef(false);
    const q = qs[i];
    const done = i >= qs.length;
    const started = i > 0 || picked !== null;
    useEffect(() => { if (q && mode === 'listen')
        say(q.word.t, course.target.tts, course.rate); }, [i, mode]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (done && !logged.current && qs.length) {
            logged.current = true;
            logActivity(course.id, { answers: qs.length, correct: score, seconds: elapsed() });
        }
    }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
    const pick = (w) => {
        if (picked)
            return;
        setPicked(w.id);
        const ok = w.id === q.word.id;
        if (ok)
            setScore((s) => s + 1);
        else
            setWrong((x) => [...x, q.word]);
        if (mode !== 'listen')
            say(q.word.t, course.target.tts, course.rate);
        // Only touch the schedule when it matters: a miss always, a hit only if the card was due.
        const dir = mode === 'reverse' ? 'p' : 'r';
        const key = wKey(q.word.id, dir);
        const prev = local.current.get(key);
        if (!ok || (prev && prev.due <= todayKey())) {
            const row = gradeCard(prev, course.id, key, ok);
            const fixed = !prev && !ok ? { ...row, miss: false, lw: undefined } : row; // unseen word → just start learning it
            local.current.set(key, fixed);
            saveCards([fixed]);
        }
    };
    const next = () => { setPicked(null); setI((x) => x + 1); };
    if (done) {
        return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.roundDone'), backTo: `/lang/${course.id}` }), _jsxs("div", { className: "card lang-result", children: [_jsxs("div", { className: "result-big", children: [score, "/", qs.length] }), _jsx("div", { className: "muted", children: t(`lang.quizMode.${mode}`) })] }), wrong.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-label mt-lg", children: t('lang.missedWords') }), _jsx("div", { className: "card card-flush", children: wrong.map((w) => (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: w.t }), _jsx("div", { className: "row-sub", children: w.s })] }), _jsx(SpeakButton, { text: w.t, tag: course.target.tts, rate: course.rate })] }, w.id))) })] })), _jsxs("div", { className: "stack mt-lg", children: [_jsx(Button, { variant: "lingua", full: true, icon: _jsx(IconRepeat, { size: 18 }), onClick: () => { setQs(buildQuiz(ctx)); setI(0); setPicked(null); setWrong([]); setScore(0); logged.current = false; }, children: t('lang.anotherRound') }), _jsx(Button, { variant: "ghost", full: true, onClick: () => navigate(`/lang/${course.id}`, { replace: true }), children: t('common.done') })] })] }));
    }
    if (!q)
        return null;
    const label = (w) => (mode === 'reverse' ? w.t : w.s);
    return (_jsxs(Screen, { className: "screen-no-tabs lingua quiz-screen", children: [_jsx(TopBar, { title: `${i + 1} / ${qs.length}`, eyebrow: t('lang.quiz'), onBack: () => navigate(`/lang/${course.id}`, { replace: true }) }), !started && (_jsx(Segmented, { value: mode, onChange: setMode, options: [{ value: 'meaning', label: t('lang.quizMode.meaning') }, { value: 'reverse', label: t('lang.quizMode.reverse') }, { value: 'listen', label: t('lang.quizMode.listen') }] })), _jsx(Progress, { value: i, max: qs.length, color: "var(--lingua)", height: 6 }), _jsxs("div", { className: "quiz-q", children: [_jsxs("div", { className: "face-meta", children: [_jsx(LevelTag, { level: q.word.l }), posLabel(t, q.word.pos) && _jsx("span", { children: posLabel(t, q.word.pos) })] }), mode === 'meaning' && _jsx("div", { className: "face-word", children: q.word.t }), mode === 'reverse' && _jsx("div", { className: "face-meaning", children: q.word.s }), mode === 'listen' && _jsxs("div", { className: "hstack", style: { justifyContent: 'center' }, children: [_jsx(SpeakButton, { text: q.word.t, tag: course.target.tts, rate: course.rate, size: 30, className: "big" }), _jsx(SpeakButton, { text: q.word.t, tag: course.target.tts, rate: course.rate * 0.7, label: t('lang.slow') })] }), picked && mode === 'listen' && _jsx("div", { className: "face-word small-word", children: q.word.t })] }), _jsx("div", { className: "quiz-options", children: q.options.map((o) => {
                    const state = !picked ? '' : o.id === q.word.id ? 'right' : o.id === picked ? 'wrong' : 'dim';
                    return _jsx("button", { type: "button", className: `quiz-opt ${state}`, onClick: () => pick(o), children: label(o) }, o.id);
                }) }), picked && (_jsxs(_Fragment, { children: [q.word.ex && _jsxs("div", { className: "small muted quiz-ex", children: [q.word.ex, q.word.exs ? ` — ${q.word.exs}` : ''] }), _jsx(Button, { variant: "lingua", full: true, size: "lg", className: "mt", onClick: next, children: t('lang.continue') })] }))] }));
}
