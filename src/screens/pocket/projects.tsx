import { useMemo, useState } from 'react';
import { formatMonthYear } from '../../lib/dates.js';
import { useT } from '../../lib/i18n.js';
import type { Expense, Project } from '../../lib/models.js';
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
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

  const year = new Date().getFullYear();
  const yearRows = useMemo(() => (expenses ?? []).filter((e) => e.date.startsWith(String(year))), [expenses, year]);
  const byProject = useMemo(() => {
    const m = new Map<string, Expense[]>();
    for (const e of expenses ?? []) { if (!m.has(e.projectId)) m.set(e.projectId, []); m.get(e.projectId)!.push(e); }
    return m;
  }, [expenses]);
  const largest = yearRows.reduce((a, e) => Math.max(a, e.amount), 0);
  const busy = busiestMonth(yearRows);
  const shown = (projects ?? []).filter((p) => filter === 'all' || p.status === filter);
  const activeCount = (projects ?? []).filter((p) => p.status === 'active').length;

  return (
    <Screen className="screen-no-tabs pocket">
      <TopBar large left={<AppsButton />} title={<span className="c-pocket">{t('pocket.title')}</span>} eyebrow={t('pocket.subtitle')} />

      <Card dark className="summary mb">
        <div className="section-label" style={{ color: 'var(--inverse-muted)' }}>{t('pocket.spentInYear', { year })}</div>
        <div className="hstack" style={{ alignItems: 'baseline' }}>
          <span className="energy-big num">{fmtLari(sum(yearRows))}</span>
          <span className="small muted">{activeCount === 1 ? t('pocket.acrossProject') : t('pocket.acrossProjects', { n: activeCount })}</span>
        </div>
        <div className="summary-stats">
          <span><b>{yearRows.length}</b> {t('pocket.expenses').toLowerCase()}</span>
          <span><b className="num">{fmtLari(largest)}</b> {t('pocket.largest')}</span>
          {busy && <span><b>{formatMonthYear(busy + '-01').split(' ')[0]}</b> {t('pocket.busiestMonth')}</span>}
        </div>
      </Card>

      <div className="hstack mb" style={{ flexWrap: 'wrap' }}>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t('pocket.all')}</Chip>
        <Chip active={filter === 'active'} onClick={() => setFilter('active')}>{t('pocket.active')}</Chip>
        <Chip active={filter === 'done'} onClick={() => setFilter('done')}>{t('pocket.done')}</Chip>
        <span style={{ flex: 1 }} />
        <Chip onClick={() => navigate('/pocket/categories')}><IconTag size={15} /> {t('pocket.categories')}</Chip>
      </div>

      {projects && projects.length === 0 && (
        <Empty icon={<IconWallet size={40} />} title={t('pocket.noProjects')} text={t('pocket.noProjectsText')} />
      )}

      <div className="stack">
        {shown.map((p) => <ProjectCard key={p.id} project={p} rows={byProject.get(p.id) ?? []} categoryCount={new Set((byProject.get(p.id) ?? []).map((e) => e.categoryId)).size} colors={[...new Set((byProject.get(p.id) ?? []).map((e) => categories?.get(e.categoryId)?.color ?? '#9A978F'))]} />)}
      </div>

      <Fab onClick={() => navigate('/pocket/project/new')}><IconPlus size={20} strokeWidth={2.5} /> {t('pocket.newProject')}</Fab>
    </Screen>
  );
}

function ProjectCard({ project, rows, categoryCount, colors }: { project: Project; rows: Expense[]; categoryCount: number; colors: string[] }) {
  const t = useT();
  const spent = sum(rows);
  const pct = project.budget ? Math.round((spent / project.budget) * 100) : null;
  return (
    <Card onClick={() => navigate(`/pocket/project/${project.id}`)} className="project-card">
      <div className="hstack">
        <div className="row-main">
          <div className="row-title" style={{ fontSize: 17 }}>{project.name}</div>
          <div className="row-sub">{formatMonthYear(project.startDate)} · {rows.length === 1 ? t('pocket.expenseCount') : t('pocket.expensesCount', { n: rows.length })}</div>
        </div>
        <StatusPill status={project.status} />
      </div>
      <div className="hstack" style={{ alignItems: 'baseline', marginTop: 8 }}>
        <span className="disp num" style={{ fontSize: 24, fontWeight: 800 }}>{fmtLari(spent)}</span>
        {project.budget ? <span className="small muted">{t('pocket.of', { n: fmtMoney(project.budget) })}</span> : null}
        <span style={{ flex: 1 }} />
        {pct !== null && <span className={`small bold num ${pct > 100 ? 'c-danger' : 'muted'}`}>{pct}%</span>}
      </div>
      {project.budget ? <div className="mt" style={{ marginTop: 8 }}><BudgetBar spent={spent} budget={project.budget} /></div> : null}
      <div className="hstack" style={{ gap: 5, marginTop: 10 }}>
        {colors.slice(0, 6).map((c) => <span key={c} className="dot" style={{ background: c, marginRight: 0 }} />)}
        <span className="small muted" style={{ marginLeft: 4 }}>{t('pocket.categoriesCount', { n: categoryCount })}</span>
        <span style={{ flex: 1 }} />
        <IconChevron size={18} className="muted" />
      </div>
    </Card>
  );
}
