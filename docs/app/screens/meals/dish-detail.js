import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { put, remove } from '../../lib/db.js';
import { todayKey } from '../../lib/dates.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { useT } from '../../lib/i18n.js';
import { dishTotal, fmtAmount, perServing } from '../../lib/nutrition.js';
import { useDish } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, IconButton, Screen, Segmented, Stat } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconBack, IconCalendar, IconClock, IconEdit, IconHeart, IconTrash, IconUser } from '../../ui/icons.js';
import { addDays, relativeDay } from '../../lib/dates.js';
import { uid } from '../../lib/ids.js';
import { MEAL_CATEGORIES } from '../../lib/models.js';
import { Sheet, Stepper } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
export function DishDetailScreen({ id }) {
    const t = useT();
    const LABEL = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
    const dish = useDish(id);
    const url = useBlobUrl(dish?.imageBlobId);
    const [tab, setTab] = useState('ingredients');
    const [adding, setAdding] = useState(false);
    if (dish === undefined)
        return _jsx(Screen, {});
    if (dish === null)
        return _jsx(Screen, { className: "screen-no-tabs", children: _jsx(Empty, { title: t('dish.notFound'), action: _jsx(Button, { variant: "secondary", onClick: () => navigate('/meals/dishes'), children: t('dish.backToDishes') }) }) });
    const n = perServing(dish);
    const total = dishTotal(dish);
    const del = async () => {
        const ok = await confirmDialog({ title: t('dish.deleteTitle', { name: dish.name }), message: t('dish.deleteMsg'), confirmLabel: t('common.delete'), danger: true });
        if (ok) {
            await remove('dishes', dish.id);
            navigate('/meals/dishes', { replace: true });
        }
    };
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsxs("div", { className: "hero", children: [url && _jsx("img", { src: url, alt: "" }), !url && _jsxs("svg", { className: "hero-deco", width: "220", height: "220", viewBox: "0 0 220 220", fill: "none", stroke: "currentColor", children: [_jsx("circle", { cx: "110", cy: "110", r: "90", strokeWidth: "10" }), _jsx("circle", { cx: "110", cy: "110", r: "55", strokeWidth: "6" })] }), _jsxs("div", { className: "hero-actions", children: [_jsx("div", { children: _jsx(IconButton, { label: t('common.back'), onClick: () => history.length > 1 ? history.back() : navigate('/meals/dishes'), children: _jsx(IconBack, {}) }) }), _jsxs("div", { children: [_jsx(IconButton, { label: dish.favorite ? t('dish.unfavorite') : t('dish.favorite'), onClick: () => put('dishes', { ...dish, favorite: !dish.favorite }), children: _jsx(IconHeart, { filled: dish.favorite }) }), _jsx(IconButton, { label: t('common.edit'), onClick: () => navigate(`/meals/dish/${dish.id}/edit`), children: _jsx(IconEdit, {}) }), _jsx(IconButton, { label: t('common.delete'), onClick: del, children: _jsx(IconTrash, {}) })] })] })] }), _jsxs("div", { className: "stack", style: { paddingTop: 18, paddingBottom: 90 }, children: [_jsxs("div", { className: "tags", children: [_jsx("span", { className: "tag tag-meals", children: LABEL[dish.category] }), dish.tags.map((tag) => _jsx("span", { className: "tag", children: tag }, tag))] }), _jsx("h1", { className: "dish-title", children: dish.name }), _jsxs("div", { className: "meta", children: [dish.prepMin + dish.cookMin > 0 && _jsxs("span", { children: [_jsx(IconClock, { size: 15, strokeWidth: 2.2 }), dish.prepMin + dish.cookMin, " ", t('unit.min'), dish.cookMin > 0 && dish.prepMin > 0 ? ` (${dish.prepMin} ${t('dish.prepTime').toLowerCase()})` : ''] }), _jsxs("span", { children: [_jsx(IconUser, { size: 15, strokeWidth: 2.2 }), dish.servings, " ", dish.servings === 1 ? t('unit.serving') : t('unit.servings')] })] }), _jsxs("div", { className: "stats mt", children: [_jsx(Stat, { tone: "dark", value: Math.round(n.kcal), label: t('dish.kcal') }), _jsx(Stat, { tone: "protein", value: `${Math.round(n.protein)}g`, label: t('dish.protein') }), _jsx(Stat, { tone: "carbs", value: `${Math.round(n.carbs)}g`, label: t('dish.carbs') }), _jsx(Stat, { tone: "fat", value: `${Math.round(n.fat)}g`, label: t('dish.fat') })] }), _jsxs("div", { className: "small muted", style: { textAlign: 'center' }, children: [t('dish.perServing'), dish.nutritionOverride ? t('dish.enteredManually') : dish.servings > 1 ? t('dish.wholeRecipe', { n: Math.round(total.kcal) }) : ''] }), _jsx("div", { className: "mt", children: _jsx(Segmented, { value: tab, onChange: setTab, options: [{ value: 'ingredients', label: t('dish.ingredientsCount', { n: dish.ingredients.length }) }, { value: 'steps', label: t('dish.stepsCount', { n: dish.steps.length }) }] }) }), tab === 'ingredients' ? (_jsxs("div", { className: "list", children: [dish.ingredients.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-text", children: t('dish.noIngredients') }) }), dish.ingredients.map((i) => (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: i.name }), _jsxs("div", { className: "row-sub", children: [fmtAmount(i.amount), " ", i.unit] })] }), _jsxs("div", { className: "row-right muted small num", children: [Math.round(i.kcal), " ", t('unit.kcal')] })] }, i.id)))] })) : (_jsxs("div", { className: "list steps", children: [dish.steps.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-text", children: t('dish.noSteps') }) }), dish.steps.map((s, i) => (_jsxs("div", { className: "step", children: [_jsx("div", { className: "step-n", children: i + 1 }), _jsx("div", { className: "step-text", children: s })] }, i)))] })), dish.notes && _jsx("div", { className: "card small muted", children: dish.notes })] }), _jsx("div", { className: "sticky-cta", children: _jsx(Button, { variant: "meals", size: "lg", full: true, icon: _jsx(IconCalendar, { size: 20 }), onClick: () => setAdding(true), children: t('dish.addToDay') }) }), _jsx(AddToDaySheet, { open: adding, onClose: () => setAdding(false), dishId: dish.id })] }));
}
/** Pick a day, meal and servings for this dish. */
function AddToDaySheet({ open, onClose, dishId }) {
    const t = useT();
    const LABEL = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
    const [date, setDate] = useState(todayKey());
    const [slot, setSlot] = useState('lunch');
    const [servings, setServings] = useState(1);
    const days = Array.from({ length: 8 }, (_, i) => addDays(todayKey(), i));
    const add = async () => {
        await put('mealSlots', { id: uid('slot'), date, slot, dishId, servings, eaten: false, order: Date.now() });
        toast(t('dish.addedToDay', { day: relativeDay(date) }));
        onClose();
    };
    return (_jsx(Sheet, { open: open, onClose: onClose, title: t('dish.addToDay'), footer: _jsx(Button, { variant: "meals", onClick: add, children: t('meals.addTo', { meal: LABEL[slot].toLowerCase() }) }), children: _jsxs("div", { className: "stack", children: [_jsx("div", { className: "section-label", children: t('dish.day') }), _jsx("div", { className: "chips", style: { margin: 0, padding: 0 }, children: days.map((d) => _jsx("button", { className: `chip chip-meals ${d === date ? 'chip-active' : ''}`, onClick: () => setDate(d), children: relativeDay(d).replace(/,.*$/, '') }, d)) }), _jsx("div", { className: "section-label mt", children: t('meals.meal') }), _jsx("div", { className: "hstack wrap", style: { gap: 6 }, children: MEAL_CATEGORIES.map((c) => _jsx("button", { className: `chip chip-meals ${slot === c ? 'chip-active' : ''}`, onClick: () => setSlot(c), children: LABEL[c] }, c)) }), _jsxs("div", { className: "spread mt", children: [_jsx("span", { className: "bold", children: t('meals.servings') }), _jsx(Stepper, { value: servings, min: 0.5, max: 10, step: 0.5, onChange: setServings })] })] }) }));
}
