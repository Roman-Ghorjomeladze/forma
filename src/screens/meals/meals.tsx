import { useMemo, useState } from 'react';
import { bulkPut, bulkRemove, put, remove } from '../../lib/db.js';
import { uid } from '../../lib/ids.js';
import { addDays, dayOfMonth, formatRange, relativeDay, startOfWeek, todayKey, weekDays, weekdayShort } from '../../lib/dates.js';
import { localizedDishName } from '../../data/seed-i18n.js';
import { useProfile } from '../../lib/hooks.js';
import { useLang, useT } from '../../lib/i18n.js';
import { MEAL_CATEGORIES, type MealCategory, type MealSlot } from '../../lib/models.js';
import { dayNutrition, perServing } from '../../lib/nutrition.js';
import { useDishMap, useMealSlots } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, IconButton, Row, Screen, Sheet, Stepper, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconBack, IconBowl, IconCart, IconCheck, IconChevron, IconCopy, IconMore, IconPlus, IconTrash } from '../../ui/icons.js';
import { AddDishSheet } from './add-dish-sheet.js';
import { DishThumb } from './dish-thumb.js';

export function MealsScreen() {
  const t = useT();
  const lang = useLang();
  const LABEL: Record<MealCategory, string> = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
  const [profile] = useProfile();
  const today = todayKey();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, profile.weekStartsOn));
  const [selected, setSelected] = useState(today);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const slots = useMealSlots(days);
  const dishes = useDishMap();
  const [adding, setAdding] = useState<MealCategory | 'any' | null>(null);
  const [editing, setEditing] = useState<MealSlot | null>(null);
  const [menu, setMenu] = useState(false);

  const daySlots = useMemo(() => (slots ?? []).filter((s) => s.date === selected), [slots, selected]);
  const totals = useMemo(() => (dishes ? dayNutrition(daySlots, dishes) : null), [daySlots, dishes]);
  const hasDay = useMemo(() => new Set((slots ?? []).map((s) => s.date)), [slots]);

  const shiftWeek = (n: number) => {
    const ws = addDays(weekStart, n * 7);
    setWeekStart(ws);
    setSelected(addDays(selected, n * 7));
  };
  const goToday = () => { setWeekStart(startOfWeek(today, profile.weekStartsOn)); setSelected(today); };

  const copyDayTo = async (target: string) => {
    const rows = daySlots.map((s) => ({ ...s, id: uid('slot'), date: target, eaten: false, order: Date.now() + s.order % 1000 }));
    await bulkPut('mealSlots', rows);
    toast(t('meals.copiedToDay', { day: relativeDay(target) }));
  };

  const copyLastWeek = async () => {
    const { getByIndex } = await import('../../lib/db.js');
    const prev = weekDays(addDays(weekStart, -7));
    const prevSlots = await getByIndex('mealSlots', 'date', IDBKeyRange.bound(prev[0], prev[6]));
    if (prevSlots.length === 0) { toast(t('meals.lastWeekEmpty')); return; }
    if (slots && slots.length > 0) {
      const ok = await confirmDialog({ title: t('meals.replaceWeekTitle'), message: t('meals.replaceWeekMsg'), confirmLabel: t('common.replace'), danger: true });
      if (!ok) return;
      await bulkRemove('mealSlots', slots.map((s) => s.id));
    }
    await bulkPut('mealSlots', prevSlots.map((s) => ({ ...s, id: uid('slot'), date: addDays(s.date, 7), eaten: false })));
    toast(t('meals.copiedLastWeek'));
  };

  const clearDay = async () => {
    if (daySlots.length === 0) return;
    const ok = await confirmDialog({ title: t('meals.clearDayTitle', { day: relativeDay(selected) }), confirmLabel: t('common.clear'), danger: true });
    if (ok) await bulkRemove('mealSlots', daySlots.map((s) => s.id));
  };

  return (
    <Screen>
      <TopBar large eyebrow={<button onClick={goToday}>{formatRange(days[0], days[6])}{weekStart !== startOfWeek(today, profile.weekStartsOn) ? t('meals.backToToday') : ''}</button>} title={t('meals.title')}
        right={<>
          <IconButton label={t('meals.shoppingList')} onClick={() => navigate('/forma/meals/shopping?week=' + weekStart)}><IconCart size={20} /></IconButton>
          <IconButton label={t('meals.dishes')} onClick={() => navigate('/forma/meals/dishes')}><IconBowl size={20} /></IconButton>
          <IconButton label={t('meals.more')} onClick={() => setMenu(true)}><IconMore size={20} /></IconButton>
        </>} />

      <div className="weeknav">
        <button className="iconbtn iconbtn-plain" aria-label={t('meals.previousWeek')} onClick={() => shiftWeek(-1)}><IconBack /></button>
        <span className="small muted bold">{formatRange(days[0], days[6])}</span>
        <button className="iconbtn iconbtn-plain" aria-label={t('meals.nextWeek')} onClick={() => shiftWeek(1)}><IconChevron /></button>
      </div>

      <div className="weekstrip">
        {days.map((d) => (
          <button key={d} className={`weekday ${d === selected ? 'active' : ''} ${d === today ? 'today' : ''}`} onClick={() => setSelected(d)}>
            <span className="weekday-name">{weekdayShort(d)}</span>
            <span className="weekday-num">{dayOfMonth(d)}</span>
            <span className={`weekday-dot ${hasDay.has(d) ? 'has' : ''}`} />
          </button>
        ))}
      </div>

      <div className="daytotals">
        <div className="daytotals-kcal">
          <span className="big">{Math.round(totals?.kcal ?? 0).toLocaleString()}</span>
          <span className="small muted">/ {profile.targetKcal.toLocaleString()} {t('unit.kcal')}</span>
        </div>
        <div className="daytotals-macros">
          <span className="c-protein">P {Math.round(totals?.protein ?? 0)}</span>
          <span className="c-carbs">C {Math.round(totals?.carbs ?? 0)}</span>
          <span className="c-fat">F {Math.round(totals?.fat ?? 0)}</span>
        </div>
      </div>

      <div className="spread mb">
        <span className="bold">{relativeDay(selected)}</span>
        <div className="hstack" style={{ gap: 6 }}>
          {daySlots.length > 0 && <Button size="sm" variant="ghost" icon={<IconTrash size={16} />} onClick={clearDay}>{t('common.clear')}</Button>}
        </div>
      </div>

      {MEAL_CATEGORIES.map((cat) => {
        const rows = daySlots.filter((s) => s.slot === cat);
        return (
          <section key={cat} className="section" style={{ marginBottom: 14 }}>
            <div className="section-label">{LABEL[cat]}</div>
            {rows.length > 0 && (
              <div className="list">
                {rows.map((slot) => {
                  const dish = dishes?.get(slot.dishId);
                  if (!dish) return null;
                  const n = perServing(dish);
                  return (
                    <Row key={slot.id} className={slot.eaten ? 'row-done' : ''} onClick={() => setEditing(slot)} right={
                      <button className={`check ${slot.eaten ? 'on' : ''}`} aria-label={t('meals.toggleEaten')} onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); put('mealSlots', { ...slot, eaten: !slot.eaten }); }}>
                        {slot.eaten && <IconCheck size={14} strokeWidth={3} />}
                      </button>
                    }>
                      <DishThumb dish={dish} />
                      <div className="row-main">
                        <div className="row-title">{localizedDishName(dish.id, dish.name, lang)}</div>
                        <div className="row-sub">{slot.servings} {slot.servings === 1 ? t('unit.serving') : t('unit.servings')} · {Math.round(n.kcal * slot.servings)} {t('unit.kcal')} · {Math.round(n.protein * slot.servings)} g {t('dish.protein')}</div>
                      </div>
                    </Row>
                  );
                })}
              </div>
            )}
            <button className="addslot" onClick={() => setAdding(cat)}><IconPlus size={18} />{rows.length > 0 ? t('meals.addAnother') : t('meals.addADish')}</button>
          </section>
        );
      })}

      <AddDishSheet open={adding !== null} onClose={() => setAdding(null)} date={selected} slot={adding && adding !== 'any' ? adding : undefined} />

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={(() => { const d = editing && dishes?.get(editing.dishId); return d ? localizedDishName(d.id, d.name, lang) : undefined; })()}>
        {editing && (
          <div className="stack">
            <div className="spread">
              <span className="bold">{t('meals.servings')}</span>
              <Stepper value={editing.servings} min={0.5} max={10} step={0.5} onChange={(v) => { const s = { ...editing, servings: v }; setEditing(s); put('mealSlots', s); }} />
            </div>
            <div className="spread">
              <span className="bold">{t('meals.meal')}</span>
              <div className="hstack" style={{ gap: 6 }}>
                {MEAL_CATEGORIES.map((c) => <button key={c} className={`chip chip-meals ${editing.slot === c ? 'chip-active' : ''}`} onClick={() => { const s = { ...editing, slot: c }; setEditing(s); put('mealSlots', s); }}>{LABEL[c]}</button>)}
              </div>
            </div>
            <div className="divider" />
            <Button variant="secondary" full onClick={() => { navigate(`/forma/meals/dish/${editing.dishId}`); setEditing(null); }}>{t('meals.viewRecipe')}</Button>
            <Button variant="secondary" full icon={<IconCopy size={18} />} onClick={async () => { await put('mealSlots', { ...editing, id: uid('slot'), date: addDays(editing.date, 1), eaten: false }); toast(t('meals.copiedToNextDay')); setEditing(null); }}>{t('meals.copyToNextDay')}</Button>
            <Button variant="danger" full icon={<IconTrash size={18} />} onClick={async () => { await remove('mealSlots', editing.id); setEditing(null); }}>{t('meals.removeFromPlan')}</Button>
          </div>
        )}
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title={t('meals.thisWeek')}>
        <div className="stack">
          <Button variant="secondary" full icon={<IconCopy size={18} />} onClick={async () => { setMenu(false); await copyLastWeek(); }}>{t('meals.copyLastWeekPlan')}</Button>
          <Button variant="secondary" full icon={<IconCopy size={18} />} disabled={daySlots.length === 0} onClick={async () => { setMenu(false); await copyDayTo(addDays(selected, 1)); }}>{t('meals.copyDayToNext', { day: relativeDay(selected).toLowerCase() })}</Button>
          <Button variant="secondary" full icon={<IconCopy size={18} />} disabled={daySlots.length === 0} onClick={async () => {
            setMenu(false);
            const ok = await confirmDialog({ title: t('meals.repeatDayTitle'), message: t('meals.repeatDayMsg'), confirmLabel: t('common.copy') });
            if (!ok) return;
            for (const d of days) if (d !== selected) await copyDayTo(d);
          }}>{t('meals.repeatDayForWeek', { day: relativeDay(selected).toLowerCase() })}</Button>
          <Button variant="secondary" full icon={<IconCart size={18} />} onClick={() => { setMenu(false); navigate('/forma/meals/shopping?week=' + weekStart); }}>{t('meals.shoppingListForWeek')}</Button>
          <Button variant="danger" full icon={<IconTrash size={18} />} disabled={!slots || slots.length === 0} onClick={async () => {
            setMenu(false);
            const ok = await confirmDialog({ title: t('meals.clearWholeWeekTitle'), confirmLabel: t('meals.clearWeek'), danger: true });
            if (ok && slots) await bulkRemove('mealSlots', slots.map((s) => s.id));
          }}>{t('meals.clearThisWeek')}</Button>
        </div>
      </Sheet>
    </Screen>
  );
}
