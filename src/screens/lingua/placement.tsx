// Placement: swipe ~60 words sampled across frequency bands, estimate your passive vocabulary,
// and optionally mark the bands you clearly know as known (they come back later as spot checks).
import { useMemo, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { gradeCard, markKnownCard, placementBands, saveCards, shuffle, wKey, type Band, type LWord } from '../../lib/lingua.js';
import type { LangProgress } from '../../lib/models.js';
import { navigate } from '../../lib/router.js';
import { Button, Progress, Screen, TopBar } from '../../ui/components.js';
import { IconCheck, IconClose } from '../../ui/icons.js';
import { isCtx, SwipeCard, useLingua, type Ctx, type Gate } from './lingua-ui.js';
import { toast } from '../../ui/dialogs.js';

const PER_BAND = 8;
const PASS = 0.75;

export function LinguaPlacementScreen({ cid }: { cid: string }) {
  const ctx = useLingua(cid);
  if (!isCtx(ctx)) return ctx as Gate;
  return <Placement ctx={ctx} />;
}

function Placement({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { course, content, prog } = ctx;
  const ranked = useMemo(() => content.words.filter((w) => !w.user).sort((a, b) => a.rank - b.rank), [content]);
  const bands = useMemo(() => placementBands(ranked.length), [ranked.length]);
  const [sample] = useState<{ w: LWord; band: number }[]>(() => bands.flatMap((b, bi) => shuffle(ranked.slice(b.from, b.to)).slice(0, PER_BAND).map((w) => ({ w, band: bi }))));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [started, setStarted] = useState(false);
  const [applied, setApplied] = useState(false);
  const done = i >= sample.length;

  const answer = (ok: boolean) => {
    const s = sample[i];
    setAnswers((a) => ({ ...a, [s.w.id]: ok }));
    setFlipped(false);
    setI((x) => x + 1);
    const n = sample[i + 1];
    if (n && course.autoSpeak) say(n.w.t, course.target.tts, course.rate);
  };

  const result = useMemo(() => {
    const per = bands.map((b: Band, bi) => {
      const xs = sample.filter((s) => s.band === bi);
      const known = xs.filter((s) => answers[s.w.id]).length;
      return { band: b, pct: xs.length ? known / xs.length : 0 };
    });
    const estimate = Math.round(per.reduce((sum, p) => sum + (p.band.to - p.band.from) * p.pct, 0));
    let upTo = 0;
    for (const p of per) { if (p.pct >= PASS) upTo = p.band.to; else break; }
    return { per, estimate, upTo };
  }, [answers, bands, sample]);

  const apply = async (markBands: boolean) => {
    const rows: LangProgress[] = [];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const unknown = new Set(sample.filter((s) => answers[s.w.id] === false).map((s) => s.w.id));
    const known = new Set(sample.filter((s) => answers[s.w.id]).map((s) => s.w.id));
    if (markBands) for (const w of ranked.slice(0, result.upTo)) if (!unknown.has(w.id)) known.add(w.id);
    for (const id of known) {
      const k = wKey(id, 'r');
      if (prog.get(k)?.state === 'known') continue;
      rows.push(markKnownCard(prog.get(k), course.id, k, todayKey, 14, 90));
    }
    for (const id of unknown) {
      const k = wKey(id, 'r');
      if (!prog.has(k)) rows.push({ ...gradeCard(undefined, course.id, k, false), miss: false, lw: undefined });
    }
    await saveCards(rows);
    setApplied(true);
    toast(t('lang.placementSaved', { n: known.size }));
  };

  if (!started) {
    return (
      <Screen className="screen-no-tabs lingua">
        <TopBar title={t('lang.placement')} eyebrow={course.title} backTo={`/lang/${course.id}`} />
        <div className="card stack">
          <p>{t('lang.placementIntro', { n: sample.length })}</p>
          <p className="small muted">{t('lang.placementHonest')}</p>
        </div>
        <Button variant="lingua" full size="lg" className="mt-lg" onClick={() => { setStarted(true); if (course.autoSpeak && sample[0]) say(sample[0].w.t, course.target.tts, course.rate); }}>{t('lang.start')}</Button>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen className="screen-no-tabs lingua">
        <TopBar title={t('lang.placementResult')} backTo={`/lang/${course.id}`} />
        <div className="card lang-result">
          <div className="result-big">~{result.estimate.toLocaleString()}</div>
          <div className="muted">{t('lang.placementEstimate')}</div>
        </div>
        <div className="card mt">
          {result.per.map((p, k) => (
            <div key={k} className="band-row">
              <span className="small muted band-label">{t('lang.bandLabel', { from: p.band.from + 1, to: p.band.to })}</span>
              <div className="band-bar"><span style={{ width: `${p.pct * 100}%`, background: p.pct >= PASS ? 'var(--meals)' : 'var(--lingua)' }} /></div>
              <span className="small num">{Math.round(p.pct * 100)}%</span>
            </div>
          ))}
        </div>
        {!applied ? (
          <div className="stack mt-lg">
            {result.upTo > 0 && <Button variant="lingua" full onClick={() => apply(true)}>{t('lang.markBands', { n: result.upTo.toLocaleString() })}</Button>}
            <Button variant={result.upTo > 0 ? 'secondary' : 'lingua'} full onClick={() => apply(false)}>{t('lang.markSampleOnly')}</Button>
            <p className="small muted">{t('lang.markBandsHint')}</p>
          </div>
        ) : (
          <Button variant="lingua" full className="mt-lg" onClick={() => navigate(`/lang/${course.id}`, { replace: true })}>{t('lang.toCourse')}</Button>
        )}
      </Screen>
    );
  }

  const s = sample[i];
  return (
    <Screen className="screen-no-tabs lingua cards-screen">
      <TopBar title={`${i + 1} / ${sample.length}`} eyebrow={t('lang.placement')} onBack={() => navigate(`/lang/${course.id}`, { replace: true })} />
      <Progress value={i} max={sample.length} color="var(--lingua)" height={6} />
      <SwipeCard key={s.w.id} showBoth={false} flipped={flipped} onFlip={() => setFlipped((f) => !f)} onAnswer={answer}
        hintLeft={t('lang.dontKnow')} hintRight={t('lang.iKnowIt')}
        front={<><div className="face-word">{s.w.t}</div><div className="face-q">{t('lang.placementQ')}</div></>}
        back={<><div className="face-word small-word">{s.w.t}</div><div className="face-meaning">{s.w.s}</div></>} />
      <div className="card-actions">
        <button type="button" className="round-btn no" aria-label={t('lang.dontKnow')} onClick={() => answer(false)}><IconClose size={26} /></button>
        <button type="button" className="flip-btn" onClick={() => setFlipped((f) => !f)}>{t('lang.checkMeaning')}</button>
        <button type="button" className="round-btn yes" aria-label={t('lang.iKnowIt')} onClick={() => answer(true)}><IconCheck size={26} /></button>
      </div>
    </Screen>
  );
}
