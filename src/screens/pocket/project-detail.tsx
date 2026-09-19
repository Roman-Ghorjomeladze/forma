import { useMemo, useState, type ReactNode } from 'react';
import { put } from '../../lib/db.js';
import { formatMonthYear, formatShort, formatShortYear } from '../../lib/dates.js';
import { useT } from '../../lib/i18n.js';
import type { Expense } from '../../lib/models.js';
import { categoryName, deleteProject, expensesToCsv, fmtLari, fmtMoney, groupByMonth, shareOrDownloadText, sum, totalsByCategory } from '../../lib/pocket.js';
import { navigate } from '../../lib/router.js';
import { useCategoryMap, useExpenses, useProject } from '../../lib/queries.js';
import { Button, Card, Chip, Empty, IconButton, Row, Screen, Section, Sheet, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCheck, IconEdit, IconMore, IconPlus, IconShare, IconTrash } from '../../ui/icons.js';
import { BudgetBar, BudgetLine, CategoryBadge, Fab, StatusPill } from './pocket-ui.js';

export function PocketProjectScreen({ id }: { id: string }) {
  const t = useT();
  const project = useProject(id);
  const rows = useExpenses(id);
  const categories = useCategoryMap();
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const spent = sum(rows ?? []);
  const cats = useMemo(() => totalsByCategory(rows ?? []), [rows]);
  const shown = useMemo(() => (rows ?? []).filter((e) => !filter || e.categoryId === filter), [rows, filter]);
  const months = useMemo(() => groupByMonth(shown), [shown]);

  if (project === undefined || !rows || !categories) return <Screen className="screen-no-tabs" />;
  if (project === null) return <Screen className="screen-no-tabs"><TopBar backTo="/pocket" title="" /><Empty title={t('pocket.noProjects')} /></Screen>;

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
    if (!ok) return;
    await deleteProject(project.id);
    navigate('/pocket', { replace: true });
  };

  const last = rows.length ? rows.reduce((a, e) => (e.date > a ? e.date : a), rows[0].date) : null;
  const eyebrow = project.status === 'done' && last ? t('pocket.startedRange', { from: formatMonthYear(project.startDate), to: formatMonthYear(last) }) : t('pocket.since', { date: formatShortYear(project.startDate) });

  return (
    <Screen className="screen-no-tabs pocket">
      <TopBar large backTo="/pocket" title={project.name} eyebrow={<span className="hstack" style={{ gap: 8 }}><StatusPill status={project.status} /><span>{eyebrow}</span></span>} right={<IconButton label={t('tree.moreOptions')} onClick={() => setMenu(true)}><IconMore /></IconButton>} />

      <Card className="mb" style={{ padding: 18 }}>
        <div className="hstack" style={{ alignItems: 'baseline', gap: 8 }}>
          <span className="energy-big num" style={{ fontSize: 36 }}>{fmtLari(spent)}</span>
          {project.budget ? <span className="muted">{t('pocket.of', { n: fmtMoney(project.budget) })}</span> : null}
        </div>
        {project.budget ? <div style={{ margin: '10px 0 8px' }}><BudgetBar spent={spent} budget={project.budget} height={12} /></div> : <div style={{ height: 6 }} />}
        <BudgetLine spent={spent} budget={project.budget} />
        <div className="hstack mt">
          <Chip onClick={() => navigate(`/pocket/project/${project.id}/edit`)}><IconEdit size={15} /> {t('pocket.editProject')}</Chip>
          <Chip onClick={exportCsv}><IconShare size={15} /> {t('pocket.exportCsv')}</Chip>
        </div>
      </Card>

      {cats.length > 0 && (
        <Section title={t('pocket.byCategory')} right={<span>{rows.length === 1 ? t('pocket.expenseCount') : t('pocket.expensesCount', { n: rows.length })}</span>}>
          <div className="stacked-bar">
            {cats.map((c) => <div key={c.categoryId} style={{ width: `${c.pct}%`, background: categories.get(c.categoryId)?.color ?? '#9A978F' }} />)}
          </div>
          <div className="cat-rows">
            {cats.map((c) => {
              const cat = categories.get(c.categoryId);
              const limit = project.categoryBudgets[c.categoryId];
              return (
                <button key={c.categoryId} type="button" className={`cat-row ${filter === c.categoryId ? 'active' : ''}`} onClick={() => setFilter(filter === c.categoryId ? null : c.categoryId)}>
                  <CategoryBadge category={cat} size={34} />
                  <div className="row-main">
                    <div className="row-title">{cat ? categoryName(cat) : '—'}</div>
                    {limit ? <div className="row-sub num">{t('pocket.of', { n: fmtMoney(limit) })}{c.total > limit ? <span className="c-danger"> · {t('pocket.over')}</span> : null}</div> : null}
                  </div>
                  <span className="small muted num" style={{ width: 40, textAlign: 'right' }}>{Math.round(c.pct)}%</span>
                  <span className="bold num" style={{ width: 84, textAlign: 'right' }}>{fmtLari(c.total)}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title={t('pocket.expenses')} right={filter ? <Chip active onClick={() => setFilter(null)}>{categoryName(categories.get(filter)!)} ✕</Chip> : undefined}>
        {rows.length === 0 && <Empty title={t('pocket.noExpenses')} text={t('pocket.noExpensesText')} action={<Button variant="pocket" icon={<IconPlus size={18} />} onClick={() => navigate(`/pocket/expense/new?project=${project.id}`)}>{t('pocket.expense')}</Button>} />}
        {months.map((m) => (
          <div key={m.month} className="mb">
            <div className="section-label">{t('pocket.monthTotal', { month: formatMonthYear(m.month + '-01'), total: fmtMoney(m.total) })}</div>
            <div className="list">
              {m.rows.map((e) => <ExpenseRow key={e.id} e={e} catName={categories.get(e.categoryId) ? categoryName(categories.get(e.categoryId)!) : '—'} badge={<CategoryBadge category={categories.get(e.categoryId)} />} />)}
            </div>
          </div>
        ))}
      </Section>
      <div style={{ height: 70 }} />

      <Fab onClick={() => navigate(`/pocket/expense/new?project=${project.id}`)}><IconPlus size={20} strokeWidth={2.5} /> {t('pocket.expense')}</Fab>

      <Sheet open={menu} onClose={() => setMenu(false)} title={project.name}>
        <div className="list">
          <Row onClick={toggleStatus}><IconCheck size={20} /><div className="row-main"><div className="row-title">{project.status === 'active' ? t('pocket.markDone') : t('pocket.markActive')}</div></div></Row>
          <Row onClick={() => { setMenu(false); navigate(`/pocket/project/${project.id}/edit`); }}><IconEdit size={20} /><div className="row-main"><div className="row-title">{t('pocket.editProject')}</div></div></Row>
          <Row onClick={exportCsv}><IconShare size={20} /><div className="row-main"><div className="row-title">{t('pocket.exportCsv')}</div></div></Row>
          <Row onClick={del} className="c-danger"><IconTrash size={20} /><div className="row-main"><div className="row-title">{t('pocket.deleteProject')}</div></div></Row>
        </div>
      </Sheet>
    </Screen>
  );
}

function ExpenseRow({ e, catName, badge }: { e: Expense; catName: string; badge: ReactNode }) {
  return (
    <Row onClick={() => navigate(`/pocket/expense/${e.id}/edit`)} right={<span className="num">{fmtLari(e.amount)}</span>}>
      {badge}
      <div className="row-main">
        <div className="row-title">{e.title || catName}</div>
        <div className="row-sub">{catName} · {formatShort(e.date)}</div>
      </div>
    </Row>
  );
}
