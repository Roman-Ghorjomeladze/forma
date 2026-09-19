import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Small shared pieces for Pocket screens.
import { useState } from 'react';
import { put } from '../../lib/db.js';
import { uid } from '../../lib/ids.js';
import { useT } from '../../lib/i18n.js';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../lib/models.js';
import { categoryName, deleteCategory, fmtLari, OTHER_CATEGORY_ID } from '../../lib/pocket.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, IconButton, Progress, Sheet, TextInput } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { CategoryGlyph, IconApps } from '../../ui/icons.js';
/** Round "back to launcher" button used at the top-left of each app's home screen. */
export function AppsButton() {
    const t = useT();
    return _jsx(IconButton, { label: t('home.allApps'), onClick: () => navigate('/'), children: _jsx(IconApps, { size: 20 }) });
}
export function CategoryBadge({ category, size = 40 }) {
    const color = category?.color ?? '#9A978F';
    return (_jsx("div", { className: "cat-badge", style: { width: size, height: size, background: `${color}22`, color }, children: _jsx(CategoryGlyph, { name: category?.icon ?? 'tag', size: Math.round(size * 0.5) }) }));
}
export function BudgetBar({ spent, budget, height = 10 }) {
    if (!budget)
        return null;
    const over = spent > budget;
    return _jsx(Progress, { value: spent, max: budget, color: over ? 'var(--danger)' : 'var(--pocket)', height: height });
}
export function BudgetLine({ spent, budget }) {
    const t = useT();
    if (!budget)
        return _jsx("div", { className: "small muted", children: t('pocket.noBudget') });
    const pct = Math.round((spent / budget) * 100);
    const left = budget - spent;
    return (_jsxs("div", { className: "spread small muted", children: [_jsx("span", { children: left >= 0 ? _jsxs(_Fragment, { children: [_jsx("b", { className: "num", children: fmtLari(left) }), " ", t('pocket.left')] }) : _jsxs(_Fragment, { children: [_jsx("b", { className: "num c-danger", children: fmtLari(-left) }), " ", t('pocket.over')] }) }), _jsxs("span", { children: [_jsxs("b", { className: "num", children: [pct, "%"] }), " ", t('pocket.ofBudget')] })] }));
}
/** Create / edit a category in a bottom sheet. */
export function CategorySheet({ open, onClose, category, nextOrder, usage, onSaved }) {
    const t = useT();
    const [name, setName] = useState(category?.name ?? '');
    const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
    const [icon, setIcon] = useState(category?.icon ?? 'box');
    const [key, setKey] = useState(0);
    const reset = (c) => { setName(c?.name ?? ''); setColor(c?.color ?? CATEGORY_COLORS[0]); setIcon(c?.icon ?? 'box'); setKey((k) => k + 1); };
    // Re-seed the form whenever the sheet opens for a (different) category.
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open)
            reset(category);
    }
    const save = async () => {
        const n = name.trim();
        if (!n) {
            toast(t('pocket.nameRequired'));
            return;
        }
        const c = category ? { ...category, name: n, color, icon } : { id: uid('cat'), name: n, color, icon, order: nextOrder, createdAt: Date.now() };
        await put('categories', c);
        onSaved?.(c);
        onClose();
    };
    const del = async () => {
        if (!category)
            return;
        const ok = await confirmDialog({ title: t('pocket.deleteCategoryTitle', { name: categoryName(category) }), message: usage ? t('pocket.deleteCategoryText', { n: usage }) : undefined, confirmLabel: t('common.delete'), danger: true });
        if (!ok)
            return;
        await deleteCategory(category.id);
        onClose();
    };
    return (_jsx(Sheet, { open: open, onClose: onClose, title: category ? t('pocket.editCategory') : t('pocket.newCategory'), footer: _jsxs(_Fragment, { children: [category && category.id !== OTHER_CATEGORY_ID && _jsx(Button, { variant: "danger", onClick: del, children: t('common.delete') }), _jsx(Button, { variant: "pocket", onClick: save, children: category ? t('common.save') : t('pocket.addCategory') })] }), children: _jsxs("div", { children: [_jsx(Field, { label: t('pocket.categoryName'), children: _jsx(TextInput, { value: name, onChange: setName, placeholder: t('pocket.categoryNamePlaceholder'), autoFocus: !category }) }), _jsx(Field, { label: t('pocket.colour'), children: _jsx("div", { className: "swatches", children: CATEGORY_COLORS.map((c) => _jsx("button", { type: "button", "aria-label": c, className: `swatch ${c === color ? 'active' : ''}`, style: { background: c }, onClick: () => setColor(c) }, c)) }) }), _jsx(Field, { label: t('pocket.icon'), children: _jsx("div", { className: "icon-grid", children: CATEGORY_ICONS.map((i) => _jsx("button", { type: "button", "aria-label": i, className: `icon-pick ${i === icon ? 'active' : ''}`, onClick: () => setIcon(i), style: i === icon ? { background: color, color: '#17160F' } : undefined, children: _jsx(CategoryGlyph, { name: i, size: 20 }) }, i)) }) })] }, key) }));
}
export function StatusPill({ status }) {
    const t = useT();
    return _jsx("span", { className: `tag ${status === 'active' ? 'tag-meals' : ''}`, children: status === 'active' ? t('pocket.active') : t('pocket.done') });
}
export function Fab({ children, onClick, tone = 'pocket', aboveTabs = false }) {
    return (_jsx("div", { className: `fab-wrap ${aboveTabs ? 'sticky-cta-above-tabs' : ''}`, children: _jsx("button", { type: "button", className: `fab fab-${tone}`, onClick: onClick, children: children }) }));
}
