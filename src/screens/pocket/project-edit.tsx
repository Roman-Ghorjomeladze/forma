import { useEffect, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import type { Project, ProjectStatus } from '../../lib/models.js';
import { categoryName, deleteProject, newProject } from '../../lib/pocket.js';
import { back, navigate } from '../../lib/router.js';
import { useCategories, useExpenses, useProject } from '../../lib/queries.js';
import { Button, Field, NumberInput, Screen, Segmented, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { CategoryBadge } from './pocket-ui.js';

export function PocketProjectEditScreen({ id }: { id?: string }) {
  const t = useT();
  const existing = useProject(id);
  const categories = useCategories();
  const expenses = useExpenses(id);
  const [draft, setDraft] = useState<Project | null>(id ? null : newProject());
  useEffect(() => { if (id && existing) setDraft(existing); }, [id, existing]);

  if (!draft || !categories) return <Screen className="screen-no-tabs" />;
  const set = (patch: Partial<Project>) => setDraft({ ...draft, ...patch });

  const save = async () => {
    const name = draft.name.trim();
    if (!name) { toast(t('pocket.nameRequired')); return; }
    const budgets: Record<string, number> = {};
    for (const [k, v] of Object.entries(draft.categoryBudgets)) if (v > 0) budgets[k] = v;
    await put('projects', { ...draft, name, categoryBudgets: budgets, budget: draft.budget && draft.budget > 0 ? draft.budget : undefined, updatedAt: Date.now() });
    if (id) back(`/pocket/project/${id}`); else navigate(`/pocket/project/${draft.id}`, { replace: true });
  };
  const del = async () => {
    const ok = await confirmDialog({ title: t('pocket.deleteProjectTitle', { name: draft.name }), message: t('pocket.deleteProjectText', { n: expenses?.length ?? 0 }), confirmLabel: t('common.delete'), danger: true });
    if (!ok) return;
    await deleteProject(draft.id);
    navigate('/pocket', { replace: true });
  };

  return (
    <Screen className="screen-no-tabs pocket">
      <TopBar onBack={() => back(id ? `/pocket/project/${id}` : '/pocket')} title={id ? t('pocket.editProject') : t('pocket.newProject')} right={<Button size="sm" variant="pocket" onClick={save}>{t('common.save')}</Button>} />

      <Field label={t('pocket.name')}><TextInput value={draft.name} onChange={(v) => set({ name: v })} placeholder={t('pocket.namePlaceholder')} autoFocus={!id} /></Field>
      <Field label={t('pocket.budget')} hint={t('common.optional')}>
        <NumberInput value={draft.budget ?? ''} onChange={(v) => set({ budget: v })} max={100_000_000} suffix="₾" placeholder="0" className="numwrap-wide" />
      </Field>
      <div className="grid-2">
        <Field label={t('pocket.started')}><input className="input" type="date" value={draft.startDate} onChange={(e: { target: HTMLInputElement }) => set({ startDate: e.target.value || draft.startDate })} /></Field>
        <Field label={t('pocket.status')}>
          <Segmented<ProjectStatus> value={draft.status} onChange={(v) => set({ status: v })} options={[{ value: 'active', label: t('pocket.active') }, { value: 'done', label: t('pocket.done') }]} />
        </Field>
      </div>
      <Field label={t('pocket.notes')}><TextArea value={draft.notes} onChange={(v) => set({ notes: v })} placeholder={t('pocket.notesPlaceholder')} /></Field>

      <Field label={t('pocket.categoryBudgets')} hint={t('pocket.categoryBudgetsHint')}>
        <div className="list">
          {categories.map((c) => (
            <div key={c.id} className="row">
              <CategoryBadge category={c} size={32} />
              <div className="row-main"><div className="row-title">{categoryName(c)}</div></div>
              <NumberInput value={draft.categoryBudgets[c.id] ?? ''} onChange={(v) => set({ categoryBudgets: { ...draft.categoryBudgets, [c.id]: v } })} max={100_000_000} suffix="₾" placeholder={t('pocket.noLimit')} />
            </div>
          ))}
        </div>
      </Field>

      <Button variant="pocket" full size="lg" onClick={save} className="mt">{id ? t('common.saveChanges') : t('pocket.newProject')}</Button>
      {id && <Button variant="ghost" full className="mt c-danger" onClick={del}>{t('pocket.deleteProject')}</Button>}
    </Screen>
  );
}
