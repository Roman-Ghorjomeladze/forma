import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { bulkPut, remove } from '../../lib/db.js';
import { fmtDuration, weekdayName } from '../../lib/dates.js';
import { estimateWorkout } from '../../lib/calories.js';
import { localizedWorkoutName } from '../../data/seed-i18n.js';
import { useProfile } from '../../lib/hooks.js';
import { useLang, useT } from '../../lib/i18n.js';
import { useExerciseMap, useSchedule, useSessions, useWorkouts } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { applyImport, parseShareFile, planImport, shareWorkouts } from '../../lib/workout-share.js';
import { Button, Card, Empty, IconButton, Row, Screen, Section, Segmented, Sheet, TopBar } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconCheck, IconChevron, IconDumbbell, IconHistory, IconPlus, IconShare, IconStar, IconUpload } from '../../ui/icons.js';
export function WorkoutsScreen() {
    const t = useT();
    const lang = useLang();
    const [profile] = useProfile();
    const workouts = useWorkouts();
    const exercises = useExerciseMap();
    const schedule = useSchedule();
    const sessions = useSessions(50);
    const [pickDay, setPickDay] = useState(null);
    // multi-select for bulk export
    const [selecting, setSelecting] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [busy, setBusy] = useState(false);
    // import
    const fileRef = useRef(null);
    const [plan, setPlan] = useState(null);
    const [importSel, setImportSel] = useState(new Set());
    const [importMode, setImportMode] = useState('update');
    const order = profile.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    const byDay = useMemo(() => new Map((schedule ?? []).map((s) => [s.weekday, s.workoutId])), [schedule]);
    const todayWd = new Date().getDay();
    const weekKcal = useMemo(() => {
        const since = Date.now() - 7 * 86400e3;
        return Math.round((sessions ?? []).filter((s) => s.startedAt >= since).reduce((a, s) => a + s.kcal, 0));
    }, [sessions]);
    const setDay = async (weekday, workoutId) => {
        if (workoutId)
            await bulkPut('schedule', [{ weekday, workoutId }]);
        else
            await remove('schedule', weekday);
        setPickDay(null);
    };
    const stopSelecting = () => { setSelecting(false); setSelected(new Set()); };
    const toggle = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id))
        n.delete(id);
    else
        n.add(id); return n; });
    const selectAll = () => setSelected(new Set((workouts ?? []).map((w) => w.id)));
    const shareSelected = async () => {
        const list = (workouts ?? []).filter((w) => selected.has(w.id));
        if (list.length === 0)
            return;
        setBusy(true);
        try {
            const title = list.length === 1 ? t('workouts.shareTitleOne', { name: localizedWorkoutName(list[0].id, list[0].name, lang) }) : t('workouts.shareTitleMany', { n: list.length });
            const how = await shareWorkouts(list, title);
            if (how === 'shared') {
                toast(t('workouts.shareReady'));
                stopSelecting();
            }
            else if (how === 'downloaded') {
                toast(t('workouts.shareDownloaded'));
                stopSelecting();
            }
        }
        catch (e) {
            toast(t('workouts.shareFailed'));
            console.error(e);
        }
        finally {
            setBusy(false);
        }
    };
    const openImport = async (file) => {
        setBusy(true);
        try {
            const parsed = parseShareFile(await file.text());
            const p = await planImport(parsed);
            setPlan(p);
            setImportSel(new Set(p.file.workouts.map((w) => w.id)));
            setImportMode('update');
        }
        catch (e) {
            toast(t('workouts.notShareFile'));
            console.error(e);
        }
        finally {
            setBusy(false);
            if (fileRef.current)
                fileRef.current.value = '';
        }
    };
    const toggleImport = (id) => setImportSel((prev) => { const n = new Set(prev); if (n.has(id))
        n.delete(id);
    else
        n.add(id); return n; });
    const confirmImport = async () => {
        if (!plan || importSel.size === 0)
            return;
        setBusy(true);
        try {
            const r = await applyImport(plan, importSel, importMode);
            toast(t('workouts.importDone', { n: r.added + r.updated }));
            setPlan(null);
        }
        catch (e) {
            toast(t('workouts.shareFailed'));
            console.error(e);
        }
        finally {
            setBusy(false);
        }
    };
    const estimateOf = (w) => (exercises ? estimateWorkout(w, exercises, profile.weightKg) : null);
    const hasWorkouts = (workouts?.length ?? 0) > 0;
    const importNeedsMode = plan ? plan.file.workouts.some((w) => plan.existing.has(w.id) && importSel.has(w.id)) : false;
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, title: t('workouts.title'), eyebrow: weekKcal > 0 ? t('workouts.kcalBurnedThisWeek', { n: weekKcal }) : t('workouts.countWorkouts', { n: workouts?.length ?? 0 }), right: _jsxs(_Fragment, { children: [_jsx(IconButton, { label: t('workouts.history'), onClick: () => navigate('/workouts/history'), children: _jsx(IconHistory, { size: 20 }) }), _jsx(IconButton, { label: t('workouts.exerciseLibrary'), onClick: () => navigate('/workouts/exercises'), children: _jsx(IconStar, { size: 20 }) }), _jsx(IconButton, { label: t('workouts.newWorkout'), tone: "accent", onClick: () => navigate('/workouts/new'), children: _jsx(IconPlus, {}) })] }) }), _jsx(Section, { title: t('workouts.weeklySchedule'), right: _jsx("span", { children: t('workouts.tapDayToAssign') }), children: _jsx("div", { className: "calendar-week", children: order.map((wd) => {
                        const w = workouts?.find((x) => x.id === byDay.get(wd));
                        return (_jsxs("button", { className: w ? 'has' : '', style: wd === todayWd ? { background: 'var(--surface-2)' } : undefined, onClick: () => setPickDay(wd), children: [_jsx("span", { children: weekdayName(wd) }), w ? _jsxs(_Fragment, { children: [_jsx("span", { className: "sched-swatch", style: { background: w.color } }), _jsx("span", { className: "w", children: localizedWorkoutName(w.id, w.name, lang) })] }) : _jsx("span", { className: "w muted", style: { fontWeight: 500 }, children: "\u2014" })] }, wd));
                    }) }) }), _jsx(Section, { title: selecting ? t('workouts.nSelected', { n: selected.size }) : t('workouts.myWorkouts'), right: selecting ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "c-workout", onClick: selectAll, children: t('workouts.selectAll') }), _jsx("button", { className: "muted", onClick: stopSelecting, children: t('common.cancel') })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { className: "c-workout", onClick: () => fileRef.current?.click(), children: t('workouts.import') }), hasWorkouts && _jsx("button", { className: "c-workout", onClick: () => setSelecting(true), children: t('workouts.select') })] })), children: workouts && workouts.length === 0 ? (_jsx(Empty, { icon: _jsx(IconDumbbell, { size: 40 }), title: t('workouts.noWorkoutsYet'), text: t('workouts.noWorkoutsHint'), action: _jsxs("div", { className: "hstack wrap", style: { justifyContent: 'center' }, children: [_jsx(Button, { icon: _jsx(IconPlus, { size: 18 }), onClick: () => navigate('/workouts/new'), children: t('workouts.newWorkout') }), _jsx(Button, { variant: "secondary", icon: _jsx(IconUpload, { size: 18 }), onClick: () => fileRef.current?.click(), children: t('workouts.import') })] }) })) : (_jsx("div", { className: "stack", style: selecting ? { marginBottom: 100 } : undefined, children: (workouts ?? []).map((w) => {
                        const est = estimateOf(w);
                        const on = selected.has(w.id);
                        return (_jsx(Card, { onClick: () => (selecting ? toggle(w.id) : navigate(`/workouts/${w.id}`)), className: selecting && on ? 'card-selected' : '', children: _jsxs("div", { className: "workout-card", children: [selecting ? _jsx("span", { className: `check ${on ? 'on' : ''}`, style: on ? { background: 'var(--workout)', borderColor: 'var(--workout)' } : undefined, children: on && _jsx(IconCheck, { size: 14, strokeWidth: 3 }) }) : _jsx("span", { className: "workout-color", style: { background: w.color } }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: localizedWorkoutName(w.id, w.name, lang) }), _jsx("div", { className: "row-sub", children: est ? `${fmtDuration(est.seconds)} · ${est.exercises} ${t('unit.exercises')} · ~${Math.round(est.kcal)} ${t('unit.kcal')}` : '' })] }), !selecting && _jsx(Button, { size: "sm", onClick: () => navigate(`/workouts/${w.id}/play`), children: t('today.start') }), !selecting && _jsx(IconChevron, { className: "muted" })] }) }, w.id));
                    }) })) }), _jsx("input", { ref: fileRef, type: "file", accept: "application/json,.json", hidden: true, onChange: (e) => { const f = e.target.files?.[0]; if (f)
                    openImport(f); } }), selecting && (_jsx("div", { className: "sticky-cta sticky-cta-above-tabs", children: _jsx(Button, { size: "lg", full: true, icon: _jsx(IconShare, { size: 20 }), disabled: busy || selected.size === 0, onClick: shareSelected, children: selected.size === 0 ? t('workouts.selectHint') : t('workouts.shareCount', { n: selected.size }) }) })), _jsx(Sheet, { open: pickDay !== null, onClose: () => setPickDay(null), title: pickDay !== null ? `${weekdayName(pickDay, true)}` : '', children: _jsxs("div", { className: "list", children: [(workouts ?? []).map((w) => (_jsxs(Row, { onClick: () => pickDay !== null && setDay(pickDay, w.id), right: pickDay !== null && byDay.get(pickDay) === w.id ? _jsx("span", { className: "c-workout", children: t('workouts.assigned') }) : undefined, children: [_jsx("span", { className: "sched-swatch", style: { background: w.color, width: 12, height: 12 } }), _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title", children: localizedWorkoutName(w.id, w.name, lang) }) })] }, w.id))), _jsx(Row, { onClick: () => pickDay !== null && setDay(pickDay, null), children: _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title muted", children: t('workouts.restDayNothing') }) }) })] }) }), _jsx(Sheet, { open: plan !== null, onClose: () => setPlan(null), title: t('workouts.importTitle'), footer: _jsx(Button, { size: "lg", disabled: busy || importSel.size === 0, icon: _jsx(IconUpload, { size: 18 }), onClick: confirmImport, children: t('workouts.importButton', { n: importSel.size }) }), children: plan && (_jsxs(_Fragment, { children: [_jsx("div", { className: "small muted mb", children: t('workouts.importPreviewHint') }), _jsx("div", { className: "list mb", children: plan.file.workouts.map((w) => {
                                const on = importSel.has(w.id);
                                const est = estimateOf(w);
                                const exists = plan.existing.has(w.id);
                                return (_jsxs(Row, { onClick: () => toggleImport(w.id), right: _jsx("span", { className: `tag ${exists ? '' : 'tag-workout'}`, children: exists ? t('workouts.importExisting') : t('workouts.importNew') }), children: [_jsx("span", { className: `check ${on ? 'on' : ''}`, style: on ? { background: 'var(--workout)', borderColor: 'var(--workout)' } : undefined, children: on && _jsx(IconCheck, { size: 14, strokeWidth: 3 }) }), _jsx("span", { className: "sched-swatch", style: { background: w.color, width: 12, height: 12 } }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: w.name }), _jsx("div", { className: "row-sub", children: est ? `${fmtDuration(est.seconds)} · ${est.exercises} ${t('unit.exercises')}` : '' })] })] }, w.id));
                            }) }), importNeedsMode && (_jsxs("div", { className: "mb", children: [_jsx("div", { className: "section-label", style: { marginBottom: 8 }, children: t('workouts.importExistingMode') }), _jsx(Segmented, { value: importMode, onChange: setImportMode, options: [{ value: 'update', label: t('workouts.importReplace') }, { value: 'copy', label: t('workouts.importKeepBoth') }] })] })), plan.missingExercises.length > 0 && _jsx("div", { className: "small muted mb", children: t('workouts.importExercisesNote', { n: plan.missingExercises.length }) }), plan.unresolvable.size > 0 && _jsx("div", { className: "small muted mb", children: t('workouts.importUnresolvable', { n: plan.unresolvable.size }) })] })) })] }));
}
