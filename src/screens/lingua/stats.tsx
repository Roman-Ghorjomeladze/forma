// Course statistics: goals, levels, grammar, sentences, last 30 days, upcoming reviews.
import { useMemo, type ReactNode } from 'react';
import { addDays, todayKey, weekdayShort, dayOfMonth } from '../../lib/dates.js';
import { useT } from '../../lib/i18n.js';
import { isMature, LEVELS, streak, unitDone, useLogs, vocabStats } from '../../lib/lingua.js';
import { Screen, TopBar } from '../../ui/components.js';
import { isCtx, LevelTag, Ring, useLingua, type Gate } from './lingua-ui.js';

export function LinguaStatsScreen({ cid }: { cid: string }) {
  const t = useT();
  const ctx = useLingua(cid);
  const logs = useLogs(cid);
  const data = useMemo(() => {
    if (!isCtx(ctx) || !logs) return null;
    const { content, prog } = ctx;
    const today = todayKey();
    const v = vocabStats(content, prog);
    const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
    const byDate = new Map(logs.map((l) => [l.date, l]));
    const last30 = days.map((d) => ({ d, l: byDate.get(d) }));
    const ans = last30.reduce((s, x) => s + (x.l?.answers ?? 0), 0);
    const cor = last30.reduce((s, x) => s + (x.l?.correct ?? 0), 0);
    const secs = logs.reduce((s, l) => s + l.seconds, 0);
    const forecast = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d, i) => ({
      d, n: [...prog.values()].filter((p) => p.key.startsWith('w:') && p.state !== 'suspended' && (i === 0 ? p.due <= d : p.due === d)).length,
    }));
    const built = content.sentences.filter((s) => isMature(prog.get(`s:${s.id}`))).length;
    const spoken = content.sentences.filter((s) => isMature(prog.get(`sp:${s.id}`))).length;
    return { v, last30, ans, cor, secs, forecast, built, spoken, streak: streak(logs) };
  }, [ctx, logs]);
  if (!isCtx(ctx)) return ctx as Gate;
  if (!data) return null;
  const { course, content, prog } = ctx;
  const { v } = data;
  const maxDay = Math.max(1, ...data.last30.map((x) => x.l?.answers ?? 0));
  const maxF = Math.max(1, ...data.forecast.map((x) => x.n));

  return (
    <Screen className="screen-no-tabs lingua">
      <TopBar title={t('lang.stats')} eyebrow={course.title} backTo={`/lang/${cid}`} />
      <div className="grid-2">
        <div className="card goal-card"><Ring value={v.passive} max={course.goals.passive} size={74}><b>{Math.round((v.passive / course.goals.passive) * 100)}%</b></Ring><div><div className="stat-value num">{v.passive.toLocaleString()}</div><div className="small muted">{t('lang.passiveOf', { n: course.goals.passive.toLocaleString() })}</div></div></div>
        <div className="card goal-card"><Ring value={v.active} max={course.goals.active} size={74} color="var(--meals)"><b>{Math.round((v.active / course.goals.active) * 100)}%</b></Ring><div><div className="stat-value num">{v.active.toLocaleString()}</div><div className="small muted">{t('lang.activeOf', { n: course.goals.active.toLocaleString() })}</div></div></div>
      </div>
      <p className="small muted mt">{t('lang.knownDefinition')}</p>

      <div className="grid-3 mt">
        <Mini value={data.streak} label={t('lang.dayStreak')} />
        <Mini value={data.ans ? `${Math.round((data.cor / data.ans) * 100)}%` : '—'} label={t('lang.accuracy30')} />
        <Mini value={`${Math.round(data.secs / 60)}`} label={t('lang.minutesTotal')} />
        <Mini value={v.learning} label={t('lang.inProgress')} />
        <Mini value={data.built} label={t('lang.sentencesBuilt')} />
        <Mini value={data.spoken} label={t('lang.sentencesSpoken')} />
      </div>

      <div className="section-label mt-lg">{t('lang.last30')}</div>
      <div className="card">
        <div className="bars">
          {data.last30.map((x) => <div key={x.d} className="bar" title={`${x.d}: ${x.l?.answers ?? 0}`}><span style={{ height: `${((x.l?.answers ?? 0) / maxDay) * 100}%` }} /></div>)}
        </div>
        <div className="small muted hstack" style={{ justifyContent: 'space-between' }}><span>{dayOfMonth(data.last30[0].d)}</span><span>{t('lang.answersPerDay')}</span><span>{dayOfMonth(data.last30[29].d)}</span></div>
      </div>

      <div className="section-label mt-lg">{t('lang.upcoming')}</div>
      <div className="card">
        <div className="bars bars-7">
          {data.forecast.map((x) => <div key={x.d} className="bar"><em>{x.n}</em><span style={{ height: `${(x.n / maxF) * 100}%` }} /><i>{weekdayShort(x.d)}</i></div>)}
        </div>
      </div>

      <div className="section-label mt-lg">{t('lang.byLevel')}</div>
      <div className="card card-flush">
        <div className="row small muted level-table-head"><span style={{ width: 34 }} /><span className="flex1">{t('lang.words')}</span><span className="w60">{t('lang.passive')}</span><span className="w60">{t('lang.active')}</span><span className="w60">{t('lang.grammar')}</span></div>
        {LEVELS.map((lv) => {
          const s = v.perLevel[lv];
          const units = content.grammar.filter((u) => u.level === lv);
          if (!s && !units.length) return null;
          return (
            <div key={lv} className="row small">
              <LevelTag level={lv} />
              <span className="flex1 num">{s?.total.toLocaleString() ?? 0}</span>
              <span className="w60 num">{s ? Math.round((s.passive / s.total) * 100) : 0}%</span>
              <span className="w60 num">{s ? Math.round((s.active / s.total) * 100) : 0}%</span>
              <span className="w60 num">{units.filter((u) => unitDone(prog, u.id)).length}/{units.length}</span>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

function Mini({ value, label }: { value: ReactNode; label: string }) {
  return <div className="card mini-stat"><div className="stat-value num">{value}</div><div className="small muted">{label}</div></div>;
}
