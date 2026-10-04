// Sentence builder: read (or hear) the meaning, build the sentence from word tiles — no keyboard.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { focusLevel, gradeCard, LEVELS, logActivity, saveCards, sameBag, sameSequence, sentenceQueue, tilesOf, vocabStats, type LSentence, type ProgressMap } from '../../lib/lingua.js';
import type { LLevel } from '../../lib/models.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Chip, Progress, Screen, Toggle, TopBar } from '../../ui/components.js';
import { IconEar, IconRepeat } from '../../ui/icons.js';
import { isCtx, LevelTag, makeTiles, SpeakButton, TileBuilder, useLingua, useStopwatch, type Ctx, type Tile, type Gate } from './lingua-ui.js';

export function LinguaBuildScreen({ cid }: { cid: string }) {
  const ctx = useLingua(cid);
  const route = useRoute();
  if (!isCtx(ctx)) return ctx as Gate;
  if (!route.query.get('go')) return <BuildSetup ctx={ctx} />;
  return <BuildSession key={route.query.toString()} ctx={ctx} level={(route.query.get('level') as LLevel | 'all') || 'all'} listen={route.query.get('listen') === '1'} mistakes={route.query.get('mistakes') === '1'} />;
}

function BuildSetup({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { course, content, prog } = ctx;
  const focus = useMemo(() => focusLevel(content, vocabStats(content, prog), prog), [content, prog]);
  const [level, setLevel] = useState<LLevel | 'all'>(focus);
  const [listen, setListen] = useState(false);
  const levels = LEVELS.filter((l) => content.sentences.some((s) => s.l === l));
  const count = (l: LLevel | 'all') => content.sentences.filter((s) => l === 'all' || s.l === l).length;
  const seen = (l: LLevel | 'all') => content.sentences.filter((s) => (l === 'all' || s.l === l) && prog.get(`s:${s.id}`)?.reps).length;
  const miss = content.sentences.filter((s) => prog.get(`s:${s.id}`)?.miss).length;
  const go = (extra = '') => navigate(`/lang/${course.id}/build?go=1&level=${level}${listen ? '&listen=1' : ''}${extra}`);
  return (
    <Screen className="screen-no-tabs lingua">
      <TopBar title={t('lang.build')} eyebrow={course.title} backTo={`/lang/${course.id}`} />
      <p className="muted">{t('lang.buildIntro', { lang: course.title })}</p>
      <div className="section-label mt-lg">{t('lang.level')}</div>
      <div className="chips">
        {levels.map((l) => <Chip key={l} tone="lingua" active={level === l} onClick={() => setLevel(l)}>{l} · {seen(l)}/{count(l)}</Chip>)}
        <Chip tone="lingua" active={level === 'all'} onClick={() => setLevel('all')}>{t('lang.all')}</Chip>
      </div>
      <div className="card mt hstack">
        <IconEar className="c-lingua" />
        <div className="flex1"><div className="bold">{t('lang.listenMode')}</div><div className="small muted">{t('lang.listenModeSub')}</div></div>
        <Toggle checked={listen} onChange={setListen} />
      </div>
      <Button variant="lingua" full size="lg" className="mt-lg" onClick={() => go()}>{t('lang.start')}</Button>
      {miss > 0 && <Button variant="secondary" full className="mt" onClick={() => go('&mistakes=1')}>{t('lang.fixSentences', { n: miss })}</Button>}
    </Screen>
  );
}

interface Q { s: LSentence; tiles: Tile[]; again: boolean }

function distractorsFor(s: LSentence, pool: LSentence[]): string[] {
  if (s.d && s.d.length) return s.d.slice(0, 3);
  // fall back to one word from another sentence of the same level
  const others = pool.filter((x) => x.id !== s.id && x.l === s.l);
  const words = tilesOf(s.t).map((w) => w.toLowerCase());
  const o = others[Math.floor(Math.random() * Math.max(1, others.length))];
  const cand = o ? tilesOf(o.t).filter((w) => !words.includes(w.toLowerCase()) && w.length > 2) : [];
  return cand.length ? [cand[Math.floor(Math.random() * cand.length)]] : [];
}

function BuildSession({ ctx, level, listen, mistakes }: { ctx: Ctx; level: LLevel | 'all'; listen: boolean; mistakes: boolean }) {
  const t = useT();
  const { course, content } = ctx;
  const local = useRef<ProgressMap>(new Map(ctx.prog));
  const [queue, setQueue] = useState<Q[]>(() => sentenceQueue(content, ctx.prog, 's', level, 10, { mistakesOnly: mistakes })
    .map((s) => ({ s, tiles: makeTiles(tilesOf(s.t), distractorsFor(s, content.sentences)), again: false })));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<null | 'right' | 'wrong' | 'close'>(null);
  const [tally, setTally] = useState({ n: 0, ok: 0 });
  const elapsed = useStopwatch();
  const logged = useRef(false);
  const q = queue[i];
  const done = i >= queue.length;

  useEffect(() => { if (q && listen) say(q.s.t, course.target.tts, course.rate); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (done && !logged.current && tally.n) { logged.current = true; logActivity(course.id, { answers: tally.n, correct: tally.ok, sentences: tally.n, seconds: elapsed() }); }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = (ok: boolean) => {
    const key = `s:${q.s.id}`;
    const row = gradeCard(local.current.get(key), course.id, key, ok);
    local.current.set(key, row);
    saveCards([row]);
    setTally((x) => ({ n: x.n + 1, ok: x.ok + (ok ? 1 : 0) }));
    if (!ok && !q.again) setQueue((qq) => [...qq, { s: q.s, tiles: makeTiles(tilesOf(q.s.t), distractorsFor(q.s, content.sentences)), again: true }]);
  };

  const check = () => {
    const answer = picked.map((id) => q.tiles.find((x) => x.id === id)!.text);
    const correct = tilesOf(q.s.t);
    if (sameSequence(answer, correct)) { setResult('right'); record(true); say(q.s.t, course.target.tts, course.rate); }
    else if (sameBag(answer, correct)) setResult('close');
    else { setResult('wrong'); record(false); say(q.s.t, course.target.tts, course.rate); }
  };
  const acceptClose = (ok: boolean) => { setResult(ok ? 'right' : 'wrong'); record(ok); say(q.s.t, course.target.tts, course.rate); };
  const next = () => { setPicked([]); setResult(null); setI((x) => x + 1); };

  if (done) {
    return (
      <Screen className="screen-no-tabs lingua">
        <TopBar title={t('lang.roundDone')} backTo={`/lang/${course.id}`} />
        {queue.length === 0 ? <div className="card lang-result"><div className="bold">{t('lang.nothingHere')}</div><div className="small muted">{t('lang.nothingHereText')}</div></div> : (
          <div className="card lang-result">
            <div className="result-big">{tally.n ? Math.round((tally.ok / tally.n) * 100) : 0}%</div>
            <div className="muted">{t('lang.resultLine', { answers: tally.n, correct: tally.ok })}</div>
          </div>
        )}
        <div className="stack mt-lg">
          <Button variant="lingua" full icon={<IconRepeat size={18} />} onClick={() => navigate(`/lang/${course.id}/build?go=1&level=${level}${listen ? '&listen=1' : ''}&r=${Date.now()}`, { replace: true })}>{t('lang.anotherRound')}</Button>
          <Button variant="ghost" full onClick={() => navigate(`/lang/${course.id}`, { replace: true })}>{t('common.done')}</Button>
        </div>
      </Screen>
    );
  }

  const unit = q.s.g ? content.unitById.get(q.s.g) : undefined;
  return (
    <Screen className="screen-no-tabs lingua build-screen">
      <TopBar title={`${Math.min(i + 1, queue.length)} / ${queue.length}`} eyebrow={t('lang.build')} onBack={() => navigate(`/lang/${course.id}`, { replace: true })} />
      <Progress value={i} max={queue.length} color="var(--lingua)" height={6} />
      <div className="build-prompt">
        <div className="face-meta"><LevelTag level={q.s.l} />{q.again && <span className="miss-pill">{t('lang.again')}</span>}</div>
        {listen && !result ? (
          <div className="hstack"><SpeakButton text={q.s.t} tag={course.target.tts} rate={course.rate} size={26} className="big" /><SpeakButton text={q.s.t} tag={course.target.tts} rate={course.rate * 0.7} size={18} label={t('lang.slow')} /><span className="muted small">{t('lang.listenAndBuild')}</span></div>
        ) : (
          <div className="build-source">{q.s.s}</div>
        )}
        <div className="small muted">{t('lang.buildIn', { lang: course.title })}</div>
      </div>
      <TileBuilder tiles={q.tiles} picked={picked} onChange={setPicked} locked={!!result} state={result ?? undefined} />
      {result && (
        <div className={`build-feedback ${result}`}>
          {result === 'right' && <div className="bold">{t('lang.correct')}</div>}
          {result === 'wrong' && <div className="bold">{t('lang.notQuite')}</div>}
          {result === 'close' && <div className="bold">{t('lang.otherOrder')}</div>}
          <div className="hstack" style={{ gap: 8 }}><div className="flex1 feedback-sentence">{q.s.t}</div><SpeakButton text={q.s.t} tag={course.target.tts} rate={course.rate} /></div>
          {listen && <div className="small muted">{q.s.s}</div>}
          {result === 'close' && <div className="small muted">{t('lang.otherOrderText')}</div>}
          {unit && result !== 'right' && <button type="button" className="link-btn c-lingua small" onClick={() => navigate(`/lang/${course.id}/grammar/${unit.id}`)}>{t('lang.reviewRule', { title: unit.title })}</button>}
        </div>
      )}
      <div className="build-actions">
        {!result && <>
          <Button variant="secondary" onClick={() => setPicked([])} disabled={!picked.length}>{t('common.clear')}</Button>
          <Button variant="lingua" className="flex1" onClick={check} disabled={!picked.length}>{t('lang.check')}</Button>
        </>}
        {result === 'close' && <>
          <Button variant="secondary" className="flex1" onClick={() => acceptClose(false)}>{t('lang.iWasWrong')}</Button>
          <Button variant="lingua" className="flex1" onClick={() => acceptClose(true)}>{t('lang.mineIsFine')}</Button>
        </>}
        {(result === 'right' || result === 'wrong') && <Button variant="lingua" full size="lg" onClick={next}>{t('lang.continue')}</Button>}
      </div>
    </Screen>
  );
}


