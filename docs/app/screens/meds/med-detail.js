import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// One medication: progress, schedule by phase, adherence, calendar export, pause/done, history.
import { useMemo } from 'react';
import { addDays, formatDateTime, formatShortYear, todayKey, weekdayName } from '../../lib/dates.js';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { adherence, chainText, doseLine, dosesOn, endDate, hintText, isOver, kindText, medicationToText, phaseOn, phaseStart, progressText, shareIcs, sortSlots, stockDaysLeft, totalDays, withStates } from '../../lib/meds.js';
import { back, navigate } from '../../lib/router.js';
import { useDoseLogs, useMedLogs, useMedication, useMedications } from '../../lib/queries.js';
import { Button, Card, IconButton, Progress, Screen, Stat, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCalendarPlus, IconEdit, IconPause, IconPill, IconPlay, IconShare } from '../../ui/icons.js';
import { DayStrip, DoseRow, SectionLabel, StatusPill } from './meds-ui.js';
export function MedDetailScreen({ id }) {
    const t = useT();
    const med = useMedication(id);
    const all = useMedications();
    const logs = useMedLogs(id);
    const today = todayKey();
    const todayLogs = useDoseLogs(today);
    const stats = useMemo(() => (med && logs ? adherence([med], logs, 30) : null), [med, logs]);
    const todays = useMemo(() => (med && todayLogs ? withStates(dosesOn([med], today, true), todayLogs) : []), [med, todayLogs, today]);
    if (med === null) {
        navigate('/meds', { replace: true });
        return _jsx(Screen, { className: "screen-no-tabs" });
    }
    if (!med || !all || !logs)
        return _jsx(Screen, { className: "screen-no-tabs" });
    const total = totalDays(med);
    const pos = phaseOn(med, today);
    const end = endDate(med);
    const over = isOver(med);
    const stockDays = stockDaysLeft(med);
    const setStatus = async (status) => { await put('medications', { ...med, status, updatedAt: Date.now() }); toast(t(`meds.status.${status}`)); };
    const exportIcs = async () => {
        const how = await shareIcs(med, all);
        toast(how === 'shared' ? t('meds.calendarShared') : t('meds.calendarDownloaded'));
    };
    const shareText = async () => {
        const text = medicationToText(med, all);
        try {
            if (navigator.share) {
                await navigator.share({ title: med.name, text });
                return;
            }
            await navigator.clipboard.writeText(text);
            toast(t('shopping.copiedToClipboard'));
        }
        catch { /* cancelled */ }
    };
    const markDone = async () => {
        const ok = await confirmDialog({ title: t('meds.markDoneTitle', { name: med.name }), message: t('meds.markDoneText'), confirmLabel: t('meds.status.done') });
        if (ok)
            setStatus('done');
    };
    return (_jsxs(Screen, { className: "screen-no-tabs meds", children: [_jsx(TopBar, { onBack: () => back('/meds'), title: kindText(med.kind), right: _jsxs(_Fragment, { children: [_jsx(IconButton, { label: t('common.share'), onClick: shareText, children: _jsx(IconShare, { size: 18 }) }), _jsx(IconButton, { label: t('common.edit'), tone: "meds", onClick: () => navigate(`/meds/${med.id}/edit`), children: _jsx(IconEdit, { size: 18 }) })] }) }), _jsxs("div", { className: "med-hero", children: [_jsx("div", { className: "thumb", style: { background: med.color }, children: _jsx(IconPill, { size: 26 }) }), _jsxs("div", { className: "row-main", children: [_jsx("h1", { className: "title-large", style: { fontSize: 26 }, children: med.name }), _jsx("div", { className: "small muted", children: [med.strength, t(`meds.form.${med.form}s`), med.person ? t('meds.forPerson', { name: med.person }) : ''].filter(Boolean).join(' · ') })] }), _jsx(StatusPill, { status: over && med.status === 'active' ? 'done' : med.status })] }), _jsxs(Card, { dark: true, className: "mb", children: [_jsx("div", { className: "section-label", style: { color: 'var(--inverse-muted)' }, children: t('meds.progress') }), _jsx("div", { className: "disp", style: { fontSize: 22, fontWeight: 800 }, children: over ? t('meds.finished') : progressText(med) }), _jsxs("div", { className: "small muted", style: { marginTop: 2 }, children: [formatShortYear(med.startDate), end ? ` → ${formatShortYear(end)}` : ` → ${t('meds.untilStopped')}`, med.weekdays.length ? ` · ${[1, 2, 3, 4, 5, 6, 0].filter((d) => med.weekdays.includes(d)).map((d) => weekdayName(d)).join(', ')}` : ''] }), total && pos && _jsx("div", { style: { marginTop: 10 }, children: _jsx(Progress, { value: pos.dayOverall, max: total, color: "var(--meds)", height: 6 }) })] }), todays.length > 0 && (_jsxs(_Fragment, { children: [_jsx(SectionLabel, { children: t('meds.today') }), _jsx("div", { className: "tl-rows mb", children: todays.map((d) => _jsx(DoseRow, { dose: d, meds: all, showTime: true, onOpen: () => { } }, d.logId)) })] })), _jsx(SectionLabel, { children: t('meds.alerts') }), _jsx("div", { className: "small muted mb", children: t('meds.alertsHint') }), _jsx(Button, { variant: "meds", full: true, icon: _jsx(IconCalendarPlus, { size: 18 }), onClick: exportIcs, className: "mb", children: t('meds.addToCalendar') }), _jsx(SectionLabel, { children: t('meds.schedule') }), _jsx("div", { className: "stack mb", children: med.phases.map((p, pi) => {
                    const active = pos?.phaseIndex === pi;
                    const start = phaseStart(med, pi);
                    return (_jsxs("div", { className: "list sched-list", style: active ? { borderColor: 'var(--meds)' } : undefined, children: [_jsxs("div", { className: "row", style: { background: active ? 'var(--meds-soft)' : 'var(--surface-2)' }, children: [_jsx("span", { className: "phase-index", children: pi + 1 }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: p.label || t('meds.phaseN', { n: pi + 1 }) }), _jsxs("div", { className: "row-sub", children: [p.days ? t('meds.daysCount', { n: p.days }) : t('meds.untilStopped'), " \u00B7 ", formatShortYear(start), p.days ? ` → ${formatShortYear(addDays(start, p.days - 1))}` : '', active && pos ? ` · ${t('meds.dayOf', { d: pos.dayInPhase, n: p.days || pos.dayInPhase })}` : ''] })] })] }), sortSlots(p.slots).map((s) => (_jsxs("div", { className: "row", children: [_jsx("span", { className: "sched-time", children: s.time }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", style: { whiteSpace: 'normal' }, children: doseLine(med, s) || t('meds.dose') }), _jsx("div", { className: "row-sub", children: [hintText(s), chainText(s, all), s.note].filter(Boolean).join(' · ') })] })] }, s.id)))] }, p.id));
                }) }), stats && (_jsxs(_Fragment, { children: [_jsx(SectionLabel, { children: t('meds.last30') }), _jsxs("div", { className: "adh-grid mb", children: [_jsx(Stat, { value: _jsxs("span", { className: "c-meds", children: [stats.pct, "%"] }), label: t('meds.adherence') }), _jsx(Stat, { value: stats.taken, label: t('meds.takenLabel') }), _jsx(Stat, { value: stats.skipped + stats.missed, label: t('meds.missedLabel') }), _jsx(Stat, { value: stats.streak, label: t('meds.streak') })] }), _jsx("div", { className: "mb", children: _jsx(DayStrip, { meds: [med], logs: logs }) })] })), typeof med.stock === 'number' && (_jsxs(_Fragment, { children: [_jsx(SectionLabel, { children: t('meds.stock') }), _jsx("div", { className: "list mb", children: _jsxs("div", { className: "settings-row", children: [_jsxs("span", { className: "l", children: [t('meds.unitsLeft'), _jsx("small", { children: stockDays !== null && stockDays < 365 ? t('meds.enoughFor', { n: stockDays }) : '' })] }), _jsx("span", { className: `bold num ${stockDays !== null && stockDays <= 3 ? 'c-danger' : ''}`, children: med.stock })] }) })] })), med.notes && _jsx("div", { className: "card mb", style: { whiteSpace: 'pre-wrap' }, children: med.notes }), _jsxs("div", { className: "stack mb", children: [med.status === 'active' && !over && _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconPause, { size: 18 }), onClick: () => setStatus('paused'), children: t('meds.pause') }), med.status === 'paused' && _jsx(Button, { variant: "meds", full: true, icon: _jsx(IconPlay, { size: 18 }), onClick: () => setStatus('active'), children: t('meds.resume') }), med.status !== 'done' && _jsx(Button, { variant: "secondary", full: true, onClick: markDone, children: t('meds.markDone') }), med.status === 'done' && _jsx(Button, { variant: "secondary", full: true, onClick: () => setStatus('active'), children: t('meds.reactivate') })] }), logs.length > 0 && (_jsxs(_Fragment, { children: [_jsx(SectionLabel, { children: t('meds.history') }), _jsx("div", { className: "list", children: logs.slice(0, 20).map((l) => {
                            const slot = med.phases.flatMap((p) => p.slots).find((s) => s.id === l.slotId);
                            return (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "row-main", children: [_jsxs("div", { className: "row-title", children: [l.date, " \u00B7 ", slot?.time ?? '—'] }), _jsx("div", { className: "row-sub", children: formatDateTime(l.at) })] }), _jsx("span", { className: `tag ${l.status === 'taken' ? 'tag-meds' : ''}`, children: t(`meds.state.${l.status}`) })] }, l.id));
                        }) })] }))] }));
}
