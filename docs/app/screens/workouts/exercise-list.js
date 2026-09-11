import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { useExercises } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Chip, IconButton, Screen, TopBar } from '../../ui/components.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';
const GROUP_DEFS = [
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
        const g = GROUP_DEFS.find((x) => x.key === group);
        return (exercises ?? [])
            .filter((e) => group === 'all' || (group === 'custom' ? e.isCustom : e.muscles.some((m) => g.match.includes(m))))
            .filter((e) => !ql || e.name.toLowerCase().includes(ql) || e.muscles.some((m) => m.includes(ql)) || e.equipment.some((m) => m.includes(ql)));
    }, [exercises, q, group]);
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, backTo: "/workouts", title: t('exercise.titleList'), eyebrow: t('exercise.countInLibrary', { n: exercises?.length ?? 0 }), right: _jsx(IconButton, { label: t('exercise.newExercise'), tone: "accent", onClick: () => navigate('/workouts/exercise/new'), children: _jsx(IconPlus, {}) }) }), _jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", placeholder: t('exercise.searchPlaceholder'), value: q, onChange: (e) => setQ(e.target.value) })] }), _jsx("div", { className: "chips", children: GROUPS.map((g) => _jsx(Chip, { tone: "workout", active: group === g.key, onClick: () => setGroup(g.key), children: g.label }, g.key)) }), _jsx("div", { className: "exercise-grid mt", children: list.map((e) => (_jsxs("button", { className: "exercise-tile", onClick: () => navigate(`/workouts/exercise/${e.id}`), children: [_jsx(ExerciseVisual, { exercise: e, size: "box" }), _jsx("div", { className: "exercise-name", children: e.name }), _jsxs("div", { className: "exercise-sub", children: [e.kind === 'time' ? t('exercise.timed') : t('unit.reps'), " \u00B7 MET ", e.met, e.equipment.length ? ` · ${e.equipment.join(', ')}` : ''] })] }, e.id))) }), list.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-title", children: t('exercise.noneMatch') }) })] }));
}
