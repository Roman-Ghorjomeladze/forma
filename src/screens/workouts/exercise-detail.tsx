import { getAll, remove } from '../../lib/db.js';
import { kcalFor } from '../../lib/calories.js';
import { useProfile } from '../../lib/hooks.js';
import { useExercise } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, IconButton, Screen, Stat, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconEdit, IconTrash } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';

export function ExerciseDetailScreen({ id }: { id: string }) {
  const ex = useExercise(id);
  const [profile] = useProfile();
  if (ex === undefined) return <Screen className="screen-no-tabs" />;
  if (ex === null) return <Screen className="screen-no-tabs"><Empty title="Exercise not found" action={<Button variant="secondary" onClick={() => navigate('/workouts/exercises')}>Back</Button>} /></Screen>;

  const perMin = kcalFor(ex.met, profile.weightKg, 60);
  const del = async () => {
    const workouts = await getAll('workouts');
    const used = workouts.filter((w) => JSON.stringify(w.blocks).includes(`"${ex.id}"`)).map((w) => w.name);
    const ok = await confirmDialog({ title: `Delete “${ex.name}”?`, message: used.length ? `It is used in: ${used.join(', ')}. Those steps will show as missing.` : undefined, confirmLabel: 'Delete', danger: true });
    if (ok) { await remove('exercises', ex.id); toast('Deleted'); navigate('/workouts/exercises', { replace: true }); }
  };

  return (
    <Screen className="screen-no-tabs">
      <TopBar backTo="/workouts/exercises" title={ex.name} right={<>
        <IconButton label="Edit" onClick={() => navigate(`/workouts/exercise/${ex.id}/edit`)}><IconEdit size={20} /></IconButton>
        <IconButton label="Delete" onClick={del}><IconTrash size={20} /></IconButton>
      </>} />
      <ExerciseVisual exercise={ex} size="large" />
      <div className="tags mt">
        {ex.muscles.map((m) => <span key={m} className="tag tag-workout">{m}</span>)}
        {ex.equipment.map((m) => <span key={m} className="tag">{m}</span>)}
        {ex.isCustom && <span className="tag">custom</span>}
      </div>
      <div className="stats stats-3 mt">
        <Stat value={ex.kind === 'time' ? `${ex.defaultAmount} s` : `${ex.defaultAmount}`} label={ex.kind === 'time' ? 'default time' : 'default reps'} />
        <Stat value={ex.met} label="MET" />
        <Stat tone="workout" value={`${perMin.toFixed(1)}`} label="kcal / min" />
      </div>
      <div className="small muted mt" style={{ textAlign: 'center' }}>{ex.kind === 'reps' ? `Timed at ~${ex.secPerRep} s per rep. ` : ''}Calories use your weight ({profile.weightKg} kg).</div>
      {ex.cues.length > 0 && (
        <div className="mt-lg">
          <div className="section-label">Form cues</div>
          <div className="list steps">
            {ex.cues.map((c, i) => <div key={i} className="step"><div className="step-n">{i + 1}</div><div className="step-text">{c}</div></div>)}
          </div>
        </div>
      )}
    </Screen>
  );
}
