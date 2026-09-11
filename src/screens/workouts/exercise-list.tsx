import { useMemo, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { useExercises } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Chip, IconButton, Screen, TopBar } from '../../ui/components.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';

const GROUP_DEFS: { key: string; labelKey: string; match: string[] }[] = [
  { key: 'all', labelKey: 'exercise.group.all', match: [] },
  { key: 'cardio', labelKey: 'exercise.group.cardio', match: ['cardio'] },
  { key: 'legs', labelKey: 'exercise.group.legs', match: ['quads', 'glutes', 'hamstrings', 'calves', 'legs'] },
  { key: 'upper', labelKey: 'exercise.group.upper', match: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { key: 'core', labelKey: 'exercise.group.core', match: ['core', 'abs', 'obliques', 'lower back', 'hip flexors'] },
  { key: 'custom', labelKey: 'exercise.group.custom', match: [] },
];

export function ExerciseListScreen() {
  const t = useT();
  const exercises = useExercises();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');

  const GROUPS = GROUP_DEFS.map((g) => ({ ...g, label: t(g.labelKey) }));

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const g = GROUP_DEFS.find((x) => x.key === group)!;
    return (exercises ?? [])
      .filter((e) => group === 'all' || (group === 'custom' ? e.isCustom : e.muscles.some((m) => g.match.includes(m))))
      .filter((e) => !ql || e.name.toLowerCase().includes(ql) || e.muscles.some((m) => m.includes(ql)) || e.equipment.some((m) => m.includes(ql)));
  }, [exercises, q, group]);

  return (
    <Screen>
      <TopBar large backTo="/workouts" title={t('exercise.titleList')} eyebrow={t('exercise.countInLibrary', { n: exercises?.length ?? 0 })} right={<IconButton label={t('exercise.newExercise')} tone="accent" onClick={() => navigate('/workouts/exercise/new')}><IconPlus /></IconButton>} />
      <div className="searchbar">
        <IconSearch size={18} />
        <input className="input" placeholder={t('exercise.searchPlaceholder')} value={q} onChange={(e: { target: HTMLInputElement }) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        {GROUPS.map((g) => <Chip key={g.key} tone="workout" active={group === g.key} onClick={() => setGroup(g.key)}>{g.label}</Chip>)}
      </div>
      <div className="exercise-grid mt">
        {list.map((e) => (
          <button key={e.id} className="exercise-tile" onClick={() => navigate(`/workouts/exercise/${e.id}`)}>
            <ExerciseVisual exercise={e} size="box" />
            <div className="exercise-name">{e.name}</div>
            <div className="exercise-sub">{e.kind === 'time' ? t('exercise.timed') : t('unit.reps')} · MET {e.met}{e.equipment.length ? ` · ${e.equipment.join(', ')}` : ''}</div>
          </button>
        ))}
      </div>
      {list.length === 0 && <div className="empty"><div className="empty-title">{t('exercise.noneMatch')}</div></div>}
    </Screen>
  );
}
