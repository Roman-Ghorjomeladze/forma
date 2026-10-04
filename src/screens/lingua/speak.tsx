// Speaking trainer: see the meaning, say the sentence aloud, reveal, compare, grade yourself.
// If the browser offers speech recognition, a mic button shows what it heard.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { hush, say } from '../../lib/lingua-speech.js';
import { focusLevel, gradeCard, LEVELS, logActivity, norm, phrasesOfTheDay, saveCards, sentenceQueue, tilesOf, vocabStats, type LSentence, type ProgressMap } from '../../lib/lingua.js';
import type { LLevel } from '../../lib/models.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Chip, Progress, Screen, TopBar } from '../../ui/components.js';
import { IconMic, IconRepeat } from '../../ui/icons.js';
import { isCtx, LevelTag, SpeakButton, useLingua, useStopwatch, type Ctx, type Gate } from './lingua-ui.js';

export function LinguaSpeakScreen({ cid }: { cid: string }) {
  const ctx = useLingua(cid);
  const route = useRoute();
  if (!isCtx(ctx)) return ctx as Gate;
  const daily = route.query.get('daily') === '1';
  if (!daily && !route.query.get('go')) return <SpeakSetup ctx={ctx} />;
  return <SpeakSession key={route.query.toString()} ctx={ctx} daily={daily} level={(route.query.get('level') as LLevel | 'all') || 'all'} dailyOnly={route.query.get('phrases') === '1'} mistakes={route.query.get('mistakes') === '1'} />;
}

function SpeakSetup({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { course, content, prog } = ctx;
  const focus = useMemo(() => focusLevel(content, vocabStats(content, prog), prog), [content, prog]);
  const [level, setLevel] = useState<LLevel | 'all'>(focus);
  const [phrases, setPhrases] = useState(true);
  const levels = LEVELS.filter((l) => content.sentences.some((s) => s.l === l));
  const miss = content.sentences.filter((s) => prog.get(`sp:${s.id}`)?.miss).length;
  const go = (extra = '') => navigate(`/lang/${course.id}/speak?go=1&level=${level}${phrases ? '&phrases=1' : ''}${extra}`);
  return (
    <Screen className="screen-no-tabs lingua">
      <TopBar title={t('lang.speak')} eyebrow={course.title} backTo={`/lang/${course.id}`} />
      <p className="muted">{t('lang.speakIntro', { lang: course.title })}</p>
      <div className="section-label mt-lg">{t('lang.level')}</div>
      <div className="chips">
        {levels.map((l) => <Chip key={l} tone="lingua" active={level === l} onClick={() => setLevel(l)}>{l}</Chip>)}
        <Chip tone="lingua" active={level === 'all'} onClick={() => setLevel('all')}>{t('lang.all')}</Chip>
      </div>
      <div className="section-label mt-lg">{t('lang.what')}</div>
      <div className="chips">
        <Chip tone="lingua" active={phrases} onClick={() => setPhrases(true)}>{t('lang.everydayPhrases')}</Chip>
        <Chip tone="lingua" active={!phrases} onClick={() => setPhrases(false)}>{t('lang.allSentences')}</Chip>
      </div>
      <Button variant="lingua" full size="lg" className="mt-lg" onClick={() => go()}>{t('lang.start')}</Button>
      <Button variant="secondary" full className="mt" onClick={() => navigate(`/lang/${course.id}/speak?daily=1`)}>{t('lang.phrasesToday')}</Button>
      {miss > 0 && <Button variant="ghost" full className="mt" onClick={() => go('&mistakes=1')}>{t('lang.fixSentences', { n: miss })}</Button>}
    </Screen>
  );
}

type Rec = { start: () => void; stop: () => void } | null;
function useRecognizer(lang: string, onText: (s: string) => void, onEnd: () => void): Rec {
  return useMemo(() => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return null;
    let r: SpeechRecognitionLike | null = null;
    return {
      start() {
        try {
          r = new Ctor();
          r.lang = lang; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
          r.onresult = (e) => { let s = ''; for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; onText(s); };
          r.onend = onEnd; r.onerror = onEnd;
          r.start();
        } catch { onEnd(); }
      },
      stop() { try { r?.stop(); } catch { /* ignore */ } },
    };
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
}
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void;
  start: () => void; stop: () => void;
}

function matchScore(heard: string, target: string): { pct: number; words: { w: string; ok: boolean }[] } {
  const h = new Set(tilesOf(heard).map(norm));
  const words = tilesOf(target).map((w) => ({ w, ok: h.has(norm(w)) }));
  return { pct: words.length ? Math.round((words.filter((x) => x.ok).length / words.length) * 100) : 0, words };
}

function SpeakSession({ ctx, daily, level, dailyOnly, mistakes }: { ctx: Ctx; daily: boolean; level: LLevel | 'all'; dailyOnly: boolean; mistakes: boolean }) {
  const t = useT();
  const { course, content } = ctx;
  const local = useRef<ProgressMap>(new Map(ctx.prog));
  const [queue] = useState<LSentence[]>(() => {
    if (daily) return phrasesOfTheDay(content, ctx.prog, focusLevel(content, vocabStats(content, ctx.prog), ctx.prog));
    return sentenceQueue(content, ctx.prog, 'sp', level, 10, { mistakesOnly: mistakes, dailyOnly });
  });
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [heard, setHeard] = useState('');
  const [listening, setListening] = useState(false);
  const [tally, setTally] = useState({ n: 0, ok: 0 });
  const elapsed = useStopwatch();
  const logged = useRef(false);
  const rec = useRecognizer(course.target.tts, setHeard, () => setListening(false));
  const s = queue[i];
  const done = i >= queue.length;

  useEffect(() => () => { hush(); rec?.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (done && !logged.current && tally.n) { logged.current = true; logActivity(course.id, { answers: tally.n, correct: tally.ok, sentences: tally.n, seconds: elapsed() }); }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const reveal = () => { rec?.stop(); setShown(true); say(s.t, course.target.tts, course.rate); };
  const grade = (ok: boolean) => {
    const key = `sp:${s.id}`;
    const row = gradeCard(local.current.get(key), course.id, key, ok);
    local.current.set(key, row);
    saveCards([row]);
    setTally((x) => ({ n: x.n + 1, ok: x.ok + (ok ? 1 : 0) }));
    setShown(false); setHeard(''); setI((x) => x + 1);
  };

  if (done) {
    return (
      <Screen className="screen-no-tabs lingua">
        <TopBar title={t('lang.roundDone')} backTo={`/lang/${course.id}`} />
        {queue.length === 0 ? <div className="card lang-result"><div className="bold">{t('lang.nothingHere')}</div></div> : (
          <div className="card lang-result"><div className="result-big">{tally.ok}/{tally.n}</div><div className="muted">{t('lang.speakDone')}</div></div>
        )}
        <div className="stack mt-lg">
          {!daily && <Button variant="lingua" full icon={<IconRepeat size={18} />} onClick={() => navigate(`/lang/${course.id}/speak?go=1&level=${level}${dailyOnly ? '&phrases=1' : ''}&r=${Date.now()}`, { replace: true })}>{t('lang.anotherRound')}</Button>}
          <Button variant={daily ? 'lingua' : 'ghost'} full onClick={() => navigate(`/lang/${course.id}`, { replace: true })}>{t('common.done')}</Button>
        </div>
      </Screen>
    );
  }

  const score = heard ? matchScore(heard, s.t) : null;
  return (
    <Screen className="screen-no-tabs lingua speak-screen">
      <TopBar title={`${i + 1} / ${queue.length}`} eyebrow={daily ? t('lang.phrasesToday') : t('lang.speak')} onBack={() => navigate(`/lang/${course.id}`, { replace: true })} />
      <Progress value={i} max={queue.length} color="var(--lingua)" height={6} />
      <div className="speak-card">
        <div className="face-meta"><LevelTag level={s.l} />{s.tp && <span>{t(`lang.topic.${s.tp}`)}</span>}</div>
        <div className="speak-source">{s.s}</div>
        <div className="face-q">{t('lang.sayAloud', { lang: course.title })}</div>
        {rec && !shown && (
          <button type="button" className={`mic-btn ${listening ? 'on' : ''}`} onClick={() => { if (listening) { rec.stop(); } else { setHeard(''); setListening(true); rec.start(); } }}>
            <IconMic size={26} /><span>{listening ? t('lang.listening') : t('lang.tapToSpeak')}</span>
          </button>
        )}
        {heard && !shown && <div className="heard">“{heard}”</div>}
        {shown && (
          <div className="speak-answer">
            <div className="hstack" style={{ gap: 8 }}>
              <div className="flex1 speak-target">{score ? score.words.map((x, k) => <span key={k} className={x.ok ? 'w-ok' : 'w-miss'}>{x.w} </span>) : s.t}</div>
              <SpeakButton text={s.t} tag={course.target.tts} rate={course.rate} size={22} />
              <SpeakButton text={s.t} tag={course.target.tts} rate={course.rate * 0.7} size={16} label={t('lang.slow')} />
            </div>
            {score && <div className="small muted">{t('lang.heardScore', { pct: score.pct })} · “{heard}”</div>}
            <div className="small muted">{t('lang.shadowTip')}</div>
          </div>
        )}
      </div>
      <div className="build-actions">
        {!shown ? <Button variant="lingua" full size="lg" onClick={reveal}>{t('lang.reveal')}</Button> : <>
          <Button variant="secondary" className="flex1" onClick={() => grade(false)}>{t('lang.missedSomething')}</Button>
          <Button variant="lingua" className="flex1" onClick={() => grade(true)}>{t('lang.saidIt')}</Button>
        </>}
      </div>
    </Screen>
  );
}
