import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { put } from '../../lib/db.js';
import { formatMonthYear, formatShort, formatShortYear } from '../../lib/dates.js';
import { useT } from '../../lib/i18n.js';
import { categoryName, deleteProject, expensesToCsv, fmtLari, fmtMoney, groupByMonth, shareOrDownloadText, sum, totalsByCategory } from '../../lib/pocket.js';
import { navigate } from '../../lib/router.js';
import { useCategoryMap, useExpenses, useProject } from '../../lib/queries.js';
import { Button, Card, Chip, Empty, IconButton, Row, Screen, Section, Sheet, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCheck, IconEdit, IconMore, IconPlus, IconShare, IconTrash } from '../../ui/icons.js';
import { BudgetBar, BudgetLine, CategoryBadge, Fab, StatusPill } from './pocket-ui.js';
export function PocketProjectScreen({ id }) {
    const t = useT();
    const project = useProject(id);
    const rows = useExpenses(id);
    const categories = useCategoryMap();
    const [menu, setMenu] = useState(false);
    const [filter, setFilter] = useState(null);
    const spent = sum(rows ?? []);
    const cats = useMemo(() => totalsByCategory(rows ?? []), [rows]);
    const shown = useMemo(() => (rows ?? []).filter((e) => !filter || e.categoryId === filter), [rows, filter]);
    const months = useMemo(() => groupByMonth(shown), [shown]);
    if (project === undefined || !rows || !categories)
        return _jsx(Screen, { className: "screen-no-tabs" });
    if (project === null)
        return _jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { backTo: "/pocket", title: "" }), _jsx(Empty, { title: t('pocket.noProjects') })] });
    const toggleStatus = async () => {
        await put('projects', { ...project, status: project.status === 'active' ? 'done' : 'active', updatedAt: Date.now() });
        setMenu(false);
    };
    const exportCsv = async () => {
        setMenu(false);
        const r = await shareOrDownloadText(`${project.name.replace(/[^\wႠ-ჿ -]+/g, '')}.csv`, expensesToCsv(rows, categories, project));
        toast(r === 'shared' ? t('pocket.csvShared') : t('pocket.csvDownloaded'));
    };
    const del = async () => {
        setMenu(false);
        const ok = await confirmDialog({ title: t('pocket.deleteProjectTitle', { name: project.name }), message: t('pocket.deleteProjectText', { n: rows.length }), confirmLabel: t('common.delete'), danger: true });
        if (!ok)
            return;
        await deleteProject(project.id);
        navigate('/pocket', { replace: true });
    };
    const last = rows.length ? rows.reduce((a, e) => (e.date > a ? e.date : a), rows[0].date) : null;
    const eyebrow = project.status === 'done' && last ? t('pocket.startedRange', { from: formatMonthYear(project.startDate), to: formatMonthYear(last) }) : t('pocket.since', { date: formatShortYear(project.startDate) });
    return (_jsxs(Screen, { className: "screen-no-tabs pocket", children: [_jsx(TopBar, { large: true, backTo: "/pocket", title: project.name, eyebrow: _jsxs("span", { className: "hstack", style: { gap: 8 }, children: [_jsx(StatusPill, { status: project.status }), _jsx("span", { children: eyebrow })] }), right: _jsx(IconButton, { label: t('tree.moreOptions'), onClick: () => setMenu(true), children: _jsx(IconMore, {}) }) }), _jsxs(Card, { className: "mb", style: { padding: 18 }, children: [_jsxs("div", { className: "hstack", style: { alignItems: 'baseline', gap: 8 }, children: [_jsx("span", { className: "energy-big num", style: { fontSize: 36 }, children: fmtLari(spent) }), project.budget ? _jsx("span", { className: "muted", children: t('pocket.of', { n: fmtMoney(project.budget) }) }) : null] }), project.budget ? _jsx("div", { style: { margin: '10px 0 8px' }, children: _jsx(BudgetBar, { spent: spent, budget: project.budget, height: 12 }) }) : _jsx("div", { style: { height: 6 } }), _jsx(BudgetLine, { spent: spent, budget: project.budget }), _jsxs("div", { className: "hstack mt", children: [_jsxs(Chip, { onClick: () => navigate(`/pocket/project/${project.id}/edit`), children: [_jsx(IconEdit, { size: 15 }), " ", t('pocket.editProject')] }), _jsxs(Chip, { onClick: exportCsv, children: [_jsx(IconShare, { size: 15 }), " ", t('pocket.exportCsv')] })] })] }), cats.length > 0 && (_jsxs(Section, { title: t('pocket.byCategory'), right: _jsx("span", { children: rows.length === 1 ? t('pocket.expenseCount') : t('pocket.expensesCount', { n: rows.length }) }), children: [_jsx("div", { className: "stacked-bar", children: cats.map((c) => _jsx("div", { style: { width: `${c.pct}%`, background: categories.get(c.categoryId)?.color ?? '#9A978F' } }, c.categoryId)) }), _jsx("div", { className: "cat-rows", children: cats.map((c) => {
                            const cat = categories.get(c.categoryId);
                            const limit = project.categoryBudgets[c.categoryId];
                            return (_jsxs("button", { type: "button", className: `cat-row ${filter === c.categoryId ? 'active' : ''}`, onClick: () => setFilter(filter === c.categoryId ? null : c.categoryId), children: [_jsx(CategoryBadge, { category: cat, size: 34 }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: cat ? categoryName(cat) : '—' }), limit ? _jsxs("div", { className: "row-sub num", children: [t('pocket.of', { n: fmtMoney(limit) }), c.total > limit ? _jsxs("span", { className: "c-danger", children: [" \u00B7 ", t('pocket.over')] }) : null] }) : null] }), _jsxs("span", { className: "small muted num", style: { width: 40, textAlign: 'right' }, children: [Math.round(c.pct), "%"] }), _jsx("span", { className: "bold num", style: { width: 84, textAlign: 'right' }, children: fmtLari(c.total) })] }, c.categoryId));
                        }) })] })), _jsxs(Section, { title: t('pocket.expenses'), right: filter ? _jsxs(Chip, { active: true, onClick: () => setFilter(null), children: [categoryName(categories.get(filter)), " \u2715"] }) : undefined, children: [rows.length === 0 && _jsx(Empty, { title: t('pocket.noExpenses'), text: t('pocket.noExpensesText'), action: _jsx(Button, { variant: "pocket", icon: _jsx(IconPlus, { size: 18 }), onClick: () => navigate(`/pocket/expense/new?project=${project.id}`), children: t('pocket.expense') }) }), months.map((m) => (_jsxs("div", { className: "mb", children: [_jsx("div", { className: "section-label", children: t('pocket.monthTotal', { month: formatMonthYear(m.month + '-01'), total: fmtMoney(m.total) }) }), _jsx("div", { className: "list", children: m.rows.map((e) => _jsx(ExpenseRow, { e: e, catName: categories.get(e.categoryId) ? categoryName(categories.get(e.categoryId)) : '—', badge: _jsx(CategoryBadge, { category: categories.get(e.categoryId) }) }, e.id)) })] }, m.month)))] }), _jsx("div", { style: { height: 70 } }), _jsxs(Fab, { onClick: () => navigate(`/pocket/expense/new?project=${project.id}`), children: [_jsx(IconPlus, { size: 20, strokeWidth: 2.5 }), " ", t('pocket.expense')] }), _jsx(Sheet, { open: menu, onClose: () => setMenu(false), title: project.name, children: _jsxs("div", { className: "list", children: [_jsxs(Row, { onClick: toggleStatus, children: [_jsx(IconCheck, { size: 20 }), _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title", children: project.status === 'active' ? t('pocket.markDone') : t('pocket.markActive') }) })] }), _jsxs(Row, { onClick: () => { setMenu(false); navigate(`/pocket/project/${project.id}/edit`); }, children: [_jsx(IconEdit, { size: 20 }), _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title", children: t('pocket.editProject') }) })] }), _jsxs(Row, { onClick: exportCsv, children: [_jsx(IconShare, { size: 20 }), _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title", children: t('pocket.exportCsv') }) })] }), _jsxs(Row, { onClick: del, className: "c-danger", children: [_jsx(IconTrash, { size: 20 }), _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title", children: t('pocket.deleteProject') }) })] })] }) })] }));
}
function ExpenseRow({ e, catName, badge }) {
    return (_jsxs(Row, { onClick: () => navigate(`/pocket/expense/${e.id}/edit`), right: _jsx("span", { className: "num", children: fmtLari(e.amount) }), children: [badge, _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: e.title || catName }), _jsxs("div", { className: "row-sub", children: [catName, " \u00B7 ", formatShort(e.date)] })] })] }));
}
