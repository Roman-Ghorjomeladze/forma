import { useEffect, useMemo, useRef, useState } from 'react';
import { put, remove } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import type { Expense } from '../../lib/models.js';
import { categoryName, fmtMoney, newExpense, OTHER_CATEGORY_ID, sum } from '../../lib/pocket.js';
import { back, navigate, useRoute } from '../../lib/router.js';
import { useCategories, useExpense, useExpenses, useProjects } from '../../lib/queries.js';
import { Button, Field, Screen, Select, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { CategoryGlyph, IconPlus } from '../../ui/icons.js';
import { CategorySheet } from './pocket-ui.js';

export function PocketExpenseEditScreen({ id }: { id?: string }) {
  const t = useT();
  const route = useRoute();
  const projectFromQuery = route.query.get('project') ?? undefined;
  const existing = useExpense(id);
  const projects = useProjects();
  const categories = useCategories();
  const [draft, setDraft] = useState<Expense | null>(null);
  const [amountText, setAmountText] = useState('');
  const [catSheet, setCatSheet] = useState(false);
  const amountRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (draft) return;
    if (id) { if (existing) { setDraft(existing); setAmountText(existing.amount ? String(existing.amount) : ''); } return; }
    if (!projects || !categories) return;
    if (projects.length === 0) { navigate('/pocket/project/new', { replace: true }); return; }
    const pid = projectFromQuery ?? projects.find((p) => p.status === 'active')?.id ?? projects[0]?.id ?? '';
    const cid = categories[0]?.id ?? OTHER_CATEGORY_ID;
    setDraft(newExpense(pid, cid));
  }, [id, existing, projects, categories, projectFromQuery, draft]);

  const siblings = useExpenses(draft?.projectId);
  const project = useMemo(() => projects?.find((p) => p.id === draft?.projectId), [projects, draft?.projectId]);
  const amount = Number(amountText.replace(',', '.')) || 0;

  if (!draft || !projects || !categories) return <Screen className="screen-no-tabs" />;
  const set = (patch: Partial<Expense>) => setDraft({ ...draft, ...patch });
  const backTo = draft.projectId ? `/pocket/project/${draft.projectId}` : '/pocket';

  // Budget preview: what the project's spend percentage becomes after saving this expense.
  let preview: string | null = null;
  if (project?.budget && siblings) {
    const others = sum(siblings.filter((e) => e.id !== draft.id));
    preview = t('pocket.budgetPreview', { project: project.name, from: Math.round((others / project.budget) * 100), to: Math.round(((others + amount) / project.budget) * 100) });
  } else if (project && siblings) {
    preview = `${project.name} · ₾${fmtMoney(sum(siblings.filter((e) => e.id !== draft.id)) + amount)}`;
  }

  const save = async () => {
    if (!draft.projectId) { toast(t('pocket.pickProject')); return; }
    if (!(amount > 0)) { toast(t('pocket.amountRequired')); amountRef.current?.focus(); return; }
    await put('expenses', { ...draft, amount: Math.round(amount * 100) / 100, title: draft.title.trim(), updatedAt: Date.now() });
    await put('projects', { ...projects.find((p) => p.id === draft.projectId)!, updatedAt: Date.now() });
    back(backTo);
  };
  const del = async () => {
    const ok = await confirmDialog({ title: t('pocket.deleteExpenseTitle', { title: draft.title || fmtMoney(draft.amount) }), confirmLabel: t('common.delete'), danger: true });
    if (!ok) return;
    await remove('expenses', draft.id);
    navigate(backTo, { replace: true });
  };

  return (
    <Screen className="screen-no-tabs pocket">
      <TopBar onBack={() => back(backTo)} title={id ? t('pocket.editExpense') : t('pocket.newExpense')} right={<Button size="sm" variant="pocket" onClick={save}>{t('common.save')}</Button>} />

      <div className="amount-hero">
        <div className="section-label">{t('pocket.amount')}</div>
        <label className="amount-input">
          <span className="amount-cur">₾</span>
          <input ref={amountRef} type="text" inputMode="decimal" value={amountText} placeholder="0" autoFocus={!id} onChange={(e: { target: HTMLInputElement }) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))} style={{ width: `${Math.max(1, amountText.length || 1)}ch` }} />
        </label>
        {preview && <div className="small muted">{preview}</div>}
      </div>

      <Field label={t('pocket.titleField')}><TextInput value={draft.title} onChange={(v) => set({ title: v })} placeholder={t('pocket.titlePlaceholder')} /></Field>

      <Field label={t('pocket.category')}>
        <div className="cat-chips">
          {categories.map((c) => {
            const on = c.id === draft.categoryId;
            return (
              <button key={c.id} type="button" className={`chip ${on ? 'chip-active' : ''}`} style={on ? { background: c.color, color: '#17160F' } : { color: 'var(--text)' }} onClick={() => set({ categoryId: c.id })}>
                <span style={{ color: on ? '#17160F' : c.color, display: 'inline-flex' }}><CategoryGlyph name={c.icon} size={16} /></span>{categoryName(c)}
              </button>
            );
          })}
          <button type="button" className="chip chip-dashed" onClick={() => setCatSheet(true)}><IconPlus size={16} /> {t('common.add')}</button>
        </div>
      </Field>

      <div className="grid-2">
        <Field label={t('pocket.project')}>
          <Select value={draft.projectId} onChange={(v) => set({ projectId: v })} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
        </Field>
        <Field label={t('pocket.date')}><input className="input" type="date" value={draft.date} onChange={(e: { target: HTMLInputElement }) => set({ date: e.target.value || draft.date })} /></Field>
      </div>
      <Field label={t('pocket.note')}><TextArea value={draft.note} onChange={(v) => set({ note: v })} placeholder={t('pocket.notePlaceholder')} rows={2} /></Field>

      <Button variant="pocket" full size="lg" onClick={save} className="mt">{t('pocket.saveExpense')}</Button>
      {id && <Button variant="ghost" full className="mt c-danger" onClick={del}>{t('pocket.deleteExpense')}</Button>}

      <CategorySheet open={catSheet} onClose={() => setCatSheet(false)} nextOrder={categories.length} onSaved={(c) => set({ categoryId: c.id })} />
    </Screen>
  );
}
