import { useMemo, useState } from 'react';
import { put } from '../../lib/db.js';
import { uid } from '../../lib/ids.js';
import { MEAL_CATEGORIES, type Dish, type MealCategory } from '../../lib/models.js';
import { perServing } from '../../lib/nutrition.js';
import { useDishes } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Chip, Row, Sheet, Stepper } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { DishThumb } from './dish-thumb.js';

const LABEL: Record<MealCategory, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

/** Pick a dish (and servings) to add to a day/slot. */
export function AddDishSheet({ open, onClose, date, slot }: { open: boolean; onClose: () => void; date: string; slot?: MealCategory }) {
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
      .filter((d) => !ql || d.name.toLowerCase().includes(ql) || d.tags.some((t) => t.toLowerCase().includes(ql)))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
  }, [dishes, q, cat]);

  const reset = () => { setPicked(null); setServings(1); setQ(''); };
  const close = () => { reset(); onClose(); };

  const add = async () => {
    if (!picked) return;
    await put('mealSlots', { id: uid('slot'), date, slot: targetSlot, dishId: picked.id, servings, eaten: false, order: Date.now() });
    toast(`Added ${picked.name}`);
    close();
  };

  return (
    <Sheet open={open} onClose={close} title={picked ? picked.name : 'Add a dish'} full
      footer={picked ? (
        <>
          <Button variant="secondary" onClick={() => setPicked(null)}>Back</Button>
          <Button variant="meals" onClick={add}>Add to {LABEL[targetSlot].toLowerCase()}</Button>
        </>
      ) : undefined}>
      {picked ? (
        <div className="stack">
          <div className="hstack" style={{ gap: 14 }}>
            <DishThumb dish={picked} large />
            <div>
              <div className="bold">{Math.round(perServing(picked).kcal * servings)} kcal</div>
              <div className="small muted">{Math.round(perServing(picked).protein * servings)} g protein · per {servings === 1 ? 'serving' : `${servings} servings`}</div>
            </div>
          </div>
          <div className="spread mt">
            <span className="bold">Servings</span>
            <Stepper value={servings} onChange={setServings} min={0.5} max={10} step={0.5} />
          </div>
          <div className="spread">
            <span className="bold">Meal</span>
            <div className="hstack" style={{ gap: 6 }}>
              {MEAL_CATEGORIES.map((c) => <Chip key={c} tone="meals" active={targetSlot === c} onClick={() => setTargetSlot(c)}>{LABEL[c]}</Chip>)}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="searchbar">
            <IconSearch size={18} />
            <input className="input" placeholder="Search dishes" value={q} onChange={(e: { target: HTMLInputElement }) => setQ(e.target.value)} />
          </div>
          <div className="chips" style={{ margin: '0 0 10px', padding: 0 }}>
            <Chip tone="meals" active={cat === 'all'} onClick={() => setCat('all')}>All</Chip>
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
                    <div className="row-sub">{LABEL[d.category]} · {Math.round(n.protein)} g protein</div>
                  </div>
                </Row>
              );
            })}
            {filtered.length === 0 && <div className="empty"><div className="empty-title">No dishes match</div></div>}
          </div>
          <Button variant="secondary" full className="mt" icon={<IconPlus size={18} />} onClick={() => { close(); navigate(`/meals/dish/new?date=${date}&slot=${targetSlot}`); }}>Create a new dish</Button>
        </>
      )}
    </Sheet>
  );
}
