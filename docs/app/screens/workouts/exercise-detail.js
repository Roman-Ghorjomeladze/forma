import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { getAll, remove } from '../../lib/db.js';
import { kcalFor } from '../../lib/calories.js';
import { useProfile } from '../../lib/hooks.js';
import { useExercise } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, IconButton, Screen, Stat, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconEdit, IconTrash } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';
export function ExerciseDetailScreen({ id }) {
    const ex = useExercise(id);
    const [profile] = useProfile();
    if (ex === undefined)
        return _jsx(Screen, { className: "screen-no-tabs" });
    if (ex === null)
        return _jsx(Screen, { className: "screen-no-tabs", children: _jsx(Empty, { title: "Exercise not found", action: _jsx(Button, { variant: "secondary", onClick: () => navigate('/workouts/exercises'), children: "Back" }) }) });
    const perMin = kcalFor(ex.met, profile.weightKg, 60);
    const del = async () => {
        const workouts = await getAll('workouts');
        const used = workouts.filter((w) => JSON.stringify(w.blocks).includes(`"${ex.id}"`)).map((w) => w.name);
        const ok = await confirmDialog({ title: `Delete “${ex.name}”?`, message: used.length ? `It is used in: ${used.join(', ')}. Those steps will show as missing.` : undefined, confirmLabel: 'Delete', danger: true });
        if (ok) {
            await remove('exercises', ex.id);
            toast('Deleted');
            navigate('/workouts/exercises', { replace: true });
        }
    };
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { backTo: "/workouts/exercises", title: ex.name, right: _jsxs(_Fragment, { children: [_jsx(IconButton, { label: "Edit", onClick: () => navigate(`/workouts/exercise/${ex.id}/edit`), children: _jsx(IconEdit, { size: 20 }) }), _jsx(IconButton, { label: "Delete", onClick: del, children: _jsx(IconTrash, { size: 20 }) })] }) }), _jsx(ExerciseVisual, { exercise: ex, size: "large" }), _jsxs("div", { className: "tags mt", children: [ex.muscles.map((m) => _jsx("span", { className: "tag tag-workout", children: m }, m)), ex.equipment.map((m) => _jsx("span", { className: "tag", children: m }, m)), ex.isCustom && _jsx("span", { className: "tag", children: "custom" })] }), _jsxs("div", { className: "stats stats-3 mt", children: [_jsx(Stat, { value: ex.kind === 'time' ? `${ex.defaultAmount} s` : `${ex.defaultAmount}`, label: ex.kind === 'time' ? 'default time' : 'default reps' }), _jsx(Stat, { value: ex.met, label: "MET" }), _jsx(Stat, { tone: "workout", value: `${perMin.toFixed(1)}`, label: "kcal / min" })] }), _jsxs("div", { className: "small muted mt", style: { textAlign: 'center' }, children: [ex.kind === 'reps' ? `Timed at ~${ex.secPerRep} s per rep. ` : '', "Calories use your weight (", profile.weightKg, " kg)."] }), ex.cues.length > 0 && (_jsxs("div", { className: "mt-lg", children: [_jsx("div", { className: "section-label", children: "Form cues" }), _jsx("div", { className: "list steps", children: ex.cues.map((c, i) => _jsxs("div", { className: "step", children: [_jsx("div", { className: "step-n", children: i + 1 }), _jsx("div", { className: "step-text", children: c })] }, i)) })] }))] }));
}
