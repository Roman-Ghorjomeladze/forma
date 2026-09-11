import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { EQUIPMENT_CATEGORIES } from '../../data/equipment-categories.js';
import { videoLibrary } from '../../data/exercise-video-library.js';
import { localizedExerciseName } from '../../data/seed-i18n.js';
import { get, put, saveBlob } from '../../lib/db.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { useLang, useT } from '../../lib/i18n.js';
import { navigate } from '../../lib/router.js';
import { Button, Chip, Field, NumberInput, Screen, Segmented, Sheet, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { Demo as BuiltinDemo } from '../../ui/demos.js';
import { IconImage, IconPlay, IconSearch, IconTrash } from '../../ui/icons.js';
const MET_PRESET_DEFS = [
    { labelKey: 'exercise.met.stretching', met: 2.3 }, { labelKey: 'exercise.met.light', met: 3 }, { labelKey: 'exercise.met.moderate', met: 4 },
    { labelKey: 'exercise.met.squats', met: 5 }, { labelKey: 'exercise.met.vigorous', met: 6 }, { labelKey: 'exercise.met.high', met: 8 }, { labelKey: 'exercise.met.veryHigh', met: 11 },
];
function blank() {
    const now = Date.now();
    return { id: uid('ex'), name: '', muscles: [], equipment: [], kind: 'reps', met: 4, secPerRep: 3, defaultAmount: 12, demo: { type: 'none' }, cues: [], isCustom: true, createdAt: now, updatedAt: now };
}
/** Full-screen sheet to browse the bundled exercise-video library and pick a demo clip. */
function VideoPickerSheet({ open, onClose, onPick }) {
    const t = useT();
    const lang = useLang();
    const [q, setQ] = useState('');
    const [equip, setEquip] = useState('all');
    const EQUIP_CHIPS = [{ key: 'all', label: t('equipment.all') }, ...EQUIPMENT_CATEGORIES.map((c) => ({ key: c.key, label: t(c.labelKey) }))];
    const list = useMemo(() => {
        const ql = q.trim().toLowerCase();
        const eqCat = EQUIPMENT_CATEGORIES.find((c) => c.key === equip);
        return videoLibrary.filter((v) => (!eqCat || eqCat.match(v.equipment)) && (!ql || localizedExerciseName(v.id, v.name, lang).toLowerCase().includes(ql) || v.muscles.some((m) => m.includes(ql))));
    }, [q, equip, lang]);
    return (_jsxs(Sheet, { open: open, onClose: onClose, title: t('exercise.chooseDemoVideoTitle'), full: true, children: [_jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", placeholder: t('exercise.searchVideos'), value: q, onChange: (e) => setQ(e.target.value) })] }), _jsx("div", { className: "chips", style: { margin: '0 0 10px', padding: 0 }, children: EQUIP_CHIPS.map((c) => _jsx(Chip, { tone: "workout", active: equip === c.key, onClick: () => setEquip(c.key), children: c.label }, c.key)) }), _jsxs("div", { className: "exercise-grid mb", children: [list.map((v) => (_jsxs("button", { className: "exercise-tile", onClick: () => onPick(v), children: [_jsx("div", { className: "demo-box", style: { width: '100%', aspectRatio: '1.3' }, children: _jsx("video", { src: v.demo.type === 'video' ? v.demo.file : undefined, poster: v.demo.type === 'video' ? v.demo.file.replace(/\.mp4$/, '.jpg') : undefined, autoPlay: true, loop: true, muted: true, playsInline: true }) }), _jsx("div", { className: "exercise-name", children: localizedExerciseName(v.id, v.name, lang) }), _jsx("div", { className: "exercise-sub", children: v.muscles.join(', ') })] }, v.id))), list.length === 0 && _jsx("div", { className: "empty", children: _jsx("div", { className: "empty-title", children: t('exercise.noVideosMatch') }) })] })] }));
}
export function ExerciseEditScreen({ id }) {
    const t = useT();
    const lang = useLang();
    const [ex, setEx] = useState(id ? null : blank());
    const [muscles, setMuscles] = useState('');
    const [equipment, setEquipment] = useState('');
    const [cues, setCues] = useState('');
    const [pending, setPending] = useState(null);
    const [preview, setPreview] = useState(undefined);
    const [pickingVideo, setPickingVideo] = useState(false);
    const existing = useBlobUrl(ex?.demo.type === 'blob' ? ex.demo.blobId : undefined);
    const fileRef = useRef(null);
    const MET_PRESETS = MET_PRESET_DEFS.map((p) => ({ ...p, label: t(p.labelKey) }));
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
    const pickVideo = (v) => {
        setPending(null);
        const p = { demo: v.demo };
        if (!ex.name.trim())
            p.name = localizedExerciseName(v.id, v.name, lang);
        if (!muscles.trim())
            setMuscles(v.muscles.join(', '));
        if (!equipment.trim())
            setEquipment(v.equipment.join(', '));
        patch(p);
        setPickingVideo(false);
    };
    const save = async () => {
        if (!ex.name.trim()) {
            toast(t('exercise.giveItAName'));
            return;
        }
        let demo = ex.demo;
        if (pending) {
            if (pending.size > 8 * 1024 * 1024) {
                toast(t('exercise.gifTooBig'));
                return;
            }
            const blobId = await saveBlob(pending, pending.name);
            demo = { type: 'blob', blobId };
        }
        const final = { ...ex, name: ex.name.trim(), muscles: split(muscles), equipment: split(equipment), cues: cues.split('\n').map((c) => c.trim()).filter(Boolean), demo, updatedAt: Date.now() };
        await put('exercises', final);
        toast(t('common.saved'));
        navigate(`/workouts/exercise/${final.id}`, { replace: true });
    };
    const cancel = async () => {
        if (!id && (ex.name || pending) && !(await confirmDialog({ title: t('exercise.discardTitle'), confirmLabel: t('common.discard'), danger: true })))
            return;
        navigate(id ? `/workouts/exercise/${id}` : '/workouts/exercises', { replace: true });
    };
    const demoUrl = preview ?? existing;
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { title: id ? t('exercise.editTitle') : t('exercise.newTitle'), onBack: cancel, right: _jsx(Button, { size: "sm", onClick: save, children: t('common.save') }) }), _jsx(Field, { label: t('exercise.name'), children: _jsx(TextInput, { value: ex.name, onChange: (v) => patch({ name: v }), placeholder: t('exercise.namePlaceholder'), autoFocus: !id }) }), _jsx(Field, { label: t('exercise.muscles'), hint: t('exercise.musclesHint'), children: _jsx(TextInput, { value: muscles, onChange: setMuscles, placeholder: t('exercise.musclesPlaceholder') }) }), _jsx(Field, { label: t('exercise.equipment'), hint: t('exercise.equipmentHint'), children: _jsx(TextInput, { value: equipment, onChange: setEquipment, placeholder: t('exercise.equipmentPlaceholder') }) }), _jsx("div", { className: "section-label mt", children: t('exercise.measuredBy') }), _jsx(Segmented, { value: ex.kind, onChange: (k) => patch({ kind: k, defaultAmount: k === 'time' ? 30 : 12 }), options: [{ value: 'reps', label: t('exercise.reps') }, { value: 'time', label: t('exercise.time') }] }), _jsx("div", { className: "mt" }), _jsx(Field, { label: ex.kind === 'time' ? t('exercise.defaultDuration') : t('exercise.defaultRepsField'), inline: true, children: _jsx(NumberInput, { value: ex.defaultAmount, min: 1, max: 3600, suffix: ex.kind === 'time' ? t('unit.s') : t('unit.reps'), onChange: (v) => patch({ defaultAmount: v }) }) }), ex.kind === 'reps' && _jsx(Field, { label: t('exercise.secPerRep'), inline: true, hint: t('exercise.secPerRepHint'), children: _jsx(NumberInput, { value: ex.secPerRep, min: 0.5, max: 30, suffix: t('unit.s'), onChange: (v) => patch({ secPerRep: v }) }) }), _jsx("div", { className: "section-label mt", children: t('exercise.intensity') }), _jsx("div", { className: "small muted mb", children: t('exercise.intensityHint') }), _jsx(Field, { label: "MET", inline: true, children: _jsx(NumberInput, { value: ex.met, min: 1, max: 20, onChange: (v) => patch({ met: v }) }) }), _jsx("div", { className: "hstack wrap mb", children: MET_PRESETS.map((p) => _jsxs("button", { className: `chip ${ex.met === p.met ? 'chip-active' : ''}`, onClick: () => patch({ met: p.met }), children: [p.label, " \u00B7 ", p.met] }, p.met)) }), _jsx("div", { className: "section-label mt", children: t('exercise.demo') }), _jsx("div", { className: "small muted mb", children: t('exercise.demoHint') }), _jsx("div", { className: "demo-box demo-box-lg mb", onClick: () => (demoUrl || ex.demo.type === 'video' || ex.demo.type === 'builtin') ? setPickingVideo(true) : fileRef.current?.click(), role: "button", children: demoUrl ? _jsx("img", { src: demoUrl, alt: "" })
                    : ex.demo.type === 'video' ? _jsx("video", { src: ex.demo.file, poster: ex.demo.file.replace(/\.mp4$/, '.jpg'), autoPlay: true, loop: true, muted: true, playsInline: true })
                        : ex.demo.type === 'builtin' ? _jsx(BuiltinDemo, { demoKey: ex.demo.key })
                            : _jsxs("span", { className: "hstack muted", children: [_jsx(IconImage, {}), t('exercise.tapToUpload')] }) }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", hidden: true, onChange: (e) => { const f = e.target.files?.[0]; if (f) {
                    setPending(f);
                } } }), _jsxs("div", { className: "hstack wrap mb", children: [_jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(IconPlay, { size: 16 }), onClick: () => setPickingVideo(true), children: t('exercise.chooseVideo') }), _jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(IconImage, { size: 16 }), onClick: () => fileRef.current?.click(), children: t('exercise.uploadGif') }), (pending || ex.demo.type !== 'none') && _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(IconTrash, { size: 16 }), onClick: () => { setPending(null); patch({ demo: { type: 'none' } }); }, children: t('common.remove') })] }), _jsx(Field, { label: t('exercise.formCues'), hint: t('exercise.formCuesHint'), children: _jsx(TextArea, { rows: 3, value: cues, onChange: setCues, placeholder: 'Chest up\nKnees over toes' }) }), _jsxs("div", { className: "stack mt", children: [_jsx(Button, { size: "lg", full: true, onClick: save, children: id ? t('common.saveChanges') : t('exercise.createExercise') }), _jsx(Button, { variant: "ghost", full: true, onClick: cancel, children: t('common.cancel') })] }), _jsx(VideoPickerSheet, { open: pickingVideo, onClose: () => setPickingVideo(false), onPick: pickVideo })] }));
}
