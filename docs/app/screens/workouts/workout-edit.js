import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { get, put } from '../../lib/db.js';
import { fmtDuration } from '../../lib/dates.js';
import { blockSeconds, estimateWorkout, kcalFor } from '../../lib/calories.js';
import { useProfile } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { useT } from '../../lib/i18n.js';
import { useExerciseMap, useExercises } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, IconButton, Row, Screen, Segmented, Sheet, Stepper, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconChevronDown, IconCopy, IconHourglass, IconPlus, IconRepeat, IconSearch, IconTrash } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';
const COLORS = ['#F0532D', '#4C8BF5', '#2FAF6E', '#E9B52A', '#B76DE0', '#17160F'];
function blank() {
    const now = Date.now();
    return { id: uid('wo'), name: '', description: '', blocks: [], color: COLORS[0], createdAt: now, updatedAt: now };
}
function getAt(blocks, path) {
    let list = blocks;
    let b;
    for (const i of path) {
        b = list[i];
        if (!b)
            return undefined;
        list = b.type === 'group' ? b.blocks : [];
    }
    return b;
}
function updateList(blocks, parent, fn) {
    if (parent.length === 0)
        return fn(blocks);
    const [i, ...rest] = parent;
    return blocks.map((b, k) => (k === i && b.type === 'group' ? { ...b, blocks: updateList(b.blocks, rest, fn) } : b));
}
export function WorkoutEditScreen({ id }) {
    const t = useT();
    const [profile] = useProfile();
    const exMap = useExerciseMap();
    const allExercises = useExercises();
    const [w, setW] = useState(id ? null : blank());
    const [addingTo, setAddingTo] = useState(null);
    const [editing, setEditing] = useState(null);
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        if (!id)
            return;
        get('workouts', id).then((x) => { if (x)
            setW(x);
        else
            navigate('/workouts', { replace: true }); });
    }, [id]);
    const est = useMemo(() => (w && exMap ? estimateWorkout(w, exMap, profile.weightKg) : null), [w, exMap, profile.weightKg]);
    if (!w || !exMap)
        return _jsx(Screen, { className: "screen-no-tabs" });
    const patch = (p) => { setW({ ...w, ...p }); setDirty(true); };
    const setBlocks = (blocks) => patch({ blocks });
    const addExercise = (ex) => {
        if (addingTo === null)
            return;
        const block = ex.kind === 'time' ? { id: uid('b'), type: 'exercise', exerciseId: ex.id, seconds: ex.defaultAmount } : { id: uid('b'), type: 'exercise', exerciseId: ex.id, reps: ex.defaultAmount };
        setBlocks(updateList(w.blocks, addingTo, (l) => [...l, block]));
        toast(t('common.addedName', { name: ex.name }));
    };
    const addRest = (parent) => setBlocks(updateList(w.blocks, parent, (l) => [...l, { id: uid('b'), type: 'rest', seconds: 20 }]));
    const addGroup = () => setBlocks([...w.blocks, { id: uid('b'), type: 'group', name: t('workouts.circuitDefault'), rounds: 3, restBetweenRounds: 60, blocks: [] }]);
    const removeAt = (path) => setBlocks(updateList(w.blocks, path.slice(0, -1), (l) => l.filter((_, i) => i !== path[path.length - 1])));
    const moveAt = (path, dir) => setBlocks(updateList(w.blocks, path.slice(0, -1), (l) => {
        const i = path[path.length - 1], j = i + dir;
        if (j < 0 || j >= l.length)
            return l;
        const copy = [...l];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy;
    }));
    const duplicateAt = (path) => setBlocks(updateList(w.blocks, path.slice(0, -1), (l) => {
        const i = path[path.length - 1];
        const b = l[i];
        const copy = b.type === 'group' ? { ...b, id: uid('b'), blocks: b.blocks.map((x) => ({ ...x, id: uid('b') })) } : { ...b, id: uid('b') };
        return [...l.slice(0, i + 1), copy, ...l.slice(i + 1)];
    }));
    const replaceAt = (path, nb) => setBlocks(updateList(w.blocks, path.slice(0, -1), (l) => l.map((b, i) => (i === path[path.length - 1] ? nb : b))));
    const save = async () => {
        if (!w.name.trim()) {
            toast(t('workouts.giveItAName'));
            return;
        }
        await put('workouts', { ...w, name: w.name.trim(), updatedAt: Date.now() });
        toast(t('common.saved'));
        navigate(`/workouts/${w.id}`, { replace: true });
    };
    const cancel = async () => {
        if (dirty && !(await confirmDialog({ title: t('workouts.discardChangesTitle'), confirmLabel: t('common.discard'), danger: true })))
            return;
        navigate(id ? `/workouts/${id}` : '/workouts', { replace: true });
    };
    const renderBlock = (b, path) => {
        if (b.type === 'group') {
            const secs = blockSeconds(b, exMap);
            return (_jsxs("div", { className: "group", children: [_jsxs("button", { className: "group-head", style: { width: '100%' }, onClick: () => setEditing(path), children: [_jsxs("span", { className: "hstack", style: { gap: 8 }, children: [_jsx(IconRepeat, { size: 18, strokeWidth: 2.4 }), b.name || t('workouts.circuitDefault'), " \u00B7 ", b.rounds, " ", b.rounds === 1 ? t('unit.round') : t('unit.rounds')] }), _jsxs("span", { children: [b.restBetweenRounds > 0 ? `${b.restBetweenRounds} ${t('unit.s')} ${t('workouts.rest').toLowerCase()} · ` : '', fmtDuration(secs)] })] }), _jsxs("div", { className: "group-body", children: [b.blocks.map((c, i) => renderBlock(c, [...path, i])), _jsxs("div", { className: "addbar", style: { margin: '4px 0 8px' }, children: [_jsxs("button", { className: "addslot", onClick: () => setAddingTo(path), children: [_jsx(IconPlus, { size: 16 }), t('workouts.exercise')] }), _jsxs("button", { className: "addslot", onClick: () => addRest(path), children: [_jsx(IconPlus, { size: 16 }), t('workouts.rest')] })] })] })] }, b.id));
        }
        const ex = b.type === 'exercise' ? exMap.get(b.exerciseId) : undefined;
        const secs = blockSeconds(b, exMap);
        return (_jsxs("div", { className: `block ${b.type === 'rest' ? 'block-rest' : ''}`, children: [_jsxs("button", { className: "hstack", style: { flex: 1, minWidth: 0, gap: 12 }, onClick: () => setEditing(path), children: [b.type === 'rest' ? _jsx("div", { className: "demo-thumb", style: { background: 'transparent' }, children: _jsx(IconHourglass, { size: 20, className: "muted" }) }) : _jsx(ExerciseVisual, { exercise: ex, animated: false }), _jsxs("div", { className: "block-main", children: [_jsx("div", { className: "block-title", style: b.type === 'rest' ? { color: 'var(--muted)', fontSize: 14 } : undefined, children: b.type === 'rest' ? `${t('workouts.rest')} ${b.seconds} ${t('unit.s')}` : ex?.name ?? t('workouts.missingExercise') }), b.type === 'exercise' && _jsxs("div", { className: "block-sub", children: [b.reps != null ? `${b.reps} ${t('unit.reps')} · ~${secs} ${t('unit.s')}` : `${b.seconds} ${t('unit.s')}`, " \u00B7 ~", Math.round(kcalFor(ex?.met ?? 4, profile.weightKg, secs)), " ", t('unit.kcal')] })] })] }), _jsxs("div", { className: "block-actions", children: [_jsx(IconButton, { label: t('workouts.moveUp'), onClick: () => moveAt(path, -1), children: _jsx(IconChevronDown, { size: 18, className: "rot180" }) }), _jsx(IconButton, { label: t('workouts.moveDown'), onClick: () => moveAt(path, 1), children: _jsx(IconChevronDown, { size: 18 }) })] })] }, b.id));
    };
    const editingBlock = editing ? getAt(w.blocks, editing) : undefined;
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { title: id ? t('workouts.editWorkoutTitle') : t('workouts.newWorkoutTitle'), onBack: cancel, right: _jsx(Button, { size: "sm", onClick: save, children: t('common.save') }) }), _jsx(Field, { label: t('workouts.name'), children: _jsx(TextInput, { value: w.name, onChange: (v) => patch({ name: v }), placeholder: t('workouts.namePlaceholder'), autoFocus: !id }) }), _jsx(Field, { label: t('workouts.description'), children: _jsx(TextArea, { rows: 2, value: w.description, onChange: (v) => patch({ description: v }), placeholder: t('common.optional') }) }), _jsx(Field, { label: t('workouts.color'), children: _jsx("div", { className: "hstack", children: COLORS.map((c) => _jsx("button", { "aria-label": c, onClick: () => patch({ color: c }), style: { width: 32, height: 32, borderRadius: 999, background: c, outline: w.color === c ? '3px solid var(--text)' : 'none', outlineOffset: 2 } }, c)) }) }), est && (_jsxs("div", { className: "builder-stats", children: [_jsxs("div", { className: "builder-stat", style: { background: 'var(--inverse-bg)', color: 'var(--inverse-text)' }, children: [_jsx("span", { className: "v", children: fmtDuration(est.seconds) }), _jsx("span", { className: "l", style: { color: 'var(--inverse-muted)' }, children: t('workouts.totalTime') })] }), _jsxs("div", { className: "builder-stat", style: { background: 'var(--workout-soft)', color: 'var(--workout-strong)' }, children: [_jsxs("span", { className: "v", children: ["~", Math.round(est.kcal)] }), _jsx("span", { className: "l", children: t('workouts.kcalAtWeight', { kg: profile.weightKg }) })] }), _jsxs("div", { className: "builder-stat", style: { background: 'var(--surface)', border: '1px solid var(--border)' }, children: [_jsx("span", { className: "v", children: est.steps }), _jsx("span", { className: "l muted", children: t('workouts.steps') })] })] })), w.blocks.map((b, i) => renderBlock(b, [i])), w.blocks.length === 0 && _jsx("div", { className: "empty", style: { padding: '20px 0' }, children: _jsx("div", { className: "empty-text", children: t('workouts.addExercisesHint') }) }), _jsxs("div", { className: "addbar", children: [_jsxs("button", { className: "addslot", onClick: () => setAddingTo([]), children: [_jsx(IconPlus, { size: 16 }), t('workouts.exercise')] }), _jsxs("button", { className: "addslot", onClick: () => addRest([]), children: [_jsx(IconPlus, { size: 16 }), t('workouts.rest')] }), _jsxs("button", { className: "addslot", onClick: addGroup, children: [_jsx(IconPlus, { size: 16 }), t('workouts.rounds')] })] }), _jsxs("div", { className: "stack", children: [_jsx(Button, { size: "lg", full: true, onClick: save, children: id ? t('common.saveChanges') : t('workouts.createWorkout') }), _jsx(Button, { variant: "ghost", full: true, onClick: cancel, children: t('common.cancel') })] }), _jsx(ExercisePicker, { open: addingTo !== null, onClose: () => setAddingTo(null), exercises: allExercises ?? [], onPick: addExercise }), _jsx(Sheet, { open: !!editingBlock, onClose: () => setEditing(null), title: editingBlock?.type === 'group' ? t('workouts.rounds') : editingBlock?.type === 'rest' ? t('workouts.rest') : exMap.get(editingBlock?.exerciseId ?? '')?.name, footer: editing ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", icon: _jsx(IconCopy, { size: 18 }), onClick: () => { duplicateAt(editing); setEditing(null); }, children: t('common.duplicate') }), _jsx(Button, { variant: "danger", icon: _jsx(IconTrash, { size: 18 }), onClick: () => { removeAt(editing); setEditing(null); }, children: t('common.remove') })] })) : undefined, children: editing && editingBlock && _jsx(BlockEditor, { block: editingBlock, exercise: editingBlock.type === 'exercise' ? exMap.get(editingBlock.exerciseId) : undefined, onChange: (nb) => replaceAt(editing, nb) }) }), _jsx("style", { children: '.rot180 { transform: rotate(180deg); }' })] }));
}
function BlockEditor({ block, exercise, onChange }) {
    const t = useT();
    if (block.type === 'rest') {
        return (_jsxs("div", { className: "stack", children: [_jsxs("div", { className: "spread", children: [_jsx("span", { className: "bold", children: t('workouts.duration') }), _jsx(Stepper, { value: block.seconds, min: 5, max: 600, step: 5, format: (v) => `${v} ${t('unit.s')}`, onChange: (v) => onChange({ ...block, seconds: v }) })] }), _jsx("div", { className: "hstack wrap", children: [10, 15, 20, 30, 45, 60, 90].map((s) => _jsxs("button", { className: `chip ${block.seconds === s ? 'chip-active' : ''}`, onClick: () => onChange({ ...block, seconds: s }), children: [s, " ", t('unit.s')] }, s)) })] }));
    }
    if (block.type === 'group') {
        return (_jsxs("div", { className: "stack", children: [_jsx(Field, { label: t('workouts.name'), children: _jsx(TextInput, { value: block.name ?? '', onChange: (v) => onChange({ ...block, name: v }), placeholder: t('workouts.circuitDefault') }) }), _jsxs("div", { className: "spread", children: [_jsx("span", { className: "bold", children: t('workouts.rounds') }), _jsx(Stepper, { value: block.rounds, min: 1, max: 20, onChange: (v) => onChange({ ...block, rounds: v }) })] }), _jsxs("div", { className: "spread", children: [_jsx("span", { className: "bold", children: t('workouts.restBetweenRounds') }), _jsx(Stepper, { value: block.restBetweenRounds, min: 0, max: 600, step: 5, format: (v) => `${v} ${t('unit.s')}`, onChange: (v) => onChange({ ...block, restBetweenRounds: v }) })] })] }));
    }
    const mode = block.reps != null ? 'reps' : 'time';
    return (_jsxs("div", { className: "stack", children: [exercise && _jsx("div", { style: { alignSelf: 'center' }, children: _jsx(ExerciseVisual, { exercise: exercise, size: "box" }) }), _jsx(Segmented, { value: mode, onChange: (m) => onChange(m === 'reps' ? { id: block.id, type: 'exercise', exerciseId: block.exerciseId, reps: exercise?.kind === 'reps' ? exercise.defaultAmount : 10 } : { id: block.id, type: 'exercise', exerciseId: block.exerciseId, seconds: exercise?.kind === 'time' ? exercise.defaultAmount : 30 }), options: [{ value: 'time', label: t('workouts.forTime') }, { value: 'reps', label: t('workouts.forReps') }] }), mode === 'time' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "spread", children: [_jsx("span", { className: "bold", children: t('workouts.duration') }), _jsx(Stepper, { value: block.seconds ?? 30, min: 5, max: 3600, step: 5, format: (v) => `${v} ${t('unit.s')}`, onChange: (v) => onChange({ ...block, seconds: v }) })] }), _jsx("div", { className: "hstack wrap", children: [20, 30, 40, 45, 60, 90, 120].map((s) => _jsxs("button", { className: `chip ${block.seconds === s ? 'chip-active' : ''}`, onClick: () => onChange({ ...block, seconds: s }), children: [s, " ", t('unit.s')] }, s)) })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "spread", children: [_jsx("span", { className: "bold", children: t('workouts.reps') }), _jsx(Stepper, { value: block.reps ?? 10, min: 1, max: 500, onChange: (v) => onChange({ ...block, reps: v }) })] }), _jsx("div", { className: "small muted", children: t('workouts.timedAtPerRep', { n: exercise?.secPerRep ?? 3 }) })] }))] }));
}
export function ExercisePicker({ open, onClose, exercises, onPick }) {
    const t = useT();
    const [q, setQ] = useState('');
    const ql = q.trim().toLowerCase();
    const list = exercises.filter((e) => !ql || e.name.toLowerCase().includes(ql) || e.muscles.some((m) => m.includes(ql)));
    return (_jsxs(Sheet, { open: open, onClose: onClose, title: t('workouts.addExerciseSheetTitle'), full: true, footer: _jsx(Button, { variant: "secondary", onClick: onClose, children: t('common.done') }), children: [_jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", placeholder: t('workouts.searchExercises'), value: q, onChange: (e) => setQ(e.target.value) })] }), _jsxs("div", { className: "list", children: [list.map((e) => (_jsxs(Row, { onClick: () => onPick(e), right: _jsx(IconPlus, { className: "c-workout" }), children: [_jsx(ExerciseVisual, { exercise: e, animated: false }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: e.name }), _jsxs("div", { className: "row-sub", children: [e.kind === 'time' ? `${e.defaultAmount} ${t('unit.s')}` : `${e.defaultAmount} ${t('unit.reps')}`, " \u00B7 ", e.muscles.join(', ')] })] })] }, e.id))), list.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-text", children: t('workouts.noExercisesMatch') }) })] }), _jsx(Button, { variant: "secondary", full: true, className: "mt", icon: _jsx(IconPlus, { size: 18 }), onClick: () => { onClose(); navigate('/workouts/exercise/new'); }, children: t('workouts.createCustomExercise') })] }));
}
