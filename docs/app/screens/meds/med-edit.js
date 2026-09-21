import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Medication editor: identity, schedule (phases → dose slots), weekdays, stock, notes.
import { useEffect, useState } from 'react';
import { weekdayName } from '../../lib/dates.js';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { deleteMedication, generateSlots, MED_COLORS, newMedication, newPhase, newSlot, sortSlots, totalDays } from '../../lib/meds.js';
import { DOSE_HINTS, MED_FORMS } from '../../lib/models.js';
import { back, navigate } from '../../lib/router.js';
import { useMedication, useMedications } from '../../lib/queries.js';
import { Button, Chip, Field, NumberInput, Screen, Segmented, Select, Sheet, TextArea, TextInput, Toggle, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCopy, IconPlus, IconTrash } from '../../ui/icons.js';
export function MedEditScreen({ id }) {
    const t = useT();
    const existing = useMedication(id);
    const all = useMedications();
    const [draft, setDraft] = useState(id ? null : newMedication());
    const [fill, setFill] = useState(null); // phase index the quick-fill sheet is open for
    useEffect(() => { if (id && existing)
        setDraft(existing); }, [id, existing]);
    if (id && existing === null) {
        navigate('/meds', { replace: true });
        return _jsx(Screen, { className: "screen-no-tabs" });
    }
    if (!draft || !all)
        return _jsx(Screen, { className: "screen-no-tabs" });
    const set = (patch) => setDraft({ ...draft, ...patch });
    const setPhase = (i, patch) => set({ phases: draft.phases.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
    const setSlot = (pi, si, patch) => setPhase(pi, { slots: draft.phases[pi].slots.map((s, k) => (k === si ? { ...s, ...patch } : s)) });
    const others = all.filter((m) => m.id !== draft.id && m.status !== 'done');
    const backTo = id ? `/meds/${id}` : '/meds';
    const save = async () => {
        const name = draft.name.trim();
        if (!name) {
            toast(t('pocket.nameRequired'));
            return;
        }
        if (draft.phases.length === 0 || draft.phases.some((p) => p.slots.length === 0)) {
            toast(t('meds.needSlot'));
            return;
        }
        if (draft.phases.some((p, i) => p.days <= 0 && i < draft.phases.length - 1)) {
            toast(t('meds.openEndedOnlyLast'));
            return;
        }
        const phases = draft.phases.map((p) => ({ ...p, label: p.label.trim(), slots: sortSlots(p.slots).map((s) => ({ ...s, amount: s.amount.trim(), note: s.note.trim(), afterMedId: s.afterMedId || undefined, gapMin: s.afterMedId ? s.gapMin ?? 30 : undefined })) }));
        await put('medications', { ...draft, name, strength: draft.strength.trim(), person: draft.person.trim(), notes: draft.notes.trim(), phases, updatedAt: Date.now() });
        if (id)
            back(backTo);
        else
            navigate(`/meds/${draft.id}`, { replace: true });
    };
    const del = async () => {
        const ok = await confirmDialog({ title: t('meds.deleteTitle', { name: draft.name }), message: t('meds.deleteText'), confirmLabel: t('common.delete'), danger: true });
        if (!ok)
            return;
        await deleteMedication(draft.id);
        navigate('/meds', { replace: true });
    };
    const addPhase = () => {
        const last = draft.phases[draft.phases.length - 1];
        const copy = last ? { ...newPhase(), days: last.days || 7, slots: last.slots.map((s) => ({ ...newSlot(s.time), amount: s.amount, hint: s.hint, note: s.note, afterMedId: s.afterMedId, gapMin: s.gapMin })) } : newPhase();
        set({ phases: [...draft.phases, copy] });
    };
    const removePhase = (i) => set({ phases: draft.phases.filter((_, k) => k !== i) });
    const addSlot = (pi) => {
        const slots = draft.phases[pi].slots;
        const last = sortSlots(slots)[slots.length - 1];
        const time = last ? nextTime(last.time) : '09:00';
        setPhase(pi, { slots: [...slots, newSlot(time, { amount: last?.amount ?? '1', hint: last?.hint ?? 'none' })] });
    };
    const removeSlot = (pi, si) => setPhase(pi, { slots: draft.phases[pi].slots.filter((_, k) => k !== si) });
    const total = totalDays(draft);
    const hintOptions = DOSE_HINTS.map((h) => ({ value: h, label: h === 'none' ? t('meds.hint.none') : t(`meds.hint.${h}`) }));
    const afterOptions = [{ value: '', label: t('meds.noChain') }, ...others.map((m) => ({ value: m.id, label: m.name }))];
    return (_jsxs(Screen, { className: "screen-no-tabs meds", children: [_jsx(TopBar, { onBack: () => back(backTo), title: id ? t('meds.editMed') : t('meds.newMed'), right: _jsx(Button, { size: "sm", variant: "meds", onClick: save, children: t('common.save') }) }), _jsx(Segmented, { value: draft.kind, onChange: (v) => set({ kind: v }), options: [{ value: 'medicine', label: t('meds.kind.medicine') }, { value: 'supplement', label: t('meds.kind.supplement') }] }), _jsxs("div", { className: "mt", children: [_jsx(Field, { label: t('meds.name'), children: _jsx(TextInput, { value: draft.name, onChange: (v) => set({ name: v }), placeholder: t('meds.namePlaceholder'), autoFocus: !id }) }), _jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('meds.strength'), hint: t('common.optional'), children: _jsx(TextInput, { value: draft.strength, onChange: (v) => set({ strength: v }), placeholder: "500 mg" }) }), _jsx(Field, { label: t('meds.formLabel'), children: _jsx(Select, { value: draft.form, onChange: (v) => set({ form: v }), options: MED_FORMS.map((f) => ({ value: f, label: t(`meds.form.${f}s`) })) }) })] }), _jsx(Field, { label: t('pocket.colour'), children: _jsx("div", { className: "swatches", children: MED_COLORS.map((c) => _jsx("button", { type: "button", "aria-label": c, className: `swatch ${c === draft.color ? 'active' : ''}`, style: { background: c }, onClick: () => set({ color: c }) }, c)) }) }), _jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('meds.person'), hint: t('meds.personHint'), children: _jsx(TextInput, { value: draft.person, onChange: (v) => set({ person: v }), placeholder: t('meds.personPlaceholder') }) }), _jsx(Field, { label: t('meds.startsOn'), children: _jsx("input", { className: "input input-date", type: "date", value: draft.startDate, onChange: (e) => set({ startDate: e.target.value || draft.startDate }) }) })] })] }), _jsx("div", { className: "section-label mt", children: t('meds.schedule') }), _jsx("div", { className: "small muted mb", children: t('meds.scheduleHint') }), draft.phases.map((p, pi) => (_jsxs("div", { className: "phase-card", children: [_jsxs("div", { className: "phase-head", children: [_jsx("span", { className: "phase-index", children: pi + 1 }), _jsx("input", { className: "input", style: { height: 40, flex: 1 }, value: p.label, placeholder: t('meds.phaseLabelPlaceholder', { n: pi + 1 }), onChange: (e) => setPhase(pi, { label: e.target.value }) }), draft.phases.length > 1 && _jsx("button", { type: "button", className: "iconbtn iconbtn-plain", "aria-label": t('common.remove'), onClick: () => removePhase(pi), children: _jsx(IconTrash, { size: 18 }) })] }), _jsxs("div", { className: "hstack", style: { gap: 10 }, children: [_jsx("span", { className: "small bold", children: t('meds.lasts') }), _jsx(NumberInput, { value: p.days, min: 0, max: 3650, onChange: (v) => setPhase(pi, { days: v }), suffix: t('meds.days') }), pi === draft.phases.length - 1 && _jsx(Toggle, { checked: p.days === 0, label: t('meds.untilStopped'), onChange: (v) => setPhase(pi, { days: v ? 0 : 7 }) }), pi === draft.phases.length - 1 && _jsx("span", { className: "small muted", children: t('meds.untilStopped') })] }), sortSlots(p.slots).map((s) => {
                        const si = p.slots.indexOf(s);
                        return (_jsxs("div", { className: "slot-card", children: [_jsxs("div", { className: "slot-top", children: [_jsx("input", { className: "input time-input", type: "time", value: s.time, onChange: (e) => setSlot(pi, si, { time: e.target.value || s.time }) }), _jsx("input", { className: "input amount-input", inputMode: "decimal", value: s.amount, placeholder: "1", "aria-label": t('meds.amount'), onChange: (e) => setSlot(pi, si, { amount: e.target.value }) }), _jsxs("span", { className: "small muted", style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [t(`meds.form.${draft.form}s`), draft.strength ? ` · ${draft.strength}` : ''] })] }), _jsx("div", { className: "slot-more", children: _jsx(Select, { value: s.hint, onChange: (v) => setSlot(pi, si, { hint: v }), options: hintOptions }) }), others.length > 0 && (_jsxs("div", { className: "slot-more", children: [_jsx(Select, { value: s.afterMedId ?? '', onChange: (v) => setSlot(pi, si, { afterMedId: v || undefined, gapMin: v ? s.gapMin ?? 30 : undefined }), options: afterOptions }), s.afterMedId && _jsxs(_Fragment, { children: [_jsx("input", { className: "input gap-input", inputMode: "numeric", value: String(s.gapMin ?? 30), onChange: (e) => setSlot(pi, si, { gapMin: Math.max(0, Number(e.target.value) || 0) }) }), _jsx("span", { className: "small muted", children: t('meds.minAfter') })] })] })), _jsx("div", { className: "slot-note", children: _jsx("input", { className: "input", value: s.note, placeholder: t('meds.slotNotePlaceholder'), onChange: (e) => setSlot(pi, si, { note: e.target.value }) }) }), p.slots.length > 1 && _jsx("div", { className: "slot-actions", children: _jsx("button", { type: "button", className: "danger", onClick: () => removeSlot(pi, si), children: t('meds.removeDose') }) })] }, s.id));
                    }), _jsxs("div", { className: "phase-actions", children: [_jsxs(Chip, { onClick: () => addSlot(pi), children: [_jsx(IconPlus, { size: 15 }), " ", t('meds.addDose')] }), _jsx(Chip, { onClick: () => setFill(pi), children: t('meds.everyNHours') }), pi === draft.phases.length - 1 && _jsxs(Chip, { onClick: addPhase, children: [_jsx(IconCopy, { size: 15 }), " ", t('meds.addPhase')] })] })] }, p.id))), _jsx("div", { className: "small muted mb", children: total === null ? t('meds.courseOpen') : t('meds.courseTotal', { n: total }) }), _jsx("div", { className: "section-label mt", children: t('meds.whichDays') }), _jsxs("div", { className: "hstack mb", style: { gap: 10 }, children: [_jsx(Toggle, { checked: draft.weekdays.length > 0, onChange: (v) => set({ weekdays: v ? [1, 2, 3, 4, 5] : [] }) }), _jsx("span", { className: "small", children: draft.weekdays.length ? t('meds.onlyTheseDays') : t('meds.everyDay') })] }), draft.weekdays.length > 0 && (_jsx("div", { className: "weekday-row mb", children: [1, 2, 3, 4, 5, 6, 0].map((d) => _jsx("button", { type: "button", className: `weekday-btn ${draft.weekdays.includes(d) ? 'on' : ''}`, onClick: () => set({ weekdays: draft.weekdays.includes(d) ? draft.weekdays.filter((x) => x !== d) : [...draft.weekdays, d] }), children: weekdayName(d) }, d)) })), _jsx("div", { className: "section-label mt", children: t('meds.stock') }), _jsxs("div", { className: "list mb", children: [_jsxs("div", { className: "settings-row", children: [_jsxs("span", { className: "l", children: [t('meds.trackStock'), _jsx("small", { children: t('meds.trackStockHint') })] }), _jsx(Toggle, { checked: typeof draft.stock === 'number', onChange: (v) => set({ stock: v ? 30 : undefined, stockWarnAt: v ? 5 : undefined }) })] }), typeof draft.stock === 'number' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "settings-row", children: [_jsx("span", { className: "l", children: t('meds.unitsLeft') }), _jsx(NumberInput, { value: draft.stock, min: 0, max: 100000, onChange: (v) => set({ stock: v }) })] }), _jsxs("div", { className: "settings-row", children: [_jsx("span", { className: "l", children: t('meds.warnAt') }), _jsx(NumberInput, { value: draft.stockWarnAt ?? 5, min: 0, max: 100000, onChange: (v) => set({ stockWarnAt: v }) })] })] }))] }), _jsx(Field, { label: t('meds.notes'), hint: t('meds.notesHint'), children: _jsx(TextArea, { value: draft.notes, onChange: (v) => set({ notes: v }), rows: 2 }) }), _jsx(Button, { variant: "meds", full: true, size: "lg", onClick: save, className: "mt", children: id ? t('common.saveChanges') : t('meds.saveMed') }), id && _jsx(Button, { variant: "ghost", full: true, className: "mt c-danger", onClick: del, children: t('meds.deleteMed') }), _jsx(QuickFillSheet, { open: fill !== null, onClose: () => setFill(null), amount: fill !== null ? draft.phases[fill]?.slots[0]?.amount ?? '1' : '1', onApply: (slots) => { if (fill !== null)
                    setPhase(fill, { slots }); setFill(null); } })] }));
}
function nextTime(t) {
    const [h, m] = t.split(':').map(Number);
    const next = Math.min(23 * 60 + 30, h * 60 + m + 6 * 60);
    return `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
}
function QuickFillSheet({ open, onClose, amount, onApply }) {
    const t = useT();
    const [from, setFrom] = useState('08:00');
    const [to, setTo] = useState('22:00');
    const [every, setEvery] = useState(8);
    const [amt, setAmt] = useState(amount);
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open)
            setAmt(amount);
    }
    const preview = generateSlots(from, to, every * 60, amt);
    return (_jsxs(Sheet, { open: open, onClose: onClose, title: t('meds.everyNHours'), footer: _jsx(Button, { variant: "meds", disabled: preview.length === 0, onClick: () => onApply(preview), children: t('meds.applyTimes', { n: preview.length }) }), children: [_jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('meds.from'), children: _jsx("input", { className: "input", type: "time", value: from, onChange: (e) => setFrom(e.target.value || from) }) }), _jsx(Field, { label: t('meds.to'), children: _jsx("input", { className: "input", type: "time", value: to, onChange: (e) => setTo(e.target.value || to) }) })] }), _jsx(Field, { label: t('meds.everyHours'), inline: true, children: _jsx(NumberInput, { value: every, min: 1, max: 24, onChange: setEvery, suffix: "h" }) }), _jsx(Field, { label: t('meds.amount'), inline: true, children: _jsx(TextInput, { value: amt, onChange: setAmt, className: "input-short" }) }), _jsx("div", { className: "small muted", children: preview.map((s) => s.time).join(' · ') || t('meds.noTimes') })] }));
}
