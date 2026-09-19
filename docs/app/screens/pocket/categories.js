import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { bulkPut } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { categoryName, fmtMoney } from '../../lib/pocket.js';
import { useAllExpenses, useCategories } from '../../lib/queries.js';
import { Button, Empty, IconButton, Screen, TopBar } from '../../ui/components.js';
import { IconArrowDown, IconArrowUp, IconEdit, IconPlus } from '../../ui/icons.js';
import { CategoryBadge, CategorySheet } from './pocket-ui.js';
export function PocketCategoriesScreen() {
    const t = useT();
    const categories = useCategories();
    const expenses = useAllExpenses();
    const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
    const usage = useMemo(() => {
        const m = new Map();
        for (const e of expenses ?? []) {
            const u = m.get(e.categoryId) ?? { n: 0, total: 0 };
            u.n++;
            u.total += e.amount;
            m.set(e.categoryId, u);
        }
        return m;
    }, [expenses]);
    const move = async (i, dir) => {
        if (!categories)
            return;
        const j = i + dir;
        if (j < 0 || j >= categories.length)
            return;
        const list = categories.map((c, k) => ({ ...c, order: k }));
        [list[i].order, list[j].order] = [list[j].order, list[i].order];
        await bulkPut('categories', list);
    };
    return (_jsxs(Screen, { className: "screen-no-tabs pocket", children: [_jsx(TopBar, { large: true, backTo: "/pocket", title: t('pocket.categories'), eyebrow: `${t('pocket.title')} · ${t('pocket.usedAcross')}`, right: _jsx(IconButton, { label: t('pocket.newCategory'), tone: "pocket", onClick: () => setEditing(null), children: _jsx(IconPlus, {}) }) }), categories && categories.length === 0 && _jsx(Empty, { title: t('pocket.noCategories'), action: _jsx(Button, { variant: "pocket", onClick: () => setEditing(null), children: t('pocket.newCategory') }) }), _jsx("div", { className: "list", children: (categories ?? []).map((c, i) => {
                    const u = usage.get(c.id);
                    return (_jsxs("div", { className: "row", children: [_jsx(CategoryBadge, { category: c }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: categoryName(c) }), _jsx("div", { className: "row-sub", children: t('pocket.categoryUsage', { n: u?.n ?? 0, total: fmtMoney(u?.total ?? 0) }) })] }), _jsxs("div", { className: "block-actions", children: [_jsx(IconButton, { label: t('pocket.moveUp'), onClick: () => move(i, -1), children: _jsx(IconArrowUp, { size: 16 }) }), _jsx(IconButton, { label: t('pocket.moveDown'), onClick: () => move(i, 1), children: _jsx(IconArrowDown, { size: 16 }) }), _jsx(IconButton, { label: t('common.edit'), onClick: () => setEditing(c), children: _jsx(IconEdit, { size: 16 }) })] })] }, c.id));
                }) }), _jsx(Button, { variant: "secondary", full: true, className: "mt", icon: _jsx(IconPlus, { size: 18 }), onClick: () => setEditing(null), children: t('pocket.newCategory') }), _jsx(CategorySheet, { open: editing !== undefined, onClose: () => setEditing(undefined), category: editing ?? undefined, nextOrder: categories?.length ?? 0, usage: editing ? usage.get(editing.id)?.n : undefined })] }));
}
