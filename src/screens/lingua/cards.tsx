// Swipe cards: right = I know it, left = I don't. Tap to flip (or show both sides).
// Modes: today's mix, due reviews, new words, mistakes, browse a level.
import { useEffect, useMemo, useRef, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import {
  dailyQueue, dueCards, gradeCard, logActivity, markKnownCard, mistakeCards, newProduction, newWords, saveCards, shuffle, wKey, LEVELS,
  type CardItem, type ProgressMap,
} from '../../lib/lingua.js';
import type { LDirection, LLevel, LangProgress } from '../../lib/models.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Chip, Progress, Screen, Segmented, TopBar } from '../../ui/components.js';
import { IconCheck, IconClose, IconRepeat, IconVolume } from '../../ui/icons.js';
import { toast } from '../../ui/dialogs.js';
import { isCtx, LevelTag, posLabel, SpeakButton, SwipeCard, useLingua, useStopwatch, type Ctx, type Gate } from './lingua-ui.js';

type Mode = 'daily' | 'review' | 'new' | 'mistakes' | 'level';

export function LinguaCardsScreen({ cid }: { cid: string }) {
  const ctx = useLingua(cid);
  const route = useRoute();
  if (!isCtx(ctx)) return ctx as Gate;
  const mode = route.query.get('mode') as Mode | null;
  if (!mode) return <CardsSetup ctx={ctx} />;
  return <CardsSession key={route.path + route.query.toString()} ctx={ctx} mode={mode} level={(route.query.get('level') as LLevel) || 'A1'} dirParam={route.query.get('dir') as LDirection | null} ids={route.query.get('ids')} />;
}

function CardsSetup({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { course, content, prog } = ctx;
  const [mode, setMode] = useState<Mode>('daily');
  const [level, setLevel] = useState<LLevel>('A1');
  const due = useMemo(() => dueCards(content, prog, course.direction).length, [content, prog, course.direction]);
  const mistakes = useMemo(() => mistakeCards(content, prog, course.direction).length, [content, prog, course.direction]);
  const levels = LEVELS.filter((l) => content.words.some((w) => w.l === l));
  const tl = course.target.code.toUpperCase(); const sl = course.source.code.toUpperCase();
  const start = () => navigate(`/lang/${course.id}/cards?mode=${mode}${mode === 'level' || mode === 'new' ? `&level=${level}` : ''}`);
  return (
    <Screen className="screen-no-tabs lingua">
      <TopBar title={t('lang.cards')} eyebrow={course.title} backTo={`/lang/${course.id}`} />
      <div className="section-label">{t('lang.whatToPractise')}</div>
      <div className="stack">
        {([
          ['daily', t('lang.modeDaily'), t('lang.modeDailySub')],
          ['review', t('lang.modeReview'), t('lang.nDue', { n: due })],
          ['new', t('lang.modeNew'), t('lang.modeNewSub')],
          ['mistakes', t('lang.modeMistakes'), t('lang.toFix', { n: mistakes })],
          ['level', t('lang.modeLevel'), t('lang.modeLevelSub')],
        ] as [Mode, string, string][]).map(([m, title, sub]) => (
          <button key={m} type="button" className={`card card-tappable mode-card ${mode === m ? 'selected' : ''}`} onClick={() => setMode(m)}>
            <span className="radio" /><span className="flex1"><span className="bold">{title}</span><span className="small muted block">{sub}</span></span>
          </button>
        ))}
      </div>
      {(mode === 'new' || mode === 'level') && (
        <>
          <div className="section-label mt-lg">{t('lang.level')}</div>
          <div className="chips">{levels.map((l) => <Chip key={l} tone="lingua" active={level === l} onClick={() => setLevel(l)}>{l}</Chip>)}</div>
        </>
      )}
      <div className="section-label mt-lg">{t('lang.direction')}</div>
      <Segmented value={course.direction} onChange={(v) => put('langCourses', { ...course, direction: v })}
        options={[{ value: 't2s', label: `${tl} → ${sl}` }, { value: 's2t', label: `${sl} → ${tl}` }, { value: 'mix', label: t('lang.mixed') }]} />
      <div className="section-label mt-lg">{t('lang.cardFace')}</div>
      <Segmented value={course.showBoth ? 'both' : 'flip'} onChange={(v) => put('langCourses', { ...course, showBoth: v === 'both' })}
        options={[{ value: 'flip', label: t('lang.tapToFlip') }, { value: 'both', label: t('lang.showBoth') }]} />
      <p className="small muted mt">{t('lang.swipeHelp')}</p>
      <Button variant="lingua" full size="lg" className="mt-lg" onClick={start}>{t('lang.start')}</Button>
    </Screen>
  );
}

interface QItem extends CardItem { tries: number; qid: number }

function buildQueue(ctx: Ctx, mode: Mode, level: LLevel, dir: LDirection, ids: string | null): CardItem[] {
  const { course, content, prog } = ctx;
  const size = course.sessionSize;
  if (ids) {
    return ids.split(',').map((id) => content.wordById.get(id)).filter(Boolean).map((word) => ({ word: word!, dir: dir === 's2t' ? 'p' : 'r', kind: prog.has(wKey(word!.id, 'r')) ? 'review' : 'new' }) as CardItem);
  }
  const pickDir = (): 'r' | 'p' => (dir === 'mix' ? (Math.random() < 0.5 ? 'r' : 'p') : dir === 's2t' ? 'p' : 'r');
  switch (mode) {
    case 'daily': return dailyQueue(content, prog, course, { direction: dir });
    case 'review': return dueCards(content, prog, dir).slice(0, size);
    case 'mistakes': return shuffle(mistakeCards(content, prog, dir)).slice(0, size);
    case 'new': {
      const w = newWords(content, prog, size, level).map<CardItem>((word) => ({ word, dir: dir === 's2t' ? 'p' : 'r', kind: 'new' }));
      if (w.length >= size || dir === 't2s') return w;
      return [...w, ...newProduction(content, prog, size - w.length).filter((x) => x.l === level).map<CardItem>((word) => ({ word, dir: 'p', kind: 'newp' }))];
    }
    case 'level': {
      const pool = shuffle(content.words.filter((w) => w.l === level)).slice(0, size);
      return pool.map((word) => {
        const d = pickDir();
        return { word, dir: d, kind: prog.has(wKey(word.id, d)) ? 'review' : 'new' } as CardItem;
      });
    }
  }
}

function CardsSession({ ctx, mode, level, dirParam, ids }: { ctx: Ctx; mode: Mode; level: LLevel; dirParam: LDirection | null; ids: string | null }) {
  const t = useT();
  const { course } = ctx;
  const dir = dirParam ?? course.direction;
  const local = useRef<ProgressMap>(new Map(ctx.prog));
  const [queue, setQueue] = useState<QItem[]>(() => buildQueue(ctx, mode, level, dir, ids).map((c, i) => ({ ...c, tries: 0, qid: i })));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reveal, setReveal] = useState(false); // after a wrong answer: show the answer, wait for "Continue"
  const [tally, setTally] = useState({ answers: 0, correct: 0, learned: 0, known: 0 });
  const [missed, setMissed] = useState<string[]>([]);
  const elapsed = useStopwatch();
  const logged = useRef(false);
  const total = queue.length;
  const item = queue[pos];
  const done = pos >= total;
  const firstPass = new Set(queue.slice(0, pos).map((q) => q.qid)).size;

  // Quiet by default. With sound on, the word is read only AFTER the answer side is revealed
  // (flip, or the reveal after a wrong answer) — never when a card first appears.
  useEffect(() => {
    if (!item || !course.autoSpeak) return;
    if (flipped || reveal) say(item.word.t, course.target.tts, course.rate);
  }, [item?.qid, flipped, reveal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!done || logged.current || tally.answers === 0) return;
    logged.current = true;
    logActivity(course.id, { answers: tally.answers, correct: tally.correct, learned: tally.learned, seconds: elapsed() });
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === 'ArrowRight') answer(true);
      else if (e.key === 'ArrowLeft') answer(false);
      else if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const advance = () => { setFlipped(false); setReveal(false); setPos((p) => p + 1); };

  const answer = (ok: boolean) => {
    if (!item || reveal) return;
    const m = local.current;
    const rows: LangProgress[] = [];
    const k = wKey(item.word.id, item.dir);
    const prev = m.get(k);
    let learnedNow = 0;
    if (item.kind === 'new' && !prev) {
      if (ok) {
        rows.push(markKnownCard(m.get(wKey(item.word.id, 'r')), course.id, wKey(item.word.id, 'r')));
        // producing it implies recognising it; recognising doesn't imply producing
        if (item.dir === 'p') rows.push(markKnownCard(m.get(k), course.id, k));
      } else {
        const row = gradeCard(undefined, course.id, k, false);
        rows.push({ ...row, miss: false, lw: undefined });
        learnedNow = 1;
      }
    } else if (item.kind === 'newp' && !prev) {
      const row = gradeCard(undefined, course.id, k, ok, { firstSight: true });
      rows.push(ok ? row : { ...row, miss: false, lw: undefined });
    } else {
      rows.push(gradeCard(prev, course.id, k, ok));
    }
    for (const r of rows) m.set(r.key, r);
    saveCards(rows);
    setTally((x) => ({ answers: x.answers + 1, correct: x.correct + (ok ? 1 : 0), learned: x.learned + learnedNow, known: x.known + (ok && item.kind === 'new' ? 1 : 0) }));
    if (!ok) {
      if (!missed.includes(item.word.id)) setMissed((x) => [...x, item.word.id]);
      if (item.tries < 3) setQueue((q) => { const nq = [...q]; nq.splice(Math.min(nq.length, pos + 4), 0, { ...item, kind: 'review', tries: item.tries + 1 }); return nq; });
      setFlipped(true);
      setReveal(true);
      return;
    }
    advance();
  };

  if (done) {
    const pct = tally.answers ? Math.round((tally.correct / tally.answers) * 100) : 0;
    return (
      <Screen className="screen-no-tabs lingua">
        <TopBar title={t('lang.roundDone')} backTo={`/lang/${course.id}`} />
        {total === 0 ? (
          <div className="card lang-result"><div className="bold">{t('lang.nothingHere')}</div><div className="small muted">{t('lang.nothingHereText')}</div></div>
        ) : (
          <div className="card lang-result">
            <div className="result-big">{pct}%</div>
            <div className="muted">{t('lang.resultLine', { answers: tally.answers, correct: tally.correct })}</div>
            <div className="lang-result-stats">
              <div><b>{tally.learned}</b><span>{t('lang.learnedNew')}</span></div>
              <div><b>{tally.known}</b><span>{t('lang.alreadyKnew')}</span></div>
              <div><b>{missed.length}</b><span>{t('lang.toFixLater')}</span></div>
            </div>
          </div>
        )}
        {missed.length > 0 && (
          <>
            <div className="section-label mt-lg">{t('lang.missedWords')}</div>
            <div className="card card-flush">
              {missed.map((id) => { const w = ctx.content.wordById.get(id)!; return (
                <div key={id} className="row"><div className="row-main"><div className="row-title">{w.t}</div><div className="row-sub">{w.s}</div></div><SpeakButton text={w.t} tag={course.target.tts} rate={course.rate} /></div>
              ); })}
            </div>
          </>
        )}
        <div className="stack mt-lg">
          <Button variant="lingua" full icon={<IconRepeat size={18} />} onClick={() => navigate(`/lang/${course.id}/cards?mode=${mode}&level=${level}&dir=${dir}&r=${Date.now()}`, { replace: true })}>{t('lang.anotherRound')}</Button>
          {missed.length > 0 && <Button variant="secondary" full onClick={() => navigate(`/lang/${course.id}/cards?mode=review&dir=${dir}&ids=${missed.join(',')}&r=${Date.now()}`, { replace: true })}>{t('lang.drillMissed')}</Button>}
          <Button variant="ghost" full onClick={() => navigate(`/lang/${course.id}`, { replace: true })}>{t('common.done')}</Button>
        </div>
      </Screen>
    );
  }

  const w = item.word;
  const pos_ = posLabel(t, w.pos);
  const target = (
    <div className="face-target">
      <div className="face-word">{w.t}</div>
      <SpeakButton text={w.t} tag={course.target.tts} rate={course.rate} size={22} />
    </div>
  );
  const meaning = <div className="face-meaning">{w.s}</div>;
  const details = (
    <div className="face-details">
      {w.info && <div className="face-info">{w.info}</div>}
      {w.ex && (
        <div className="face-ex">
          <div className="hstack" style={{ gap: 6, alignItems: 'flex-start' }}><span className="flex1">{w.ex}</span><SpeakButton text={w.ex} tag={course.target.tts} rate={course.rate} size={16} /></div>
          {w.exs && <div className="muted">{w.exs}</div>}
        </div>
      )}
    </div>
  );
  const meta = (
    <div className="face-meta">
      <LevelTag level={w.l} />{pos_ && <span>{pos_}</span>}
      {item.kind === 'new' && <span className="new-pill">{t('lang.new')}</span>}
      {item.kind === 'newp' && <span className="new-pill">{t('lang.sayIt')}</span>}
      {item.kind === 'mistake' && <span className="miss-pill">{t('lang.mistake')}</span>}
    </div>
  );
  const front = item.dir === 'r'
    ? <>{meta}{target}<div className="face-q">{t('lang.qMeaning')}</div></>
    : <>{meta}{meaning}<div className="face-q">{t('lang.qSay', { lang: course.title })}</div></>;
  const back = item.dir === 'r' ? <><div className="face-word small-word">{w.t}</div>{meaning}{details}</> : <>{target}{details}</>;
  const isNew = item.kind === 'new';

  return (
    <Screen className="screen-no-tabs lingua cards-screen">
      <TopBar title={`${Math.min(firstPass + 1, total)} / ${total}`} eyebrow={course.title} onBack={() => navigate(`/lang/${course.id}`, { replace: true })}
        right={<button type="button" className={`iconbtn ${course.autoSpeak ? 'iconbtn-lingua' : ''}`} aria-label={course.autoSpeak ? t('lang.soundOn') : t('lang.soundOff')} title={course.autoSpeak ? t('lang.soundOn') : t('lang.soundOff')}
          onClick={() => { const on = !course.autoSpeak; put('langCourses', { ...course, autoSpeak: on }); toast(on ? t('lang.soundOnToast') : t('lang.soundOffToast')); }}><IconVolume off={!course.autoSpeak} size={20} /></button>} />
      <Progress value={pos} max={total} color="var(--lingua)" height={6} />
      <SwipeCard front={front} back={back} showBoth={course.showBoth} flipped={flipped} onFlip={() => setFlipped((f) => !f)}
        onAnswer={answer} disabled={reveal}
        hintLeft={isNew ? t('lang.learnIt') : t('lang.dontKnow')} hintRight={isNew ? t('lang.iKnowIt') : t('lang.know')} />
      {reveal ? (
        <div className="card-actions">
          <Button variant="lingua" full size="lg" onClick={advance}>{t('lang.continue')}</Button>
        </div>
      ) : (
        <div className="card-actions">
          <button type="button" className="round-btn no" aria-label={t('lang.dontKnow')} onClick={() => answer(false)}><IconClose size={26} /></button>
          {!course.showBoth && <button type="button" className="flip-btn" onClick={() => setFlipped((f) => !f)}>{flipped ? t('lang.front') : t('lang.flip')}</button>}
          <button type="button" className="round-btn yes" aria-label={t('lang.know')} onClick={() => answer(true)}><IconCheck size={26} /></button>
        </div>
      )}
      <div className="small muted center">{isNew ? t('lang.newHelp') : t('lang.swipeShort')}</div>
    </Screen>
  );
}
