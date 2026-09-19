import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { formatMonthYear } from '../../lib/dates.js';
import { useT } from '../../lib/i18n.js';
import { busiestMonth, fmtLari, fmtMoney, sum } from '../../lib/pocket.js';
import { navigate } from '../../lib/router.js';
import { useAllExpenses, useCategoryMap, useProjects } from '../../lib/queries.js';
import { Card, Chip, Empty, Screen, TopBar } from '../../ui/components.js';
import { IconChevron, IconPlus, IconTag, IconWallet } from '../../ui/icons.js';
import { AppsButton, BudgetBar, Fab, StatusPill } from './pocket-ui.js';
export function PocketProjectsScreen() {
    const t = useT();
    const projects = useProjects();
    const expenses = useAllExpenses();
    const categories = useCategoryMap();
    const [filter, setFilter] = useState('all');
    const year = new Date().getFullYear();
    const yearRows = useMemo(() => (expenses ?? []).filter((e) => e.date.startsWith(String(year))), [expenses, year]);
    const byProject = useMemo(() => {
        const m = new Map();
        for (const e of expenses ?? []) {
            if (!m.has(e.projectId))
                m.set(e.projectId, []);
            m.get(e.projectId).push(e);
        }
        return m;
    }, [expenses]);
    const largest = yearRows.reduce((a, e) => Math.max(a, e.amount), 0);
    const busy = busiestMonth(yearRows);
    const shown = (projects ?? []).filter((p) => filter === 'all' || p.status === filter);
    const activeCount = (projects ?? []).filter((p) => p.status === 'active').length;
    return (_jsxs(Screen, { className: "screen-no-tabs pocket", children: [_jsx(TopBar, { large: true, left: _jsx(AppsButton, {}), title: _jsx("span", { className: "c-pocket", children: t('pocket.title') }), eyebrow: t('pocket.subtitle') }), _jsxs(Card, { dark: true, className: "summary mb", children: [_jsx("div", { className: "section-label", style: { color: 'var(--inverse-muted)' }, children: t('pocket.spentInYear', { year }) }), _jsxs("div", { className: "hstack", style: { alignItems: 'baseline' }, children: [_jsx("span", { className: "energy-big num", children: fmtLari(sum(yearRows)) }), _jsx("span", { className: "small muted", children: activeCount === 1 ? t('pocket.acrossProject') : t('pocket.acrossProjects', { n: activeCount }) })] }), _jsxs("div", { className: "summary-stats", children: [_jsxs("span", { children: [_jsx("b", { children: yearRows.length }), " ", t('pocket.expenses').toLowerCase()] }), _jsxs("span", { children: [_jsx("b", { className: "num", children: fmtLari(largest) }), " ", t('pocket.largest')] }), busy && _jsxs("span", { children: [_jsx("b", { children: formatMonthYear(busy + '-01').split(' ')[0] }), " ", t('pocket.busiestMonth')] })] })] }), _jsxs("div", { className: "hstack mb", style: { flexWrap: 'wrap' }, children: [_jsx(Chip, { active: filter === 'all', onClick: () => setFilter('all'), children: t('pocket.all') }), _jsx(Chip, { active: filter === 'active', onClick: () => setFilter('active'), children: t('pocket.active') }), _jsx(Chip, { active: filter === 'done', onClick: () => setFilter('done'), children: t('pocket.done') }), _jsx("span", { style: { flex: 1 } }), _jsxs(Chip, { onClick: () => navigate('/pocket/categories'), children: [_jsx(IconTag, { size: 15 }), " ", t('pocket.categories')] })] }), projects && projects.length === 0 && (_jsx(Empty, { icon: _jsx(IconWallet, { size: 40 }), title: t('pocket.noProjects'), text: t('pocket.noProjectsText') })), _jsx("div", { className: "stack", children: shown.map((p) => _jsx(ProjectCard, { project: p, rows: byProject.get(p.id) ?? [], categoryCount: new Set((byProject.get(p.id) ?? []).map((e) => e.categoryId)).size, colors: [...new Set((byProject.get(p.id) ?? []).map((e) => categories?.get(e.categoryId)?.color ?? '#9A978F'))] }, p.id)) }), _jsxs(Fab, { onClick: () => navigate('/pocket/project/new'), children: [_jsx(IconPlus, { size: 20, strokeWidth: 2.5 }), " ", t('pocket.newProject')] })] }));
}
function ProjectCard({ project, rows, categoryCount, colors }) {
    const t = useT();
    const spent = sum(rows);
    const pct = project.budget ? Math.round((spent / project.budget) * 100) : null;
    return (_jsxs(Card, { onClick: () => navigate(`/pocket/project/${project.id}`), className: "project-card", children: [_jsxs("div", { className: "hstack", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", style: { fontSize: 17 }, children: project.name }), _jsxs("div", { className: "row-sub", children: [formatMonthYear(project.startDate), " \u00B7 ", rows.length === 1 ? t('pocket.expenseCount') : t('pocket.expensesCount', { n: rows.length })] })] }), _jsx(StatusPill, { status: project.status })] }), _jsxs("div", { className: "hstack", style: { alignItems: 'baseline', marginTop: 8 }, children: [_jsx("span", { className: "disp num", style: { fontSize: 24, fontWeight: 800 }, children: fmtLari(spent) }), project.budget ? _jsx("span", { className: "small muted", children: t('pocket.of', { n: fmtMoney(project.budget) }) }) : null, _jsx("span", { style: { flex: 1 } }), pct !== null && _jsxs("span", { className: `small bold num ${pct > 100 ? 'c-danger' : 'muted'}`, children: [pct, "%"] })] }), project.budget ? _jsx("div", { className: "mt", style: { marginTop: 8 }, children: _jsx(BudgetBar, { spent: spent, budget: project.budget }) }) : null, _jsxs("div", { className: "hstack", style: { gap: 5, marginTop: 10 }, children: [colors.slice(0, 6).map((c) => _jsx("span", { className: "dot", style: { background: c, marginRight: 0 } }, c)), _jsx("span", { className: "small muted", style: { marginLeft: 4 }, children: t('pocket.categoriesCount', { n: categoryCount }) }), _jsx("span", { style: { flex: 1 } }), _jsx(IconChevron, { size: 18, className: "muted" })] })] }));
}
