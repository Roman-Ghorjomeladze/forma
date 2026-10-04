import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// One course's dashboard: today's plan, goal progress, activities, phrases of the day, levels.
import { useMemo } from 'react';
import { useT } from '../../lib/i18n.js';
import { dueCards, focusLevel, nextUnit, phrasesOfTheDay, sentenceQueue, streak, useLogs, vocabStats, CORE_LEVELS, unitDone, drillMistakes } from '../../lib/lingua.js';
import { navigate } from '../../lib/router.js';
import { todayKey } from '../../lib/dates.js';
import { Button, Screen, TopBar } from '../../ui/components.js';
import { IconBook, IconCards, IconChart, IconChevron, IconEar, IconFlame, IconList, IconMic, IconPuzzle, IconSettings, IconTarget, IconAlert } from '../../ui/icons.js';
import { isCtx, LevelTag, Ring, SpeakButton, useLingua } from './lingua-ui.js';
export function LinguaCourseScreen({ cid }) {
    const t = useT();
    const ctx = useLingua(cid);
    const logs = useLogs(cid);
    const data = useMemo(() => {
        if (!isCtx(ctx))
            return null;
        const { content, prog } = ctx;
        const stats = vocabStats(content, prog);
        const focus = focusLevel(content, stats, prog);
        const sentDue = sentenceQueue(content, prog, 's', 'all', 999).filter((s) => prog.has(`s:${s.id}`)).length;
        return {
            stats, focus,
            due: dueCards(content, prog, 'mix').length,
            phrases: phrasesOfTheDay(content, prog, focus),
            unit: nextUnit(content, prog),
            sentDue,
            mistakes: stats.mistakes,
            drillMiss: drillMistakes(content, prog).length,
            started: prog.size > 0,
        };
    }, [ctx]);
    if (!isCtx(ctx) || !data)
        return ctx;
    const { course, content, prog } = ctx;
    const { stats } = data;
    const newLeft = Math.max(0, course.dailyNew - stats.learnedToday);
    const days = logs ? streak(logs) : 0;
    const todayLog = logs?.find((l) => l.date === todayKey());
    const go = (p) => navigate(`/lang/${cid}/${p}`);
    return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { eyebrow: t('lang.fromLang', { lang: course.source.name }), title: course.title, backTo: "/lang", right: _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "iconbtn", "aria-label": t('lang.stats'), onClick: () => go('stats'), children: _jsx(IconChart, {}) }), _jsx("button", { type: "button", className: "iconbtn", "aria-label": t('lang.manage'), onClick: () => go('manage'), children: _jsx(IconSettings, {}) })] }) }), _jsxs("div", { className: "card card-dark lang-hero", children: [_jsxs("div", { className: "lang-hero-top", children: [_jsx(Ring, { value: stats.passive, max: course.goals.passive, size: 92, stroke: 9, color: "var(--lingua-bright)", children: _jsxs("div", { className: "ring-num", children: [Math.round((stats.passive / Math.max(1, course.goals.passive)) * 100), "%"] }) }), _jsxs("div", { className: "lang-hero-goals", children: [_jsx(Goal, { label: t('lang.passive'), value: stats.passive, max: course.goals.passive }), _jsx(Goal, { label: t('lang.active'), value: stats.active, max: course.goals.active }), _jsxs("div", { className: "small hero-meta", children: [_jsxs("span", { className: "hstack", style: { gap: 4 }, children: [_jsx(IconFlame, { size: 14 }), " ", t('lang.streak', { n: days })] }), _jsxs("span", { children: [_jsx(LevelTag, { level: data.focus }), " ", t('lang.focus')] })] })] })] }), _jsxs("div", { className: "lang-hero-today", children: [_jsxs("div", { children: [_jsx("b", { children: data.due }), _jsx("span", { children: t('lang.dueReviews') })] }), _jsxs("div", { children: [_jsx("b", { children: newLeft }), _jsx("span", { children: t('lang.newLeft') })] }), _jsxs("div", { children: [_jsx("b", { children: todayLog?.answers ?? 0 }), _jsx("span", { children: t('lang.answeredToday') })] })] }), _jsx(Button, { variant: "lingua", full: true, size: "lg", onClick: () => go('cards?mode=daily'), children: data.due + newLeft > 0 ? t('lang.startToday') : t('lang.extraRound') })] }), !data.started && (_jsxs("button", { type: "button", className: "card card-tappable lang-tip mt", onClick: () => go('placement'), children: [_jsx(IconTarget, { size: 22, className: "c-lingua" }), _jsxs("div", { className: "flex1", children: [_jsx("div", { className: "bold", children: t('lang.placementTipTitle') }), _jsx("div", { className: "small muted", children: t('lang.placementTipText') })] }), _jsx(IconChevron, { className: "muted" })] })), _jsx("div", { className: "section-label mt-lg", children: t('lang.practice') }), _jsxs("div", { className: "lang-grid", children: [_jsx(Tile, { icon: _jsx(IconCards, {}), title: t('lang.cards'), sub: t('lang.cardsSub'), onClick: () => go('cards') }), _jsx(Tile, { icon: _jsx(IconPuzzle, {}), title: t('lang.build'), sub: data.sentDue ? t('lang.nDue', { n: data.sentDue }) : t('lang.buildSub'), onClick: () => go('build') }), _jsx(Tile, { icon: _jsx(IconMic, {}), title: t('lang.speak'), sub: t('lang.speakSub'), onClick: () => go('speak') }), _jsx(Tile, { icon: _jsx(IconEar, {}), title: t('lang.listen'), sub: t('lang.listenSub'), onClick: () => go('quiz?mode=listen') }), _jsx(Tile, { icon: _jsx(IconTarget, {}), title: t('lang.quiz'), sub: t('lang.quizSub'), onClick: () => go('quiz') }), _jsx(Tile, { icon: _jsx(IconBook, {}), title: t('lang.grammar'), sub: t('lang.grammarSub', { done: content.grammar.filter((u) => unitDone(prog, u.id)).length, total: content.grammar.length }), onClick: () => go('grammar') }), _jsx(Tile, { icon: _jsx(IconAlert, {}), title: t('lang.mistakes'), sub: data.mistakes ? t('lang.toFix', { n: data.mistakes }) : t('lang.noMistakesShort'), onClick: () => go('mistakes'), badge: data.mistakes || undefined }), _jsx(Tile, { icon: _jsx(IconList, {}), title: t('lang.words'), sub: t('lang.wordsSub', { n: content.words.length.toLocaleString() }), onClick: () => go('words') })] }), data.phrases.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "section-head mt-lg", children: [_jsx("div", { className: "section-label", style: { margin: 0 }, children: t('lang.phrasesToday') }), _jsx("button", { type: "button", className: "link-btn c-lingua", onClick: () => go('speak?daily=1'), children: t('lang.practiseSaying') })] }), _jsx("div", { className: "card card-flush", children: data.phrases.map((s) => (_jsxs("div", { className: "row phrase-row", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "phrase-t", children: s.t }), _jsx("div", { className: "row-sub", children: s.s })] }), _jsx(SpeakButton, { text: s.t, tag: course.target.tts, rate: course.rate })] }, s.id))) })] })), data.unit && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-label mt-lg", children: t('lang.nextGrammar') }), _jsxs("button", { type: "button", className: "card card-tappable lang-unit-card", onClick: () => go(`grammar/${data.unit.id}`), children: [_jsx(LevelTag, { level: data.unit.level }), _jsxs("div", { className: "flex1", children: [_jsx("div", { className: "bold", children: data.unit.title }), _jsx("div", { className: "small muted", children: data.unit.summary })] }), _jsx(IconChevron, { className: "muted" })] })] })), _jsx("div", { className: "section-label mt-lg", children: t('lang.levels') }), _jsxs("div", { className: "card", children: [CORE_LEVELS.concat(stats.perLevel.C1 ? ['C1'] : []).map((lv) => {
                        const s = stats.perLevel[lv];
                        if (!s)
                            return null;
                        return (_jsxs("div", { className: "level-row", children: [_jsx(LevelTag, { level: lv }), _jsxs("div", { className: "level-bars", children: [_jsxs("div", { className: "level-bar", children: [_jsx("span", { className: "pas", style: { width: `${(s.passive / s.total) * 100}%` } }), _jsx("span", { className: "act", style: { width: `${(s.active / s.total) * 100}%` } })] }), _jsx("div", { className: "small muted", children: t('lang.levelLine', { passive: s.passive, active: s.active, total: s.total }) })] })] }, lv));
                    }), _jsxs("div", { className: "small muted legend", children: [_jsx("span", { className: "dot act" }), t('lang.active'), " ", _jsx("span", { className: "dot pas" }), t('lang.passive')] })] })] }));
}
function Goal({ label, value, max }) {
    return (_jsxs("div", { className: "goal", children: [_jsxs("div", { className: "goal-head", children: [_jsx("span", { children: label }), _jsxs("b", { className: "num", children: [value.toLocaleString(), " ", _jsxs("span", { className: "muted", children: ["/ ", max.toLocaleString()] })] })] }), _jsx("div", { className: "goal-bar", children: _jsx("span", { style: { width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` } }) })] }));
}
function Tile({ icon, title, sub, onClick, badge }) {
    return (_jsxs("button", { type: "button", className: "lang-tile", onClick: onClick, children: [_jsx("span", { className: "lang-tile-icon", children: icon }), _jsx("span", { className: "lang-tile-title", children: title }), _jsx("span", { className: "lang-tile-sub", children: sub }), badge ? _jsx("span", { className: "lang-badge", children: badge > 99 ? '99+' : badge }) : null] }));
}
