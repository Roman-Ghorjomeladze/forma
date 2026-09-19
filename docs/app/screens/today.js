import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { put } from '../lib/db.js';
import { addDays, fmtDuration, formatLong, todayKey } from '../lib/dates.js';
import { localizedDishName, localizedWorkoutName } from '../data/seed-i18n.js';
import { useProfile } from '../lib/hooks.js';
import { useLang, useT } from '../lib/i18n.js';
import { navigate } from '../lib/router.js';
import { useDishMap, useExerciseMap, useMealSlots, useSchedule, useSessions, useWorkouts } from '../lib/queries.js';
import { dayNutrition, perServing } from '../lib/nutrition.js';
import { estimateWorkout } from '../lib/calories.js';
import { MEAL_CATEGORIES } from '../lib/models.js';
import { Button, Card, Empty, MacroBar, Row, Screen, Section, TopBar } from '../ui/components.js';
import { IconCheck, IconChevron, IconDumbbell, IconFlame, IconPlus } from '../ui/icons.js';
import { DishThumb } from './meals/dish-thumb.js';
import { AppsButton } from './pocket/pocket-ui.js';
import { AddDishSheet } from './meals/add-dish-sheet.js';
export function TodayScreen() {
    const t = useT();
    const lang = useLang();
    const SLOT_LABEL = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
    const today = todayKey();
    const [profile] = useProfile();
    const slots = useMealSlots([today]);
    const dishes = useDishMap();
    const exercises = useExerciseMap();
    const workouts = useWorkouts();
    const schedule = useSchedule();
    const sessions = useSessions(400);
    const [adding, setAdding] = useState(false);
    const eaten = useMemo(() => (slots && dishes ? dayNutrition(slots, dishes, true) : null), [slots, dishes]);
    const planned = useMemo(() => (slots && dishes ? dayNutrition(slots, dishes, false) : null), [slots, dishes]);
    const todaySessions = useMemo(() => (sessions ?? []).filter((s) => new Date(s.startedAt).toDateString() === new Date().toDateString()), [sessions]);
    const burned = todaySessions.reduce((s, x) => s + x.kcal, 0);
    const remaining = profile.targetKcal - (eaten?.kcal ?? 0) + burned;
    const weekday = new Date().getDay();
    const scheduledId = schedule?.find((s) => s.weekday === weekday)?.workoutId;
    const scheduled = workouts?.find((w) => w.id === scheduledId);
    const est = scheduled && exercises ? estimateWorkout(scheduled, exercises, profile.weightKg) : null;
    const doneToday = todaySessions.length > 0;
    const streak = useMemo(() => {
        if (!sessions)
            return 0;
        const days = new Set(sessions.map((s) => {
            const d = new Date(s.startedAt);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }));
        let n = 0;
        let k = today;
        if (!days.has(k))
            k = addDays(k, -1);
        while (days.has(k)) {
            n++;
            k = addDays(k, -1);
        }
        return n;
    }, [sessions, today]);
    const weekMinutes = useMemo(() => {
        const since = Date.now() - 7 * 86400e3;
        return Math.round((sessions ?? []).filter((s) => s.startedAt >= since).reduce((a, s) => a + s.activeSeconds, 0) / 60);
    }, [sessions]);
    const toggleEaten = async (slot) => put('mealSlots', { ...slot, eaten: !slot.eaten });
    const eatenPct = Math.min(100, ((eaten?.kcal ?? 0) / Math.max(1, profile.targetKcal)) * 100);
    const burnedPct = Math.min(100 - eatenPct, (burned / Math.max(1, profile.targetKcal)) * 100);
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, eyebrow: formatLong(today), title: t('today.title'), right: _jsxs(_Fragment, { children: [streak > 0 && _jsxs("span", { className: "streak", children: [_jsx(IconFlame, { size: 16, strokeWidth: 2.2 }), t('today.streak', { n: streak })] }), _jsx(AppsButton, {})] }) }), _jsxs(Card, { dark: true, className: "energy mb", children: [_jsxs("div", { className: "energy-top", children: [_jsxs("div", { className: "energy-left", children: [_jsx("span", { className: "energy-big", children: Math.round(remaining).toLocaleString() }), _jsx("span", { className: "muted", style: { fontWeight: 600, fontSize: 14 }, children: t('today.kcalLeft') })] }), _jsx("span", { className: "muted small", children: t('today.target', { n: profile.targetKcal.toLocaleString() }) })] }), _jsxs("div", { className: "energy-bar", children: [_jsx("div", { style: { width: `${eatenPct}%`, background: 'var(--meals)' } }), _jsx("div", { style: { width: `${burnedPct}%`, background: 'var(--workout)' } })] }), _jsxs("div", { className: "energy-legend", children: [_jsxs("span", { children: [_jsx("i", { className: "dot", style: { background: 'var(--meals)' } }), t('today.eaten', { n: Math.round(eaten?.kcal ?? 0).toLocaleString() })] }), _jsxs("span", { children: [_jsx("i", { className: "dot", style: { background: 'var(--workout)' } }), t('today.burned', { n: Math.round(burned).toLocaleString() })] }), planned && planned.kcal !== (eaten?.kcal ?? 0) && _jsx("span", { children: t('today.planned', { n: Math.round(planned.kcal).toLocaleString() }) })] }), _jsxs("div", { className: "macros", children: [_jsx(MacroBar, { label: t('today.macro.protein'), value: eaten?.protein ?? 0, target: profile.targetProtein, color: "var(--protein)" }), _jsx(MacroBar, { label: t('today.macro.carbs'), value: eaten?.carbs ?? 0, target: profile.targetCarbs, color: "var(--carbs)" }), _jsx(MacroBar, { label: t('today.macro.fat'), value: eaten?.fat ?? 0, target: profile.targetFat, color: "var(--fat)" })] })] }), _jsx(Section, { title: t('today.workout'), right: _jsx("span", { children: doneToday ? t('today.doneToday', { n: todaySessions.length }) : scheduled ? t('today.scheduledToday') : weekMinutes > 0 ? t('today.minThisWeek', { n: weekMinutes }) : undefined }), children: scheduled ? (_jsx(Card, { children: _jsxs("div", { className: "workout-card", children: [_jsx("div", { className: "thumb thumb-workout", children: _jsx(IconDumbbell, { strokeWidth: 2.2 }) }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: localizedWorkoutName(scheduled.id, scheduled.name, lang) }), _jsx("div", { className: "row-sub", children: est ? `${fmtDuration(est.seconds)} · ${est.exercises} ${t('unit.exercises')} · ~${Math.round(est.kcal)} ${t('unit.kcal')}` : '' })] }), _jsx(Button, { size: "sm", onClick: () => navigate(`/forma/workouts/${scheduled.id}/play`), children: doneToday ? t('today.again') : t('today.start') })] }) })) : (_jsx(Card, { onClick: () => navigate('/forma/workouts'), children: _jsxs("div", { className: "workout-card", children: [_jsx("div", { className: "thumb thumb-workout", children: _jsx(IconDumbbell, { strokeWidth: 2.2 }) }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: doneToday ? t('today.niceWorkToday') : t('today.restDay') }), _jsx("div", { className: "row-sub", children: doneToday ? t('today.kcalBurned', { n: Math.round(burned) }) : t('today.nothingScheduled') })] }), _jsx(IconChevron, { className: "muted" })] }) })) }), _jsxs(Section, { title: t('today.meals'), right: _jsx("button", { className: "c-meals", onClick: () => navigate('/forma/meals'), children: t('today.planWeek') }), children: [slots && dishes && slots.length > 0 ? (_jsx("div", { className: "list", children: MEAL_CATEGORIES.flatMap((cat) => slots.filter((s) => s.slot === cat)).map((slot) => {
                            const dish = dishes.get(slot.dishId);
                            if (!dish)
                                return null;
                            const n = perServing(dish);
                            return (_jsxs(Row, { className: slot.eaten ? 'row-done' : '', onClick: () => navigate(`/forma/meals/dish/${dish.id}`), right: _jsx("span", { className: "num", children: Math.round(n.kcal * slot.servings) }), children: [_jsx("button", { className: `check ${slot.eaten ? 'on' : ''}`, "aria-label": slot.eaten ? t('today.markNotEaten') : t('today.markEaten'), onClick: (e) => { e.stopPropagation(); toggleEaten(slot); }, children: slot.eaten && _jsx(IconCheck, { size: 14, strokeWidth: 3 }) }), _jsx(DishThumb, { dish: dish, small: true }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: localizedDishName(dish.id, dish.name, lang) }), _jsxs("div", { className: "row-sub", children: [SLOT_LABEL[slot.slot], slot.servings !== 1 ? ` · ${slot.servings} ${t('unit.servings')}` : '', dish.prepMin + dish.cookMin > 0 ? ` · ${dish.prepMin + dish.cookMin} ${t('unit.min')}` : ''] })] })] }, slot.id));
                        }) })) : (_jsx(Empty, { title: t('today.nothingPlanned'), text: t('today.addDishOrPlanWeek'), action: _jsx(Button, { variant: "meals", size: "sm", icon: _jsx(IconPlus, { size: 18 }), onClick: () => setAdding(true), children: t('today.addDish') }) })), slots && slots.length > 0 && (_jsxs("button", { className: "addslot", onClick: () => setAdding(true), children: [_jsx(IconPlus, { size: 18 }), t('today.addDishToToday')] }))] }), _jsx(AddDishSheet, { open: adding, onClose: () => setAdding(false), date: today })] }));
}
