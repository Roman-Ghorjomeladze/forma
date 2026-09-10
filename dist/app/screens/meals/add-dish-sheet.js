import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { put } from '../../lib/db.js';
import { uid } from '../../lib/ids.js';
import { MEAL_CATEGORIES } from '../../lib/models.js';
import { perServing } from '../../lib/nutrition.js';
import { useDishes } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Chip, Row, Sheet, Stepper } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { DishThumb } from './dish-thumb.js';
const LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
/** Pick a dish (and servings) to add to a day/slot. */
export function AddDishSheet({ open, onClose, date, slot }) {
    const dishes = useDishes();
    const [q, setQ] = useState('');
    const [cat, setCat] = useState(slot ?? 'all');
    const [picked, setPicked] = useState(null);
    const [servings, setServings] = useState(1);
    const [targetSlot, setTargetSlot] = useState(slot ?? 'lunch');
    const filtered = useMemo(() => {
        const list = dishes ?? [];
        const ql = q.trim().toLowerCase();
        return list
            .filter((d) => cat === 'all' || d.category === cat)
            .filter((d) => !ql || d.name.toLowerCase().includes(ql) || d.tags.some((t) => t.toLowerCase().includes(ql)))
            .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
    }, [dishes, q, cat]);
    const reset = () => { setPicked(null); setServings(1); setQ(''); };
    const close = () => { reset(); onClose(); };
    const add = async () => {
        if (!picked)
            return;
        await put('mealSlots', { id: uid('slot'), date, slot: targetSlot, dishId: picked.id, servings, eaten: false, order: Date.now() });
        toast(`Added ${picked.name}`);
        close();
    };
    return (_jsx(Sheet, { open: open, onClose: close, title: picked ? picked.name : 'Add a dish', full: true, footer: picked ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setPicked(null), children: "Back" }), _jsxs(Button, { variant: "meals", onClick: add, children: ["Add to ", LABEL[targetSlot].toLowerCase()] })] })) : undefined, children: picked ? (_jsxs("div", { className: "stack", children: [_jsxs("div", { className: "hstack", style: { gap: 14 }, children: [_jsx(DishThumb, { dish: picked, large: true }), _jsxs("div", { children: [_jsxs("div", { className: "bold", children: [Math.round(perServing(picked).kcal * servings), " kcal"] }), _jsxs("div", { className: "small muted", children: [Math.round(perServing(picked).protein * servings), " g protein \u00B7 per ", servings === 1 ? 'serving' : `${servings} servings`] })] })] }), _jsxs("div", { className: "spread mt", children: [_jsx("span", { className: "bold", children: "Servings" }), _jsx(Stepper, { value: servings, onChange: setServings, min: 0.5, max: 10, step: 0.5 })] }), _jsxs("div", { className: "spread", children: [_jsx("span", { className: "bold", children: "Meal" }), _jsx("div", { className: "hstack", style: { gap: 6 }, children: MEAL_CATEGORIES.map((c) => _jsx(Chip, { tone: "meals", active: targetSlot === c, onClick: () => setTargetSlot(c), children: LABEL[c] }, c)) })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", placeholder: "Search dishes", value: q, onChange: (e) => setQ(e.target.value) })] }), _jsxs("div", { className: "chips", style: { margin: '0 0 10px', padding: 0 }, children: [_jsx(Chip, { tone: "meals", active: cat === 'all', onClick: () => setCat('all'), children: "All" }), MEAL_CATEGORIES.map((c) => _jsx(Chip, { tone: "meals", active: cat === c, onClick: () => setCat(c), children: LABEL[c] }, c))] }), _jsxs("div", { className: "list", children: [filtered.map((d) => {
                            const n = perServing(d);
                            return (_jsxs(Row, { onClick: () => { setPicked(d); setTargetSlot(slot ?? d.category); }, right: _jsx("span", { className: "num", children: Math.round(n.kcal) }), children: [_jsx(DishThumb, { dish: d, small: true }), _jsxs("div", { className: "row-main", children: [_jsxs("div", { className: "row-title", children: [d.favorite ? '★ ' : '', d.name] }), _jsxs("div", { className: "row-sub", children: [LABEL[d.category], " \u00B7 ", Math.round(n.protein), " g protein"] })] })] }, d.id));
                        }), filtered.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-title", children: "No dishes match" }) })] }), _jsx(Button, { variant: "secondary", full: true, className: "mt", icon: _jsx(IconPlus, { size: 18 }), onClick: () => { close(); navigate(`/meals/dish/new?date=${date}&slot=${targetSlot}`); }, children: "Create a new dish" })] })) }));
}
