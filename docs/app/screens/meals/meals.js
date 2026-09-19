import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { bulkPut, bulkRemove, put, remove } from '../../lib/db.js';
import { uid } from '../../lib/ids.js';
import { addDays, dayOfMonth, formatRange, relativeDay, startOfWeek, todayKey, weekDays, weekdayShort } from '../../lib/dates.js';
import { localizedDishName } from '../../data/seed-i18n.js';
import { useProfile } from '../../lib/hooks.js';
import { useLang, useT } from '../../lib/i18n.js';
import { MEAL_CATEGORIES } from '../../lib/models.js';
import { dayNutrition, perServing } from '../../lib/nutrition.js';
import { useDishMap, useMealSlots } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, IconButton, Row, Screen, Sheet, Stepper, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconBack, IconBowl, IconCart, IconCheck, IconChevron, IconCopy, IconMore, IconPlus, IconTrash } from '../../ui/icons.js';
import { AddDishSheet } from './add-dish-sheet.js';
import { DishThumb } from './dish-thumb.js';
export function MealsScreen() {
    const t = useT();
    const lang = useLang();
    const LABEL = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
    const [profile] = useProfile();
    const today = todayKey();
    const [weekStart, setWeekStart] = useState(() => startOfWeek(today, profile.weekStartsOn));
    const [selected, setSelected] = useState(today);
    const days = useMemo(() => weekDays(weekStart), [weekStart]);
    const slots = useMealSlots(days);
    const dishes = useDishMap();
    const [adding, setAdding] = useState(null);
    const [editing, setEditing] = useState(null);
    const [menu, setMenu] = useState(false);
    const daySlots = useMemo(() => (slots ?? []).filter((s) => s.date === selected), [slots, selected]);
    const totals = useMemo(() => (dishes ? dayNutrition(daySlots, dishes) : null), [daySlots, dishes]);
    const hasDay = useMemo(() => new Set((slots ?? []).map((s) => s.date)), [slots]);
    const shiftWeek = (n) => {
        const ws = addDays(weekStart, n * 7);
        setWeekStart(ws);
        setSelected(addDays(selected, n * 7));
    };
    const goToday = () => { setWeekStart(startOfWeek(today, profile.weekStartsOn)); setSelected(today); };
    const copyDayTo = async (target) => {
        const rows = daySlots.map((s) => ({ ...s, id: uid('slot'), date: target, eaten: false, order: Date.now() + s.order % 1000 }));
        await bulkPut('mealSlots', rows);
        toast(t('meals.copiedToDay', { day: relativeDay(target) }));
    };
    const copyLastWeek = async () => {
        const { getByIndex } = await import('../../lib/db.js');
        const prev = weekDays(addDays(weekStart, -7));
        const prevSlots = await getByIndex('mealSlots', 'date', IDBKeyRange.bound(prev[0], prev[6]));
        if (prevSlots.length === 0) {
            toast(t('meals.lastWeekEmpty'));
            return;
        }
        if (slots && slots.length > 0) {
            const ok = await confirmDialog({ title: t('meals.replaceWeekTitle'), message: t('meals.replaceWeekMsg'), confirmLabel: t('common.replace'), danger: true });
            if (!ok)
                return;
            await bulkRemove('mealSlots', slots.map((s) => s.id));
        }
        await bulkPut('mealSlots', prevSlots.map((s) => ({ ...s, id: uid('slot'), date: addDays(s.date, 7), eaten: false })));
        toast(t('meals.copiedLastWeek'));
    };
    const clearDay = async () => {
        if (daySlots.length === 0)
            return;
        const ok = await confirmDialog({ title: t('meals.clearDayTitle', { day: relativeDay(selected) }), confirmLabel: t('common.clear'), danger: true });
        if (ok)
            await bulkRemove('mealSlots', daySlots.map((s) => s.id));
    };
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, eyebrow: _jsxs("button", { onClick: goToday, children: [formatRange(days[0], days[6]), weekStart !== startOfWeek(today, profile.weekStartsOn) ? t('meals.backToToday') : ''] }), title: t('meals.title'), right: _jsxs(_Fragment, { children: [_jsx(IconButton, { label: t('meals.shoppingList'), onClick: () => navigate('/forma/meals/shopping?week=' + weekStart), children: _jsx(IconCart, { size: 20 }) }), _jsx(IconButton, { label: t('meals.dishes'), onClick: () => navigate('/forma/meals/dishes'), children: _jsx(IconBowl, { size: 20 }) }), _jsx(IconButton, { label: t('meals.more'), onClick: () => setMenu(true), children: _jsx(IconMore, { size: 20 }) })] }) }), _jsxs("div", { className: "weeknav", children: [_jsx("button", { className: "iconbtn iconbtn-plain", "aria-label": t('meals.previousWeek'), onClick: () => shiftWeek(-1), children: _jsx(IconBack, {}) }), _jsx("span", { className: "small muted bold", children: formatRange(days[0], days[6]) }), _jsx("button", { className: "iconbtn iconbtn-plain", "aria-label": t('meals.nextWeek'), onClick: () => shiftWeek(1), children: _jsx(IconChevron, {}) })] }), _jsx("div", { className: "weekstrip", children: days.map((d) => (_jsxs("button", { className: `weekday ${d === selected ? 'active' : ''} ${d === today ? 'today' : ''}`, onClick: () => setSelected(d), children: [_jsx("span", { className: "weekday-name", children: weekdayShort(d) }), _jsx("span", { className: "weekday-num", children: dayOfMonth(d) }), _jsx("span", { className: `weekday-dot ${hasDay.has(d) ? 'has' : ''}` })] }, d))) }), _jsxs("div", { className: "daytotals", children: [_jsxs("div", { className: "daytotals-kcal", children: [_jsx("span", { className: "big", children: Math.round(totals?.kcal ?? 0).toLocaleString() }), _jsxs("span", { className: "small muted", children: ["/ ", profile.targetKcal.toLocaleString(), " ", t('unit.kcal')] })] }), _jsxs("div", { className: "daytotals-macros", children: [_jsxs("span", { className: "c-protein", children: ["P ", Math.round(totals?.protein ?? 0)] }), _jsxs("span", { className: "c-carbs", children: ["C ", Math.round(totals?.carbs ?? 0)] }), _jsxs("span", { className: "c-fat", children: ["F ", Math.round(totals?.fat ?? 0)] })] })] }), _jsxs("div", { className: "spread mb", children: [_jsx("span", { className: "bold", children: relativeDay(selected) }), _jsx("div", { className: "hstack", style: { gap: 6 }, children: daySlots.length > 0 && _jsx(Button, { size: "sm", variant: "ghost", icon: _jsx(IconTrash, { size: 16 }), onClick: clearDay, children: t('common.clear') }) })] }), MEAL_CATEGORIES.map((cat) => {
                const rows = daySlots.filter((s) => s.slot === cat);
                return (_jsxs("section", { className: "section", style: { marginBottom: 14 }, children: [_jsx("div", { className: "section-label", children: LABEL[cat] }), rows.length > 0 && (_jsx("div", { className: "list", children: rows.map((slot) => {
                                const dish = dishes?.get(slot.dishId);
                                if (!dish)
                                    return null;
                                const n = perServing(dish);
                                return (_jsxs(Row, { className: slot.eaten ? 'row-done' : '', onClick: () => setEditing(slot), right: _jsx("button", { className: `check ${slot.eaten ? 'on' : ''}`, "aria-label": t('meals.toggleEaten'), onClick: (e) => { e.stopPropagation(); put('mealSlots', { ...slot, eaten: !slot.eaten }); }, children: slot.eaten && _jsx(IconCheck, { size: 14, strokeWidth: 3 }) }), children: [_jsx(DishThumb, { dish: dish }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: localizedDishName(dish.id, dish.name, lang) }), _jsxs("div", { className: "row-sub", children: [slot.servings, " ", slot.servings === 1 ? t('unit.serving') : t('unit.servings'), " \u00B7 ", Math.round(n.kcal * slot.servings), " ", t('unit.kcal'), " \u00B7 ", Math.round(n.protein * slot.servings), " g ", t('dish.protein')] })] })] }, slot.id));
                            }) })), _jsxs("button", { className: "addslot", onClick: () => setAdding(cat), children: [_jsx(IconPlus, { size: 18 }), rows.length > 0 ? t('meals.addAnother') : t('meals.addADish')] })] }, cat));
            }), _jsx(AddDishSheet, { open: adding !== null, onClose: () => setAdding(null), date: selected, slot: adding && adding !== 'any' ? adding : undefined }), _jsx(Sheet, { open: !!editing, onClose: () => setEditing(null), title: (() => { const d = editing && dishes?.get(editing.dishId); return d ? localizedDishName(d.id, d.name, lang) : undefined; })(), children: editing && (_jsxs("div", { className: "stack", children: [_jsxs("div", { className: "spread", children: [_jsx("span", { className: "bold", children: t('meals.servings') }), _jsx(Stepper, { value: editing.servings, min: 0.5, max: 10, step: 0.5, onChange: (v) => { const s = { ...editing, servings: v }; setEditing(s); put('mealSlots', s); } })] }), _jsxs("div", { className: "spread", children: [_jsx("span", { className: "bold", children: t('meals.meal') }), _jsx("div", { className: "hstack", style: { gap: 6 }, children: MEAL_CATEGORIES.map((c) => _jsx("button", { className: `chip chip-meals ${editing.slot === c ? 'chip-active' : ''}`, onClick: () => { const s = { ...editing, slot: c }; setEditing(s); put('mealSlots', s); }, children: LABEL[c] }, c)) })] }), _jsx("div", { className: "divider" }), _jsx(Button, { variant: "secondary", full: true, onClick: () => { navigate(`/forma/meals/dish/${editing.dishId}`); setEditing(null); }, children: t('meals.viewRecipe') }), _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconCopy, { size: 18 }), onClick: async () => { await put('mealSlots', { ...editing, id: uid('slot'), date: addDays(editing.date, 1), eaten: false }); toast(t('meals.copiedToNextDay')); setEditing(null); }, children: t('meals.copyToNextDay') }), _jsx(Button, { variant: "danger", full: true, icon: _jsx(IconTrash, { size: 18 }), onClick: async () => { await remove('mealSlots', editing.id); setEditing(null); }, children: t('meals.removeFromPlan') })] })) }), _jsx(Sheet, { open: menu, onClose: () => setMenu(false), title: t('meals.thisWeek'), children: _jsxs("div", { className: "stack", children: [_jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconCopy, { size: 18 }), onClick: async () => { setMenu(false); await copyLastWeek(); }, children: t('meals.copyLastWeekPlan') }), _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconCopy, { size: 18 }), disabled: daySlots.length === 0, onClick: async () => { setMenu(false); await copyDayTo(addDays(selected, 1)); }, children: t('meals.copyDayToNext', { day: relativeDay(selected).toLowerCase() }) }), _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconCopy, { size: 18 }), disabled: daySlots.length === 0, onClick: async () => {
                                setMenu(false);
                                const ok = await confirmDialog({ title: t('meals.repeatDayTitle'), message: t('meals.repeatDayMsg'), confirmLabel: t('common.copy') });
                                if (!ok)
                                    return;
                                for (const d of days)
                                    if (d !== selected)
                                        await copyDayTo(d);
                            }, children: t('meals.repeatDayForWeek', { day: relativeDay(selected).toLowerCase() }) }), _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconCart, { size: 18 }), onClick: () => { setMenu(false); navigate('/forma/meals/shopping?week=' + weekStart); }, children: t('meals.shoppingListForWeek') }), _jsx(Button, { variant: "danger", full: true, icon: _jsx(IconTrash, { size: 18 }), disabled: !slots || slots.length === 0, onClick: async () => {
                                setMenu(false);
                                const ok = await confirmDialog({ title: t('meals.clearWholeWeekTitle'), confirmLabel: t('meals.clearWeek'), danger: true });
                                if (ok && slots)
                                    await bulkRemove('mealSlots', slots.map((s) => s.id));
                            }, children: t('meals.clearThisWeek') })] }) })] }));
}
