import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Course statistics: goals, levels, grammar, sentences, last 30 days, upcoming reviews.
import { useMemo } from 'react';
import { addDays, todayKey, weekdayShort, dayOfMonth } from '../../lib/dates.js';
import { useT } from '../../lib/i18n.js';
import { isMature, LEVELS, streak, unitDone, useLogs, vocabStats } from '../../lib/lingua.js';
import { Screen, TopBar } from '../../ui/components.js';
import { isCtx, LevelTag, Ring, useLingua } from './lingua-ui.js';
export function LinguaStatsScreen({ cid }) {
    const t = useT();
    const ctx = useLingua(cid);
    const logs = useLogs(cid);
    const data = useMemo(() => {
        if (!isCtx(ctx) || !logs)
            return null;
        const { content, prog } = ctx;
        const today = todayKey();
        const v = vocabStats(content, prog);
        const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
        const byDate = new Map(logs.map((l) => [l.date, l]));
        const last30 = days.map((d) => ({ d, l: byDate.get(d) }));
        const ans = last30.reduce((s, x) => s + (x.l?.answers ?? 0), 0);
        const cor = last30.reduce((s, x) => s + (x.l?.correct ?? 0), 0);
        const secs = logs.reduce((s, l) => s + l.seconds, 0);
        const forecast = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d, i) => ({
            d, n: [...prog.values()].filter((p) => p.key.startsWith('w:') && p.state !== 'suspended' && (i === 0 ? p.due <= d : p.due === d)).length,
        }));
        const built = content.sentences.filter((s) => isMature(prog.get(`s:${s.id}`))).length;
        const spoken = content.sentences.filter((s) => isMature(prog.get(`sp:${s.id}`))).length;
        return { v, last30, ans, cor, secs, forecast, built, spoken, streak: streak(logs) };
    }, [ctx, logs]);
    if (!isCtx(ctx))
        return ctx;
    if (!data)
        return null;
    const { course, content, prog } = ctx;
    const { v } = data;
    const maxDay = Math.max(1, ...data.last30.map((x) => x.l?.answers ?? 0));
    const maxF = Math.max(1, ...data.forecast.map((x) => x.n));
    return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.stats'), eyebrow: course.title, backTo: `/lang/${cid}` }), _jsxs("div", { className: "grid-2", children: [_jsxs("div", { className: "card goal-card", children: [_jsx(Ring, { value: v.passive, max: course.goals.passive, size: 74, children: _jsxs("b", { children: [Math.round((v.passive / course.goals.passive) * 100), "%"] }) }), _jsxs("div", { children: [_jsx("div", { className: "stat-value num", children: v.passive.toLocaleString() }), _jsx("div", { className: "small muted", children: t('lang.passiveOf', { n: course.goals.passive.toLocaleString() }) })] })] }), _jsxs("div", { className: "card goal-card", children: [_jsx(Ring, { value: v.active, max: course.goals.active, size: 74, color: "var(--meals)", children: _jsxs("b", { children: [Math.round((v.active / course.goals.active) * 100), "%"] }) }), _jsxs("div", { children: [_jsx("div", { className: "stat-value num", children: v.active.toLocaleString() }), _jsx("div", { className: "small muted", children: t('lang.activeOf', { n: course.goals.active.toLocaleString() }) })] })] })] }), _jsx("p", { className: "small muted mt", children: t('lang.knownDefinition') }), _jsxs("div", { className: "grid-3 mt", children: [_jsx(Mini, { value: data.streak, label: t('lang.dayStreak') }), _jsx(Mini, { value: data.ans ? `${Math.round((data.cor / data.ans) * 100)}%` : '—', label: t('lang.accuracy30') }), _jsx(Mini, { value: `${Math.round(data.secs / 60)}`, label: t('lang.minutesTotal') }), _jsx(Mini, { value: v.learning, label: t('lang.inProgress') }), _jsx(Mini, { value: data.built, label: t('lang.sentencesBuilt') }), _jsx(Mini, { value: data.spoken, label: t('lang.sentencesSpoken') })] }), _jsx("div", { className: "section-label mt-lg", children: t('lang.last30') }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "bars", children: data.last30.map((x) => _jsx("div", { className: "bar", title: `${x.d}: ${x.l?.answers ?? 0}`, children: _jsx("span", { style: { height: `${((x.l?.answers ?? 0) / maxDay) * 100}%` } }) }, x.d)) }), _jsxs("div", { className: "small muted hstack", style: { justifyContent: 'space-between' }, children: [_jsx("span", { children: dayOfMonth(data.last30[0].d) }), _jsx("span", { children: t('lang.answersPerDay') }), _jsx("span", { children: dayOfMonth(data.last30[29].d) })] })] }), _jsx("div", { className: "section-label mt-lg", children: t('lang.upcoming') }), _jsx("div", { className: "card", children: _jsx("div", { className: "bars bars-7", children: data.forecast.map((x) => _jsxs("div", { className: "bar", children: [_jsx("em", { children: x.n }), _jsx("span", { style: { height: `${(x.n / maxF) * 100}%` } }), _jsx("i", { children: weekdayShort(x.d) })] }, x.d)) }) }), _jsx("div", { className: "section-label mt-lg", children: t('lang.byLevel') }), _jsxs("div", { className: "card card-flush", children: [_jsxs("div", { className: "row small muted level-table-head", children: [_jsx("span", { style: { width: 34 } }), _jsx("span", { className: "flex1", children: t('lang.words') }), _jsx("span", { className: "w60", children: t('lang.passive') }), _jsx("span", { className: "w60", children: t('lang.active') }), _jsx("span", { className: "w60", children: t('lang.grammar') })] }), LEVELS.map((lv) => {
                        const s = v.perLevel[lv];
                        const units = content.grammar.filter((u) => u.level === lv);
                        if (!s && !units.length)
                            return null;
                        return (_jsxs("div", { className: "row small", children: [_jsx(LevelTag, { level: lv }), _jsx("span", { className: "flex1 num", children: s?.total.toLocaleString() ?? 0 }), _jsxs("span", { className: "w60 num", children: [s ? Math.round((s.passive / s.total) * 100) : 0, "%"] }), _jsxs("span", { className: "w60 num", children: [s ? Math.round((s.active / s.total) * 100) : 0, "%"] }), _jsxs("span", { className: "w60 num", children: [units.filter((u) => unitDone(prog, u.id)).length, "/", units.length] })] }, lv));
                    })] })] }));
}
function Mini({ value, label }) {
    return _jsxs("div", { className: "card mini-stat", children: [_jsx("div", { className: "stat-value num", children: value }), _jsx("div", { className: "small muted", children: label })] });
}
