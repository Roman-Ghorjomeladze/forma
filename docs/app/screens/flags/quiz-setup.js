import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { accuracy, bestScore, countryName, perfectRounds, weakSpots } from '../../lib/flags.js';
import { useLang, useT } from '../../lib/i18n.js';
import { QUIZ_LENGTH, QUIZ_MODES } from '../../lib/models.js';
import { navigate, useRoute } from '../../lib/router.js';
import { useQuizResults } from '../../lib/queries.js';
import { Button, Screen, Section, Stat, TopBar } from '../../ui/components.js';
import { IconApps, IconFlag, IconPin, IconPlay } from '../../ui/icons.js';
import { ContinentChips, Flag, useContinentFilter } from './flags-ui.js';
const MODE_ICON = { flag: _jsx(IconFlag, { size: 22 }), country: _jsx(IconApps, { size: 22 }), capital: _jsx(IconPin, { size: 22 }) };
export function FlagsQuizSetupScreen() {
    const t = useT();
    const lang = useLang();
    const route = useRoute();
    const results = useQuizResults();
    const [filter, setFilter] = useContinentFilter('flags:quizContinent');
    const [mode, setMode] = useState('flag');
    const fromQuery = route.query.get('continent');
    useEffect(() => {
        if (fromQuery)
            setFilter(fromQuery); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromQuery]);
    const history = results ?? [];
    const weak = weakSpots(history, 8);
    return (_jsxs(Screen, { className: "screen-no-tabs flags", children: [_jsx(TopBar, { large: true, backTo: "/flags", title: _jsx("span", { className: "c-flags", children: t('flags.quiz') }), eyebrow: t('flags.quizSub', { n: QUIZ_LENGTH }) }), _jsx("div", { className: "section-label", children: t('flags.mode') }), _jsx("div", { className: "stack", style: { gap: 8 }, children: QUIZ_MODES.map((m) => {
                    const best = bestScore(history, m, filter);
                    return (_jsxs("button", { type: "button", className: `mode-opt ${mode === m ? 'active' : ''}`, onClick: () => setMode(m), children: [_jsx("span", { className: "mode-icon", children: MODE_ICON[m] }), _jsxs("span", { className: "row-main", children: [_jsx("span", { className: "row-title", children: t(`flags.mode.${m}`) }), _jsx("span", { className: "row-sub", children: t(`flags.mode.${m}Desc`) })] }), _jsxs("span", { className: "mode-best", children: [_jsx("span", { className: "small muted", children: t('flags.best') }), _jsx("span", { className: "num bold", children: best ? `${best.score}/${best.total}` : '—' })] })] }, m));
                }) }), _jsx("div", { className: "section-label mt-lg", children: t('flags.continentLabel') }), _jsx(ContinentChips, { value: filter, onChange: setFilter }), _jsxs("div", { className: "stats stats-3 mt", children: [_jsx(Stat, { value: history.length, label: t('flags.played') }), _jsx(Stat, { value: `${accuracy(history)}%`, label: t('flags.accuracy') }), _jsx(Stat, { value: perfectRounds(history), label: t('flags.perfect') })] }), weak.length > 0 && (_jsxs(Section, { title: t('flags.weakSpots'), className: "mt-lg", children: [_jsx("div", { className: "small muted mb", children: t('flags.weakSpotsHint') }), _jsx("div", { className: "weak-row", children: weak.map((c) => _jsxs("button", { type: "button", className: "weak-flag", onClick: () => navigate(`/flags?c=${c.c}`), children: [_jsx(Flag, { country: c }), _jsx("span", { children: countryName(c, lang) })] }, c.c)) })] })), _jsx("div", { className: "sticky-cta", children: _jsx(Button, { variant: "flags", full: true, size: "lg", icon: _jsx(IconPlay, { size: 18 }), onClick: () => navigate(`/flags/quiz/play?mode=${mode}&continent=${filter}`), children: t('flags.start', { n: QUIZ_LENGTH }) }) }), _jsx("div", { style: { height: 80 } })] }));
}
