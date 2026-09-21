// Meds home: next dose hero, today's timeline grouped by time, the medication list.
import { useMemo, useState } from 'react';
import { formatLong, todayKey } from '../../lib/dates.js';
import { useNow } from '../../lib/hooks.js';
import { useT } from '../../lib/i18n.js';
import { doseLine, dosesOn, groupByTime, hintText, isOver, markDose, nextDose, progressText, stockDaysLeft, withStates, type DoseWithState } from '../../lib/meds.js';
import type { Medication } from '../../lib/models.js';
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
  const [filter, setFilter] = useState<'active' | 'paused' | 'done'>('active');

  const todays = useMemo(() => (meds && logs ? withStates(dosesOn(meds, today), logs, new Date(now)) : undefined), [meds, logs, today, now]);
  const next = useMemo(() => (meds && logs ? nextDose(meds, logs, new Date(now)) : null), [meds, logs, now]);
  const groups = useMemo(() => (todays ? groupByTime(todays) : []), [todays]);
  const taken = todays?.filter((d) => d.state === 'taken').length ?? 0;
  useDueAlert(todays);

  const shown = (meds ?? []).filter((m) => m.status === filter);
  const counts = { active: (meds ?? []).filter((m) => m.status === 'active').length, paused: (meds ?? []).filter((m) => m.status === 'paused').length, done: (meds ?? []).filter((m) => m.status === 'done').length };

  return (
    <Screen className="screen-no-tabs meds">
      <TopBar large left={<AppsButton />} title={<span className="c-meds">{t('meds.title')}</span>} eyebrow={formatLong(today)} />

      {meds && meds.length === 0 ? (
        <Empty icon={<IconPill size={40} />} title={t('meds.noMeds')} text={t('meds.noMedsText')} action={<Button variant="meds" icon={<IconPlus size={18} />} onClick={() => navigate('/meds/new')}>{t('meds.newMed')}</Button>} />
      ) : (
        <>
          <NextCard next={next} todays={todays} taken={taken} now={now} />

          {todays && todays.length > 0 && (
            <>
              <SectionLabel right={<span className="small muted num">{t('meds.takenOf', { taken, total: todays.length })}</span>}>{t('meds.today')}</SectionLabel>
              <div className="timeline mb">
                {groups.map((g) => {
                  const cls = g.doses.some((d) => d.state === 'late') ? 'late' : g.doses.some((d) => d.state === 'due') ? 'due' : '';
                  return (
                    <div key={g.time} className={`tl-block ${cls}`}>
                      <div className="tl-time">{g.time}</div>
                      <div className="tl-rows">{g.doses.map((d) => <DoseRow key={d.logId} dose={d} meds={meds ?? []} />)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {todays && todays.length === 0 && counts.active > 0 && <div className="small muted mb" style={{ textAlign: 'center', padding: '8px 0' }}>{t('meds.nothingToday')}</div>}

          <SectionLabel>{t('meds.medications')}</SectionLabel>
          <div className="hstack mb" style={{ flexWrap: 'wrap' }}>
            <Chip tone="meds" active={filter === 'active'} onClick={() => setFilter('active')}>{t('meds.status.active')} <span className="muted">{counts.active}</span></Chip>
            {counts.paused > 0 && <Chip tone="meds" active={filter === 'paused'} onClick={() => setFilter('paused')}>{t('meds.status.paused')} <span className="muted">{counts.paused}</span></Chip>}
            {counts.done > 0 && <Chip tone="meds" active={filter === 'done'} onClick={() => setFilter('done')}>{t('meds.status.done')} <span className="muted">{counts.done}</span></Chip>}
          </div>
          <div className="stack">
            {shown.map((m) => <MedCard key={m.id} med={m} />)}
            {shown.length === 0 && <div className="small muted" style={{ textAlign: 'center', padding: 12 }}>{t('meds.noneInFilter')}</div>}
          </div>
        </>
      )}

      <Fab tone="meds" onClick={() => navigate('/meds/new')}><IconPlus size={20} strokeWidth={2.5} /> {t('meds.newMed')}</Fab>
    </Screen>
  );
}

function NextCard({ next, todays, taken, now }: { next: DoseWithState | null; todays: DoseWithState[] | undefined; taken: number; now: number }) {
  const t = useT();
  if (!todays) return null;
  const total = todays.length;
  if (!next) {
    return (
      <Card dark className="next-card mb">
        <div className="section-label" style={{ color: 'var(--inverse-muted)' }}>{t('meds.next')}</div>
        <div className="next-when">{total > 0 && taken === total ? t('meds.allDone') : t('meds.nothingPlanned')}</div>
        {total > 0 && <div className="small muted">{t('meds.takenOf', { taken, total })}</div>}
      </Card>
    );
  }
  const d = new Date(now);
  const nm = d.getHours() * 60 + d.getMinutes();
  const isToday = next.date === todayKey();
  const diff = next.minutes - nm;
  const when = !isToday ? t('meds.tomorrowAt', { time: next.slot.time }) : diff > 0 ? (diff >= 60 ? t('meds.inHours', { h: Math.floor(diff / 60), m: diff % 60 }) : t('meds.inMinutes', { m: diff })) : diff === 0 ? t('meds.now') : t('meds.lateBy', { m: -diff });
  return (
    <Card dark className="next-card mb">
      <div className="section-label" style={{ color: 'var(--inverse-muted)' }}>{next.state === 'late' ? t('meds.overdue') : t('meds.next')}</div>
      <div className="next-when" style={next.state === 'late' ? { color: '#FF7A55' } : undefined}>{when}</div>
      <div className="hstack" style={{ gap: 8 }}>
        <span className="med-dot" style={{ width: 10, height: 10, borderRadius: 999, background: next.med.color, flexShrink: 0 }} />
        <span className="bold">{next.slot.time} · {next.med.name}</span>
        <span className="muted small">{doseLine(next.med, next.slot)}</span>
      </div>
      {hintText(next.slot) && <div className="small" style={{ color: 'var(--inverse-muted)' }}>{hintText(next.slot)}</div>}
      {total > 0 && <div className="mt" style={{ marginTop: 10 }}><Progress value={taken} max={total} color="var(--meds)" height={6} /></div>}
      {isToday && (
        <div className="next-actions">
          <Button variant="meds" icon={<IconCheck size={18} strokeWidth={3} />} onClick={() => markDose(next, 'taken')}>{t('meds.taken')}</Button>
          <Button variant="secondary" onClick={() => markDose(next, 'skipped')}>{t('meds.skip')}</Button>
        </div>
      )}
    </Card>
  );
}

function MedCard({ med }: { med: Medication }) {
  const t = useT();
  const today = todayKey();
  const todaysDoses = dosesOn([med], today, true);
  const stockDays = stockDaysLeft(med);
  const lowStock = typeof med.stock === 'number' && ((typeof med.stockWarnAt === 'number' && med.stock <= med.stockWarnAt) || (stockDays !== null && stockDays <= 3));
  return (
    <Card onClick={() => navigate(`/meds/${med.id}`)} className="med-card">
      <div className="hstack">
        <MedBadge med={med} />
        <div className="row-main">
          <div className="row-title">{med.name} {med.strength && <span className="muted" style={{ fontWeight: 500 }}>{med.strength}</span>}</div>
          <div className="row-sub">{med.status === 'done' || isOver(med) ? t('meds.finished') : progressText(med)}{med.person ? ` · ${med.person}` : ''}</div>
        </div>
        <StatusPill status={med.status} />
        <IconChevron size={18} className="muted" />
      </div>
      <div className="hstack" style={{ marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
        {todaysDoses.length > 0 ? <span className="small muted">{todaysDoses.map((d) => d.slot.time).join(' · ')}</span> : <span className="small muted">{t('meds.notToday')}</span>}
        <span style={{ flex: 1 }} />
        {typeof med.stock === 'number' && <span className={`tag ${lowStock ? 'tag-workout' : ''}`}>{t('meds.stockLeft', { n: med.stock })}</span>}
      </div>
    </Card>
  );
}
