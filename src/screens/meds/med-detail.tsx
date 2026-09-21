// One medication: progress, schedule by phase, adherence, calendar export, pause/done, history.
import { useMemo } from 'react';
import { addDays, formatDateTime, formatShortYear, todayKey, weekdayName } from '../../lib/dates.js';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { adherence, chainText, doseLine, dosesOn, endDate, hintText, isOver, kindText, medicationToText, phaseOn, phaseStart, progressText, shareIcs, sortSlots, stockDaysLeft, totalDays, withStates } from '../../lib/meds.js';
import type { Medication } from '../../lib/models.js';
import { back, navigate } from '../../lib/router.js';
import { useDoseLogs, useMedLogs, useMedication, useMedications } from '../../lib/queries.js';
import { Button, Card, IconButton, Progress, Screen, Stat, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCalendarPlus, IconEdit, IconPause, IconPill, IconPlay, IconShare } from '../../ui/icons.js';
import { DayStrip, DoseRow, SectionLabel, StatusPill } from './meds-ui.js';

export function MedDetailScreen({ id }: { id: string }) {
  const t = useT();
  const med = useMedication(id);
  const all = useMedications();
  const logs = useMedLogs(id);
  const today = todayKey();
  const todayLogs = useDoseLogs(today);
  const stats = useMemo(() => (med && logs ? adherence([med], logs, 30) : null), [med, logs]);
  const todays = useMemo(() => (med && todayLogs ? withStates(dosesOn([med], today, true), todayLogs) : []), [med, todayLogs, today]);

  if (med === null) { navigate('/meds', { replace: true }); return <Screen className="screen-no-tabs" />; }
  if (!med || !all || !logs) return <Screen className="screen-no-tabs" />;

  const total = totalDays(med);
  const pos = phaseOn(med, today);
  const end = endDate(med);
  const over = isOver(med);
  const stockDays = stockDaysLeft(med);

  const setStatus = async (status: Medication['status']) => { await put('medications', { ...med, status, updatedAt: Date.now() }); toast(t(`meds.status.${status}`)); };
  const exportIcs = async () => {
    const how = await shareIcs(med, all);
    toast(how === 'shared' ? t('meds.calendarShared') : t('meds.calendarDownloaded'));
  };
  const shareText = async () => {
    const text = medicationToText(med, all);
    try {
      if (navigator.share) { await navigator.share({ title: med.name, text }); return; }
      await navigator.clipboard.writeText(text);
      toast(t('shopping.copiedToClipboard'));
    } catch { /* cancelled */ }
  };
  const markDone = async () => {
    const ok = await confirmDialog({ title: t('meds.markDoneTitle', { name: med.name }), message: t('meds.markDoneText'), confirmLabel: t('meds.status.done') });
    if (ok) setStatus('done');
  };

  return (
    <Screen className="screen-no-tabs meds">
      <TopBar onBack={() => back('/meds')} title={kindText(med.kind)} right={<>
        <IconButton label={t('common.share')} onClick={shareText}><IconShare size={18} /></IconButton>
        <IconButton label={t('common.edit')} tone="meds" onClick={() => navigate(`/meds/${med.id}/edit`)}><IconEdit size={18} /></IconButton>
      </>} />

      <div className="med-hero">
        <div className="thumb" style={{ background: med.color }}><IconPill size={26} /></div>
        <div className="row-main">
          <h1 className="title-large" style={{ fontSize: 26 }}>{med.name}</h1>
          <div className="small muted">{[med.strength, t(`meds.form.${med.form}s`), med.person ? t('meds.forPerson', { name: med.person }) : ''].filter(Boolean).join(' · ')}</div>
        </div>
        <StatusPill status={over && med.status === 'active' ? 'done' : med.status} />
      </div>

      <Card dark className="mb">
        <div className="section-label" style={{ color: 'var(--inverse-muted)' }}>{t('meds.progress')}</div>
        <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{over ? t('meds.finished') : progressText(med)}</div>
        <div className="small muted" style={{ marginTop: 2 }}>{formatShortYear(med.startDate)}{end ? ` → ${formatShortYear(end)}` : ` → ${t('meds.untilStopped')}`}{med.weekdays.length ? ` · ${[1, 2, 3, 4, 5, 6, 0].filter((d) => med.weekdays.includes(d)).map((d) => weekdayName(d)).join(', ')}` : ''}</div>
        {total && pos && <div style={{ marginTop: 10 }}><Progress value={pos.dayOverall} max={total} color="var(--meds)" height={6} /></div>}
      </Card>

      {todays.length > 0 && (
        <>
          <SectionLabel>{t('meds.today')}</SectionLabel>
          <div className="tl-rows mb">{todays.map((d) => <DoseRow key={d.logId} dose={d} meds={all} showTime onOpen={() => {}} />)}</div>
        </>
      )}

      <SectionLabel>{t('meds.alerts')}</SectionLabel>
      <div className="small muted mb">{t('meds.alertsHint')}</div>
      <Button variant="meds" full icon={<IconCalendarPlus size={18} />} onClick={exportIcs} className="mb">{t('meds.addToCalendar')}</Button>

      <SectionLabel>{t('meds.schedule')}</SectionLabel>
      <div className="stack mb">
        {med.phases.map((p, pi) => {
          const active = pos?.phaseIndex === pi;
          const start = phaseStart(med, pi);
          return (
            <div key={p.id} className="list sched-list" style={active ? { borderColor: 'var(--meds)' } : undefined}>
              <div className="row" style={{ background: active ? 'var(--meds-soft)' : 'var(--surface-2)' }}>
                <span className="phase-index">{pi + 1}</span>
                <div className="row-main">
                  <div className="row-title">{p.label || t('meds.phaseN', { n: pi + 1 })}</div>
                  <div className="row-sub">{p.days ? t('meds.daysCount', { n: p.days }) : t('meds.untilStopped')} · {formatShortYear(start)}{p.days ? ` → ${formatShortYear(addDays(start, p.days - 1))}` : ''}{active && pos ? ` · ${t('meds.dayOf', { d: pos.dayInPhase, n: p.days || pos.dayInPhase })}` : ''}</div>
                </div>
              </div>
              {sortSlots(p.slots).map((s) => (
                <div key={s.id} className="row">
                  <span className="sched-time">{s.time}</span>
                  <div className="row-main">
                    <div className="row-title" style={{ whiteSpace: 'normal' }}>{doseLine(med, s) || t('meds.dose')}</div>
                    <div className="row-sub">{[hintText(s), chainText(s, all), s.note].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {stats && (
        <>
          <SectionLabel>{t('meds.last30')}</SectionLabel>
          <div className="adh-grid mb">
            <Stat value={<span className="c-meds">{stats.pct}%</span>} label={t('meds.adherence')} />
            <Stat value={stats.taken} label={t('meds.takenLabel')} />
            <Stat value={stats.skipped + stats.missed} label={t('meds.missedLabel')} />
            <Stat value={stats.streak} label={t('meds.streak')} />
          </div>
          <div className="mb"><DayStrip meds={[med]} logs={logs} /></div>
        </>
      )}

      {typeof med.stock === 'number' && (
        <>
          <SectionLabel>{t('meds.stock')}</SectionLabel>
          <div className="list mb">
            <div className="settings-row"><span className="l">{t('meds.unitsLeft')}<small>{stockDays !== null && stockDays < 365 ? t('meds.enoughFor', { n: stockDays }) : ''}</small></span><span className={`bold num ${stockDays !== null && stockDays <= 3 ? 'c-danger' : ''}`}>{med.stock}</span></div>
          </div>
        </>
      )}

      {med.notes && <div className="card mb" style={{ whiteSpace: 'pre-wrap' }}>{med.notes}</div>}

      <div className="stack mb">
        {med.status === 'active' && !over && <Button variant="secondary" full icon={<IconPause size={18} />} onClick={() => setStatus('paused')}>{t('meds.pause')}</Button>}
        {med.status === 'paused' && <Button variant="meds" full icon={<IconPlay size={18} />} onClick={() => setStatus('active')}>{t('meds.resume')}</Button>}
        {med.status !== 'done' && <Button variant="secondary" full onClick={markDone}>{t('meds.markDone')}</Button>}
        {med.status === 'done' && <Button variant="secondary" full onClick={() => setStatus('active')}>{t('meds.reactivate')}</Button>}
      </div>

      {logs.length > 0 && (
        <>
          <SectionLabel>{t('meds.history')}</SectionLabel>
          <div className="list">
            {logs.slice(0, 20).map((l) => {
              const slot = med.phases.flatMap((p) => p.slots).find((s) => s.id === l.slotId);
              return (
                <div key={l.id} className="row">
                  <div className="row-main"><div className="row-title">{l.date} · {slot?.time ?? '—'}</div><div className="row-sub">{formatDateTime(l.at)}</div></div>
                  <span className={`tag ${l.status === 'taken' ? 'tag-meds' : ''}`}>{t(`meds.state.${l.status}`)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Screen>
  );
}
