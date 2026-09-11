import { useMemo, useState } from 'react';
import { put } from '../lib/db.js';
import { addDays, fmtDuration, formatLong, todayKey } from '../lib/dates.js';
import { localizedDishName, localizedWorkoutName } from '../data/seed-i18n.js';
import { useProfile } from '../lib/hooks.js';
import { useLang, useT } from '../lib/i18n.js';
import { navigate } from '../lib/router.js';
import { useDishMap, useExerciseMap, useMealSlots, useSchedule, useSessions, useWorkouts } from '../lib/queries.js';
import { dayNutrition, perServing } from '../lib/nutrition.js';
import { estimateWorkout } from '../lib/calories.js';
import { MEAL_CATEGORIES, type MealSlot } from '../lib/models.js';
import { Button, Card, Empty, MacroBar, Row, Screen, Section, TopBar } from '../ui/components.js';
import { IconCheck, IconChevron, IconDumbbell, IconFlame, IconPlus } from '../ui/icons.js';
import { DishThumb } from './meals/dish-thumb.js';
import { AddDishSheet } from './meals/add-dish-sheet.js';

export function TodayScreen() {
  const t = useT();
  const lang = useLang();
  const SLOT_LABEL: Record<string, string> = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
  const today = todayKey();
  const [profile] = useProfile();
  const slots = useMealSlots([today]);
  const dishes = useDishMap();
  const exercises = useExerciseMap();
  const workouts = useWorkouts();
  const schedule = useSchedule();
  const sessions = useSessions(400);
  const [adding, setAdding] = useState(false);

  const eaten = useMemo(() => (slots && dishes ? dayNutrition(slots, dishes, true) : null), [slots, dishes]);
  const planned = useMemo(() => (slots && dishes ? dayNutrition(slots, dishes, false) : null), [slots, dishes]);

  const todaySessions = useMemo(() => (sessions ?? []).filter((s) => new Date(s.startedAt).toDateString() === new Date().toDateString()), [sessions]);
  const burned = todaySessions.reduce((s, x) => s + x.kcal, 0);
  const remaining = profile.targetKcal - (eaten?.kcal ?? 0) + burned;

  const weekday = new Date().getDay();
  const scheduledId = schedule?.find((s) => s.weekday === weekday)?.workoutId;
  const scheduled = workouts?.find((w) => w.id === scheduledId);
  const est = scheduled && exercises ? estimateWorkout(scheduled, exercises, profile.weightKg) : null;
  const doneToday = todaySessions.length > 0;

  const streak = useMemo(() => {
    if (!sessions) return 0;
    const days = new Set(sessions.map((s) => {
      const d = new Date(s.startedAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }));
    let n = 0;
    let k = today;
    if (!days.has(k)) k = addDays(k, -1);
    while (days.has(k)) { n++; k = addDays(k, -1); }
    return n;
  }, [sessions, today]);

  const weekMinutes = useMemo(() => {
    const since = Date.now() - 7 * 86400e3;
    return Math.round((sessions ?? []).filter((s) => s.startedAt >= since).reduce((a, s) => a + s.activeSeconds, 0) / 60);
  }, [sessions]);

  const toggleEaten = async (slot: MealSlot) => put('mealSlots', { ...slot, eaten: !slot.eaten });

  const eatenPct = Math.min(100, ((eaten?.kcal ?? 0) / Math.max(1, profile.targetKcal)) * 100);
  const burnedPct = Math.min(100 - eatenPct, (burned / Math.max(1, profile.targetKcal)) * 100);

  return (
    <Screen>
      <TopBar large eyebrow={formatLong(today)} title={t('today.title')} right={streak > 0 ? <span className="streak"><IconFlame size={16} strokeWidth={2.2} />{t('today.streak', { n: streak })}</span> : undefined} />

      <Card dark className="energy mb">
        <div className="energy-top">
          <div className="energy-left">
            <span className="energy-big">{Math.round(remaining).toLocaleString()}</span>
            <span className="muted" style={{ fontWeight: 600, fontSize: 14 }}>{t('today.kcalLeft')}</span>
          </div>
          <span className="muted small">{t('today.target', { n: profile.targetKcal.toLocaleString() })}</span>
        </div>
        <div className="energy-bar">
          <div style={{ width: `${eatenPct}%`, background: 'var(--meals)' }} />
          <div style={{ width: `${burnedPct}%`, background: 'var(--workout)' }} />
        </div>
        <div className="energy-legend">
          <span><i className="dot" style={{ background: 'var(--meals)' }} />{t('today.eaten', { n: Math.round(eaten?.kcal ?? 0).toLocaleString() })}</span>
          <span><i className="dot" style={{ background: 'var(--workout)' }} />{t('today.burned', { n: Math.round(burned).toLocaleString() })}</span>
          {planned && planned.kcal !== (eaten?.kcal ?? 0) && <span>{t('today.planned', { n: Math.round(planned.kcal).toLocaleString() })}</span>}
        </div>
        <div className="macros">
          <MacroBar label={t('today.macro.protein')} value={eaten?.protein ?? 0} target={profile.targetProtein} color="var(--protein)" />
          <MacroBar label={t('today.macro.carbs')} value={eaten?.carbs ?? 0} target={profile.targetCarbs} color="var(--carbs)" />
          <MacroBar label={t('today.macro.fat')} value={eaten?.fat ?? 0} target={profile.targetFat} color="var(--fat)" />
        </div>
      </Card>

      <Section title={t('today.workout')} right={<span>{doneToday ? t('today.doneToday', { n: todaySessions.length }) : scheduled ? t('today.scheduledToday') : weekMinutes > 0 ? t('today.minThisWeek', { n: weekMinutes }) : undefined}</span>}>
        {scheduled ? (
          <Card>
            <div className="workout-card">
              <div className="thumb thumb-workout"><IconDumbbell strokeWidth={2.2} /></div>
              <div className="row-main">
                <div className="row-title">{localizedWorkoutName(scheduled.id, scheduled.name, lang)}</div>
                <div className="row-sub">{est ? `${fmtDuration(est.seconds)} · ${est.exercises} ${t('unit.exercises')} · ~${Math.round(est.kcal)} ${t('unit.kcal')}` : ''}</div>
              </div>
              <Button size="sm" onClick={() => navigate(`/workouts/${scheduled.id}/play`)}>{doneToday ? t('today.again') : t('today.start')}</Button>
            </div>
          </Card>
        ) : (
          <Card onClick={() => navigate('/workouts')}>
            <div className="workout-card">
              <div className="thumb thumb-workout"><IconDumbbell strokeWidth={2.2} /></div>
              <div className="row-main">
                <div className="row-title">{doneToday ? t('today.niceWorkToday') : t('today.restDay')}</div>
                <div className="row-sub">{doneToday ? t('today.kcalBurned', { n: Math.round(burned) }) : t('today.nothingScheduled')}</div>
              </div>
              <IconChevron className="muted" />
            </div>
          </Card>
        )}
      </Section>

      <Section title={t('today.meals')} right={<button className="c-meals" onClick={() => navigate('/meals')}>{t('today.planWeek')}</button>}>
        {slots && dishes && slots.length > 0 ? (
          <div className="list">
            {MEAL_CATEGORIES.flatMap((cat) => slots.filter((s) => s.slot === cat)).map((slot) => {
              const dish = dishes.get(slot.dishId);
              if (!dish) return null;
              const n = perServing(dish);
              return (
                <Row key={slot.id} className={slot.eaten ? 'row-done' : ''} onClick={() => navigate(`/meals/dish/${dish.id}`)} right={<span className="num">{Math.round(n.kcal * slot.servings)}</span>}>
                  <button className={`check ${slot.eaten ? 'on' : ''}`} aria-label={slot.eaten ? t('today.markNotEaten') : t('today.markEaten')} onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); toggleEaten(slot); }}>
                    {slot.eaten && <IconCheck size={14} strokeWidth={3} />}
                  </button>
                  <DishThumb dish={dish} small />
                  <div className="row-main">
                    <div className="row-title">{localizedDishName(dish.id, dish.name, lang)}</div>
                    <div className="row-sub">{SLOT_LABEL[slot.slot]}{slot.servings !== 1 ? ` · ${slot.servings} ${t('unit.servings')}` : ''}{dish.prepMin + dish.cookMin > 0 ? ` · ${dish.prepMin + dish.cookMin} ${t('unit.min')}` : ''}</div>
                  </div>
                </Row>
              );
            })}
          </div>
        ) : (
          <Empty title={t('today.nothingPlanned')} text={t('today.addDishOrPlanWeek')} action={<Button variant="meals" size="sm" icon={<IconPlus size={18} />} onClick={() => setAdding(true)}>{t('today.addDish')}</Button>} />
        )}
        {slots && slots.length > 0 && (
          <button className="addslot" onClick={() => setAdding(true)}><IconPlus size={18} />{t('today.addDishToToday')}</button>
        )}
      </Section>

      <AddDishSheet open={adding} onClose={() => setAdding(false)} date={today} />
    </Screen>
  );
}
