import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { categoryName, deleteProject, newProject } from '../../lib/pocket.js';
import { back, navigate } from '../../lib/router.js';
import { useCategories, useExpenses, useProject } from '../../lib/queries.js';
import { Button, Field, NumberInput, Screen, Segmented, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { CategoryBadge } from './pocket-ui.js';
export function PocketProjectEditScreen({ id }) {
    const t = useT();
    const existing = useProject(id);
    const categories = useCategories();
    const expenses = useExpenses(id);
    const [draft, setDraft] = useState(id ? null : newProject());
    useEffect(() => { if (id && existing)
        setDraft(existing); }, [id, existing]);
    if (!draft || !categories)
        return _jsx(Screen, { className: "screen-no-tabs" });
    const set = (patch) => setDraft({ ...draft, ...patch });
    const save = async () => {
        const name = draft.name.trim();
        if (!name) {
            toast(t('pocket.nameRequired'));
            return;
        }
        const budgets = {};
        for (const [k, v] of Object.entries(draft.categoryBudgets))
            if (v > 0)
                budgets[k] = v;
        await put('projects', { ...draft, name, categoryBudgets: budgets, budget: draft.budget && draft.budget > 0 ? draft.budget : undefined, updatedAt: Date.now() });
        if (id)
            back(`/pocket/project/${id}`);
        else
            navigate(`/pocket/project/${draft.id}`, { replace: true });
    };
    const del = async () => {
        const ok = await confirmDialog({ title: t('pocket.deleteProjectTitle', { name: draft.name }), message: t('pocket.deleteProjectText', { n: expenses?.length ?? 0 }), confirmLabel: t('common.delete'), danger: true });
        if (!ok)
            return;
        await deleteProject(draft.id);
        navigate('/pocket', { replace: true });
    };
    return (_jsxs(Screen, { className: "screen-no-tabs pocket", children: [_jsx(TopBar, { onBack: () => back(id ? `/pocket/project/${id}` : '/pocket'), title: id ? t('pocket.editProject') : t('pocket.newProject'), right: _jsx(Button, { size: "sm", variant: "pocket", onClick: save, children: t('common.save') }) }), _jsx(Field, { label: t('pocket.name'), children: _jsx(TextInput, { value: draft.name, onChange: (v) => set({ name: v }), placeholder: t('pocket.namePlaceholder'), autoFocus: !id }) }), _jsx(Field, { label: t('pocket.budget'), hint: t('common.optional'), children: _jsx(NumberInput, { value: draft.budget ?? '', onChange: (v) => set({ budget: v }), max: 100_000_000, suffix: "\u20BE", placeholder: "0", className: "numwrap-wide" }) }), _jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('pocket.started'), children: _jsx("input", { className: "input", type: "date", value: draft.startDate, onChange: (e) => set({ startDate: e.target.value || draft.startDate }) }) }), _jsx(Field, { label: t('pocket.status'), children: _jsx(Segmented, { value: draft.status, onChange: (v) => set({ status: v }), options: [{ value: 'active', label: t('pocket.active') }, { value: 'done', label: t('pocket.done') }] }) })] }), _jsx(Field, { label: t('pocket.notes'), children: _jsx(TextArea, { value: draft.notes, onChange: (v) => set({ notes: v }), placeholder: t('pocket.notesPlaceholder') }) }), _jsx(Field, { label: t('pocket.categoryBudgets'), hint: t('pocket.categoryBudgetsHint'), children: _jsx("div", { className: "list", children: categories.map((c) => (_jsxs("div", { className: "row", children: [_jsx(CategoryBadge, { category: c, size: 32 }), _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title", children: categoryName(c) }) }), _jsx(NumberInput, { value: draft.categoryBudgets[c.id] ?? '', onChange: (v) => set({ categoryBudgets: { ...draft.categoryBudgets, [c.id]: v } }), max: 100_000_000, suffix: "\u20BE", placeholder: t('pocket.noLimit') })] }, c.id))) }) }), _jsx(Button, { variant: "pocket", full: true, size: "lg", onClick: save, className: "mt", children: id ? t('common.saveChanges') : t('pocket.newProject') }), id && _jsx(Button, { variant: "ghost", full: true, className: "mt c-danger", onClick: del, children: t('pocket.deleteProject') })] }));
}
