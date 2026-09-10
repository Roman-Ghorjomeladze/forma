import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { MEAL_CATEGORIES } from '../../lib/models.js';
import { perServing } from '../../lib/nutrition.js';
import { useDishes } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Chip, Empty, IconButton, Row, Screen, TopBar } from '../../ui/components.js';
import { IconBowl, IconPlus, IconSearch } from '../../ui/icons.js';
import { DishThumb } from './dish-thumb.js';
const LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
export function DishListScreen() {
    const dishes = useDishes();
    const [q, setQ] = useState('');
    const [cat, setCat] = useState('all');
    const filtered = useMemo(() => {
        const ql = q.trim().toLowerCase();
        return (dishes ?? [])
            .filter((d) => cat === 'all' || (cat === 'fav' ? d.favorite : d.category === cat))
            .filter((d) => !ql || d.name.toLowerCase().includes(ql) || d.tags.some((t) => t.toLowerCase().includes(ql)) || d.ingredients.some((i) => i.name.toLowerCase().includes(ql)));
    }, [dishes, q, cat]);
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, backTo: "/meals", title: "Dishes", eyebrow: `${dishes?.length ?? 0} recipes`, right: _jsx(IconButton, { label: "New dish", tone: "meals", onClick: () => navigate('/meals/dish/new'), children: _jsx(IconPlus, {}) }) }), _jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", placeholder: "Search dishes, tags, ingredients", value: q, onChange: (e) => setQ(e.target.value) })] }), _jsxs("div", { className: "chips", children: [_jsx(Chip, { tone: "meals", active: cat === 'all', onClick: () => setCat('all'), children: "All" }), _jsx(Chip, { tone: "meals", active: cat === 'fav', onClick: () => setCat('fav'), children: "\u2605 Favorites" }), MEAL_CATEGORIES.map((c) => _jsx(Chip, { tone: "meals", active: cat === c, onClick: () => setCat(c), children: LABEL[c] }, c))] }), dishes && dishes.length === 0 ? (_jsx(Empty, { icon: _jsx(IconBowl, { size: 40 }), title: "No dishes yet", text: "Create your first recipe with ingredients, steps and nutrition.", action: _jsx(Button, { variant: "meals", icon: _jsx(IconPlus, { size: 18 }), onClick: () => navigate('/meals/dish/new'), children: "New dish" }) })) : (_jsxs("div", { className: "list mt", children: [filtered.map((d) => {
                        const n = perServing(d);
                        return (_jsxs(Row, { onClick: () => navigate(`/meals/dish/${d.id}`), right: _jsxs("div", { style: { textAlign: 'right' }, children: [_jsxs("div", { className: "num", children: [Math.round(n.kcal), " kcal"] }), _jsxs("div", { className: "small muted num", children: [Math.round(n.protein), " g P"] })] }), children: [_jsx(DishThumb, { dish: d }), _jsxs("div", { className: "row-main", children: [_jsxs("div", { className: "row-title", children: [d.favorite ? '★ ' : '', d.name] }), _jsxs("div", { className: "row-sub", children: [LABEL[d.category], d.prepMin + d.cookMin > 0 ? ` · ${d.prepMin + d.cookMin} min` : '', d.tags.length ? ` · ${d.tags.slice(0, 2).join(', ')}` : ''] })] })] }, d.id));
                    }), filtered.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-title", children: "Nothing matches" }) })] }))] }));
}
