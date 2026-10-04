// Multiple-choice quiz: meaning, reverse (pick the foreign word) or listening. Tap only.
import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { focusLevel, gradeCard, logActivity, saveCards, shuffle, vocabStats, wKey, type LWord, type ProgressMap } from '../../lib/lingua.js';
import { todayKey } from '../../lib/dates.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Progress, Screen, Segmented, TopBar } from '../../ui/components.js';
import { IconRepeat } from '../../ui/icons.js';
import { isCtx, LevelTag, posLabel, SpeakButton, useLingua, useStopwatch, type Ctx, type Gate } from './lingua-ui.js';

type QMode = 'meaning' | 'reverse' | 'listen';
interface Q { word: LWord; options: LWord[] }

export function LinguaQuizScreen({ cid }: { cid: string }) {
  const ctx = useLingua(cid);
  const route = useRoute();
  if (!isCtx(ctx)) return ctx as Gate;
  return <QuizSession key={route.query.toString()} ctx={ctx} initial={(route.query.get('mode') as QMode) || 'meaning'} />;
}

function buildQuiz(ctx: Ctx, n = 12): Q[] {
  const { content, prog } = ctx;
  const today = todayKey();
  // words you've met (due ones first), topped up with the focus level
  const met = content.words.filter((w) => prog.has(wKey(w.id, 'r')) || prog.has(wKey(w.id, 'p')));
  const due = met.filter((w) => [wKey(w.id, 'r'), wKey(w.id, 'p')].some((k) => (prog.get(k)?.due ?? '9') <= today));
  const focus = focusLevel(content, vocabStats(content, prog), prog);
  const lvl = shuffle(content.words.filter((w) => w.l === focus)).slice(0, 60);
  const pool: LWord[] = [];
  for (const w of [...shuffle(due), ...shuffle(met), ...lvl]) { if (!pool.includes(w)) pool.push(w); if (pool.length >= n) break; }
  return pool.map((word) => {
    const meaning = word.s.toLowerCase();
    const same = content.words.filter((x) => x.id !== word.id && x.pos === word.pos && x.s.toLowerCase() !== meaning && Math.abs(x.rank - word.rank) < 1500);
    const others = shuffle(same.length >= 3 ? same : content.words.filter((x) => x.id !== word.id)).slice(0, 3);
    return { word, options: shuffle([word, ...others]) };
  });
}

function QuizSession({ ctx, initial }: { ctx: Ctx; initial: QMode }) {
  const t = useT();
  const { course } = ctx;
  const [mode, setMode] = useState<QMode>(initial);
  const [qs, setQs] = useState<Q[]>(() => buildQuiz(ctx));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<LWord[]>([]);
  const [score, setScore] = useState(0);
  const local = useRef<ProgressMap>(new Map(ctx.prog));
  const elapsed = useStopwatch();
  const logged = useRef(false);
  const q = qs[i];
  const done = i >= qs.length;
  const started = i > 0 || picked !== null;

  useEffect(() => { if (q && mode === 'listen') say(q.word.t, course.target.tts, course.rate); }, [i, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (done && !logged.current && qs.length) { logged.current = true; logActivity(course.id, { answers: qs.length, correct: score, seconds: elapsed() }); }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (w: LWord) => {
    if (picked) return;
    setPicked(w.id);
    const ok = w.id === q.word.id;
    if (ok) setScore((s) => s + 1); else setWrong((x) => [...x, q.word]);
    if (mode !== 'listen') say(q.word.t, course.target.tts, course.rate);
    // Only touch the schedule when it matters: a miss always, a hit only if the card was due.
    const dir = mode === 'reverse' ? 'p' : 'r';
    const key = wKey(q.word.id, dir);
    const prev = local.current.get(key);
    if (!ok || (prev && prev.due <= todayKey())) {
      const row = gradeCard(prev, course.id, key, ok);
      const fixed = !prev && !ok ? { ...row, miss: false, lw: undefined } : row; // unseen word → just start learning it
      local.current.set(key, fixed);
      saveCards([fixed]);
    }
  };
  const next = () => { setPicked(null); setI((x) => x + 1); };

  if (done) {
    return (
      <Screen className="screen-no-tabs lingua">
        <TopBar title={t('lang.roundDone')} backTo={`/lang/${course.id}`} />
        <div className="card lang-result"><div className="result-big">{score}/{qs.length}</div><div className="muted">{t(`lang.quizMode.${mode}`)}</div></div>
        {wrong.length > 0 && (
          <>
            <div className="section-label mt-lg">{t('lang.missedWords')}</div>
            <div className="card card-flush">{wrong.map((w) => (
              <div key={w.id} className="row"><div className="row-main"><div className="row-title">{w.t}</div><div className="row-sub">{w.s}</div></div><SpeakButton text={w.t} tag={course.target.tts} rate={course.rate} /></div>
            ))}</div>
          </>
        )}
        <div className="stack mt-lg">
          <Button variant="lingua" full icon={<IconRepeat size={18} />} onClick={() => { setQs(buildQuiz(ctx)); setI(0); setPicked(null); setWrong([]); setScore(0); logged.current = false; }}>{t('lang.anotherRound')}</Button>
          <Button variant="ghost" full onClick={() => navigate(`/lang/${course.id}`, { replace: true })}>{t('common.done')}</Button>
        </div>
      </Screen>
    );
  }
  if (!q) return null;
  const label = (w: LWord) => (mode === 'reverse' ? w.t : w.s);
  return (
    <Screen className="screen-no-tabs lingua quiz-screen">
      <TopBar title={`${i + 1} / ${qs.length}`} eyebrow={t('lang.quiz')} onBack={() => navigate(`/lang/${course.id}`, { replace: true })} />
      {!started && (
        <Segmented value={mode} onChange={setMode} options={[{ value: 'meaning', label: t('lang.quizMode.meaning') }, { value: 'reverse', label: t('lang.quizMode.reverse') }, { value: 'listen', label: t('lang.quizMode.listen') }]} />
      )}
      <Progress value={i} max={qs.length} color="var(--lingua)" height={6} />
      <div className="quiz-q">
        <div className="face-meta"><LevelTag level={q.word.l} />{posLabel(t, q.word.pos) && <span>{posLabel(t, q.word.pos)}</span>}</div>
        {mode === 'meaning' && <div className="face-word">{q.word.t}</div>}
        {mode === 'reverse' && <div className="face-meaning">{q.word.s}</div>}
        {mode === 'listen' && <div className="hstack" style={{ justifyContent: 'center' }}><SpeakButton text={q.word.t} tag={course.target.tts} rate={course.rate} size={30} className="big" /><SpeakButton text={q.word.t} tag={course.target.tts} rate={course.rate * 0.7} label={t('lang.slow')} /></div>}
        {picked && mode === 'listen' && <div className="face-word small-word">{q.word.t}</div>}
      </div>
      <div className="quiz-options">
        {q.options.map((o) => {
          const state = !picked ? '' : o.id === q.word.id ? 'right' : o.id === picked ? 'wrong' : 'dim';
          return <button key={o.id} type="button" className={`quiz-opt ${state}`} onClick={() => pick(o)}>{label(o)}</button>;
        })}
      </div>
      {picked && (
        <>
          {q.word.ex && <div className="small muted quiz-ex">{q.word.ex}{q.word.exs ? ` — ${q.word.exs}` : ''}</div>}
          <Button variant="lingua" full size="lg" className="mt" onClick={next}>{t('lang.continue')}</Button>
        </>
      )}
    </Screen>
  );
}


