import { useMemo, useState } from 'react';
import { bulkPut, remove } from '../../lib/db.js';
import { fmtDuration, weekdayName } from '../../lib/dates.js';
import { estimateWorkout } from '../../lib/calories.js';
import { localizedWorkoutName } from '../../data/seed-i18n.js';
import { useProfile } from '../../lib/hooks.js';
import { useLang, useT } from '../../lib/i18n.js';
import { useExerciseMap, useSchedule, useSessions, useWorkouts } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Card, Empty, IconButton, Row, Screen, Section, Sheet, TopBar } from '../../ui/components.js';
import { IconChevron, IconDumbbell, IconHistory, IconPlus, IconStar } from '../../ui/icons.js';

export function WorkoutsScreen() {
  const t = useT();
  const lang = useLang();
  const [profile] = useProfile();
  const workouts = useWorkouts();
  const exercises = useExerciseMap();
  const schedule = useSchedule();
  const sessions = useSessions(50);
  const [pickDay, setPickDay] = useState<number | null>(null);

  const order = profile.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const byDay = useMemo(() => new Map((schedule ?? []).map((s) => [s.weekday, s.workoutId])), [schedule]);
  const todayWd = new Date().getDay();
  const weekKcal = useMemo(() => {
    const since = Date.now() - 7 * 86400e3;
    return Math.round((sessions ?? []).filter((s) => s.startedAt >= since).reduce((a, s) => a + s.kcal, 0));
  }, [sessions]);

  const setDay = async (weekday: number, workoutId: string | null) => {
    if (workoutId) await bulkPut('schedule', [{ weekday, workoutId }]);
    else await remove('schedule', weekday);
    setPickDay(null);
  };

  return (
    <Screen>
      <TopBar large title={t('workouts.title')} eyebrow={weekKcal > 0 ? t('workouts.kcalBurnedThisWeek', { n: weekKcal }) : t('workouts.countWorkouts', { n: workouts?.length ?? 0 })}
        right={<>
          <IconButton label={t('workouts.history')} onClick={() => navigate('/workouts/history')}><IconHistory size={20} /></IconButton>
          <IconButton label={t('workouts.exerciseLibrary')} onClick={() => navigate('/workouts/exercises')}><IconStar size={20} /></IconButton>
          <IconButton label={t('workouts.newWorkout')} tone="accent" onClick={() => navigate('/workouts/new')}><IconPlus /></IconButton>
        </>} />

      <Section title={t('workouts.weeklySchedule')} right={<span>{t('workouts.tapDayToAssign')}</span>}>
        <div className="calendar-week">
          {order.map((wd) => {
            const w = workouts?.find((x) => x.id === byDay.get(wd));
            return (
              <button key={wd} className={w ? 'has' : ''} style={wd === todayWd ? { background: 'var(--surface-2)' } : undefined} onClick={() => setPickDay(wd)}>
                <span>{weekdayName(wd)}</span>
                {w ? <><span className="sched-swatch" style={{ background: w.color }} /><span className="w">{localizedWorkoutName(w.id, w.name, lang)}</span></> : <span className="w muted" style={{ fontWeight: 500 }}>—</span>}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t('workouts.myWorkouts')}>
        {workouts && workouts.length === 0 ? (
          <Empty icon={<IconDumbbell size={40} />} title={t('workouts.noWorkoutsYet')} text={t('workouts.noWorkoutsHint')} action={<Button icon={<IconPlus size={18} />} onClick={() => navigate('/workouts/new')}>{t('workouts.newWorkout')}</Button>} />
        ) : (
          <div className="stack">
            {(workouts ?? []).map((w) => {
              const est = exercises ? estimateWorkout(w, exercises, profile.weightKg) : null;
              return (
                <Card key={w.id} onClick={() => navigate(`/workouts/${w.id}`)}>
                  <div className="workout-card">
                    <span className="workout-color" style={{ background: w.color }} />
                    <div className="row-main">
                      <div className="row-title">{localizedWorkoutName(w.id, w.name, lang)}</div>
                      <div className="row-sub">{est ? `${fmtDuration(est.seconds)} · ${est.exercises} ${t('unit.exercises')} · ~${Math.round(est.kcal)} ${t('unit.kcal')}` : ''}</div>
                    </div>
                    <Button size="sm" onClick={() => navigate(`/workouts/${w.id}/play`)}>{t('today.start')}</Button>
                    <IconChevron className="muted" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      <Sheet open={pickDay !== null} onClose={() => setPickDay(null)} title={pickDay !== null ? `${weekdayName(pickDay, true)}` : ''}>
        <div className="list">
          {(workouts ?? []).map((w) => (
            <Row key={w.id} onClick={() => pickDay !== null && setDay(pickDay, w.id)} right={pickDay !== null && byDay.get(pickDay) === w.id ? <span className="c-workout">{t('workouts.assigned')}</span> : undefined}>
              <span className="sched-swatch" style={{ background: w.color, width: 12, height: 12 }} />
              <div className="row-main"><div className="row-title">{localizedWorkoutName(w.id, w.name, lang)}</div></div>
            </Row>
          ))}
          <Row onClick={() => pickDay !== null && setDay(pickDay, null)}><div className="row-main"><div className="row-title muted">{t('workouts.restDayNothing')}</div></div></Row>
        </div>
      </Sheet>
    </Screen>
  );
}
