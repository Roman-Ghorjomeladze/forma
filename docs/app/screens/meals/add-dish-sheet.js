import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { put } from '../../lib/db.js';
import { uid } from '../../lib/ids.js';
import { localizedDishName } from '../../data/seed-i18n.js';
import { useLang, useT } from '../../lib/i18n.js';
import { MEAL_CATEGORIES } from '../../lib/models.js';
import { perServing } from '../../lib/nutrition.js';
import { useDishes } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Chip, Row, Sheet, Stepper } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { DishThumb } from './dish-thumb.js';
/** Pick a dish (and servings) to add to a day/slot. */
export function AddDishSheet({ open, onClose, date, slot }) {
    const t = useT();
    const lang = useLang();
    const LABEL = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
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
            .filter((d) => !ql || localizedDishName(d.id, d.name, lang).toLowerCase().includes(ql) || d.tags.some((tag) => tag.toLowerCase().includes(ql)))
            .sort((a, b) => Number(b.favorite) - Number(a.favorite) || localizedDishName(a.id, a.name, lang).localeCompare(localizedDishName(b.id, b.name, lang)));
    }, [dishes, q, cat, lang]);
    const reset = () => { setPicked(null); setServings(1); setQ(''); };
    const close = () => { reset(); onClose(); };
    const add = async () => {
        if (!picked)
            return;
        await put('mealSlots', { id: uid('slot'), date, slot: targetSlot, dishId: picked.id, servings, eaten: false, order: Date.now() });
        toast(t('common.addedName', { name: localizedDishName(picked.id, picked.name, lang) }));
        close();
    };
    return (_jsx(Sheet, { open: open, onClose: close, title: picked ? localizedDishName(picked.id, picked.name, lang) : t('today.addDish'), full: true, footer: picked ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setPicked(null), children: t('common.back') }), _jsx(Button, { variant: "meals", onClick: add, children: t('meals.addTo', { meal: LABEL[targetSlot].toLowerCase() }) })] })) : undefined, children: picked ? (_jsxs("div", { className: "stack", children: [_jsxs("div", { className: "hstack", style: { gap: 14 }, children: [_jsx(DishThumb, { dish: picked, large: true }), _jsxs("div", { children: [_jsxs("div", { className: "bold", children: [Math.round(perServing(picked).kcal * servings), " ", t('unit.kcal')] }), _jsxs("div", { className: "small muted", children: [Math.round(perServing(picked).protein * servings), " g ", t('dish.protein'), " \u00B7 ", t('dish.perServing'), " ", servings === 1 ? t('unit.serving') : `${servings} ${t('unit.servings')}`] })] })] }), _jsxs("div", { className: "spread mt", children: [_jsx("span", { className: "bold", children: t('meals.servings') }), _jsx(Stepper, { value: servings, onChange: setServings, min: 0.5, max: 10, step: 0.5 })] }), _jsxs("div", { className: "spread", children: [_jsx("span", { className: "bold", children: t('meals.meal') }), _jsx("div", { className: "hstack", style: { gap: 6 }, children: MEAL_CATEGORIES.map((c) => _jsx(Chip, { tone: "meals", active: targetSlot === c, onClick: () => setTargetSlot(c), children: LABEL[c] }, c)) })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", placeholder: t('dish.search'), value: q, onChange: (e) => setQ(e.target.value) })] }), _jsxs("div", { className: "chips", style: { margin: '0 0 10px', padding: 0 }, children: [_jsx(Chip, { tone: "meals", active: cat === 'all', onClick: () => setCat('all'), children: t('dish.all') }), MEAL_CATEGORIES.map((c) => _jsx(Chip, { tone: "meals", active: cat === c, onClick: () => setCat(c), children: LABEL[c] }, c))] }), _jsxs("div", { className: "list", children: [filtered.map((d) => {
                            const n = perServing(d);
                            return (_jsxs(Row, { onClick: () => { setPicked(d); setTargetSlot(slot ?? d.category); }, right: _jsx("span", { className: "num", children: Math.round(n.kcal) }), children: [_jsx(DishThumb, { dish: d, small: true }), _jsxs("div", { className: "row-main", children: [_jsxs("div", { className: "row-title", children: [d.favorite ? '★ ' : '', localizedDishName(d.id, d.name, lang)] }), _jsxs("div", { className: "row-sub", children: [LABEL[d.category], " \u00B7 ", Math.round(n.protein), " g ", t('dish.protein')] })] })] }, d.id));
                        }), filtered.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-title", children: t('dish.noDishesMatch') }) })] }), _jsx(Button, { variant: "secondary", full: true, className: "mt", icon: _jsx(IconPlus, { size: 18 }), onClick: () => { close(); navigate(`/meals/dish/new?date=${date}&slot=${targetSlot}`); }, children: t('dish.createNewDish') })] })) }));
}
