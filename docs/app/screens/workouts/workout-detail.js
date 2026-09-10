import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { put, remove } from '../../lib/db.js';
import { fmtDuration } from '../../lib/dates.js';
import { estimateWorkout, expandWorkout, kcalFor } from '../../lib/calories.js';
import { useProfile } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { useExerciseMap, useWorkout } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, IconButton, Screen, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCopy, IconEdit, IconHourglass, IconPlay, IconTrash } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';
function reId(blocks) {
    return blocks.map((b) => (b.type === 'group' ? { ...b, id: uid('b'), blocks: reId(b.blocks) } : { ...b, id: uid('b') }));
}
export function WorkoutDetailScreen({ id }) {
    const [profile] = useProfile();
    const workout = useWorkout(id);
    const exercises = useExerciseMap();
    if (workout === undefined || !exercises)
        return _jsx(Screen, { className: "screen-no-tabs" });
    if (workout === null)
        return _jsx(Screen, { className: "screen-no-tabs", children: _jsx(Empty, { title: "Workout not found", action: _jsx(Button, { variant: "secondary", onClick: () => navigate('/workouts'), children: "Back" }) }) });
    const est = estimateWorkout(workout, exercises, profile.weightKg);
    const steps = expandWorkout(workout, exercises);
    const del = async () => {
        if (await confirmDialog({ title: `Delete “${workout.name}”?`, message: 'Your history stays.', confirmLabel: 'Delete', danger: true })) {
            await remove('workouts', workout.id);
            navigate('/workouts', { replace: true });
        }
    };
    const duplicate = async () => {
        const copy = { ...workout, id: uid('wo'), name: `${workout.name} copy`, blocks: reId(workout.blocks), createdAt: Date.now(), updatedAt: Date.now() };
        await put('workouts', copy);
        toast('Duplicated');
        navigate(`/workouts/${copy.id}/edit`, { replace: true });
    };
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { backTo: "/workouts", title: workout.name, right: _jsxs(_Fragment, { children: [_jsx(IconButton, { label: "Duplicate", onClick: duplicate, children: _jsx(IconCopy, { size: 20 }) }), _jsx(IconButton, { label: "Edit", onClick: () => navigate(`/workouts/${workout.id}/edit`), children: _jsx(IconEdit, { size: 20 }) }), _jsx(IconButton, { label: "Delete", onClick: del, children: _jsx(IconTrash, { size: 20 }) })] }) }), workout.description && _jsx("p", { className: "muted mb", children: workout.description }), _jsxs("div", { className: "builder-stats", children: [_jsxs("div", { className: "builder-stat", style: { background: 'var(--inverse-bg)', color: 'var(--inverse-text)' }, children: [_jsx("span", { className: "v", children: fmtDuration(est.seconds) }), _jsx("span", { className: "l", style: { color: 'var(--inverse-muted)' }, children: "total time" })] }), _jsxs("div", { className: "builder-stat", style: { background: 'var(--workout-soft)', color: 'var(--workout-strong)' }, children: [_jsxs("span", { className: "v", children: ["~", Math.round(est.kcal)] }), _jsxs("span", { className: "l", children: ["kcal at ", profile.weightKg, " kg"] })] }), _jsxs("div", { className: "builder-stat", style: { background: 'var(--surface)', border: '1px solid var(--border)' }, children: [_jsx("span", { className: "v", children: est.exercises }), _jsx("span", { className: "l muted", children: "exercises" })] })] }), _jsxs("div", { className: "list", style: { marginBottom: 100 }, children: [steps.map((s) => (_jsxs("div", { className: "row", style: s.type === 'rest' ? { background: 'var(--surface-2)', paddingTop: 8, paddingBottom: 8 } : undefined, children: [s.type === 'rest' ? _jsx("div", { className: "demo-thumb", style: { background: 'transparent' }, children: _jsx(IconHourglass, { className: "muted", size: 20 }) }) : _jsx(ExerciseVisual, { exercise: exercises.get(s.exerciseId), animated: false }), _jsxs("div", { className: "row-main", children: [_jsxs("div", { className: "row-title", style: s.type === 'rest' ? { color: 'var(--muted)', fontSize: 14 } : undefined, children: [s.label, s.round && s.type === 'exercise' ? _jsxs("span", { className: "muted", children: [" \u00B7 round ", s.round.n, "/", s.round.of] }) : ''] }), s.type === 'exercise' && _jsxs("div", { className: "row-sub", children: [s.reps ? `${s.reps} reps · ~${s.seconds} s` : `${s.seconds} s`, " \u00B7 ~", Math.round(kcalFor(s.met, profile.weightKg, s.seconds)), " kcal"] })] }), s.type === 'rest' && _jsxs("span", { className: "row-right muted small", children: [s.seconds, " s"] })] }, s.index))), steps.length === 0 && _jsx(Empty, { title: "Empty workout", text: "Add exercises in the editor.", action: _jsx(Button, { variant: "secondary", onClick: () => navigate(`/workouts/${workout.id}/edit`), children: "Edit" }) })] }), steps.length > 0 && (_jsx("div", { className: "sticky-cta", children: _jsx(Button, { size: "lg", full: true, icon: _jsx(IconPlay, { size: 20 }), onClick: () => navigate(`/workouts/${workout.id}/play`), children: "Start workout" }) }))] }));
}
