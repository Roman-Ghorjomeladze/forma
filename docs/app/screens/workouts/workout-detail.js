import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { put, remove } from '../../lib/db.js';
import { fmtDuration } from '../../lib/dates.js';
import { estimateWorkout, expandWorkout, kcalFor } from '../../lib/calories.js';
import { localizedWorkoutName } from '../../data/seed-i18n.js';
import { useProfile } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { useLang, useT } from '../../lib/i18n.js';
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
    const t = useT();
    const lang = useLang();
    const [profile] = useProfile();
    const workout = useWorkout(id);
    const exercises = useExerciseMap();
    if (workout === undefined || !exercises)
        return _jsx(Screen, { className: "screen-no-tabs" });
    if (workout === null)
        return _jsx(Screen, { className: "screen-no-tabs", children: _jsx(Empty, { title: t('workouts.notFound'), action: _jsx(Button, { variant: "secondary", onClick: () => navigate('/workouts'), children: t('common.back') }) }) });
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
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { backTo: "/workouts", title: name, right: _jsxs(_Fragment, { children: [_jsx(IconButton, { label: t('common.duplicate'), onClick: duplicate, children: _jsx(IconCopy, { size: 20 }) }), _jsx(IconButton, { label: t('common.edit'), onClick: () => navigate(`/workouts/${workout.id}/edit`), children: _jsx(IconEdit, { size: 20 }) }), _jsx(IconButton, { label: t('common.delete'), onClick: del, children: _jsx(IconTrash, { size: 20 }) })] }) }), workout.description && _jsx("p", { className: "muted mb", children: workout.description }), _jsxs("div", { className: "builder-stats", children: [_jsxs("div", { className: "builder-stat", style: { background: 'var(--inverse-bg)', color: 'var(--inverse-text)' }, children: [_jsx("span", { className: "v", children: fmtDuration(est.seconds) }), _jsx("span", { className: "l", style: { color: 'var(--inverse-muted)' }, children: t('workouts.totalTime') })] }), _jsxs("div", { className: "builder-stat", style: { background: 'var(--workout-soft)', color: 'var(--workout-strong)' }, children: [_jsxs("span", { className: "v", children: ["~", Math.round(est.kcal)] }), _jsx("span", { className: "l", children: t('workouts.kcalAtWeight', { kg: profile.weightKg }) })] }), _jsxs("div", { className: "builder-stat", style: { background: 'var(--surface)', border: '1px solid var(--border)' }, children: [_jsx("span", { className: "v", children: est.exercises }), _jsx("span", { className: "l muted", children: t('workouts.exercises') })] })] }), _jsxs("div", { className: "list", style: { marginBottom: 100 }, children: [steps.map((s) => (_jsxs("div", { className: "row", style: s.type === 'rest' ? { background: 'var(--surface-2)', paddingTop: 8, paddingBottom: 8 } : undefined, children: [s.type === 'rest' ? _jsx("div", { className: "demo-thumb", style: { background: 'transparent' }, children: _jsx(IconHourglass, { className: "muted", size: 20 }) }) : _jsx(ExerciseVisual, { exercise: exercises.get(s.exerciseId), animated: false }), _jsxs("div", { className: "row-main", children: [_jsxs("div", { className: "row-title", style: s.type === 'rest' ? { color: 'var(--muted)', fontSize: 14 } : undefined, children: [s.label, s.round && s.type === 'exercise' ? _jsx("span", { className: "muted", children: t('step.roundShort', { n: s.round.n, of: s.round.of }) }) : ''] }), s.type === 'exercise' && _jsxs("div", { className: "row-sub", children: [s.reps ? `${s.reps} ${t('unit.reps')} · ~${s.seconds} ${t('unit.s')}` : `${s.seconds} ${t('unit.s')}`, " \u00B7 ~", Math.round(kcalFor(s.met, profile.weightKg, s.seconds)), " ", t('unit.kcal')] })] }), s.type === 'rest' && _jsxs("span", { className: "row-right muted small", children: [s.seconds, " ", t('unit.s')] })] }, s.index))), steps.length === 0 && _jsx(Empty, { title: t('workouts.emptyWorkout'), text: t('workouts.addExercisesInEditor'), action: _jsx(Button, { variant: "secondary", onClick: () => navigate(`/workouts/${workout.id}/edit`), children: t('common.edit') }) })] }), steps.length > 0 && (_jsx("div", { className: "sticky-cta", children: _jsx(Button, { size: "lg", full: true, icon: _jsx(IconPlay, { size: 20 }), onClick: () => navigate(`/workouts/${workout.id}/play`), children: t('workouts.startWorkout') }) }))] }));
}
