// Shared pieces for Meds screens: dose rows, status pill, badge, day strip, due-alert hook.
import { useEffect, useRef, type ReactNode } from 'react';
import { sounds } from '../../lib/audio.js';
import { addDays, todayKey, weekdayShort, dayOfMonth } from '../../lib/dates.js';
import { useT } from '../../lib/i18n.js';
import { amountText, chainText, doseLine, dosesOn, hintText, markDose, nowMinutes, unmarkDose, type DoseWithState } from '../../lib/meds.js';
import type { DoseLog, MedStatus, Medication } from '../../lib/models.js';
import { navigate } from '../../lib/router.js';
import { toast } from '../../ui/dialogs.js';
import { IconCheck, IconClose, IconPill } from '../../ui/icons.js';

export function MedBadge({ med, size = 40 }: { med: Medication | undefined; size?: number }) {
  const color = med?.color ?? '#9A978F';
  return <div className="cat-badge" style={{ width: size, height: size, background: `${color}22`, color }}><IconPill size={Math.round(size * 0.5)} /></div>;
}

export function StatusPill({ status }: { status: MedStatus }) {
  const t = useT();
  return <span className={`med-status-pill ${status}`}>{t(`meds.status.${status}`)}</span>;
}

/** One dose in the Today timeline: tap the circle to mark taken (again to undo), "skip" for skipped. */
export function DoseRow({ dose, meds, showTime = false, onOpen }: { dose: DoseWithState; meds: Medication[]; showTime?: boolean; onOpen?: () => void }) {
  const t = useT();
  const { med, slot, state, log } = dose;
  const toggle = async () => {
    if (log) { await unmarkDose(dose, log); return; }
    await markDose(dose, 'taken');
    if (typeof med.stock === 'number' && typeof med.stockWarnAt === 'number' && med.stock - 1 <= med.stockWarnAt) toast(t('meds.stockLow', { name: med.name, n: med.stock - 1 }));
  };
  const skip = async () => { await markDose(dose, 'skipped'); };
  const hint = hintText(slot);
  const chain = chainText(slot, meds);
  return (
    <div className={`dose-row ${state}`}>
      <button type="button" className="dose-check" aria-label={log ? t('meds.undo') : t('meds.taken')} onClick={toggle}>
        {state === 'taken' && <IconCheck size={16} strokeWidth={3} />}
        {state === 'skipped' && <IconClose size={14} strokeWidth={3} />}
      </button>
      <button type="button" className="row-main" style={{ textAlign: 'left' }} onClick={onOpen ?? (() => navigate(`/meds/${med.id}`))}>
        <div className="dose-name"><span className="med-dot" style={{ background: med.color }} />{showTime && <span className="num muted">{slot.time}</span>}<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{med.name}</span></div>
        <div className="dose-sub">
          {doseLine(med, slot) && <span>{doseLine(med, slot)}</span>}
          {hint && <span className="hint">{hint}</span>}
          {chain && <span className="chain">{chain}</span>}
          {slot.note && <span>{slot.note}</span>}
          {med.person && <span>· {med.person}</span>}
        </div>
      </button>
      {state === 'due' && <span className="dose-state due">{t('meds.state.due')}</span>}
      {state === 'late' && <span className="dose-state late">{t('meds.state.late')}</span>}
      {state === 'skipped' && <span className="dose-state">{t('meds.state.skipped')}</span>}
      {!log && dose.date <= todayKey() && <button type="button" className="dose-skip" onClick={skip}>{t('meds.skip')}</button>}
    </div>
  );
}

/** Last 14 days as coloured pips: full / partial / missed. */
export function DayStrip({ meds, logs, days = 14 }: { meds: Medication[]; logs: DoseLog[]; days?: number }) {
  const today = todayKey();
  const map = new Map(logs.map((l) => [l.id, l]));
  const cells = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1)).map((day) => {
    const list = dosesOn(meds, day, true);
    if (list.length === 0) return { day, cls: '', label: '' };
    const taken = list.filter((d) => map.get(d.logId)?.status === 'taken').length;
    const resolved = list.filter((d) => map.get(d.logId)).length;
    const isToday = day === today;
    const cls = taken === list.length ? 'full' : taken > 0 ? 'part' : resolved > 0 || !isToday ? 'miss' : '';
    return { day, cls, label: `${taken}/${list.length}` };
  });
  return (
    <div className="day-strip">
      {cells.map((c) => (
        <div key={c.day} className="day-cell">
          <span>{weekdayShort(c.day).slice(0, 2)}</span>
          <div className={`pip ${c.cls} ${c.day === today ? 'today' : ''}`}>{c.label ? c.label : dayOfMonth(c.day)}</div>
        </div>
      ))}
    </div>
  );
}

/** Plays a cue + toast when a dose becomes due while the app is open (checked every 30 s). */
export function useDueAlert(today: DoseWithState[] | undefined) {
  const t = useT();
  const announced = useRef<Set<string>>(new Set());
  useEffect(() => {
    const tick = () => {
      if (!today) return;
      const nm = nowMinutes();
      for (const d of today) {
        if (d.log || d.minutes > nm || d.minutes < nm - 1 || announced.current.has(d.logId)) continue;
        announced.current.add(d.logId);
        try { sounds.go(); } catch { /* audio not unlocked */ }
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignore */ }
        toast(t('meds.dueNow', { name: d.med.name, dose: amountText(d.med, d.slot) }), 6000);
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [today, t]);
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="spread" style={{ marginBottom: 8 }}><div className="section-label" style={{ margin: 0 }}>{children}</div>{right}</div>;
}
