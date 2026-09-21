// Meds helpers: schedule engine (which doses fall on a day, in which phase), dose states,
// adherence, quick-fill of slots, and iCalendar export with alarms.
import { bulkRemove, getByIndex, put, remove } from './db.js';
import { addDays, fromKey, todayKey } from './dates.js';
import { uid } from './ids.js';
import { tGlobal } from './i18n.js';
import type { DoseLog, DoseSlot, MedForm, MedKind, Medication, Phase } from './models.js';

export const MED_COLORS = ['#2F7DE1', '#D9488A', '#2FAF6E', '#E39A1C', '#B76DE0', '#1FA8A8', '#F0532D', '#E9B52A', '#5B5BD6', '#9A978F'];

export function newSlot(time = '09:00', partial: Partial<DoseSlot> = {}): DoseSlot {
  return { id: uid('slot'), time, amount: '1', hint: 'none', note: '', ...partial };
}

export function newPhase(partial: Partial<Phase> = {}): Phase {
  return { id: uid('ph'), label: '', days: 7, slots: [newSlot('09:00')], ...partial };
}

export function newMedication(partial: Partial<Medication> = {}): Medication {
  const now = Date.now();
  return {
    id: uid('med'), kind: 'medicine', name: '', strength: '', form: 'tablet', color: MED_COLORS[0], person: '', notes: '', startDate: todayKey(), weekdays: [],
    phases: [newPhase()], status: 'active', createdAt: now, updatedAt: now, ...partial,
  };
}

export async function deleteMedication(id: string): Promise<void> {
  const logs = await getByIndex('doseLogs', 'medId', id);
  await bulkRemove('doseLogs', logs.map((l) => l.id));
  await remove('medications', id);
}

// ---- time helpers --------------------------------------------------------------------------
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400e3);
}

/** Slots every `everyMin` minutes from `from` to `to` inclusive (e.g. every 8 h from 08:00). */
export function generateSlots(from: string, to: string, everyMin: number, amount: string): DoseSlot[] {
  const out: DoseSlot[] = [];
  const start = toMinutes(from), end = toMinutes(to);
  if (everyMin < 15 || end < start) return out;
  for (let m = start; m <= end && out.length < 24; m += everyMin) out.push(newSlot(fromMinutes(m), { amount }));
  return out;
}

export function sortSlots(slots: DoseSlot[]): DoseSlot[] {
  return [...slots].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

// ---- schedule --------------------------------------------------------------------------------
export interface PhasePosition {
  phase: Phase;
  phaseIndex: number;
  /** 1-based day inside the phase. */
  dayInPhase: number;
  /** 1-based day since startDate. */
  dayOverall: number;
}

export function totalDays(m: Medication): number | null {
  if (m.phases.length === 0) return 0;
  if (m.phases[m.phases.length - 1].days === 0) return null;
  return m.phases.reduce((a, p) => a + Math.max(0, p.days), 0);
}

export function endDate(m: Medication): string | null {
  const n = totalDays(m);
  return n === null ? null : addDays(m.startDate, Math.max(0, n - 1));
}

/** First calendar day of a phase. */
export function phaseStart(m: Medication, phaseIndex: number): string {
  let offset = 0;
  for (let i = 0; i < phaseIndex; i++) offset += Math.max(0, m.phases[i].days);
  return addDays(m.startDate, offset);
}

/** Which phase a calendar day falls in (ignores status/weekday filter — callers decide). */
export function phaseOn(m: Medication, date: string): PhasePosition | null {
  const day = daysBetween(m.startDate, date); // 0-based
  if (day < 0) return null;
  let offset = 0;
  for (let i = 0; i < m.phases.length; i++) {
    const p = m.phases[i];
    const last = i === m.phases.length - 1;
    if (p.days === 0 && last) return { phase: p, phaseIndex: i, dayInPhase: day - offset + 1, dayOverall: day + 1 };
    if (day < offset + p.days) return { phase: p, phaseIndex: i, dayInPhase: day - offset + 1, dayOverall: day + 1 };
    offset += p.days;
  }
  return null;
}

export function isScheduledOn(m: Medication, date: string): boolean {
  if (m.status === 'done') return false;
  if (m.weekdays.length > 0 && !m.weekdays.includes(fromKey(date).getDay())) return false;
  return phaseOn(m, date) !== null;
}

/** A course whose last phase has ended (so it can be auto-marked done). */
export function isOver(m: Medication, date = todayKey()): boolean {
  const end = endDate(m);
  return end !== null && date > end;
}

export interface DoseInstance {
  logId: string;
  med: Medication;
  slot: DoseSlot;
  pos: PhasePosition;
  date: string;
  minutes: number;
}

export function logIdFor(medId: string, date: string, slotId: string): string { return `${medId}_${date}_${slotId}`; }

/** Every dose due on a day across medications, sorted by time (paused ones are skipped). */
export function dosesOn(meds: Medication[], date: string, includePaused = false): DoseInstance[] {
  const out: DoseInstance[] = [];
  for (const m of meds) {
    if (m.status === 'paused' && !includePaused) continue;
    if (!isScheduledOn(m, date)) continue;
    const pos = phaseOn(m, date)!;
    for (const slot of pos.phase.slots) out.push({ logId: logIdFor(m.id, date, slot.id), med: m, slot, pos, date, minutes: toMinutes(slot.time) });
  }
  return out.sort((a, b) => a.minutes - b.minutes || a.med.name.localeCompare(b.med.name));
}

export type DoseState = 'taken' | 'skipped' | 'late' | 'due' | 'upcoming';
export const DUE_BEFORE_MIN = 15;
export const LATE_AFTER_MIN = 60;

export function nowMinutes(now = new Date()): number { return now.getHours() * 60 + now.getMinutes(); }

export function doseState(inst: DoseInstance, log: DoseLog | undefined, now = new Date()): DoseState {
  if (log) return log.status;
  const today = todayKey();
  if (inst.date < today) return 'late';
  if (inst.date > today) return 'upcoming';
  const nm = nowMinutes(now);
  if (nm < inst.minutes - DUE_BEFORE_MIN) return 'upcoming';
  if (nm <= inst.minutes + LATE_AFTER_MIN) return 'due';
  return 'late';
}

export interface DoseWithState extends DoseInstance { state: DoseState; log?: DoseLog }

export function withStates(list: DoseInstance[], logs: DoseLog[], now = new Date()): DoseWithState[] {
  const map = new Map(logs.map((l) => [l.id, l]));
  return list.map((d) => { const log = map.get(d.logId); return { ...d, log, state: doseState(d, log, now) }; });
}

/** Groups a day's doses by time so "09:00 — Ibuprofen, Omeprazole" reads as one block. */
export function groupByTime(list: DoseWithState[]): { time: string; minutes: number; doses: DoseWithState[] }[] {
  const out: { time: string; minutes: number; doses: DoseWithState[] }[] = [];
  for (const d of list) {
    const last = out[out.length - 1];
    if (last && last.minutes === d.minutes) last.doses.push(d);
    else out.push({ time: d.slot.time, minutes: d.minutes, doses: [d] });
  }
  return out;
}

/** First unresolved dose today (from an hour ago on), else the first dose on the next scheduled day within 14 days. */
export function nextDose(meds: Medication[], logs: DoseLog[], now = new Date()): DoseWithState | null {
  const today = todayKey();
  const nm = nowMinutes(now);
  const todays = withStates(dosesOn(meds, today), logs, now).filter((d) => !d.log);
  const pending = todays.find((d) => d.minutes >= nm - LATE_AFTER_MIN) ?? todays[0];
  if (pending) return pending;
  for (let i = 1; i <= 14; i++) {
    const day = addDays(today, i);
    const list = dosesOn(meds, day);
    if (list.length) return { ...list[0], state: 'upcoming' };
  }
  return null;
}

export async function markDose(inst: DoseInstance, status: 'taken' | 'skipped'): Promise<void> {
  await put('doseLogs', { id: inst.logId, medId: inst.med.id, date: inst.date, slotId: inst.slot.id, status, at: Date.now() });
  if (status === 'taken' && typeof inst.med.stock === 'number') {
    const n = Number(inst.slot.amount.replace(',', '.'));
    const dec = Number.isFinite(n) && n > 0 && n < 100 ? n : 1;
    await put('medications', { ...inst.med, stock: Math.max(0, Math.round((inst.med.stock - dec) * 100) / 100), updatedAt: Date.now() });
  }
}

export async function unmarkDose(inst: DoseInstance, log: DoseLog | undefined): Promise<void> {
  await remove('doseLogs', inst.logId);
  if (log?.status === 'taken' && typeof inst.med.stock === 'number') {
    const n = Number(inst.slot.amount.replace(',', '.'));
    const dec = Number.isFinite(n) && n > 0 && n < 100 ? n : 1;
    await put('medications', { ...inst.med, stock: Math.round((inst.med.stock + dec) * 100) / 100, updatedAt: Date.now() });
  }
}

// ---- stats -----------------------------------------------------------------------------------
export interface Adherence { taken: number; skipped: number; missed: number; total: number; pct: number; streak: number }

/** Adherence over the last `days` days for the given meds (today counts only doses already due). */
export function adherence(meds: Medication[], logs: DoseLog[], days = 30, now = new Date()): Adherence {
  const today = todayKey();
  const logMap = new Map(logs.map((l) => [l.id, l]));
  let taken = 0, skipped = 0, missed = 0, streak = 0, streakAlive = true;
  for (let i = 0; i < days; i++) {
    const day = addDays(today, -i);
    const list = dosesOn(meds, day, true).filter((d) => day !== today || doseState(d, undefined, now) !== 'upcoming');
    if (list.length === 0) continue;
    let dayClean = true, dayTaken = 0;
    for (const d of list) {
      const log = logMap.get(d.logId);
      if (log?.status === 'taken') { taken++; dayTaken++; }
      else if (log?.status === 'skipped') { skipped++; dayClean = false; }
      else if (day !== today || doseState(d, undefined, now) === 'late') { missed++; dayClean = false; }
    }
    if (streakAlive && dayClean && dayTaken > 0) streak++;
    else if (streakAlive && !dayClean) streakAlive = false;
  }
  const total = taken + skipped + missed;
  return { taken, skipped, missed, total, pct: total ? Math.round((taken / total) * 100) : 0, streak };
}

export function progressText(m: Medication, date = todayKey()): string {
  const pos = phaseOn(m, date);
  const total = totalDays(m);
  if (!pos) return date < m.startDate ? tGlobal('meds.startsIn', { n: daysBetween(date, m.startDate) }) : tGlobal('meds.finished');
  const phaseName = pos.phase.label || tGlobal('meds.phaseN', { n: pos.phaseIndex + 1 });
  const ofPhase = pos.phase.days ? tGlobal('meds.dayOf', { d: pos.dayInPhase, n: pos.phase.days }) : tGlobal('meds.dayN', { d: pos.dayInPhase });
  if (m.phases.length > 1) return `${phaseName} · ${ofPhase}` + (total ? ` · ${tGlobal('meds.dayOfCourse', { d: pos.dayOverall, n: total })}` : '');
  return total ? tGlobal('meds.dayOfCourse', { d: pos.dayOverall, n: total }) : tGlobal('meds.dayN', { d: pos.dayOverall });
}

export function hintText(slot: DoseSlot): string { return slot.hint === 'none' ? '' : tGlobal(`meds.hint.${slot.hint}`); }
export function kindText(k: MedKind): string { return tGlobal(`meds.kind.${k}`); }
export function formText(f: MedForm, n: number | null): string { return tGlobal(`meds.form.${f}${n === 1 ? '' : 's'}`); }

/** "2 tablets", "10 drops", "5 ml" — from the slot amount + the medication's form. */
export function amountText(m: Medication, slot: DoseSlot): string {
  const a = slot.amount.trim();
  if (!a) return '';
  const n = /^\d+([.,]\d+)?$/.test(a) ? Number(a.replace(',', '.')) : /^\d+\/\d+$/.test(a) ? 0.5 : null;
  if (n === null) return a;
  return `${a} ${formText(m.form, n)}`;
}

export function doseLine(m: Medication, slot: DoseSlot): string {
  return [amountText(m, slot), m.strength].filter(Boolean).join(' · ');
}

/** "30 min after Ibuprofen" for chained slots. */
export function chainText(slot: DoseSlot, meds: Medication[]): string {
  if (!slot.afterMedId) return '';
  const other = meds.find((r) => r.id === slot.afterMedId);
  if (!other) return '';
  return tGlobal('meds.afterOther', { n: slot.gapMin ?? 0, name: other.name });
}

/** Stock warning: units left vs the next 7 days of doses. */
export function stockDaysLeft(m: Medication, today = todayKey()): number | null {
  if (typeof m.stock !== 'number') return null;
  let left = m.stock;
  for (let i = 0; i < 365; i++) {
    const day = addDays(today, i);
    const doses = dosesOn([m], day, true);
    if (doses.length === 0 && isOver(m, day)) return i;
    for (const d of doses) { const n = Number(d.slot.amount.replace(',', '.')); left -= Number.isFinite(n) && n > 0 && n < 100 ? n : 1; }
    if (left < 0) return i;
  }
  return 365;
}

// ---- iCalendar export ---------------------------------------------------------------------------
function icsEscape(s: string): string { return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function icsDate(key: string, hhmm: string): string { return key.replace(/-/g, '') + 'T' + hhmm.replace(':', '') + '00'; }
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** One VEVENT per phase × slot, repeating daily for the phase length (open-ended: 90 days), with a display alarm at dose time. */
export function medicationToIcs(m: Medication, meds: Medication[] = []): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Forma//Meds//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${icsEscape(m.name)}`];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  m.phases.forEach((p, pi) => {
    const start = phaseStart(m, pi);
    const count = p.days > 0 ? p.days : 90;
    for (const slot of sortSlots(p.slots)) {
      const summary = [m.kind === 'supplement' ? '🌿' : '💊', m.name, doseLine(m, slot)].filter(Boolean).join(' ');
      const desc = [p.label || (m.phases.length > 1 ? tGlobal('meds.phaseN', { n: pi + 1 }) : ''), hintText(slot), chainText(slot, meds), slot.note, m.notes].filter(Boolean).join('\n');
      const rrule = `RRULE:FREQ=DAILY;COUNT=${count}` + (m.weekdays.length ? `;BYDAY=${m.weekdays.map((d) => BYDAY[d]).join(',')}` : '');
      lines.push('BEGIN:VEVENT', `UID:${m.id}-${p.id}-${slot.id}@forma`, `DTSTAMP:${stamp}`, `DTSTART:${icsDate(start, slot.time)}`, 'DURATION:PT10M', rrule,
        `SUMMARY:${icsEscape(summary)}`, desc ? `DESCRIPTION:${icsEscape(desc)}` : '', 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(summary)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    }
  });
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n') + '\r\n';
}

export async function shareIcs(m: Medication, meds: Medication[]): Promise<'shared' | 'downloaded'> {
  const text = medicationToIcs(m, meds);
  const name = `${m.name.replace(/[^\w\u10A0-\u10FF-]+/g, '-').toLowerCase() || 'medication'}.ics`;
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  try {
    const file = new File([text], name, { type: 'text/calendar' });
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], title: m.name }); return 'shared'; }
  } catch (e) { if ((e as Error).name === 'AbortError') return 'shared'; }
  const blob = new Blob([text], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}

/** Plain-text schedule (for sharing with a doctor / family). */
export function medicationToText(m: Medication, meds: Medication[] = []): string {
  const head = [m.name, m.strength, kindText(m.kind)].filter(Boolean).join(' · ');
  const out = [head, m.person ? tGlobal('meds.forPerson', { name: m.person }) : '', `${tGlobal('meds.startsOn')}: ${m.startDate}` + (endDate(m) ? ` → ${endDate(m)}` : '')].filter(Boolean);
  m.phases.forEach((p, pi) => {
    out.push('', (p.label || tGlobal('meds.phaseN', { n: pi + 1 })) + (p.days ? ` (${tGlobal('meds.daysCount', { n: p.days })})` : ` (${tGlobal('meds.untilStopped')})`));
    for (const s of sortSlots(p.slots)) out.push(`  ${s.time}  ${[doseLine(m, s), hintText(s), chainText(s, meds), s.note].filter(Boolean).join(' — ')}`);
  });
  if (m.notes) out.push('', m.notes);
  return out.join('\n');
}
