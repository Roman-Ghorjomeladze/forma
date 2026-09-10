import { useMemo, useState } from 'react';
import { useExercises } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Chip, IconButton, Screen, TopBar } from '../../ui/components.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';

const GROUPS: { key: string; label: string; match: string[] }[] = [
  { key: 'all', label: 'All', match: [] },
  { key: 'cardio', label: 'Cardio', match: ['cardio'] },
  { key: 'legs', label: 'Legs', match: ['quads', 'glutes', 'hamstrings', 'calves', 'legs'] },
  { key: 'upper', label: 'Upper body', match: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { key: 'core', label: 'Core', match: ['core', 'abs', 'obliques', 'lower back', 'hip flexors'] },
  { key: 'custom', label: 'Custom', match: [] },
];

export function ExerciseListScreen() {
  const exercises = useExercises();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const g = GROUPS.find((x) => x.key === group)!;
    return (exercises ?? [])
      .filter((e) => group === 'all' || (group === 'custom' ? e.isCustom : e.muscles.some((m) => g.match.includes(m))))
      .filter((e) => !ql || e.name.toLowerCase().includes(ql) || e.muscles.some((m) => m.includes(ql)) || e.equipment.some((m) => m.includes(ql)));
  }, [exercises, q, group]);

  return (
    <Screen>
      <TopBar large backTo="/workouts" title="Exercises" eyebrow={`${exercises?.length ?? 0} in your library`} right={<IconButton label="New exercise" tone="accent" onClick={() => navigate('/workouts/exercise/new')}><IconPlus /></IconButton>} />
      <div className="searchbar">
        <IconSearch size={18} />
        <input className="input" placeholder="Search by name, muscle, equipment" value={q} onChange={(e: { target: HTMLInputElement }) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        {GROUPS.map((g) => <Chip key={g.key} tone="workout" active={group === g.key} onClick={() => setGroup(g.key)}>{g.label}</Chip>)}
      </div>
      <div className="exercise-grid mt">
        {list.map((e) => (
          <button key={e.id} className="exercise-tile" onClick={() => navigate(`/workouts/exercise/${e.id}`)}>
            <ExerciseVisual exercise={e} size="box" />
            <div className="exercise-name">{e.name}</div>
            <div className="exercise-sub">{e.kind === 'time' ? 'timed' : 'reps'} · MET {e.met}{e.equipment.length ? ` · ${e.equipment.join(', ')}` : ''}</div>
          </button>
        ))}
      </div>
      {list.length === 0 && <div className="empty"><div className="empty-title">No exercises match</div></div>}
    </Screen>
  );
}
