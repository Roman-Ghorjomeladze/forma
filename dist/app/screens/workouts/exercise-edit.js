import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { get, put, saveBlob } from '../../lib/db.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, NumberInput, Screen, Segmented, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { DEMO_KEYS, Demo } from '../../ui/demos.js';
import { IconImage, IconTrash } from '../../ui/icons.js';
const MET_PRESETS = [
    { label: 'Stretching', met: 2.3 }, { label: 'Light (core, mobility)', met: 3 }, { label: 'Moderate (push-ups, rows)', met: 4 },
    { label: 'Squats / lunges', met: 5 }, { label: 'Vigorous (deadlift, step-ups)', met: 6 }, { label: 'High intensity (burpees, HIIT)', met: 8 }, { label: 'Very high (jump rope, sprints)', met: 11 },
];
function blank() {
    const now = Date.now();
    return { id: uid('ex'), name: '', muscles: [], equipment: [], kind: 'reps', met: 4, secPerRep: 3, defaultAmount: 12, demo: { type: 'none' }, cues: [], isCustom: true, createdAt: now, updatedAt: now };
}
export function ExerciseEditScreen({ id }) {
    const [ex, setEx] = useState(id ? null : blank());
    const [muscles, setMuscles] = useState('');
    const [equipment, setEquipment] = useState('');
    const [cues, setCues] = useState('');
    const [pending, setPending] = useState(null);
    const [preview, setPreview] = useState(undefined);
    const existing = useBlobUrl(ex?.demo.type === 'blob' ? ex.demo.blobId : undefined);
    const fileRef = useRef(null);
    useEffect(() => {
        if (!id)
            return;
        get('exercises', id).then((e) => {
            if (!e) {
                navigate('/workouts/exercises', { replace: true });
                return;
            }
            setEx(e);
            setMuscles(e.muscles.join(', '));
            setEquipment(e.equipment.join(', '));
            setCues(e.cues.join('\n'));
        });
    }, [id]);
    useEffect(() => {
        if (!pending) {
            setPreview(undefined);
            return;
        }
        const u = URL.createObjectURL(pending);
        setPreview(u);
        return () => URL.revokeObjectURL(u);
    }, [pending]);
    if (!ex)
        return _jsx(Screen, { className: "screen-no-tabs" });
    const patch = (p) => setEx({ ...ex, ...p });
    const split = (s) => s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const save = async () => {
        if (!ex.name.trim()) {
            toast('Give the exercise a name');
            return;
        }
        let demo = ex.demo;
        if (pending) {
            if (pending.size > 8 * 1024 * 1024) {
                toast('Please use a GIF/image under 8 MB');
                return;
            }
            const blobId = await saveBlob(pending, pending.name);
            demo = { type: 'blob', blobId };
        }
        const final = { ...ex, name: ex.name.trim(), muscles: split(muscles), equipment: split(equipment), cues: cues.split('\n').map((c) => c.trim()).filter(Boolean), demo, updatedAt: Date.now() };
        await put('exercises', final);
        toast('Saved');
        navigate(`/workouts/exercise/${final.id}`, { replace: true });
    };
    const cancel = async () => {
        if (!id && (ex.name || pending) && !(await confirmDialog({ title: 'Discard this exercise?', confirmLabel: 'Discard', danger: true })))
            return;
        navigate(id ? `/workouts/exercise/${id}` : '/workouts/exercises', { replace: true });
    };
    const demoUrl = preview ?? existing;
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { title: id ? 'Edit exercise' : 'New exercise', onBack: cancel, right: _jsx(Button, { size: "sm", onClick: save, children: "Save" }) }), _jsx(Field, { label: "Name", children: _jsx(TextInput, { value: ex.name, onChange: (v) => patch({ name: v }), placeholder: "e.g. Goblet squat", autoFocus: !id }) }), _jsx(Field, { label: "Muscles", hint: "Comma separated: quads, glutes", children: _jsx(TextInput, { value: muscles, onChange: setMuscles, placeholder: "quads, glutes, core" }) }), _jsx(Field, { label: "Equipment", hint: "Leave empty for bodyweight", children: _jsx(TextInput, { value: equipment, onChange: setEquipment, placeholder: "dumbbell" }) }), _jsx("div", { className: "section-label mt", children: "Measured by" }), _jsx(Segmented, { value: ex.kind, onChange: (k) => patch({ kind: k, defaultAmount: k === 'time' ? 30 : 12 }), options: [{ value: 'reps', label: 'Reps' }, { value: 'time', label: 'Time' }] }), _jsx("div", { className: "mt" }), _jsx(Field, { label: ex.kind === 'time' ? 'Default duration' : 'Default reps', inline: true, children: _jsx(NumberInput, { value: ex.defaultAmount, min: 1, max: 3600, suffix: ex.kind === 'time' ? 's' : 'reps', onChange: (v) => patch({ defaultAmount: v }) }) }), ex.kind === 'reps' && _jsx(Field, { label: "Seconds per rep", inline: true, hint: "Used to estimate time and calories for rep-based sets.", children: _jsx(NumberInput, { value: ex.secPerRep, min: 0.5, max: 30, suffix: "s", onChange: (v) => patch({ secPerRep: v }) }) }), _jsx("div", { className: "section-label mt", children: "Intensity (MET)" }), _jsx("div", { className: "small muted mb", children: "kcal per minute \u2248 MET \u00D7 body weight (kg) \u00F7 60." }), _jsx(Field, { label: "MET", inline: true, children: _jsx(NumberInput, { value: ex.met, min: 1, max: 20, onChange: (v) => patch({ met: v }) }) }), _jsx("div", { className: "hstack wrap mb", children: MET_PRESETS.map((p) => _jsxs("button", { className: `chip ${ex.met === p.met ? 'chip-active' : ''}`, onClick: () => patch({ met: p.met }), children: [p.label, " \u00B7 ", p.met] }, p.met)) }), _jsx("div", { className: "section-label mt", children: "Demo" }), _jsx("div", { className: "small muted mb", children: "Upload your own GIF or image, or pick a built-in animation." }), _jsx("div", { className: "demo-box demo-box-lg mb", onClick: () => fileRef.current?.click(), role: "button", children: demoUrl ? _jsx("img", { src: demoUrl, alt: "" }) : ex.demo.type === 'builtin' ? _jsx(Demo, { demoKey: ex.demo.key }) : _jsxs("span", { className: "hstack muted", children: [_jsx(IconImage, {}), "Tap to upload a GIF / image"] }) }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", hidden: true, onChange: (e) => { const f = e.target.files?.[0]; if (f) {
                    setPending(f);
                } } }), _jsxs("div", { className: "hstack mb", children: [_jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(IconImage, { size: 16 }), onClick: () => fileRef.current?.click(), children: "Upload GIF / image" }), (pending || ex.demo.type !== 'none') && _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(IconTrash, { size: 16 }), onClick: () => { setPending(null); patch({ demo: { type: 'none' } }); }, children: "Remove" })] }), _jsx("div", { className: "exercise-grid mb", children: DEMO_KEYS.map((k) => (_jsxs("button", { className: "exercise-tile", style: ex.demo.type === 'builtin' && ex.demo.key === k && !pending ? { borderColor: 'var(--workout)' } : undefined, onClick: () => { setPending(null); patch({ demo: { type: 'builtin', key: k } }); }, children: [_jsx("div", { className: "demo-box", style: { width: '100%', aspectRatio: '1.6' }, children: _jsx(Demo, { demoKey: k, animated: false }) }), _jsx("div", { className: "exercise-sub", children: k.replace(/-/g, ' ') })] }, k))) }), _jsx(Field, { label: "Form cues", hint: "One per line \u2014 the first one is shown during the workout.", children: _jsx(TextArea, { rows: 3, value: cues, onChange: setCues, placeholder: 'Chest up\nKnees over toes' }) }), _jsxs("div", { className: "stack mt", children: [_jsx(Button, { size: "lg", full: true, onClick: save, children: id ? 'Save changes' : 'Create exercise' }), _jsx(Button, { variant: "ghost", full: true, onClick: cancel, children: "Cancel" })] })] }));
}
