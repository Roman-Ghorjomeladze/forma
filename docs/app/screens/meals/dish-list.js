import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { localizedDishName } from '../../data/seed-i18n.js';
import { useLang, useT } from '../../lib/i18n.js';
import { MEAL_CATEGORIES } from '../../lib/models.js';
import { perServing } from '../../lib/nutrition.js';
import { useDishes } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Chip, Empty, IconButton, Row, Screen, TopBar } from '../../ui/components.js';
import { IconBowl, IconPlus, IconSearch } from '../../ui/icons.js';
import { DishThumb } from './dish-thumb.js';
export function DishListScreen() {
    const t = useT();
    const lang = useLang();
    const LABEL = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
    const dishes = useDishes();
    const [q, setQ] = useState('');
    const [cat, setCat] = useState('all');
    const filtered = useMemo(() => {
        const ql = q.trim().toLowerCase();
        return (dishes ?? [])
            .filter((d) => cat === 'all' || (cat === 'fav' ? d.favorite : d.category === cat))
            .filter((d) => !ql || localizedDishName(d.id, d.name, lang).toLowerCase().includes(ql) || d.tags.some((tag) => tag.toLowerCase().includes(ql)) || d.ingredients.some((i) => i.name.toLowerCase().includes(ql)));
    }, [dishes, q, cat, lang]);
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, backTo: "/meals", title: t('dish.titleList'), eyebrow: t('dish.recipesCount', { n: dishes?.length ?? 0 }), right: _jsx(IconButton, { label: t('dish.newDish'), tone: "meals", onClick: () => navigate('/meals/dish/new'), children: _jsx(IconPlus, {}) }) }), _jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", placeholder: t('dish.searchPlaceholder'), value: q, onChange: (e) => setQ(e.target.value) })] }), _jsxs("div", { className: "chips", children: [_jsx(Chip, { tone: "meals", active: cat === 'all', onClick: () => setCat('all'), children: t('dish.all') }), _jsx(Chip, { tone: "meals", active: cat === 'fav', onClick: () => setCat('fav'), children: t('dish.favorites') }), MEAL_CATEGORIES.map((c) => _jsx(Chip, { tone: "meals", active: cat === c, onClick: () => setCat(c), children: LABEL[c] }, c))] }), dishes && dishes.length === 0 ? (_jsx(Empty, { icon: _jsx(IconBowl, { size: 40 }), title: t('dish.noDishesYet'), text: t('dish.noDishesHint'), action: _jsx(Button, { variant: "meals", icon: _jsx(IconPlus, { size: 18 }), onClick: () => navigate('/meals/dish/new'), children: t('dish.newDish') }) })) : (_jsxs("div", { className: "list mt", children: [filtered.map((d) => {
                        const n = perServing(d);
                        return (_jsxs(Row, { onClick: () => navigate(`/meals/dish/${d.id}`), right: _jsxs("div", { style: { textAlign: 'right' }, children: [_jsxs("div", { className: "num", children: [Math.round(n.kcal), " ", t('unit.kcal')] }), _jsxs("div", { className: "small muted num", children: [Math.round(n.protein), " g P"] })] }), children: [_jsx(DishThumb, { dish: d }), _jsxs("div", { className: "row-main", children: [_jsxs("div", { className: "row-title", children: [d.favorite ? '★ ' : '', localizedDishName(d.id, d.name, lang)] }), _jsxs("div", { className: "row-sub", children: [LABEL[d.category], d.prepMin + d.cookMin > 0 ? ` · ${d.prepMin + d.cookMin} ${t('unit.min')}` : '', d.tags.length ? ` · ${d.tags.slice(0, 2).join(', ')}` : ''] })] })] }, d.id));
                    }), filtered.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-title", children: t('dish.nothingMatches') }) })] }))] }));
}
