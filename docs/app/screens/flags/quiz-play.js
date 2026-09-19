import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// One quiz round: questions one by one, then the results with a review list.
import { useEffect, useMemo, useRef, useState } from 'react';
import { put } from '../../lib/db.js';
import { bestScore, buildQuiz, capitalName, continentName, countryName, newResult, resultTitleKey } from '../../lib/flags.js';
import { useLang, useT } from '../../lib/i18n.js';
import { navigate, useRoute } from '../../lib/router.js';
import { useQuizResults } from '../../lib/queries.js';
import { Button, IconButton, Progress, Screen } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconCheck, IconChevron, IconClose, IconGlobe, IconPin, IconShuffle, IconStar } from '../../ui/icons.js';
import { Flag } from './flags-ui.js';
export function FlagsQuizPlayScreen() {
    const t = useT();
    const lang = useLang();
    const route = useRoute();
    const mode = route.query.get('mode') || 'flag';
    const continent = route.query.get('continent') || 'all';
    const results = useQuizResults();
    const [questions, setQuestions] = useState(null);
    const [i, setI] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [picked, setPicked] = useState(null);
    const [saved, setSaved] = useState(null);
    const started = useRef(false);
    useEffect(() => {
        if (!results || started.current)
            return;
        started.current = true;
        setQuestions(buildQuiz(mode, continent, results));
    }, [results, mode, continent]);
    const q = questions?.[i];
    const score = answers.filter((a) => a.correct).length;
    const done = questions !== null && i >= questions.length;
    useEffect(() => {
        if (!done || saved || !questions || !results)
            return;
        const prev = bestScore(results, mode, continent);
        const missed = answers.filter((a) => !a.correct).map((a) => a.q.answer.c);
        put('quizResults', newResult(mode, continent, score, questions.length, missed)).catch(() => { });
        setSaved({ newBest: !prev || score / questions.length > prev.score / prev.total, previousBest: prev ? prev.score : null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [done]);
    const pick = (c) => {
        if (!q || picked)
            return;
        setPicked(c);
        setAnswers((a) => [...a, { q, picked: c, correct: c.c === q.answer.c }]);
    };
    const next = () => { setPicked(null); setI((k) => k + 1); };
    const quit = async () => {
        if (done || answers.length === 0) {
            navigate('/flags/quiz', { replace: true });
            return;
        }
        const ok = await confirmDialog({ title: t('flags.quit'), message: t('flags.quitText'), confirmLabel: t('common.done'), danger: true });
        if (ok)
            navigate('/flags/quiz', { replace: true });
    };
    const again = () => { started.current = false; setQuestions(null); setI(0); setAnswers([]); setPicked(null); setSaved(null); setTimeout(() => { started.current = true; setQuestions(buildQuiz(mode, continent, results ?? [])); }, 0); };
    const label = useMemo(() => `${t(`flags.mode.${mode}`)} · ${continent === 'all' ? t('flags.all') : continentName(continent)}`, [t, mode, continent]);
    if (!questions)
        return _jsx(Screen, { className: "screen-no-tabs" });
    if (done) {
        const total = questions.length;
        return (_jsxs(Screen, { className: "screen-no-tabs flags quiz-results", children: [_jsxs("div", { className: "result-hero", children: [_jsx("div", { className: "result-ring", children: _jsxs("span", { className: "disp num", children: [score, _jsxs("small", { children: ["/", total] })] }) }), _jsx("div", { className: "title-large", style: { fontSize: 28 }, children: t(resultTitleKey(score, total)) }), _jsx("div", { className: "small muted", style: { textAlign: 'center' }, children: label }), _jsxs("div", { className: "tags", style: { justifyContent: 'center' }, children: [saved?.newBest && _jsxs("span", { className: "tag tag-pocket", children: [_jsx(IconStar, { size: 13 }), " ", t('flags.newBest')] }), saved && !saved.newBest && saved.previousBest !== null && _jsx("span", { className: "tag", children: t('flags.bestIs', { score: saved.previousBest, total }) })] })] }), _jsx("div", { className: "section-label", children: t('flags.review') }), _jsx("div", { className: "list", children: answers.map((a, k) => (_jsxs("button", { type: "button", className: "row row-tappable", onClick: () => navigate(`/flags?c=${a.q.answer.c}`), children: [_jsx(Flag, { country: a.q.answer, size: 48 }), _jsxs("span", { className: "row-main", children: [_jsx("span", { className: "row-title", children: countryName(a.q.answer, lang) }), _jsxs("span", { className: "row-sub", children: [mode === 'capital' ? capitalName(a.q.answer, lang) : continentName(a.q.answer.r), !a.correct && mode !== 'country' ? ` · ${mode === 'capital' ? capitalName(a.picked, lang) : countryName(a.picked, lang)} ✕` : ''] })] }), a.correct ? _jsx(IconCheck, { size: 20, className: "c-meals" }) : _jsx(IconClose, { size: 20, className: "c-danger" })] }, k))) }), _jsx("div", { className: "small muted mt", style: { textAlign: 'center' }, children: t('flags.reviewHint') }), _jsxs("div", { className: "stack mt-lg", children: [_jsx(Button, { variant: "flags", full: true, size: "lg", icon: _jsx(IconShuffle, { size: 18 }), onClick: again, children: t('flags.playAgain') }), _jsx(Button, { variant: "secondary", full: true, onClick: () => navigate('/flags/quiz', { replace: true }), children: t('flags.changeMode') }), _jsx(Button, { variant: "ghost", full: true, onClick: () => navigate('/flags', { replace: true }), children: t('flags.backToFlags') })] })] }));
    }
    if (!q)
        return null;
    const state = (c) => (!picked ? '' : c.c === q.answer.c ? 'right' : c.c === picked.c ? 'wrong' : 'dim');
    return (_jsxs(Screen, { className: "screen-no-tabs flags quiz", children: [_jsxs("div", { className: "quiz-head", children: [_jsx(IconButton, { label: t('common.close'), onClick: quit, children: _jsx(IconClose, { size: 18 }) }), _jsxs("div", { className: "quiz-progress", children: [_jsxs("div", { className: "spread small bold muted", children: [_jsx("span", { children: label }), _jsx("span", { className: "num", children: t('flags.ofTotal', { i: i + 1, n: questions.length }) })] }), _jsx(Progress, { value: i + (picked ? 1 : 0), max: questions.length, color: "var(--flags)", height: 6 })] }), _jsxs("span", { className: "tag tag-meals", children: [_jsx(IconCheck, { size: 13 }), " ", score] })] }), mode === 'flag' || mode === 'capital' ? (_jsxs("div", { className: "quiz-prompt", children: [_jsx(Flag, { country: q.answer, className: "flag-hero" }), mode === 'capital' && _jsx("div", { className: "title-large", style: { fontSize: 26, textAlign: 'center' }, children: countryName(q.answer, lang) }), _jsx("div", { className: "small muted bold", children: mode === 'flag' ? t('flags.q.flag') : t('flags.q.capital') })] })) : (_jsxs("div", { className: "quiz-prompt", children: [_jsx("div", { className: "small muted bold", children: t('flags.q.country') }), _jsx("div", { className: "title-large", style: { fontSize: 34, textAlign: 'center' }, children: countryName(q.answer, lang) }), _jsxs("span", { className: "tag tag-flags", children: [_jsx(IconGlobe, { size: 13 }), " ", continentName(q.answer.r)] })] })), mode === 'country' ? (_jsx("div", { className: "flag-options", children: q.options.map((c) => _jsx("button", { type: "button", className: `flag-opt ${state(c)}`, onClick: () => pick(c), disabled: !!picked, children: _jsx(Flag, { country: c }) }, c.c)) })) : (_jsx("div", { className: "stack", style: { gap: 10 }, children: q.options.map((c) => (_jsxs("button", { type: "button", className: `quiz-opt ${state(c)}`, onClick: () => pick(c), disabled: !!picked, children: [_jsx("span", { children: mode === 'capital' ? capitalName(c, lang) : countryName(c, lang) }), state(c) === 'right' && _jsx(IconCheck, { size: 18, className: "c-meals" }), state(c) === 'wrong' && _jsx(IconClose, { size: 18, className: "c-danger" })] }, c.c))) })), _jsx("div", { className: "quiz-foot", children: picked ? (_jsxs(_Fragment, { children: [mode === 'flag' && _jsxs("span", { className: "tag", children: [_jsx(IconPin, { size: 13 }), " ", capitalName(q.answer, lang)] }), mode === 'country' && _jsx("span", { className: `tag ${picked.c === q.answer.c ? 'tag-meals' : ''}`, children: picked.c === q.answer.c ? t('flags.correctAnswer', { name: countryName(q.answer, lang) }) : `${countryName(picked, lang)} ✕` }), mode === 'capital' && picked.c !== q.answer.c && _jsx("span", { className: "tag", children: t('flags.correctAnswer', { name: capitalName(q.answer, lang) }) }), _jsx("span", { style: { flex: 1 } }), _jsxs(Button, { variant: "dark", onClick: next, children: [i + 1 >= questions.length ? t('flags.finish') : t('flags.next'), " ", _jsx(IconChevron, { size: 18 })] })] })) : (_jsx("span", { className: "small muted bold", style: { width: '100%', textAlign: 'center' }, children: mode === 'country' ? t('flags.tapFlag') : '' })) })] }));
}
