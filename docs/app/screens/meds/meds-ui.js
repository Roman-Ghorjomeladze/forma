import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Shared pieces for Meds screens: dose rows, status pill, badge, day strip, due-alert hook.
import { useEffect, useRef } from 'react';
import { sounds } from '../../lib/audio.js';
import { addDays, todayKey, weekdayShort, dayOfMonth } from '../../lib/dates.js';
import { useT } from '../../lib/i18n.js';
import { amountText, chainText, doseLine, dosesOn, hintText, markDose, nowMinutes, unmarkDose } from '../../lib/meds.js';
import { navigate } from '../../lib/router.js';
import { toast } from '../../ui/dialogs.js';
import { IconCheck, IconClose, IconPill } from '../../ui/icons.js';
export function MedBadge({ med, size = 40 }) {
    const color = med?.color ?? '#9A978F';
    return _jsx("div", { className: "cat-badge", style: { width: size, height: size, background: `${color}22`, color }, children: _jsx(IconPill, { size: Math.round(size * 0.5) }) });
}
export function StatusPill({ status }) {
    const t = useT();
    return _jsx("span", { className: `med-status-pill ${status}`, children: t(`meds.status.${status}`) });
}
/** One dose in the Today timeline: tap the circle to mark taken (again to undo), "skip" for skipped. */
export function DoseRow({ dose, meds, showTime = false, onOpen }) {
    const t = useT();
    const { med, slot, state, log } = dose;
    const toggle = async () => {
        if (log) {
            await unmarkDose(dose, log);
            return;
        }
        await markDose(dose, 'taken');
        if (typeof med.stock === 'number' && typeof med.stockWarnAt === 'number' && med.stock - 1 <= med.stockWarnAt)
            toast(t('meds.stockLow', { name: med.name, n: med.stock - 1 }));
    };
    const skip = async () => { await markDose(dose, 'skipped'); };
    const hint = hintText(slot);
    const chain = chainText(slot, meds);
    return (_jsxs("div", { className: `dose-row ${state}`, children: [_jsxs("button", { type: "button", className: "dose-check", "aria-label": log ? t('meds.undo') : t('meds.taken'), onClick: toggle, children: [state === 'taken' && _jsx(IconCheck, { size: 16, strokeWidth: 3 }), state === 'skipped' && _jsx(IconClose, { size: 14, strokeWidth: 3 })] }), _jsxs("button", { type: "button", className: "row-main", style: { textAlign: 'left' }, onClick: onOpen ?? (() => navigate(`/meds/${med.id}`)), children: [_jsxs("div", { className: "dose-name", children: [_jsx("span", { className: "med-dot", style: { background: med.color } }), showTime && _jsx("span", { className: "num muted", children: slot.time }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: med.name })] }), _jsxs("div", { className: "dose-sub", children: [doseLine(med, slot) && _jsx("span", { children: doseLine(med, slot) }), hint && _jsx("span", { className: "hint", children: hint }), chain && _jsx("span", { className: "chain", children: chain }), slot.note && _jsx("span", { children: slot.note }), med.person && _jsxs("span", { children: ["\u00B7 ", med.person] })] })] }), state === 'due' && _jsx("span", { className: "dose-state due", children: t('meds.state.due') }), state === 'late' && _jsx("span", { className: "dose-state late", children: t('meds.state.late') }), state === 'skipped' && _jsx("span", { className: "dose-state", children: t('meds.state.skipped') }), !log && dose.date <= todayKey() && _jsx("button", { type: "button", className: "dose-skip", onClick: skip, children: t('meds.skip') })] }));
}
/** Last 14 days as coloured pips: full / partial / missed. */
export function DayStrip({ meds, logs, days = 14 }) {
    const today = todayKey();
    const map = new Map(logs.map((l) => [l.id, l]));
    const cells = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1)).map((day) => {
        const list = dosesOn(meds, day, true);
        if (list.length === 0)
            return { day, cls: '', label: '' };
        const taken = list.filter((d) => map.get(d.logId)?.status === 'taken').length;
        const resolved = list.filter((d) => map.get(d.logId)).length;
        const isToday = day === today;
        const cls = taken === list.length ? 'full' : taken > 0 ? 'part' : resolved > 0 || !isToday ? 'miss' : '';
        return { day, cls, label: `${taken}/${list.length}` };
    });
    return (_jsx("div", { className: "day-strip", children: cells.map((c) => (_jsxs("div", { className: "day-cell", children: [_jsx("span", { children: weekdayShort(c.day).slice(0, 2) }), _jsx("div", { className: `pip ${c.cls} ${c.day === today ? 'today' : ''}`, children: c.label ? c.label : dayOfMonth(c.day) })] }, c.day))) }));
}
/** Plays a cue + toast when a dose becomes due while the app is open (checked every 30 s). */
export function useDueAlert(today) {
    const t = useT();
    const announced = useRef(new Set());
    useEffect(() => {
        const tick = () => {
            if (!today)
                return;
            const nm = nowMinutes();
            for (const d of today) {
                if (d.log || d.minutes > nm || d.minutes < nm - 1 || announced.current.has(d.logId))
                    continue;
                announced.current.add(d.logId);
                try {
                    sounds.go();
                }
                catch { /* audio not unlocked */ }
                try {
                    navigator.vibrate?.([200, 100, 200]);
                }
                catch { /* ignore */ }
                toast(t('meds.dueNow', { name: d.med.name, dose: amountText(d.med, d.slot) }), 6000);
            }
        };
        tick();
        const id = window.setInterval(tick, 30_000);
        return () => window.clearInterval(id);
    }, [today, t]);
}
export function SectionLabel({ children, right }) {
    return _jsxs("div", { className: "spread", style: { marginBottom: 8 }, children: [_jsx("div", { className: "section-label", style: { margin: 0 }, children: children }), right] });
}
