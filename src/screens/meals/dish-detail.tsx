import { useState } from 'react';
import { put, remove } from '../../lib/db.js';
import { todayKey } from '../../lib/dates.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { dishTotal, fmtAmount, perServing } from '../../lib/nutrition.js';
import { useDish } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, IconButton, Screen, Segmented, Stat } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconBack, IconCalendar, IconClock, IconEdit, IconHeart, IconTrash, IconUser } from '../../ui/icons.js';
import { addDays, relativeDay } from '../../lib/dates.js';
import { uid } from '../../lib/ids.js';
import { MEAL_CATEGORIES, type MealCategory } from '../../lib/models.js';
import { Sheet, Stepper } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';

const LABEL: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

export function DishDetailScreen({ id }: { id: string }) {
  const dish = useDish(id);
  const url = useBlobUrl(dish?.imageBlobId);
  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [adding, setAdding] = useState(false);

  if (dish === undefined) return <Screen />;
  if (dish === null) return <Screen className="screen-no-tabs"><Empty title="Dish not found" action={<Button variant="secondary" onClick={() => navigate('/meals/dishes')}>Back to dishes</Button>} /></Screen>;

  const n = perServing(dish);
  const total = dishTotal(dish);
  const del = async () => {
    const ok = await confirmDialog({ title: `Delete “${dish.name}”?`, message: 'It will also disappear from any planned days.', confirmLabel: 'Delete', danger: true });
    if (ok) { await remove('dishes', dish.id); navigate('/meals/dishes', { replace: true }); }
  };

  return (
    <Screen className="screen-no-tabs" >
      <div className="hero">
        {url && <img src={url} alt="" />}
        {!url && <svg className="hero-deco" width="220" height="220" viewBox="0 0 220 220" fill="none" stroke="currentColor"><circle cx="110" cy="110" r="90" strokeWidth="10" /><circle cx="110" cy="110" r="55" strokeWidth="6" /></svg>}
        <div className="hero-actions">
          <div><IconButton label="Back" onClick={() => history.length > 1 ? history.back() : navigate('/meals/dishes')}><IconBack /></IconButton></div>
          <div>
            <IconButton label={dish.favorite ? 'Unfavorite' : 'Favorite'} onClick={() => put('dishes', { ...dish, favorite: !dish.favorite })}><IconHeart filled={dish.favorite} /></IconButton>
            <IconButton label="Edit" onClick={() => navigate(`/meals/dish/${dish.id}/edit`)}><IconEdit /></IconButton>
            <IconButton label="Delete" onClick={del}><IconTrash /></IconButton>
          </div>
        </div>
      </div>

      <div className="stack" style={{ paddingTop: 18, paddingBottom: 90 }}>
        <div className="tags">
          <span className="tag tag-meals">{LABEL[dish.category]}</span>
          {dish.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
        <h1 className="dish-title">{dish.name}</h1>
        <div className="meta">
          {dish.prepMin + dish.cookMin > 0 && <span><IconClock size={15} strokeWidth={2.2} />{dish.prepMin + dish.cookMin} min{dish.cookMin > 0 && dish.prepMin > 0 ? ` (${dish.prepMin} prep)` : ''}</span>}
          <span><IconUser size={15} strokeWidth={2.2} />{dish.servings} {dish.servings === 1 ? 'serving' : 'servings'}</span>
        </div>

        <div className="stats mt">
          <Stat tone="dark" value={Math.round(n.kcal)} label="kcal" />
          <Stat tone="protein" value={`${Math.round(n.protein)}g`} label="protein" />
          <Stat tone="carbs" value={`${Math.round(n.carbs)}g`} label="carbs" />
          <Stat tone="fat" value={`${Math.round(n.fat)}g`} label="fat" />
        </div>
        <div className="small muted" style={{ textAlign: 'center' }}>per serving{dish.nutritionOverride ? ' (entered manually)' : dish.servings > 1 ? ` · whole recipe ${Math.round(total.kcal)} kcal` : ''}</div>

        <div className="mt">
          <Segmented value={tab} onChange={setTab} options={[{ value: 'ingredients', label: `Ingredients (${dish.ingredients.length})` }, { value: 'steps', label: `Steps (${dish.steps.length})` }]} />
        </div>

        {tab === 'ingredients' ? (
          <div className="list">
            {dish.ingredients.length === 0 && <div className="empty"><div className="empty-text">No ingredients listed.</div></div>}
            {dish.ingredients.map((i) => (
              <div key={i.id} className="row">
                <div className="row-main">
                  <div className="row-title">{i.name}</div>
                  <div className="row-sub">{fmtAmount(i.amount)} {i.unit}</div>
                </div>
                <div className="row-right muted small num">{Math.round(i.kcal)} kcal</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="list steps">
            {dish.steps.length === 0 && <div className="empty"><div className="empty-text">No cooking steps yet.</div></div>}
            {dish.steps.map((s, i) => (
              <div key={i} className="step"><div className="step-n">{i + 1}</div><div className="step-text">{s}</div></div>
            ))}
          </div>
        )}
        {dish.notes && <div className="card small muted">{dish.notes}</div>}
      </div>

      <div className="sticky-cta">
        <Button variant="meals" size="lg" full icon={<IconCalendar size={20} />} onClick={() => setAdding(true)}>Add to a day</Button>
      </div>
      <AddToDaySheet open={adding} onClose={() => setAdding(false)} dishId={dish.id} />
    </Screen>
  );
}

/** Pick a day, meal and servings for this dish. */
function AddToDaySheet({ open, onClose, dishId }: { open: boolean; onClose: () => void; dishId: string }) {
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState<MealCategory>('lunch');
  const [servings, setServings] = useState(1);
  const days = Array.from({ length: 8 }, (_, i) => addDays(todayKey(), i));
  const add = async () => {
    await put('mealSlots', { id: uid('slot'), date, slot, dishId, servings, eaten: false, order: Date.now() });
    toast(`Added to ${relativeDay(date)}`);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add to a day" footer={<Button variant="meals" onClick={add}>Add to {LABEL[slot].toLowerCase()}</Button>}>
      <div className="stack">
        <div className="section-label">Day</div>
        <div className="chips" style={{ margin: 0, padding: 0 }}>
          {days.map((d) => <button key={d} className={`chip chip-meals ${d === date ? 'chip-active' : ''}`} onClick={() => setDate(d)}>{relativeDay(d).replace(/,.*$/, '')}</button>)}
        </div>
        <div className="section-label mt">Meal</div>
        <div className="hstack wrap" style={{ gap: 6 }}>
          {MEAL_CATEGORIES.map((c) => <button key={c} className={`chip chip-meals ${slot === c ? 'chip-active' : ''}`} onClick={() => setSlot(c)}>{LABEL[c]}</button>)}
        </div>
        <div className="spread mt">
          <span className="bold">Servings</span>
          <Stepper value={servings} min={0.5} max={10} step={0.5} onChange={setServings} />
        </div>
      </div>
    </Sheet>
  );
}
