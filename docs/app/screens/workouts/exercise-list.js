import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDeferredValue, useMemo, useState } from 'react';
import { EQUIPMENT_CATEGORIES } from '../../data/equipment-categories.js';
import { EXERCISE_GROUP_DEFS } from '../../data/exercise-groups.js';
import { localizedExerciseName } from '../../data/seed-i18n.js';
import { useLang, useT } from '../../lib/i18n.js';
import { useExercises } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Chip, IconButton, Screen, TopBar } from '../../ui/components.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';
const GROUP_DEFS = [...EXERCISE_GROUP_DEFS, { key: 'custom', labelKey: 'exercise.group.custom', match: [] }];
/** Best-effort friendly label for an exercise's equipment (falls back to the raw tag). */
function equipmentLabel(equipment, t) {
    if (equipment.length === 0)
        return t('equipment.bodyweight');
    const cat = EQUIPMENT_CATEGORIES.find((c) => c.key !== 'bodyweight' && c.match(equipment));
    return cat ? t(cat.labelKey) : equipment.join(', ');
}
export function ExerciseListScreen() {
    const t = useT();
    const lang = useLang();
    const exercises = useExercises();
    const [q, setQ] = useState('');
    const [group, setGroup] = useState('all');
    const [equip, setEquip] = useState('all');
    // Filtering ~300+ items on every keystroke can lag the input on slower phones; deferring the
    // query value lets React keep the text box responsive and catch up the (expensive) filtered
    // list a beat later, instead of blocking each keystroke on the full filter pass.
    const dq = useDeferredValue(q);
    const GROUPS = GROUP_DEFS.map((g) => ({ ...g, label: t(g.labelKey) }));
    const EQUIP_CHIPS = [{ key: 'all', label: t('equipment.all') }, ...EQUIPMENT_CATEGORIES.map((c) => ({ key: c.key, label: t(c.labelKey) }))];
    const list = useMemo(() => {
        const ql = dq.trim().toLowerCase();
        const g = GROUP_DEFS.find((x) => x.key === group);
        const eqCat = EQUIPMENT_CATEGORIES.find((c) => c.key === equip);
        return (exercises ?? [])
            .filter((e) => group === 'all' || (group === 'custom' ? e.isCustom : e.muscles.some((m) => g.match.includes(m))))
            .filter((e) => !eqCat || eqCat.match(e.equipment))
            .filter((e) => !ql || localizedExerciseName(e.id, e.name, lang).toLowerCase().includes(ql) || e.muscles.some((m) => m.includes(ql)) || e.equipment.some((m) => m.includes(ql)));
    }, [exercises, dq, group, equip, lang]);
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, backTo: "/forma/workouts", title: t('exercise.titleList'), eyebrow: t('exercise.countInLibrary', { n: exercises?.length ?? 0 }), right: _jsx(IconButton, { label: t('exercise.newExercise'), tone: "accent", onClick: () => navigate('/forma/workouts/exercise/new'), children: _jsx(IconPlus, {}) }) }), _jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", placeholder: t('exercise.searchPlaceholder'), value: q, onChange: (e) => setQ(e.target.value) })] }), _jsx("div", { className: "chips", children: GROUPS.map((g) => _jsx(Chip, { tone: "workout", active: group === g.key, onClick: () => setGroup(g.key), children: g.label }, g.key)) }), _jsx("div", { className: "chips", style: { marginTop: -4 }, children: EQUIP_CHIPS.map((c) => _jsx(Chip, { tone: "workout", active: equip === c.key, onClick: () => setEquip(c.key), children: c.label }, c.key)) }), _jsx("div", { className: "exercise-grid mt", children: list.map((e) => (_jsxs("button", { className: "exercise-tile", onClick: () => navigate(`/forma/workouts/exercise/${e.id}`), children: [_jsx(ExerciseVisual, { exercise: e, size: "box", animated: false }), _jsx("div", { className: "exercise-name", children: localizedExerciseName(e.id, e.name, lang) }), _jsxs("div", { className: "exercise-sub", children: [e.kind === 'time' ? t('exercise.timed') : t('unit.reps'), " \u00B7 MET ", e.met, " \u00B7 ", equipmentLabel(e.equipment, t)] })] }, e.id))) }), list.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-title", children: t('exercise.noneMatch') }) })] }));
}
