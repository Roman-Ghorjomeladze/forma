import { put, remove } from '../../lib/db.js';
import { fmtDuration } from '../../lib/dates.js';
import { estimateWorkout, expandWorkout, kcalFor } from '../../lib/calories.js';
import { localizedWorkoutName } from '../../data/seed-i18n.js';
import { useProfile } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { useLang, useT } from '../../lib/i18n.js';
import type { Block } from '../../lib/models.js';
import { useExerciseMap, useWorkout } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, IconButton, Screen, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCopy, IconEdit, IconHourglass, IconPlay, IconTrash } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';

function reId(blocks: Block[]): Block[] {
  return blocks.map((b) => (b.type === 'group' ? { ...b, id: uid('b'), blocks: reId(b.blocks) } : { ...b, id: uid('b') }));
}

export function WorkoutDetailScreen({ id }: { id: string }) {
  const t = useT();
  const lang = useLang();
  const [profile] = useProfile();
  const workout = useWorkout(id);
  const exercises = useExerciseMap();

  if (workout === undefined || !exercises) return <Screen className="screen-no-tabs" />;
  if (workout === null) return <Screen className="screen-no-tabs"><Empty title={t('workouts.notFound')} action={<Button variant="secondary" onClick={() => navigate('/workouts')}>{t('common.back')}</Button>} /></Screen>;

  const name = localizedWorkoutName(workout.id, workout.name, lang);
  const est = estimateWorkout(workout, exercises, profile.weightKg);
  const steps = expandWorkout(workout, exercises, lang);

  const del = async () => {
    if (await confirmDialog({ title: t('workouts.deleteTitle', { name }), message: t('workouts.deleteMsg'), confirmLabel: t('common.delete'), danger: true })) {
      await remove('workouts', workout.id);
      navigate('/workouts', { replace: true });
    }
  };
  const duplicate = async () => {
    const copy = { ...workout, id: uid('wo'), name: `${workout.name} copy`, blocks: reId(workout.blocks), createdAt: Date.now(), updatedAt: Date.now() };
    await put('workouts', copy);
    toast(t('common.duplicated'));
    navigate(`/workouts/${copy.id}/edit`, { replace: true });
  };

  return (
    <Screen className="screen-no-tabs">
      <TopBar backTo="/workouts" title={name} right={<>
        <IconButton label={t('common.duplicate')} onClick={duplicate}><IconCopy size={20} /></IconButton>
        <IconButton label={t('common.edit')} onClick={() => navigate(`/workouts/${workout.id}/edit`)}><IconEdit size={20} /></IconButton>
        <IconButton label={t('common.delete')} onClick={del}><IconTrash size={20} /></IconButton>
      </>} />
      {workout.description && <p className="muted mb">{workout.description}</p>}
      <div className="builder-stats">
        <div className="builder-stat" style={{ background: 'var(--inverse-bg)', color: 'var(--inverse-text)' }}><span className="v">{fmtDuration(est.seconds)}</span><span className="l" style={{ color: 'var(--inverse-muted)' }}>{t('workouts.totalTime')}</span></div>
        <div className="builder-stat" style={{ background: 'var(--workout-soft)', color: 'var(--workout-strong)' }}><span className="v">~{Math.round(est.kcal)}</span><span className="l">{t('workouts.kcalAtWeight', { kg: profile.weightKg })}</span></div>
        <div className="builder-stat" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}><span className="v">{est.exercises}</span><span className="l muted">{t('workouts.exercises')}</span></div>
      </div>

      <div className="list" style={{ marginBottom: 100 }}>
        {steps.map((s) => (
          <div key={s.index} className="row" style={s.type === 'rest' ? { background: 'var(--surface-2)', paddingTop: 8, paddingBottom: 8 } : undefined}>
            {s.type === 'rest' ? <div className="demo-thumb" style={{ background: 'transparent' }}><IconHourglass className="muted" size={20} /></div> : <ExerciseVisual exercise={exercises.get(s.exerciseId!)} animated={false} />}
            <div className="row-main">
              <div className="row-title" style={s.type === 'rest' ? { color: 'var(--muted)', fontSize: 14 } : undefined}>{s.label}{s.round && s.type === 'exercise' ? <span className="muted">{t('step.roundShort', { n: s.round.n, of: s.round.of })}</span> : ''}</div>
              {s.type === 'exercise' && <div className="row-sub">{s.reps ? `${s.reps} ${t('unit.reps')} · ~${s.seconds} ${t('unit.s')}` : `${s.seconds} ${t('unit.s')}`} · ~{Math.round(kcalFor(s.met, profile.weightKg, s.seconds))} {t('unit.kcal')}</div>}
            </div>
            {s.type === 'rest' && <span className="row-right muted small">{s.seconds} {t('unit.s')}</span>}
          </div>
        ))}
        {steps.length === 0 && <Empty title={t('workouts.emptyWorkout')} text={t('workouts.addExercisesInEditor')} action={<Button variant="secondary" onClick={() => navigate(`/workouts/${workout.id}/edit`)}>{t('common.edit')}</Button>} />}
      </div>

      {steps.length > 0 && (
        <div className="sticky-cta">
          <Button size="lg" full icon={<IconPlay size={20} />} onClick={() => navigate(`/workouts/${workout.id}/play`)}>{t('workouts.startWorkout')}</Button>
        </div>
      )}
    </Screen>
  );
}
