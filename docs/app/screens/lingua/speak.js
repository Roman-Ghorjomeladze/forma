import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Speaking trainer: see the meaning, say the sentence aloud, reveal, compare, grade yourself.
// If the browser offers speech recognition, a mic button shows what it heard.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { hush, say } from '../../lib/lingua-speech.js';
import { focusLevel, gradeCard, LEVELS, logActivity, norm, phrasesOfTheDay, saveCards, sentenceQueue, tilesOf, vocabStats } from '../../lib/lingua.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Chip, Progress, Screen, TopBar } from '../../ui/components.js';
import { IconMic, IconRepeat } from '../../ui/icons.js';
import { isCtx, LevelTag, SpeakButton, useLingua, useStopwatch } from './lingua-ui.js';
export function LinguaSpeakScreen({ cid }) {
    const ctx = useLingua(cid);
    const route = useRoute();
    if (!isCtx(ctx))
        return ctx;
    const daily = route.query.get('daily') === '1';
    if (!daily && !route.query.get('go'))
        return _jsx(SpeakSetup, { ctx: ctx });
    return _jsx(SpeakSession, { ctx: ctx, daily: daily, level: route.query.get('level') || 'all', dailyOnly: route.query.get('phrases') === '1', mistakes: route.query.get('mistakes') === '1' }, route.query.toString());
}
function SpeakSetup({ ctx }) {
    const t = useT();
    const { course, content, prog } = ctx;
    const focus = useMemo(() => focusLevel(content, vocabStats(content, prog), prog), [content, prog]);
    const [level, setLevel] = useState(focus);
    const [phrases, setPhrases] = useState(true);
    const levels = LEVELS.filter((l) => content.sentences.some((s) => s.l === l));
    const miss = content.sentences.filter((s) => prog.get(`sp:${s.id}`)?.miss).length;
    const go = (extra = '') => navigate(`/lang/${course.id}/speak?go=1&level=${level}${phrases ? '&phrases=1' : ''}${extra}`);
    return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.speak'), eyebrow: course.title, backTo: `/lang/${course.id}` }), _jsx("p", { className: "muted", children: t('lang.speakIntro', { lang: course.title }) }), _jsx("div", { className: "section-label mt-lg", children: t('lang.level') }), _jsxs("div", { className: "chips", children: [levels.map((l) => _jsx(Chip, { tone: "lingua", active: level === l, onClick: () => setLevel(l), children: l }, l)), _jsx(Chip, { tone: "lingua", active: level === 'all', onClick: () => setLevel('all'), children: t('lang.all') })] }), _jsx("div", { className: "section-label mt-lg", children: t('lang.what') }), _jsxs("div", { className: "chips", children: [_jsx(Chip, { tone: "lingua", active: phrases, onClick: () => setPhrases(true), children: t('lang.everydayPhrases') }), _jsx(Chip, { tone: "lingua", active: !phrases, onClick: () => setPhrases(false), children: t('lang.allSentences') })] }), _jsx(Button, { variant: "lingua", full: true, size: "lg", className: "mt-lg", onClick: () => go(), children: t('lang.start') }), _jsx(Button, { variant: "secondary", full: true, className: "mt", onClick: () => navigate(`/lang/${course.id}/speak?daily=1`), children: t('lang.phrasesToday') }), miss > 0 && _jsx(Button, { variant: "ghost", full: true, className: "mt", onClick: () => go('&mistakes=1'), children: t('lang.fixSentences', { n: miss }) })] }));
}
function useRecognizer(lang, onText, onEnd) {
    return useMemo(() => {
        const W = window;
        const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
        if (!Ctor)
            return null;
        let r = null;
        return {
            start() {
                try {
                    r = new Ctor();
                    r.lang = lang;
                    r.interimResults = true;
                    r.maxAlternatives = 1;
                    r.continuous = false;
                    r.onresult = (e) => { let s = ''; for (let i = 0; i < e.results.length; i++)
                        s += e.results[i][0].transcript; onText(s); };
                    r.onend = onEnd;
                    r.onerror = onEnd;
                    r.start();
                }
                catch {
                    onEnd();
                }
            },
            stop() { try {
                r?.stop();
            }
            catch { /* ignore */ } },
        };
    }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
}
function matchScore(heard, target) {
    const h = new Set(tilesOf(heard).map(norm));
    const words = tilesOf(target).map((w) => ({ w, ok: h.has(norm(w)) }));
    return { pct: words.length ? Math.round((words.filter((x) => x.ok).length / words.length) * 100) : 0, words };
}
function SpeakSession({ ctx, daily, level, dailyOnly, mistakes }) {
    const t = useT();
    const { course, content } = ctx;
    const local = useRef(new Map(ctx.prog));
    const [queue] = useState(() => {
        if (daily)
            return phrasesOfTheDay(content, ctx.prog, focusLevel(content, vocabStats(content, ctx.prog), ctx.prog));
        return sentenceQueue(content, ctx.prog, 'sp', level, 10, { mistakesOnly: mistakes, dailyOnly });
    });
    const [i, setI] = useState(0);
    const [shown, setShown] = useState(false);
    const [heard, setHeard] = useState('');
    const [listening, setListening] = useState(false);
    const [tally, setTally] = useState({ n: 0, ok: 0 });
    const elapsed = useStopwatch();
    const logged = useRef(false);
    const rec = useRecognizer(course.target.tts, setHeard, () => setListening(false));
    const s = queue[i];
    const done = i >= queue.length;
    useEffect(() => () => { hush(); rec?.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (done && !logged.current && tally.n) {
            logged.current = true;
            logActivity(course.id, { answers: tally.n, correct: tally.ok, sentences: tally.n, seconds: elapsed() });
        }
    }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
    const reveal = () => { rec?.stop(); setShown(true); say(s.t, course.target.tts, course.rate); };
    const grade = (ok) => {
        const key = `sp:${s.id}`;
        const row = gradeCard(local.current.get(key), course.id, key, ok);
        local.current.set(key, row);
        saveCards([row]);
        setTally((x) => ({ n: x.n + 1, ok: x.ok + (ok ? 1 : 0) }));
        setShown(false);
        setHeard('');
        setI((x) => x + 1);
    };
    if (done) {
        return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.roundDone'), backTo: `/lang/${course.id}` }), queue.length === 0 ? _jsx("div", { className: "card lang-result", children: _jsx("div", { className: "bold", children: t('lang.nothingHere') }) }) : (_jsxs("div", { className: "card lang-result", children: [_jsxs("div", { className: "result-big", children: [tally.ok, "/", tally.n] }), _jsx("div", { className: "muted", children: t('lang.speakDone') })] })), _jsxs("div", { className: "stack mt-lg", children: [!daily && _jsx(Button, { variant: "lingua", full: true, icon: _jsx(IconRepeat, { size: 18 }), onClick: () => navigate(`/lang/${course.id}/speak?go=1&level=${level}${dailyOnly ? '&phrases=1' : ''}&r=${Date.now()}`, { replace: true }), children: t('lang.anotherRound') }), _jsx(Button, { variant: daily ? 'lingua' : 'ghost', full: true, onClick: () => navigate(`/lang/${course.id}`, { replace: true }), children: t('common.done') })] })] }));
    }
    const score = heard ? matchScore(heard, s.t) : null;
    return (_jsxs(Screen, { className: "screen-no-tabs lingua speak-screen", children: [_jsx(TopBar, { title: `${i + 1} / ${queue.length}`, eyebrow: daily ? t('lang.phrasesToday') : t('lang.speak'), onBack: () => navigate(`/lang/${course.id}`, { replace: true }) }), _jsx(Progress, { value: i, max: queue.length, color: "var(--lingua)", height: 6 }), _jsxs("div", { className: "speak-card", children: [_jsxs("div", { className: "face-meta", children: [_jsx(LevelTag, { level: s.l }), s.tp && _jsx("span", { children: t(`lang.topic.${s.tp}`) })] }), _jsx("div", { className: "speak-source", children: s.s }), _jsx("div", { className: "face-q", children: t('lang.sayAloud', { lang: course.title }) }), rec && !shown && (_jsxs("button", { type: "button", className: `mic-btn ${listening ? 'on' : ''}`, onClick: () => { if (listening) {
                            rec.stop();
                        }
                        else {
                            setHeard('');
                            setListening(true);
                            rec.start();
                        } }, children: [_jsx(IconMic, { size: 26 }), _jsx("span", { children: listening ? t('lang.listening') : t('lang.tapToSpeak') })] })), heard && !shown && _jsxs("div", { className: "heard", children: ["\u201C", heard, "\u201D"] }), shown && (_jsxs("div", { className: "speak-answer", children: [_jsxs("div", { className: "hstack", style: { gap: 8 }, children: [_jsx("div", { className: "flex1 speak-target", children: score ? score.words.map((x, k) => _jsxs("span", { className: x.ok ? 'w-ok' : 'w-miss', children: [x.w, " "] }, k)) : s.t }), _jsx(SpeakButton, { text: s.t, tag: course.target.tts, rate: course.rate, size: 22 }), _jsx(SpeakButton, { text: s.t, tag: course.target.tts, rate: course.rate * 0.7, size: 16, label: t('lang.slow') })] }), score && _jsxs("div", { className: "small muted", children: [t('lang.heardScore', { pct: score.pct }), " \u00B7 \u201C", heard, "\u201D"] }), _jsx("div", { className: "small muted", children: t('lang.shadowTip') })] }))] }), _jsx("div", { className: "build-actions", children: !shown ? _jsx(Button, { variant: "lingua", full: true, size: "lg", onClick: reveal, children: t('lang.reveal') }) : _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", className: "flex1", onClick: () => grade(false), children: t('lang.missedSomething') }), _jsx(Button, { variant: "lingua", className: "flex1", onClick: () => grade(true), children: t('lang.saidIt') })] }) })] }));
}
