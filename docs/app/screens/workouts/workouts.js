import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { bulkPut, remove } from '../../lib/db.js';
import { fmtDuration, weekdayName } from '../../lib/dates.js';
import { estimateWorkout } from '../../lib/calories.js';
import { useProfile } from '../../lib/hooks.js';
import { useExerciseMap, useSchedule, useSessions, useWorkouts } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Card, Empty, IconButton, Row, Screen, Section, Sheet, TopBar } from '../../ui/components.js';
import { IconChevron, IconDumbbell, IconHistory, IconPlus, IconStar } from '../../ui/icons.js';
export function WorkoutsScreen() {
    const [profile] = useProfile();
    const workouts = useWorkouts();
    const exercises = useExerciseMap();
    const schedule = useSchedule();
    const sessions = useSessions(50);
    const [pickDay, setPickDay] = useState(null);
    const order = profile.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    const byDay = useMemo(() => new Map((schedule ?? []).map((s) => [s.weekday, s.workoutId])), [schedule]);
    const todayWd = new Date().getDay();
    const weekKcal = useMemo(() => {
        const since = Date.now() - 7 * 86400e3;
        return Math.round((sessions ?? []).filter((s) => s.startedAt >= since).reduce((a, s) => a + s.kcal, 0));
    }, [sessions]);
    const setDay = async (weekday, workoutId) => {
        if (workoutId)
            await bulkPut('schedule', [{ weekday, workoutId }]);
        else
            await remove('schedule', weekday);
        setPickDay(null);
    };
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, title: "Workouts", eyebrow: weekKcal > 0 ? `${weekKcal} kcal burned this week` : `${workouts?.length ?? 0} workouts`, right: _jsxs(_Fragment, { children: [_jsx(IconButton, { label: "History", onClick: () => navigate('/workouts/history'), children: _jsx(IconHistory, { size: 20 }) }), _jsx(IconButton, { label: "Exercise library", onClick: () => navigate('/workouts/exercises'), children: _jsx(IconStar, { size: 20 }) }), _jsx(IconButton, { label: "New workout", tone: "accent", onClick: () => navigate('/workouts/new'), children: _jsx(IconPlus, {}) })] }) }), _jsx(Section, { title: "Weekly schedule", right: _jsx("span", { children: "tap a day to assign" }), children: _jsx("div", { className: "calendar-week", children: order.map((wd) => {
                        const w = workouts?.find((x) => x.id === byDay.get(wd));
                        return (_jsxs("button", { className: w ? 'has' : '', style: wd === todayWd ? { background: 'var(--surface-2)' } : undefined, onClick: () => setPickDay(wd), children: [_jsx("span", { children: weekdayName(wd) }), w ? _jsxs(_Fragment, { children: [_jsx("span", { className: "sched-swatch", style: { background: w.color } }), _jsx("span", { className: "w", children: w.name })] }) : _jsx("span", { className: "w muted", style: { fontWeight: 500 }, children: "\u2014" })] }, wd));
                    }) }) }), _jsx(Section, { title: "My workouts", children: workouts && workouts.length === 0 ? (_jsx(Empty, { icon: _jsx(IconDumbbell, { size: 40 }), title: "No workouts yet", text: "Build a chain of exercises and rests, then start the guided timer.", action: _jsx(Button, { icon: _jsx(IconPlus, { size: 18 }), onClick: () => navigate('/workouts/new'), children: "New workout" }) })) : (_jsx("div", { className: "stack", children: (workouts ?? []).map((w) => {
                        const est = exercises ? estimateWorkout(w, exercises, profile.weightKg) : null;
                        return (_jsx(Card, { onClick: () => navigate(`/workouts/${w.id}`), children: _jsxs("div", { className: "workout-card", children: [_jsx("span", { className: "workout-color", style: { background: w.color } }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: w.name }), _jsx("div", { className: "row-sub", children: est ? `${fmtDuration(est.seconds)} · ${est.exercises} exercises · ~${Math.round(est.kcal)} kcal` : '' })] }), _jsx(Button, { size: "sm", onClick: () => navigate(`/workouts/${w.id}/play`), children: "Start" }), _jsx(IconChevron, { className: "muted" })] }) }, w.id));
                    }) })) }), _jsx(Sheet, { open: pickDay !== null, onClose: () => setPickDay(null), title: pickDay !== null ? `${weekdayName(pickDay, true)}` : '', children: _jsxs("div", { className: "list", children: [(workouts ?? []).map((w) => (_jsxs(Row, { onClick: () => pickDay !== null && setDay(pickDay, w.id), right: pickDay !== null && byDay.get(pickDay) === w.id ? _jsx("span", { className: "c-workout", children: "Assigned" }) : undefined, children: [_jsx("span", { className: "sched-swatch", style: { background: w.color, width: 12, height: 12 } }), _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title", children: w.name }) })] }, w.id))), _jsx(Row, { onClick: () => pickDay !== null && setDay(pickDay, null), children: _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title muted", children: "Rest day (nothing scheduled)" }) }) })] }) })] }));
}
