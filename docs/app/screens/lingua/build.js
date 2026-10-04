import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Sentence builder: read (or hear) the meaning, build the sentence from word tiles — no keyboard.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { focusLevel, gradeCard, LEVELS, logActivity, saveCards, sameBag, sameSequence, sentenceQueue, tilesOf, vocabStats } from '../../lib/lingua.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Chip, Progress, Screen, Toggle, TopBar } from '../../ui/components.js';
import { IconEar, IconRepeat } from '../../ui/icons.js';
import { isCtx, LevelTag, makeTiles, SpeakButton, TileBuilder, useLingua, useStopwatch } from './lingua-ui.js';
export function LinguaBuildScreen({ cid }) {
    const ctx = useLingua(cid);
    const route = useRoute();
    if (!isCtx(ctx))
        return ctx;
    if (!route.query.get('go'))
        return _jsx(BuildSetup, { ctx: ctx });
    return _jsx(BuildSession, { ctx: ctx, level: route.query.get('level') || 'all', listen: route.query.get('listen') === '1', mistakes: route.query.get('mistakes') === '1' }, route.query.toString());
}
function BuildSetup({ ctx }) {
    const t = useT();
    const { course, content, prog } = ctx;
    const focus = useMemo(() => focusLevel(content, vocabStats(content, prog), prog), [content, prog]);
    const [level, setLevel] = useState(focus);
    const [listen, setListen] = useState(false);
    const levels = LEVELS.filter((l) => content.sentences.some((s) => s.l === l));
    const count = (l) => content.sentences.filter((s) => l === 'all' || s.l === l).length;
    const seen = (l) => content.sentences.filter((s) => (l === 'all' || s.l === l) && prog.get(`s:${s.id}`)?.reps).length;
    const miss = content.sentences.filter((s) => prog.get(`s:${s.id}`)?.miss).length;
    const go = (extra = '') => navigate(`/lang/${course.id}/build?go=1&level=${level}${listen ? '&listen=1' : ''}${extra}`);
    return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.build'), eyebrow: course.title, backTo: `/lang/${course.id}` }), _jsx("p", { className: "muted", children: t('lang.buildIntro', { lang: course.title }) }), _jsx("div", { className: "section-label mt-lg", children: t('lang.level') }), _jsxs("div", { className: "chips", children: [levels.map((l) => _jsxs(Chip, { tone: "lingua", active: level === l, onClick: () => setLevel(l), children: [l, " \u00B7 ", seen(l), "/", count(l)] }, l)), _jsx(Chip, { tone: "lingua", active: level === 'all', onClick: () => setLevel('all'), children: t('lang.all') })] }), _jsxs("div", { className: "card mt hstack", children: [_jsx(IconEar, { className: "c-lingua" }), _jsxs("div", { className: "flex1", children: [_jsx("div", { className: "bold", children: t('lang.listenMode') }), _jsx("div", { className: "small muted", children: t('lang.listenModeSub') })] }), _jsx(Toggle, { checked: listen, onChange: setListen })] }), _jsx(Button, { variant: "lingua", full: true, size: "lg", className: "mt-lg", onClick: () => go(), children: t('lang.start') }), miss > 0 && _jsx(Button, { variant: "secondary", full: true, className: "mt", onClick: () => go('&mistakes=1'), children: t('lang.fixSentences', { n: miss }) })] }));
}
function distractorsFor(s, pool) {
    if (s.d && s.d.length)
        return s.d.slice(0, 3);
    // fall back to one word from another sentence of the same level
    const others = pool.filter((x) => x.id !== s.id && x.l === s.l);
    const words = tilesOf(s.t).map((w) => w.toLowerCase());
    const o = others[Math.floor(Math.random() * Math.max(1, others.length))];
    const cand = o ? tilesOf(o.t).filter((w) => !words.includes(w.toLowerCase()) && w.length > 2) : [];
    return cand.length ? [cand[Math.floor(Math.random() * cand.length)]] : [];
}
function BuildSession({ ctx, level, listen, mistakes }) {
    const t = useT();
    const { course, content } = ctx;
    const local = useRef(new Map(ctx.prog));
    const [queue, setQueue] = useState(() => sentenceQueue(content, ctx.prog, 's', level, 10, { mistakesOnly: mistakes })
        .map((s) => ({ s, tiles: makeTiles(tilesOf(s.t), distractorsFor(s, content.sentences)), again: false })));
    const [i, setI] = useState(0);
    const [picked, setPicked] = useState([]);
    const [result, setResult] = useState(null);
    const [tally, setTally] = useState({ n: 0, ok: 0 });
    const elapsed = useStopwatch();
    const logged = useRef(false);
    const q = queue[i];
    const done = i >= queue.length;
    useEffect(() => { if (q && listen)
        say(q.s.t, course.target.tts, course.rate); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (done && !logged.current && tally.n) {
            logged.current = true;
            logActivity(course.id, { answers: tally.n, correct: tally.ok, sentences: tally.n, seconds: elapsed() });
        }
    }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
    const record = (ok) => {
        const key = `s:${q.s.id}`;
        const row = gradeCard(local.current.get(key), course.id, key, ok);
        local.current.set(key, row);
        saveCards([row]);
        setTally((x) => ({ n: x.n + 1, ok: x.ok + (ok ? 1 : 0) }));
        if (!ok && !q.again)
            setQueue((qq) => [...qq, { s: q.s, tiles: makeTiles(tilesOf(q.s.t), distractorsFor(q.s, content.sentences)), again: true }]);
    };
    const check = () => {
        const answer = picked.map((id) => q.tiles.find((x) => x.id === id).text);
        const correct = tilesOf(q.s.t);
        if (sameSequence(answer, correct)) {
            setResult('right');
            record(true);
            say(q.s.t, course.target.tts, course.rate);
        }
        else if (sameBag(answer, correct))
            setResult('close');
        else {
            setResult('wrong');
            record(false);
            say(q.s.t, course.target.tts, course.rate);
        }
    };
    const acceptClose = (ok) => { setResult(ok ? 'right' : 'wrong'); record(ok); say(q.s.t, course.target.tts, course.rate); };
    const next = () => { setPicked([]); setResult(null); setI((x) => x + 1); };
    if (done) {
        return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.roundDone'), backTo: `/lang/${course.id}` }), queue.length === 0 ? _jsxs("div", { className: "card lang-result", children: [_jsx("div", { className: "bold", children: t('lang.nothingHere') }), _jsx("div", { className: "small muted", children: t('lang.nothingHereText') })] }) : (_jsxs("div", { className: "card lang-result", children: [_jsxs("div", { className: "result-big", children: [tally.n ? Math.round((tally.ok / tally.n) * 100) : 0, "%"] }), _jsx("div", { className: "muted", children: t('lang.resultLine', { answers: tally.n, correct: tally.ok }) })] })), _jsxs("div", { className: "stack mt-lg", children: [_jsx(Button, { variant: "lingua", full: true, icon: _jsx(IconRepeat, { size: 18 }), onClick: () => navigate(`/lang/${course.id}/build?go=1&level=${level}${listen ? '&listen=1' : ''}&r=${Date.now()}`, { replace: true }), children: t('lang.anotherRound') }), _jsx(Button, { variant: "ghost", full: true, onClick: () => navigate(`/lang/${course.id}`, { replace: true }), children: t('common.done') })] })] }));
    }
    const unit = q.s.g ? content.unitById.get(q.s.g) : undefined;
    return (_jsxs(Screen, { className: "screen-no-tabs lingua build-screen", children: [_jsx(TopBar, { title: `${Math.min(i + 1, queue.length)} / ${queue.length}`, eyebrow: t('lang.build'), onBack: () => navigate(`/lang/${course.id}`, { replace: true }) }), _jsx(Progress, { value: i, max: queue.length, color: "var(--lingua)", height: 6 }), _jsxs("div", { className: "build-prompt", children: [_jsxs("div", { className: "face-meta", children: [_jsx(LevelTag, { level: q.s.l }), q.again && _jsx("span", { className: "miss-pill", children: t('lang.again') })] }), listen && !result ? (_jsxs("div", { className: "hstack", children: [_jsx(SpeakButton, { text: q.s.t, tag: course.target.tts, rate: course.rate, size: 26, className: "big" }), _jsx(SpeakButton, { text: q.s.t, tag: course.target.tts, rate: course.rate * 0.7, size: 18, label: t('lang.slow') }), _jsx("span", { className: "muted small", children: t('lang.listenAndBuild') })] })) : (_jsx("div", { className: "build-source", children: q.s.s })), _jsx("div", { className: "small muted", children: t('lang.buildIn', { lang: course.title }) })] }), _jsx(TileBuilder, { tiles: q.tiles, picked: picked, onChange: setPicked, locked: !!result, state: result ?? undefined }), result && (_jsxs("div", { className: `build-feedback ${result}`, children: [result === 'right' && _jsx("div", { className: "bold", children: t('lang.correct') }), result === 'wrong' && _jsx("div", { className: "bold", children: t('lang.notQuite') }), result === 'close' && _jsx("div", { className: "bold", children: t('lang.otherOrder') }), _jsxs("div", { className: "hstack", style: { gap: 8 }, children: [_jsx("div", { className: "flex1 feedback-sentence", children: q.s.t }), _jsx(SpeakButton, { text: q.s.t, tag: course.target.tts, rate: course.rate })] }), listen && _jsx("div", { className: "small muted", children: q.s.s }), result === 'close' && _jsx("div", { className: "small muted", children: t('lang.otherOrderText') }), unit && result !== 'right' && _jsx("button", { type: "button", className: "link-btn c-lingua small", onClick: () => navigate(`/lang/${course.id}/grammar/${unit.id}`), children: t('lang.reviewRule', { title: unit.title }) })] })), _jsxs("div", { className: "build-actions", children: [!result && _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setPicked([]), disabled: !picked.length, children: t('common.clear') }), _jsx(Button, { variant: "lingua", className: "flex1", onClick: check, disabled: !picked.length, children: t('lang.check') })] }), result === 'close' && _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", className: "flex1", onClick: () => acceptClose(false), children: t('lang.iWasWrong') }), _jsx(Button, { variant: "lingua", className: "flex1", onClick: () => acceptClose(true), children: t('lang.mineIsFine') })] }), (result === 'right' || result === 'wrong') && _jsx(Button, { variant: "lingua", full: true, size: "lg", onClick: next, children: t('lang.continue') })] })] }));
}
