import { useMemo, useState } from 'react';
import { put } from '../../lib/db.js';
import { uid } from '../../lib/ids.js';
import { useT } from '../../lib/i18n.js';
import { MEAL_CATEGORIES, type Dish, type MealCategory } from '../../lib/models.js';
import { perServing } from '../../lib/nutrition.js';
import { useDishes } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Chip, Row, Sheet, Stepper } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { DishThumb } from './dish-thumb.js';

/** Pick a dish (and servings) to add to a day/slot. */
export function AddDishSheet({ open, onClose, date, slot }: { open: boolean; onClose: () => void; date: string; slot?: MealCategory }) {
  const t = useT();
  const LABEL: Record<MealCategory, string> = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
  const dishes = useDishes();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<MealCategory | 'all'>(slot ?? 'all');
  const [picked, setPicked] = useState<Dish | null>(null);
  const [servings, setServings] = useState(1);
  const [targetSlot, setTargetSlot] = useState<MealCategory>(slot ?? 'lunch');

  const filtered = useMemo(() => {
    const list = dishes ?? [];
    const ql = q.trim().toLowerCase();
    return list
      .filter((d) => cat === 'all' || d.category === cat)
      .filter((d) => !ql || d.name.toLowerCase().includes(ql) || d.tags.some((tag) => tag.toLowerCase().includes(ql)))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
  }, [dishes, q, cat]);

  const reset = () => { setPicked(null); setServings(1); setQ(''); };
  const close = () => { reset(); onClose(); };

  const add = async () => {
    if (!picked) return;
    await put('mealSlots', { id: uid('slot'), date, slot: targetSlot, dishId: picked.id, servings, eaten: false, order: Date.now() });
    toast(t('common.addedName', { name: picked.name }));
    close();
  };

  return (
    <Sheet open={open} onClose={close} title={picked ? picked.name : t('today.addDish')} full
      footer={picked ? (
        <>
          <Button variant="secondary" onClick={() => setPicked(null)}>{t('common.back')}</Button>
          <Button variant="meals" onClick={add}>{t('meals.addTo', { meal: LABEL[targetSlot].toLowerCase() })}</Button>
        </>
      ) : undefined}>
      {picked ? (
        <div className="stack">
          <div className="hstack" style={{ gap: 14 }}>
            <DishThumb dish={picked} large />
            <div>
              <div className="bold">{Math.round(perServing(picked).kcal * servings)} {t('unit.kcal')}</div>
              <div className="small muted">{Math.round(perServing(picked).protein * servings)} g {t('dish.protein')} · {t('dish.perServing')} {servings === 1 ? t('unit.serving') : `${servings} ${t('unit.servings')}`}</div>
            </div>
          </div>
          <div className="spread mt">
            <span className="bold">{t('meals.servings')}</span>
            <Stepper value={servings} onChange={setServings} min={0.5} max={10} step={0.5} />
          </div>
          <div className="spread">
            <span className="bold">{t('meals.meal')}</span>
            <div className="hstack" style={{ gap: 6 }}>
              {MEAL_CATEGORIES.map((c) => <Chip key={c} tone="meals" active={targetSlot === c} onClick={() => setTargetSlot(c)}>{LABEL[c]}</Chip>)}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="searchbar">
            <IconSearch size={18} />
            <input className="input" placeholder={t('dish.search')} value={q} onChange={(e: { target: HTMLInputElement }) => setQ(e.target.value)} />
          </div>
          <div className="chips" style={{ margin: '0 0 10px', padding: 0 }}>
            <Chip tone="meals" active={cat === 'all'} onClick={() => setCat('all')}>{t('dish.all')}</Chip>
            {MEAL_CATEGORIES.map((c) => <Chip key={c} tone="meals" active={cat === c} onClick={() => setCat(c)}>{LABEL[c]}</Chip>)}
          </div>
          <div className="list">
            {filtered.map((d) => {
              const n = perServing(d);
              return (
                <Row key={d.id} onClick={() => { setPicked(d); setTargetSlot(slot ?? d.category); }} right={<span className="num">{Math.round(n.kcal)}</span>}>
                  <DishThumb dish={d} small />
                  <div className="row-main">
                    <div className="row-title">{d.favorite ? '★ ' : ''}{d.name}</div>
                    <div className="row-sub">{LABEL[d.category]} · {Math.round(n.protein)} g {t('dish.protein')}</div>
                  </div>
                </Row>
              );
            })}
            {filtered.length === 0 && <div className="empty"><div className="empty-title">{t('dish.noDishesMatch')}</div></div>}
          </div>
          <Button variant="secondary" full className="mt" icon={<IconPlus size={18} />} onClick={() => { close(); navigate(`/meals/dish/new?date=${date}&slot=${targetSlot}`); }}>{t('dish.createNewDish')}</Button>
        </>
      )}
    </Sheet>
  );
}
