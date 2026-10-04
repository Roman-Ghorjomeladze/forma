// One course's dashboard: today's plan, goal progress, activities, phrases of the day, levels.
import { useMemo, type ReactNode } from 'react';
import { useT } from '../../lib/i18n.js';
import { dueCards, focusLevel, nextUnit, phrasesOfTheDay, sentenceQueue, streak, useLogs, vocabStats, CORE_LEVELS, unitDone, drillMistakes } from '../../lib/lingua.js';
import { navigate } from '../../lib/router.js';
import { todayKey } from '../../lib/dates.js';
import { Button, Screen, TopBar } from '../../ui/components.js';
import { IconBook, IconCards, IconChart, IconChevron, IconEar, IconFlame, IconList, IconMic, IconPuzzle, IconSettings, IconTarget, IconAlert } from '../../ui/icons.js';
import { isCtx, LevelTag, Ring, SpeakButton, useLingua, type Gate } from './lingua-ui.js';

export function LinguaCourseScreen({ cid }: { cid: string }) {
  const t = useT();
  const ctx = useLingua(cid);
  const logs = useLogs(cid);
  const data = useMemo(() => {
    if (!isCtx(ctx)) return null;
    const { content, prog } = ctx;
    const stats = vocabStats(content, prog);
    const focus = focusLevel(content, stats, prog);
    const sentDue = sentenceQueue(content, prog, 's', 'all', 999).filter((s) => prog.has(`s:${s.id}`)).length;
    return {
      stats, focus,
      due: dueCards(content, prog, 'mix').length,
      phrases: phrasesOfTheDay(content, prog, focus),
      unit: nextUnit(content, prog),
      sentDue,
      mistakes: stats.mistakes,
      drillMiss: drillMistakes(content, prog).length,
      started: prog.size > 0,
    };
  }, [ctx]);
  if (!isCtx(ctx) || !data) return ctx as Gate;
  const { course, content, prog } = ctx;
  const { stats } = data;
  const newLeft = Math.max(0, course.dailyNew - stats.learnedToday);
  const days = logs ? streak(logs) : 0;
  const todayLog = logs?.find((l) => l.date === todayKey());
  const go = (p: string) => navigate(`/lang/${cid}/${p}`);

  return (
    <Screen className="screen-no-tabs lingua">
      <TopBar eyebrow={t('lang.fromLang', { lang: course.source.name })} title={course.title} backTo="/lang"
        right={<>
          <button type="button" className="iconbtn" aria-label={t('lang.stats')} onClick={() => go('stats')}><IconChart /></button>
          <button type="button" className="iconbtn" aria-label={t('lang.manage')} onClick={() => go('manage')}><IconSettings /></button>
        </>} />

      <div className="card card-dark lang-hero">
        <div className="lang-hero-top">
          <Ring value={stats.passive} max={course.goals.passive} size={92} stroke={9} color="var(--lingua-bright)">
            <div className="ring-num">{Math.round((stats.passive / Math.max(1, course.goals.passive)) * 100)}%</div>
          </Ring>
          <div className="lang-hero-goals">
            <Goal label={t('lang.passive')} value={stats.passive} max={course.goals.passive} />
            <Goal label={t('lang.active')} value={stats.active} max={course.goals.active} />
            <div className="small hero-meta">
              <span className="hstack" style={{ gap: 4 }}><IconFlame size={14} /> {t('lang.streak', { n: days })}</span>
              <span><LevelTag level={data.focus} /> {t('lang.focus')}</span>
            </div>
          </div>
        </div>
        <div className="lang-hero-today">
          <div><b>{data.due}</b><span>{t('lang.dueReviews')}</span></div>
          <div><b>{newLeft}</b><span>{t('lang.newLeft')}</span></div>
          <div><b>{todayLog?.answers ?? 0}</b><span>{t('lang.answeredToday')}</span></div>
        </div>
        <Button variant="lingua" full size="lg" onClick={() => go('cards?mode=daily')}>{data.due + newLeft > 0 ? t('lang.startToday') : t('lang.extraRound')}</Button>
      </div>

      {!data.started && (
        <button type="button" className="card card-tappable lang-tip mt" onClick={() => go('placement')}>
          <IconTarget size={22} className="c-lingua" />
          <div className="flex1"><div className="bold">{t('lang.placementTipTitle')}</div><div className="small muted">{t('lang.placementTipText')}</div></div>
          <IconChevron className="muted" />
        </button>
      )}

      <div className="section-label mt-lg">{t('lang.practice')}</div>
      <div className="lang-grid">
        <Tile icon={<IconCards />} title={t('lang.cards')} sub={t('lang.cardsSub')} onClick={() => go('cards')} />
        <Tile icon={<IconPuzzle />} title={t('lang.build')} sub={data.sentDue ? t('lang.nDue', { n: data.sentDue }) : t('lang.buildSub')} onClick={() => go('build')} />
        <Tile icon={<IconMic />} title={t('lang.speak')} sub={t('lang.speakSub')} onClick={() => go('speak')} />
        <Tile icon={<IconEar />} title={t('lang.listen')} sub={t('lang.listenSub')} onClick={() => go('quiz?mode=listen')} />
        <Tile icon={<IconTarget />} title={t('lang.quiz')} sub={t('lang.quizSub')} onClick={() => go('quiz')} />
        <Tile icon={<IconBook />} title={t('lang.grammar')} sub={t('lang.grammarSub', { done: content.grammar.filter((u) => unitDone(prog, u.id)).length, total: content.grammar.length })} onClick={() => go('grammar')} />
        <Tile icon={<IconAlert />} title={t('lang.mistakes')} sub={data.mistakes ? t('lang.toFix', { n: data.mistakes }) : t('lang.noMistakesShort')} onClick={() => go('mistakes')} badge={data.mistakes || undefined} />
        <Tile icon={<IconList />} title={t('lang.words')} sub={t('lang.wordsSub', { n: content.words.length.toLocaleString() })} onClick={() => go('words')} />
      </div>

      {data.phrases.length > 0 && (
        <>
          <div className="section-head mt-lg">
            <div className="section-label" style={{ margin: 0 }}>{t('lang.phrasesToday')}</div>
            <button type="button" className="link-btn c-lingua" onClick={() => go('speak?daily=1')}>{t('lang.practiseSaying')}</button>
          </div>
          <div className="card card-flush">
            {data.phrases.map((s) => (
              <div key={s.id} className="row phrase-row">
                <div className="row-main">
                  <div className="phrase-t">{s.t}</div>
                  <div className="row-sub">{s.s}</div>
                </div>
                <SpeakButton text={s.t} tag={course.target.tts} rate={course.rate} />
              </div>
            ))}
          </div>
        </>
      )}

      {data.unit && (
        <>
          <div className="section-label mt-lg">{t('lang.nextGrammar')}</div>
          <button type="button" className="card card-tappable lang-unit-card" onClick={() => go(`grammar/${data.unit!.id}`)}>
            <LevelTag level={data.unit.level} />
            <div className="flex1"><div className="bold">{data.unit.title}</div><div className="small muted">{data.unit.summary}</div></div>
            <IconChevron className="muted" />
          </button>
        </>
      )}

      <div className="section-label mt-lg">{t('lang.levels')}</div>
      <div className="card">
        {CORE_LEVELS.concat(stats.perLevel.C1 ? ['C1'] : []).map((lv) => {
          const s = stats.perLevel[lv];
          if (!s) return null;
          return (
            <div key={lv} className="level-row">
              <LevelTag level={lv} />
              <div className="level-bars">
                <div className="level-bar"><span className="pas" style={{ width: `${(s.passive / s.total) * 100}%` }} /><span className="act" style={{ width: `${(s.active / s.total) * 100}%` }} /></div>
                <div className="small muted">{t('lang.levelLine', { passive: s.passive, active: s.active, total: s.total })}</div>
              </div>
            </div>
          );
        })}
        <div className="small muted legend"><span className="dot act" />{t('lang.active')} <span className="dot pas" />{t('lang.passive')}</div>
      </div>
    </Screen>
  );
}

function Goal({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="goal">
      <div className="goal-head"><span>{label}</span><b className="num">{value.toLocaleString()} <span className="muted">/ {max.toLocaleString()}</span></b></div>
      <div className="goal-bar"><span style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} /></div>
    </div>
  );
}

function Tile({ icon, title, sub, onClick, badge }: { icon: ReactNode; title: string; sub: string; onClick: () => void; badge?: number }) {
  return (
    <button type="button" className="lang-tile" onClick={onClick}>
      <span className="lang-tile-icon">{icon}</span>
      <span className="lang-tile-title">{title}</span>
      <span className="lang-tile-sub">{sub}</span>
      {badge ? <span className="lang-badge">{badge > 99 ? '99+' : badge}</span> : null}
    </button>
  );
}
