import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Meds home: next dose hero, today's timeline grouped by time, the medication list.
import { useMemo, useState } from 'react';
import { formatLong, todayKey } from '../../lib/dates.js';
import { useNow } from '../../lib/hooks.js';
import { useT } from '../../lib/i18n.js';
import { doseLine, dosesOn, groupByTime, hintText, isOver, markDose, nextDose, progressText, stockDaysLeft, withStates } from '../../lib/meds.js';
import { navigate } from '../../lib/router.js';
import { useDoseLogs, useMedications } from '../../lib/queries.js';
import { Button, Card, Chip, Empty, Progress, Screen, TopBar } from '../../ui/components.js';
import { IconCheck, IconChevron, IconPill, IconPlus } from '../../ui/icons.js';
import { AppsButton, Fab } from '../pocket/pocket-ui.js';
import { DoseRow, MedBadge, SectionLabel, StatusPill, useDueAlert } from './meds-ui.js';
export function MedsHomeScreen() {
    const t = useT();
    const now = useNow(30_000);
    const today = todayKey();
    const meds = useMedications();
    const logs = useDoseLogs(today);
    const [filter, setFilter] = useState('active');
    const todays = useMemo(() => (meds && logs ? withStates(dosesOn(meds, today), logs, new Date(now)) : undefined), [meds, logs, today, now]);
    const next = useMemo(() => (meds && logs ? nextDose(meds, logs, new Date(now)) : null), [meds, logs, now]);
    const groups = useMemo(() => (todays ? groupByTime(todays) : []), [todays]);
    const taken = todays?.filter((d) => d.state === 'taken').length ?? 0;
    useDueAlert(todays);
    const shown = (meds ?? []).filter((m) => m.status === filter);
    const counts = { active: (meds ?? []).filter((m) => m.status === 'active').length, paused: (meds ?? []).filter((m) => m.status === 'paused').length, done: (meds ?? []).filter((m) => m.status === 'done').length };
    return (_jsxs(Screen, { className: "screen-no-tabs meds", children: [_jsx(TopBar, { large: true, left: _jsx(AppsButton, {}), title: _jsx("span", { className: "c-meds", children: t('meds.title') }), eyebrow: formatLong(today) }), meds && meds.length === 0 ? (_jsx(Empty, { icon: _jsx(IconPill, { size: 40 }), title: t('meds.noMeds'), text: t('meds.noMedsText'), action: _jsx(Button, { variant: "meds", icon: _jsx(IconPlus, { size: 18 }), onClick: () => navigate('/meds/new'), children: t('meds.newMed') }) })) : (_jsxs(_Fragment, { children: [_jsx(NextCard, { next: next, todays: todays, taken: taken, now: now }), todays && todays.length > 0 && (_jsxs(_Fragment, { children: [_jsx(SectionLabel, { right: _jsx("span", { className: "small muted num", children: t('meds.takenOf', { taken, total: todays.length }) }), children: t('meds.today') }), _jsx("div", { className: "timeline mb", children: groups.map((g) => {
                                    const cls = g.doses.some((d) => d.state === 'late') ? 'late' : g.doses.some((d) => d.state === 'due') ? 'due' : '';
                                    return (_jsxs("div", { className: `tl-block ${cls}`, children: [_jsx("div", { className: "tl-time", children: g.time }), _jsx("div", { className: "tl-rows", children: g.doses.map((d) => _jsx(DoseRow, { dose: d, meds: meds ?? [] }, d.logId)) })] }, g.time));
                                }) })] })), todays && todays.length === 0 && counts.active > 0 && _jsx("div", { className: "small muted mb", style: { textAlign: 'center', padding: '8px 0' }, children: t('meds.nothingToday') }), _jsx(SectionLabel, { children: t('meds.medications') }), _jsxs("div", { className: "hstack mb", style: { flexWrap: 'wrap' }, children: [_jsxs(Chip, { tone: "meds", active: filter === 'active', onClick: () => setFilter('active'), children: [t('meds.status.active'), " ", _jsx("span", { className: "muted", children: counts.active })] }), counts.paused > 0 && _jsxs(Chip, { tone: "meds", active: filter === 'paused', onClick: () => setFilter('paused'), children: [t('meds.status.paused'), " ", _jsx("span", { className: "muted", children: counts.paused })] }), counts.done > 0 && _jsxs(Chip, { tone: "meds", active: filter === 'done', onClick: () => setFilter('done'), children: [t('meds.status.done'), " ", _jsx("span", { className: "muted", children: counts.done })] })] }), _jsxs("div", { className: "stack", children: [shown.map((m) => _jsx(MedCard, { med: m }, m.id)), shown.length === 0 && _jsx("div", { className: "small muted", style: { textAlign: 'center', padding: 12 }, children: t('meds.noneInFilter') })] })] })), _jsxs(Fab, { tone: "meds", onClick: () => navigate('/meds/new'), children: [_jsx(IconPlus, { size: 20, strokeWidth: 2.5 }), " ", t('meds.newMed')] })] }));
}
function NextCard({ next, todays, taken, now }) {
    const t = useT();
    if (!todays)
        return null;
    const total = todays.length;
    if (!next) {
        return (_jsxs(Card, { dark: true, className: "next-card mb", children: [_jsx("div", { className: "section-label", style: { color: 'var(--inverse-muted)' }, children: t('meds.next') }), _jsx("div", { className: "next-when", children: total > 0 && taken === total ? t('meds.allDone') : t('meds.nothingPlanned') }), total > 0 && _jsx("div", { className: "small muted", children: t('meds.takenOf', { taken, total }) })] }));
    }
    const d = new Date(now);
    const nm = d.getHours() * 60 + d.getMinutes();
    const isToday = next.date === todayKey();
    const diff = next.minutes - nm;
    const when = !isToday ? t('meds.tomorrowAt', { time: next.slot.time }) : diff > 0 ? (diff >= 60 ? t('meds.inHours', { h: Math.floor(diff / 60), m: diff % 60 }) : t('meds.inMinutes', { m: diff })) : diff === 0 ? t('meds.now') : t('meds.lateBy', { m: -diff });
    return (_jsxs(Card, { dark: true, className: "next-card mb", children: [_jsx("div", { className: "section-label", style: { color: 'var(--inverse-muted)' }, children: next.state === 'late' ? t('meds.overdue') : t('meds.next') }), _jsx("div", { className: "next-when", style: next.state === 'late' ? { color: '#FF7A55' } : undefined, children: when }), _jsxs("div", { className: "hstack", style: { gap: 8 }, children: [_jsx("span", { className: "med-dot", style: { width: 10, height: 10, borderRadius: 999, background: next.med.color, flexShrink: 0 } }), _jsxs("span", { className: "bold", children: [next.slot.time, " \u00B7 ", next.med.name] }), _jsx("span", { className: "muted small", children: doseLine(next.med, next.slot) })] }), hintText(next.slot) && _jsx("div", { className: "small", style: { color: 'var(--inverse-muted)' }, children: hintText(next.slot) }), total > 0 && _jsx("div", { className: "mt", style: { marginTop: 10 }, children: _jsx(Progress, { value: taken, max: total, color: "var(--meds)", height: 6 }) }), isToday && (_jsxs("div", { className: "next-actions", children: [_jsx(Button, { variant: "meds", icon: _jsx(IconCheck, { size: 18, strokeWidth: 3 }), onClick: () => markDose(next, 'taken'), children: t('meds.taken') }), _jsx(Button, { variant: "secondary", onClick: () => markDose(next, 'skipped'), children: t('meds.skip') })] }))] }));
}
function MedCard({ med }) {
    const t = useT();
    const today = todayKey();
    const todaysDoses = dosesOn([med], today, true);
    const stockDays = stockDaysLeft(med);
    const lowStock = typeof med.stock === 'number' && ((typeof med.stockWarnAt === 'number' && med.stock <= med.stockWarnAt) || (stockDays !== null && stockDays <= 3));
    return (_jsxs(Card, { onClick: () => navigate(`/meds/${med.id}`), className: "med-card", children: [_jsxs("div", { className: "hstack", children: [_jsx(MedBadge, { med: med }), _jsxs("div", { className: "row-main", children: [_jsxs("div", { className: "row-title", children: [med.name, " ", med.strength && _jsx("span", { className: "muted", style: { fontWeight: 500 }, children: med.strength })] }), _jsxs("div", { className: "row-sub", children: [med.status === 'done' || isOver(med) ? t('meds.finished') : progressText(med), med.person ? ` · ${med.person}` : ''] })] }), _jsx(StatusPill, { status: med.status }), _jsx(IconChevron, { size: 18, className: "muted" })] }), _jsxs("div", { className: "hstack", style: { marginTop: 8, gap: 8, flexWrap: 'wrap' }, children: [todaysDoses.length > 0 ? _jsx("span", { className: "small muted", children: todaysDoses.map((d) => d.slot.time).join(' · ') }) : _jsx("span", { className: "small muted", children: t('meds.notToday') }), _jsx("span", { style: { flex: 1 } }), typeof med.stock === 'number' && _jsx("span", { className: `tag ${lowStock ? 'tag-workout' : ''}`, children: t('meds.stockLeft', { n: med.stock }) })] })] }));
}
