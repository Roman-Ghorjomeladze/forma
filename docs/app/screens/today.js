import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { put } from '../lib/db.js';
import { addDays, fmtDuration, formatLong, todayKey } from '../lib/dates.js';
import { useProfile } from '../lib/hooks.js';
import { navigate } from '../lib/router.js';
import { useDishMap, useExerciseMap, useMealSlots, useSchedule, useSessions, useWorkouts } from '../lib/queries.js';
import { dayNutrition, perServing } from '../lib/nutrition.js';
import { estimateWorkout } from '../lib/calories.js';
import { MEAL_CATEGORIES } from '../lib/models.js';
import { Button, Card, Empty, MacroBar, Row, Screen, Section, TopBar } from '../ui/components.js';
import { IconCheck, IconChevron, IconDumbbell, IconFlame, IconPlus } from '../ui/icons.js';
import { DishThumb } from './meals/dish-thumb.js';
import { AddDishSheet } from './meals/add-dish-sheet.js';
const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
export function TodayScreen() {
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
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, eyebrow: formatLong(today), title: "Today", right: streak > 0 ? _jsxs("span", { className: "streak", children: [_jsx(IconFlame, { size: 16, strokeWidth: 2.2 }), streak, "-day streak"] }) : undefined }), _jsxs(Card, { dark: true, className: "energy mb", children: [_jsxs("div", { className: "energy-top", children: [_jsxs("div", { className: "energy-left", children: [_jsx("span", { className: "energy-big", children: Math.round(remaining).toLocaleString() }), _jsx("span", { className: "muted", style: { fontWeight: 600, fontSize: 14 }, children: "kcal left" })] }), _jsxs("span", { className: "muted small", children: ["target ", profile.targetKcal.toLocaleString()] })] }), _jsxs("div", { className: "energy-bar", children: [_jsx("div", { style: { width: `${eatenPct}%`, background: 'var(--meals)' } }), _jsx("div", { style: { width: `${burnedPct}%`, background: 'var(--workout)' } })] }), _jsxs("div", { className: "energy-legend", children: [_jsxs("span", { children: [_jsx("i", { className: "dot", style: { background: 'var(--meals)' } }), "Eaten ", Math.round(eaten?.kcal ?? 0).toLocaleString()] }), _jsxs("span", { children: [_jsx("i", { className: "dot", style: { background: 'var(--workout)' } }), "Burned ", Math.round(burned).toLocaleString()] }), planned && planned.kcal !== (eaten?.kcal ?? 0) && _jsxs("span", { children: ["Planned ", Math.round(planned.kcal).toLocaleString()] })] }), _jsxs("div", { className: "macros", children: [_jsx(MacroBar, { label: "Protein", value: eaten?.protein ?? 0, target: profile.targetProtein, color: "var(--protein)" }), _jsx(MacroBar, { label: "Carbs", value: eaten?.carbs ?? 0, target: profile.targetCarbs, color: "var(--carbs)" }), _jsx(MacroBar, { label: "Fat", value: eaten?.fat ?? 0, target: profile.targetFat, color: "var(--fat)" })] })] }), _jsx(Section, { title: "Workout", right: _jsx("span", { children: doneToday ? `${todaySessions.length} done today` : scheduled ? 'Scheduled today' : weekMinutes > 0 ? `${weekMinutes} min this week` : undefined }), children: scheduled ? (_jsx(Card, { children: _jsxs("div", { className: "workout-card", children: [_jsx("div", { className: "thumb thumb-workout", children: _jsx(IconDumbbell, { strokeWidth: 2.2 }) }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: scheduled.name }), _jsx("div", { className: "row-sub", children: est ? `${fmtDuration(est.seconds)} · ${est.exercises} exercises · ~${Math.round(est.kcal)} kcal` : '' })] }), _jsx(Button, { size: "sm", onClick: () => navigate(`/workouts/${scheduled.id}/play`), children: doneToday ? 'Again' : 'Start' })] }) })) : (_jsx(Card, { onClick: () => navigate('/workouts'), children: _jsxs("div", { className: "workout-card", children: [_jsx("div", { className: "thumb thumb-workout", children: _jsx(IconDumbbell, { strokeWidth: 2.2 }) }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: doneToday ? 'Nice work today' : 'Rest day' }), _jsx("div", { className: "row-sub", children: doneToday ? `${Math.round(burned)} kcal burned` : 'Nothing scheduled — pick a workout anyway' })] }), _jsx(IconChevron, { className: "muted" })] }) })) }), _jsxs(Section, { title: "Meals", right: _jsx("button", { className: "c-meals", onClick: () => navigate('/meals'), children: "Plan week" }), children: [slots && dishes && slots.length > 0 ? (_jsx("div", { className: "list", children: MEAL_CATEGORIES.flatMap((cat) => slots.filter((s) => s.slot === cat)).map((slot) => {
                            const dish = dishes.get(slot.dishId);
                            if (!dish)
                                return null;
                            const n = perServing(dish);
                            return (_jsxs(Row, { className: slot.eaten ? 'row-done' : '', onClick: () => navigate(`/meals/dish/${dish.id}`), right: _jsx("span", { className: "num", children: Math.round(n.kcal * slot.servings) }), children: [_jsx("button", { className: `check ${slot.eaten ? 'on' : ''}`, "aria-label": slot.eaten ? 'Mark not eaten' : 'Mark eaten', onClick: (e) => { e.stopPropagation(); toggleEaten(slot); }, children: slot.eaten && _jsx(IconCheck, { size: 14, strokeWidth: 3 }) }), _jsx(DishThumb, { dish: dish, small: true }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: dish.name }), _jsxs("div", { className: "row-sub", children: [SLOT_LABEL[slot.slot], slot.servings !== 1 ? ` · ${slot.servings} servings` : '', dish.prepMin + dish.cookMin > 0 ? ` · ${dish.prepMin + dish.cookMin} min` : ''] })] })] }, slot.id));
                        }) })) : (_jsx(Empty, { title: "Nothing planned for today", text: "Add a dish for today or plan the whole week.", action: _jsx(Button, { variant: "meals", size: "sm", icon: _jsx(IconPlus, { size: 18 }), onClick: () => setAdding(true), children: "Add a dish" }) })), slots && slots.length > 0 && (_jsxs("button", { className: "addslot", onClick: () => setAdding(true), children: [_jsx(IconPlus, { size: 18 }), "Add a dish to today"] }))] }), _jsx(AddDishSheet, { open: adding, onClose: () => setAdding(false), date: today })] }));
}
