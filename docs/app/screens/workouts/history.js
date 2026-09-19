import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { remove } from '../../lib/db.js';
import { fmtClock, formatDateTime } from '../../lib/dates.js';
import { useT } from '../../lib/i18n.js';
import { useSessions } from '../../lib/queries.js';
import { Empty, IconButton, Screen, Stat, TopBar } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconHistory, IconTrash } from '../../ui/icons.js';
export function HistoryScreen() {
    const t = useT();
    const sessions = useSessions(500);
    const totals = useMemo(() => {
        const list = sessions ?? [];
        const since = Date.now() - 7 * 86400e3;
        const week = list.filter((s) => s.startedAt >= since);
        return { count: list.length, weekCount: week.length, weekKcal: Math.round(week.reduce((a, s) => a + s.kcal, 0)), weekMin: Math.round(week.reduce((a, s) => a + s.activeSeconds, 0) / 60) };
    }, [sessions]);
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, backTo: "/forma/workouts", title: t('history.title'), eyebrow: t('history.sessionsCount', { n: totals.count }) }), _jsxs("div", { className: "stats stats-3 mb", children: [_jsx(Stat, { value: totals.weekCount, label: t('history.thisWeek') }), _jsx(Stat, { value: totals.weekMin, label: t('history.activeMin') }), _jsx(Stat, { tone: "workout", value: totals.weekKcal, label: t('unit.kcal') })] }), sessions && sessions.length === 0 ? (_jsx(Empty, { icon: _jsx(IconHistory, { size: 40 }), title: t('history.noSessionsYet'), text: t('history.noSessionsHint') })) : (_jsx("div", { className: "list", children: (sessions ?? []).map((s) => (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: s.workoutName }), _jsxs("div", { className: "row-sub", children: [formatDateTime(s.startedAt), " \u00B7 ", fmtClock(Math.round((s.endedAt - s.startedAt) / 1000)), " \u00B7 ", s.completedSteps, "/", s.totalSteps, " ", t('player.stepsLabel')] })] }), _jsxs("div", { className: "row-right c-workout num", children: [Math.round(s.kcal), " ", t('unit.kcal')] }), _jsx(IconButton, { label: t('common.delete'), className: "iconbtn-plain", onClick: async () => { if (await confirmDialog({ title: t('history.deleteSessionTitle'), confirmLabel: t('common.delete'), danger: true }))
                                remove('sessions', s.id); }, children: _jsx(IconTrash, { size: 18 }) })] }, s.id))) }))] }));
}
