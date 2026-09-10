import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { put, remove } from '../../lib/db.js';
import { todayKey } from '../../lib/dates.js';
import { useBlobUrl } from '../../lib/hooks.js';
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
const LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
export function DishDetailScreen({ id }) {
    const dish = useDish(id);
    const url = useBlobUrl(dish?.imageBlobId);
    const [tab, setTab] = useState('ingredients');
    const [adding, setAdding] = useState(false);
    if (dish === undefined)
        return _jsx(Screen, {});
    if (dish === null)
        return _jsx(Screen, { className: "screen-no-tabs", children: _jsx(Empty, { title: "Dish not found", action: _jsx(Button, { variant: "secondary", onClick: () => navigate('/meals/dishes'), children: "Back to dishes" }) }) });
    const n = perServing(dish);
    const total = dishTotal(dish);
    const del = async () => {
        const ok = await confirmDialog({ title: `Delete “${dish.name}”?`, message: 'It will also disappear from any planned days.', confirmLabel: 'Delete', danger: true });
        if (ok) {
            await remove('dishes', dish.id);
            navigate('/meals/dishes', { replace: true });
        }
    };
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsxs("div", { className: "hero", children: [url && _jsx("img", { src: url, alt: "" }), !url && _jsxs("svg", { className: "hero-deco", width: "220", height: "220", viewBox: "0 0 220 220", fill: "none", stroke: "currentColor", children: [_jsx("circle", { cx: "110", cy: "110", r: "90", strokeWidth: "10" }), _jsx("circle", { cx: "110", cy: "110", r: "55", strokeWidth: "6" })] }), _jsxs("div", { className: "hero-actions", children: [_jsx("div", { children: _jsx(IconButton, { label: "Back", onClick: () => history.length > 1 ? history.back() : navigate('/meals/dishes'), children: _jsx(IconBack, {}) }) }), _jsxs("div", { children: [_jsx(IconButton, { label: dish.favorite ? 'Unfavorite' : 'Favorite', onClick: () => put('dishes', { ...dish, favorite: !dish.favorite }), children: _jsx(IconHeart, { filled: dish.favorite }) }), _jsx(IconButton, { label: "Edit", onClick: () => navigate(`/meals/dish/${dish.id}/edit`), children: _jsx(IconEdit, {}) }), _jsx(IconButton, { label: "Delete", onClick: del, children: _jsx(IconTrash, {}) })] })] })] }), _jsxs("div", { className: "stack", style: { paddingTop: 18, paddingBottom: 90 }, children: [_jsxs("div", { className: "tags", children: [_jsx("span", { className: "tag tag-meals", children: LABEL[dish.category] }), dish.tags.map((t) => _jsx("span", { className: "tag", children: t }, t))] }), _jsx("h1", { className: "dish-title", children: dish.name }), _jsxs("div", { className: "meta", children: [dish.prepMin + dish.cookMin > 0 && _jsxs("span", { children: [_jsx(IconClock, { size: 15, strokeWidth: 2.2 }), dish.prepMin + dish.cookMin, " min", dish.cookMin > 0 && dish.prepMin > 0 ? ` (${dish.prepMin} prep)` : ''] }), _jsxs("span", { children: [_jsx(IconUser, { size: 15, strokeWidth: 2.2 }), dish.servings, " ", dish.servings === 1 ? 'serving' : 'servings'] })] }), _jsxs("div", { className: "stats mt", children: [_jsx(Stat, { tone: "dark", value: Math.round(n.kcal), label: "kcal" }), _jsx(Stat, { tone: "protein", value: `${Math.round(n.protein)}g`, label: "protein" }), _jsx(Stat, { tone: "carbs", value: `${Math.round(n.carbs)}g`, label: "carbs" }), _jsx(Stat, { tone: "fat", value: `${Math.round(n.fat)}g`, label: "fat" })] }), _jsxs("div", { className: "small muted", style: { textAlign: 'center' }, children: ["per serving", dish.nutritionOverride ? ' (entered manually)' : dish.servings > 1 ? ` · whole recipe ${Math.round(total.kcal)} kcal` : ''] }), _jsx("div", { className: "mt", children: _jsx(Segmented, { value: tab, onChange: setTab, options: [{ value: 'ingredients', label: `Ingredients (${dish.ingredients.length})` }, { value: 'steps', label: `Steps (${dish.steps.length})` }] }) }), tab === 'ingredients' ? (_jsxs("div", { className: "list", children: [dish.ingredients.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-text", children: "No ingredients listed." }) }), dish.ingredients.map((i) => (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: i.name }), _jsxs("div", { className: "row-sub", children: [fmtAmount(i.amount), " ", i.unit] })] }), _jsxs("div", { className: "row-right muted small num", children: [Math.round(i.kcal), " kcal"] })] }, i.id)))] })) : (_jsxs("div", { className: "list steps", children: [dish.steps.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-text", children: "No cooking steps yet." }) }), dish.steps.map((s, i) => (_jsxs("div", { className: "step", children: [_jsx("div", { className: "step-n", children: i + 1 }), _jsx("div", { className: "step-text", children: s })] }, i)))] })), dish.notes && _jsx("div", { className: "card small muted", children: dish.notes })] }), _jsx("div", { className: "sticky-cta", children: _jsx(Button, { variant: "meals", size: "lg", full: true, icon: _jsx(IconCalendar, { size: 20 }), onClick: () => setAdding(true), children: "Add to a day" }) }), _jsx(AddToDaySheet, { open: adding, onClose: () => setAdding(false), dishId: dish.id })] }));
}
/** Pick a day, meal and servings for this dish. */
function AddToDaySheet({ open, onClose, dishId }) {
    const [date, setDate] = useState(todayKey());
    const [slot, setSlot] = useState('lunch');
    const [servings, setServings] = useState(1);
    const days = Array.from({ length: 8 }, (_, i) => addDays(todayKey(), i));
    const add = async () => {
        await put('mealSlots', { id: uid('slot'), date, slot, dishId, servings, eaten: false, order: Date.now() });
        toast(`Added to ${relativeDay(date)}`);
        onClose();
    };
    return (_jsx(Sheet, { open: open, onClose: onClose, title: "Add to a day", footer: _jsxs(Button, { variant: "meals", onClick: add, children: ["Add to ", LABEL[slot].toLowerCase()] }), children: _jsxs("div", { className: "stack", children: [_jsx("div", { className: "section-label", children: "Day" }), _jsx("div", { className: "chips", style: { margin: 0, padding: 0 }, children: days.map((d) => _jsx("button", { className: `chip chip-meals ${d === date ? 'chip-active' : ''}`, onClick: () => setDate(d), children: relativeDay(d).replace(/,.*$/, '') }, d)) }), _jsx("div", { className: "section-label mt", children: "Meal" }), _jsx("div", { className: "hstack wrap", style: { gap: 6 }, children: MEAL_CATEGORIES.map((c) => _jsx("button", { className: `chip chip-meals ${slot === c ? 'chip-active' : ''}`, onClick: () => setSlot(c), children: LABEL[c] }, c)) }), _jsxs("div", { className: "spread mt", children: [_jsx("span", { className: "bold", children: "Servings" }), _jsx(Stepper, { value: servings, min: 0.5, max: 10, step: 0.5, onChange: setServings })] })] }) }));
}
