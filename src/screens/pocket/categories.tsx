import { useMemo, useState } from 'react';
import { bulkPut } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import type { Category } from '../../lib/models.js';
import { categoryName, fmtMoney } from '../../lib/pocket.js';
import { useAllExpenses, useCategories } from '../../lib/queries.js';
import { Button, Empty, IconButton, Screen, TopBar } from '../../ui/components.js';
import { IconArrowDown, IconArrowUp, IconEdit, IconPlus } from '../../ui/icons.js';
import { CategoryBadge, CategorySheet } from './pocket-ui.js';

export function PocketCategoriesScreen() {
  const t = useT();
  const categories = useCategories();
  const expenses = useAllExpenses();
  const [editing, setEditing] = useState<Category | null | undefined>(undefined); // undefined = closed, null = new

  const usage = useMemo(() => {
    const m = new Map<string, { n: number; total: number }>();
    for (const e of expenses ?? []) { const u = m.get(e.categoryId) ?? { n: 0, total: 0 }; u.n++; u.total += e.amount; m.set(e.categoryId, u); }
    return m;
  }, [expenses]);

  const move = async (i: number, dir: -1 | 1) => {
    if (!categories) return;
    const j = i + dir;
    if (j < 0 || j >= categories.length) return;
    const list = categories.map((c, k) => ({ ...c, order: k }));
    [list[i].order, list[j].order] = [list[j].order, list[i].order];
    await bulkPut('categories', list);
  };

  return (
    <Screen className="screen-no-tabs pocket">
      <TopBar large backTo="/pocket" title={t('pocket.categories')} eyebrow={`${t('pocket.title')} · ${t('pocket.usedAcross')}`} right={<IconButton label={t('pocket.newCategory')} tone="pocket" onClick={() => setEditing(null)}><IconPlus /></IconButton>} />
      {categories && categories.length === 0 && <Empty title={t('pocket.noCategories')} action={<Button variant="pocket" onClick={() => setEditing(null)}>{t('pocket.newCategory')}</Button>} />}
      <div className="list">
        {(categories ?? []).map((c, i) => {
          const u = usage.get(c.id);
          return (
            <div key={c.id} className="row">
              <CategoryBadge category={c} />
              <div className="row-main">
                <div className="row-title">{categoryName(c)}</div>
                <div className="row-sub">{t('pocket.categoryUsage', { n: u?.n ?? 0, total: fmtMoney(u?.total ?? 0) })}</div>
              </div>
              <div className="block-actions">
                <IconButton label={t('pocket.moveUp')} onClick={() => move(i, -1)}><IconArrowUp size={16} /></IconButton>
                <IconButton label={t('pocket.moveDown')} onClick={() => move(i, 1)}><IconArrowDown size={16} /></IconButton>
                <IconButton label={t('common.edit')} onClick={() => setEditing(c)}><IconEdit size={16} /></IconButton>
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="secondary" full className="mt" icon={<IconPlus size={18} />} onClick={() => setEditing(null)}>{t('pocket.newCategory')}</Button>
      <CategorySheet open={editing !== undefined} onClose={() => setEditing(undefined)} category={editing ?? undefined} nextOrder={categories?.length ?? 0} usage={editing ? usage.get(editing.id)?.n : undefined} />
    </Screen>
  );
}
