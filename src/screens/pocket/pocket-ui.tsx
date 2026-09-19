// Small shared pieces for Pocket screens.
import { useState, type ReactNode } from 'react';
import { put } from '../../lib/db.js';
import { uid } from '../../lib/ids.js';
import { useT } from '../../lib/i18n.js';
import { CATEGORY_COLORS, CATEGORY_ICONS, type Category, type CategoryIcon } from '../../lib/models.js';
import { categoryName, deleteCategory, fmtLari, OTHER_CATEGORY_ID } from '../../lib/pocket.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, IconButton, Progress, Sheet, TextInput } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { CategoryGlyph, IconApps } from '../../ui/icons.js';

/** Round "back to launcher" button used at the top-left of each app's home screen. */
export function AppsButton() {
  const t = useT();
  return <IconButton label={t('home.allApps')} onClick={() => navigate('/')}><IconApps size={20} /></IconButton>;
}

export function CategoryBadge({ category, size = 40 }: { category: Category | undefined; size?: number }) {
  const color = category?.color ?? '#9A978F';
  return (
    <div className="cat-badge" style={{ width: size, height: size, background: `${color}22`, color }}>
      <CategoryGlyph name={category?.icon ?? 'tag'} size={Math.round(size * 0.5)} />
    </div>
  );
}

export function BudgetBar({ spent, budget, height = 10 }: { spent: number; budget: number | undefined; height?: number }) {
  if (!budget) return null;
  const over = spent > budget;
  return <Progress value={spent} max={budget} color={over ? 'var(--danger)' : 'var(--pocket)'} height={height} />;
}

export function BudgetLine({ spent, budget }: { spent: number; budget: number | undefined }) {
  const t = useT();
  if (!budget) return <div className="small muted">{t('pocket.noBudget')}</div>;
  const pct = Math.round((spent / budget) * 100);
  const left = budget - spent;
  return (
    <div className="spread small muted">
      <span>{left >= 0 ? <><b className="num">{fmtLari(left)}</b> {t('pocket.left')}</> : <><b className="num c-danger">{fmtLari(-left)}</b> {t('pocket.over')}</>}</span>
      <span><b className="num">{pct}%</b> {t('pocket.ofBudget')}</span>
    </div>
  );
}

/** Create / edit a category in a bottom sheet. */
export function CategorySheet({ open, onClose, category, nextOrder, usage, onSaved }: { open: boolean; onClose: () => void; category?: Category; nextOrder: number; usage?: number; onSaved?: (c: Category) => void }) {
  const t = useT();
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState<CategoryIcon>(category?.icon ?? 'box');
  const [key, setKey] = useState(0);
  const reset = (c?: Category) => { setName(c?.name ?? ''); setColor(c?.color ?? CATEGORY_COLORS[0]); setIcon(c?.icon ?? 'box'); setKey((k) => k + 1); };
  // Re-seed the form whenever the sheet opens for a (different) category.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) reset(category); }

  const save = async () => {
    const n = name.trim();
    if (!n) { toast(t('pocket.nameRequired')); return; }
    const c: Category = category ? { ...category, name: n, color, icon } : { id: uid('cat'), name: n, color, icon, order: nextOrder, createdAt: Date.now() };
    await put('categories', c);
    onSaved?.(c);
    onClose();
  };
  const del = async () => {
    if (!category) return;
    const ok = await confirmDialog({ title: t('pocket.deleteCategoryTitle', { name: categoryName(category) }), message: usage ? t('pocket.deleteCategoryText', { n: usage }) : undefined, confirmLabel: t('common.delete'), danger: true });
    if (!ok) return;
    await deleteCategory(category.id);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={category ? t('pocket.editCategory') : t('pocket.newCategory')} footer={<>
      {category && category.id !== OTHER_CATEGORY_ID && <Button variant="danger" onClick={del}>{t('common.delete')}</Button>}
      <Button variant="pocket" onClick={save}>{category ? t('common.save') : t('pocket.addCategory')}</Button>
    </>}>
      <div key={key}>
        <Field label={t('pocket.categoryName')}><TextInput value={name} onChange={setName} placeholder={t('pocket.categoryNamePlaceholder')} autoFocus={!category} /></Field>
        <Field label={t('pocket.colour')}>
          <div className="swatches">
            {CATEGORY_COLORS.map((c) => <button key={c} type="button" aria-label={c} className={`swatch ${c === color ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />)}
          </div>
        </Field>
        <Field label={t('pocket.icon')}>
          <div className="icon-grid">
            {CATEGORY_ICONS.map((i) => <button key={i} type="button" aria-label={i} className={`icon-pick ${i === icon ? 'active' : ''}`} onClick={() => setIcon(i)} style={i === icon ? { background: color, color: '#17160F' } : undefined}><CategoryGlyph name={i} size={20} /></button>)}
          </div>
        </Field>
      </div>
    </Sheet>
  );
}

export function StatusPill({ status }: { status: 'active' | 'done' }) {
  const t = useT();
  return <span className={`tag ${status === 'active' ? 'tag-meals' : ''}`}>{status === 'active' ? t('pocket.active') : t('pocket.done')}</span>;
}

export function Fab({ children, onClick, tone = 'pocket', aboveTabs = false }: { children: ReactNode; onClick: () => void; tone?: 'pocket' | 'tree'; aboveTabs?: boolean }) {
  return (
    <div className={`fab-wrap ${aboveTabs ? 'sticky-cta-above-tabs' : ''}`}>
      <button type="button" className={`fab fab-${tone}`} onClick={onClick}>{children}</button>
    </div>
  );
}
