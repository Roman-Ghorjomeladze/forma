import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { put } from '../../lib/db.js';
import { fmtClock, fmtDuration } from '../../lib/dates.js';
import { expandWorkout, kcalFor } from '../../lib/calories.js';
import { localizedWorkoutName } from '../../data/seed-i18n.js';
import { useBlobUrls, usePrefs, useProfile } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { useLang, useT } from '../../lib/i18n.js';
import type { Session, Step } from '../../lib/models.js';
import { useExerciseMap, useMusicTracks, useWorkout } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { sounds, speak, startMusic, stopMusic, stopSpeaking, unlockAudio } from '../../lib/audio.js';
import { keepAwake } from '../../lib/wakelock.js';
import { Button, Empty, Row, Sheet, Stat, Toggle } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconClose, IconHourglass, IconNext, IconPause, IconPlay, IconPrev, IconVolume } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';

const LEAD_IN = 5;

type Phase = 'ready' | 'running' | 'paused' | 'done';

interface Timing {
  index: number;          // -1 = lead-in
  stepStartedAt: number;  // ms timestamp when the current step started (adjusted for pauses)
  pausedAt: number | null;
  sessionStartedAt: number;
  completedSeconds: number; // sum of seconds of completed steps (actual, incl. skipped portion counted as done)
  completedKcal: number;
  activeSeconds: number;
  cuedSecond: number;      // last second for which a countdown cue fired
  announced: number;       // last step index announced
}

export function PlayerScreen({ id }: { id: string }) {
  const t = useT();
  const lang = useLang();
  const workout = useWorkout(id);
  const exMap = useExerciseMap();
  const [profile] = useProfile();
  const [prefs, setPrefs] = usePrefs();
  const steps = useMemo(() => (workout && exMap ? expandWorkout(workout, exMap, lang) : []), [workout, exMap, lang]);
  const workoutName = workout ? localizedWorkoutName(workout.id, workout.name, lang) : '';

  const [phase, setPhase] = useState<Phase>('ready');
  const [now, setNow] = useState(() => Date.now());
  const t2 = useRef<Timing>({ index: -1, stepStartedAt: 0, pausedAt: null, sessionStartedAt: 0, completedSeconds: 0, completedKcal: 0, activeSeconds: 0, cuedSecond: -1, announced: -2 });
  const [, force] = useState(0);
  const rerender = () => force((x) => x + 1);
  const savedRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [audioSheet, setAudioSheet] = useState(false);

  const weight = profile.weightKg;
  const soundOn = prefs.sound;
  const musicOn = prefs.music;
  const musicTracks = useMusicTracks();
  const playlist = useBlobUrls(useMemo(() => (musicTracks ?? []).map((tr) => tr.blobId), [musicTracks]));

  const audioSheetEl = (
    <Sheet open={audioSheet} onClose={() => setAudioSheet(false)} title={t('player.audioSheetTitle')}>
      <div className="list">
        <div className="settings-row"><span className="l">{t('settings.sounds')}<small>{t('settings.soundsHint')}</small></span><Toggle checked={prefs.sound} onChange={(v) => setPrefs({ sound: v })} /></div>
        <div className="settings-row"><span className="l">{t('settings.voiceCues')}<small>{t('settings.voiceCuesHint')}</small></span><Toggle checked={prefs.voice} onChange={(v) => setPrefs({ voice: v })} /></div>
        <div className="settings-row"><span className="l">{t('settings.music')}<small>{t('settings.musicHint')}</small></span><Toggle checked={prefs.music} onChange={(v) => setPrefs({ music: v })} /></div>
      </div>
      {prefs.music && (
        <div className="small muted" style={{ padding: '10px 4px 0' }}>
          {musicTracks && musicTracks.length > 0 ? t('player.usingYourTracks', { n: musicTracks.length }) : t('player.usingBuiltinBeat')}
          {' '}
          <button style={{ color: 'var(--workout)', fontWeight: 600, textDecoration: 'underline' }} onClick={() => { setAudioSheet(false); navigate('/settings'); }}>{t('player.manageTracksLink')}</button>
        </div>
      )}
    </Sheet>
  );

  const stepAt = (i: number): Step | undefined => steps[i];
  const durationOf = (i: number) => (i < 0 ? LEAD_IN : stepAt(i)?.seconds ?? 0);

  const announce = useCallback((i: number) => {
    const s = stepAt(i);
    if (!s) return;
    if (soundOn) (s.type === 'rest' ? sounds.rest : sounds.go)();
    if (s.type === 'rest') speak(t('player.say.rest', { n: s.seconds }));
    else speak(s.reps ? t('player.say.exerciseReps', { label: s.label, reps: s.reps }) : t('player.say.exerciseSeconds', { label: s.label, n: s.seconds }));
    t2.current.announced = i;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, soundOn, t]);

  const finish = useCallback(async () => {
    if (savedRef.current || !workout) return;
    savedRef.current = true;
    const tm = t2.current;
    const endedAt = Date.now();
    const completed = Math.max(0, Math.min(steps.length, tm.index));
    const s: Session = {
      id: uid('ses'), workoutId: workout.id, workoutName: workout.name, startedAt: tm.sessionStartedAt || endedAt, endedAt,
      kcal: Math.round(tm.completedKcal * 10) / 10, completedSteps: completed, totalSteps: steps.length, activeSeconds: Math.round(tm.activeSeconds),
    };
    setSession(s);
    setPhase('done');
    keepAwake(false);
    stopSpeaking();
    if (soundOn) sounds.done();
    speak(t('player.say.complete'));
    if (completed > 0) await put('sessions', s);
  }, [workout, steps.length, soundOn, t]);

  /** Mark the current step as completed (fully or partially) and move to `next`. */
  const advanceTo = useCallback((next: number, opts: { partial?: boolean } = {}) => {
    const tm = t2.current;
    const cur = tm.index;
    if (cur >= 0) {
      const s = stepAt(cur);
      if (s) {
        const elapsed = opts.partial ? Math.min(s.seconds, (Date.now() - tm.stepStartedAt) / 1000) : s.seconds;
        tm.completedSeconds += elapsed;
        tm.completedKcal += kcalFor(s.met, weight, elapsed);
        if (s.type === 'exercise') tm.activeSeconds += elapsed;
      }
    }
    tm.index = next;
    tm.stepStartedAt = Date.now();
    tm.cuedSecond = -1;
    if (next >= steps.length) { finish(); return; }
    announce(next);
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, weight, announce, finish]);

  // main clock
  useEffect(() => {
    if (phase !== 'running') return;
    const tick = () => {
      const tm = t2.current;
      const nowMs = Date.now();
      setNow(nowMs);
      let remaining = durationOf(tm.index) - (nowMs - tm.stepStartedAt) / 1000;
      // step(s) elapsed (also catches up after backgrounding)
      let guard = 0;
      while (remaining <= 0 && guard++ < 500) {
        const overshoot = -remaining;
        const nextIndex = tm.index + 1;
        if (tm.index >= 0) {
          const s = stepAt(tm.index);
          if (s) { tm.completedSeconds += s.seconds; tm.completedKcal += kcalFor(s.met, weight, s.seconds); if (s.type === 'exercise') tm.activeSeconds += s.seconds; }
        }
        tm.index = nextIndex;
        tm.stepStartedAt = nowMs - overshoot * 1000;
        tm.cuedSecond = -1;
        if (nextIndex >= steps.length) { finish(); return; }
        if (document.visibilityState === 'visible' && overshoot < 2) announce(nextIndex);
        remaining = durationOf(tm.index) - (nowMs - tm.stepStartedAt) / 1000;
        rerender();
      }
      // countdown cues
      const secLeft = Math.ceil(remaining);
      if (secLeft <= prefs.countdownSeconds && secLeft >= 1 && tm.cuedSecond !== secLeft && durationOf(tm.index) > prefs.countdownSeconds) {
        tm.cuedSecond = secLeft;
        if (soundOn) sounds.tick();
        if (tm.index >= 0 || true) speak(t(`player.count.${secLeft}`), { rate: 1.2 });
      }
      const dur = durationOf(tm.index);
      if (tm.index >= 0 && dur >= 40 && Math.abs(remaining - dur / 2) < 0.12 && tm.cuedSecond !== -2) { tm.cuedSecond = -2; if (soundOn) sounds.halfway(); speak(t('player.say.halfway')); }
    };
    tick();
    const idInt = window.setInterval(tick, 100);
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(idInt); document.removeEventListener('visibilitychange', onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, steps, weight, prefs.countdownSeconds, soundOn, t]);

  // Background music tracks the running phase and the music preference; toggling
  // either one starts/stops the loop (restarting from 0 is imperceptible).
  useEffect(() => {
    if (phase === 'running' && musicOn) startMusic(playlist);
    else stopMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, musicOn, playlist.join(',')]);

  useEffect(() => () => { keepAwake(false); stopSpeaking(); stopMusic(); }, []);

  const start = () => {
    unlockAudio();
    const tm = t2.current;
    tm.sessionStartedAt = Date.now();
    tm.index = -1;
    tm.stepStartedAt = Date.now();
    tm.cuedSecond = -1;
    setPhase('running');
    if (prefs.keepAwake) keepAwake(true);
    speak(t('player.say.getReadyFirstUp', { label: steps[0]?.label ?? '' }));
  };
  const pause = () => { t2.current.pausedAt = Date.now(); setPhase('paused'); stopSpeaking(); keepAwake(false); };
  const resume = () => {
    const tm = t2.current;
    if (tm.pausedAt) { tm.stepStartedAt += Date.now() - tm.pausedAt; tm.sessionStartedAt += 0; tm.pausedAt = null; }
    unlockAudio();
    setPhase('running');
    if (prefs.keepAwake) keepAwake(true);
  };
  const skip = () => { unlockAudio(); advanceTo(t2.current.index + 1, { partial: true }); if (phase === 'paused') resume(); };
  const previous = () => {
    const tm = t2.current;
    const elapsed = (Date.now() - tm.stepStartedAt) / 1000;
    if (elapsed > 3 || tm.index <= 0) { tm.stepStartedAt = Date.now(); tm.cuedSecond = -1; rerender(); return; }
    // going back: un-count the previous step
    const prev = stepAt(tm.index - 1);
    if (prev) { tm.completedSeconds -= prev.seconds; tm.completedKcal -= kcalFor(prev.met, weight, prev.seconds); if (prev.type === 'exercise') tm.activeSeconds -= prev.seconds; }
    tm.index -= 1; tm.stepStartedAt = Date.now(); tm.cuedSecond = -1; announce(tm.index); rerender();
  };
  const quit = async () => {
    if (phase === 'ready' || phase === 'done') { navigate(`/forma/workouts/${id}`, { replace: true }); return; }
    const wasRunning = phase === 'running';
    if (wasRunning) pause();
    const ok = await confirmDialog({ title: t('player.endWorkoutTitle'), message: t('player.endWorkoutMsg'), confirmLabel: t('player.end'), cancelLabel: t('player.keepGoing'), danger: true });
    if (ok) { advanceTo(t2.current.index, { partial: true }); t2.current.index = Math.max(0, t2.current.index); finish(); }
    else if (wasRunning) resume();
  };

  if (workout === undefined || !exMap) return <div className="player" />;
  if (workout === null || steps.length === 0) return <div className="player"><Empty title={t('player.nothingToPlay')} text={t('player.noExercisesYet')} action={<Button variant="secondary" onClick={() => navigate('/forma/workouts')}>{t('common.back')}</Button>} /></div>;

  const tm = t2.current;
  const idx = tm.index;
  const step = idx >= 0 ? steps[idx] : undefined;
  const nextStep = steps[idx + 1];
  const dur = durationOf(idx);
  const elapsedMs = phase === 'paused' && tm.pausedAt ? tm.pausedAt - tm.stepStartedAt : now - tm.stepStartedAt;
  const remaining = Math.max(0, dur - elapsedMs / 1000);
  const stepPct = dur > 0 ? Math.min(100, (elapsedMs / 1000 / dur) * 100) : 0;
  const totalSeconds = steps.reduce((a, s) => a + s.seconds, 0);
  const totalKcal = steps.reduce((a, s) => a + kcalFor(s.met, weight, s.seconds), 0);
  const liveKcal = tm.completedKcal + (step ? kcalFor(step.met, weight, Math.min(step.seconds, elapsedMs / 1000)) : 0);
  const sessionElapsed = phase === 'ready' ? 0 : ((phase === 'paused' && tm.pausedAt ? tm.pausedAt : now) - tm.sessionStartedAt) / 1000;
  const exercise = step?.exerciseId ? exMap.get(step.exerciseId) : undefined;

  if (phase === 'done' && session) {
    const pct = Math.round((session.completedSteps / Math.max(1, session.totalSteps)) * 100);
    return (
      <div className="player">
        <div className="player-head"><span /><div className="player-head-mid"><span className="t">{workoutName}</span></div><button className="iconbtn" aria-label={t('player.close')} onClick={() => navigate('/forma/workouts', { replace: true })}><IconClose size={18} /></button></div>
        <div className="player-done">
          <div>
            <div className="player-phase">{pct >= 100 ? t('player.complete') : t('player.pctDone', { pct })}</div>
            <div className="big">{pct >= 100 ? t('player.niceWork') : t('player.goodEffort')}</div>
          </div>
          <div className="stats stats-3">
            <Stat value={fmtClock(Math.round((session.endedAt - session.startedAt) / 1000))} label={t('player.totalTime')} />
            <Stat value={`${Math.round(session.kcal)}`} label={t('player.kcalBurned')} />
            <Stat value={`${session.completedSteps}/${session.totalSteps}`} label={t('player.stepsLabel')} />
          </div>
          <div className="small" style={{ color: '#9A978F' }}>{t('player.activeOfWork', { d: fmtDuration(session.activeSeconds), kg: weight })}</div>
          <Button size="lg" full onClick={() => navigate('/forma', { replace: true })}>{t('common.done')}</Button>
          <Button variant="ghost" full onClick={() => navigate(`/forma/workouts/${id}`, { replace: true })}>{t('player.backToWorkout')}</Button>
        </div>
      </div>
    );
  }

  if (phase === 'ready') {
    return (
      <div className="player">
        <div className="player-head">
          <button className="iconbtn" aria-label={t('player.close')} onClick={quit}><IconClose size={18} /></button>
          <div className="player-head-mid"><span className="t">{workoutName}</span><span className="s">{fmtDuration(totalSeconds)} · {steps.filter((s) => s.type === 'exercise').length} {t('unit.exercises')} · ~{Math.round(totalKcal)} {t('unit.kcal')}</span></div>
          <button className="iconbtn" aria-label={t('player.audioSheetTitle')} onClick={() => setAudioSheet(true)}><IconVolume size={18} off={!soundOn && !prefs.voice && !musicOn} /></button>
        </div>
        <div className="player-ready">
          <div className="player-demo"><ExerciseVisual exercise={steps[0].exerciseId ? exMap.get(steps[0].exerciseId) : undefined} size="player" /></div>
          <div className="list" style={{ maxHeight: '32dvh', overflowY: 'auto' }}>
            {steps.slice(0, 12).map((s) => (
              <Row key={s.index}>
                <div className="row-main"><div className="row-title" style={s.type === 'rest' ? { color: '#9A978F', fontWeight: 500 } : undefined}>{s.label}{s.round && s.type === 'exercise' ? <span style={{ color: '#9A978F' }}> · R{s.round.n}</span> : ''}</div></div>
                <div className="row-right" style={{ color: '#9A978F' }}>{s.reps ? `${s.reps} ${t('unit.reps')}` : `${s.seconds} ${t('unit.s')}`}</div>
              </Row>
            ))}
            {steps.length > 12 && <Row><div className="row-sub">{t('player.andMoreSteps', { n: steps.length - 12 })}</div></Row>}
          </div>
          <Button size="lg" full icon={<IconPlay size={22} />} onClick={start}>{t('today.start')}</Button>
          <div className="small" style={{ color: '#9A978F', textAlign: 'center' }}>{t('player.keepScreenOnHint')}</div>
        </div>
        {audioSheetEl}
      </div>
    );
  }

  const isRest = idx < 0 || step?.type === 'rest';
  return (
    <div className="player">
      <div className="player-head">
        <button className="iconbtn" aria-label={t('player.endWorkout')} onClick={quit}><IconClose size={18} /></button>
        <div className="player-head-mid">
          <span className="t">{workoutName}</span>
          <span className="s">{step?.round ? t('player.roundOf', { n: step.round.n, of: step.round.of }) : ''}{t('player.elapsed', { clock: fmtClock(sessionElapsed) })}</span>
        </div>
        <button className="iconbtn" aria-label={t('player.audioSheetTitle')} onClick={() => setAudioSheet(true)}><IconVolume size={18} off={!soundOn && !prefs.voice && !musicOn} /></button>
      </div>

      <div className="player-progress" aria-hidden="true">
        {steps.map((s, i) => (
          <div key={s.index} className={s.type === 'rest' ? 'rest' : ''}><div style={{ width: i < idx ? '100%' : i === idx ? `${stepPct}%` : '0%' }} /></div>
        ))}
      </div>

      <div className={`player-demo ${isRest ? 'rest' : ''}`}>
        {idx < 0 ? <ExerciseVisual exercise={steps[0].exerciseId ? exMap.get(steps[0].exerciseId) : undefined} size="player" />
          : step?.type === 'rest' ? <IconHourglass size={64} />
          : <ExerciseVisual exercise={exercise} size="player" animated={phase === 'running'} />}
        {step?.type === 'exercise' && exercise?.demo.type === 'builtin' && <span className="player-badge">{t('player.demo')}</span>}
        {phase === 'paused' && <span className="player-badge" style={{ left: 14, right: 'auto', color: '#F3F1EC' }}>{t('player.paused')}</span>}
      </div>

      <div className="player-label">
        <div className={`player-phase ${isRest ? 'rest' : ''}`}>{idx < 0 ? t('player.getReady') : step?.type === 'rest' ? (step.label === 'Round rest' || step.label === t('step.roundRest') ? t('player.roundRestCaps') : t('player.restCaps')) : t('player.workCaps')}</div>
        <div className="player-name">{idx < 0 ? steps[0].label : step?.type === 'rest' ? (nextStep ? t('player.nextLabel', { name: nextStep.label }) : t('player.almostDone')) : step?.label}</div>
        <div className="player-cue">{idx >= 0 && step?.type === 'exercise' ? (step.reps ? t('player.repsWithCue', { reps: step.reps, cue: exercise?.cues[0] ?? '' }) : exercise?.cues[0] ?? '') : idx < 0 ? t('player.startingSoon') : nextStep?.reps ? `${nextStep.reps} ${t('unit.reps')}` : nextStep ? `${nextStep.seconds} ${t('unit.s')}` : ''}</div>
      </div>

      <div className="player-time">
        <div className={`player-clock ${remaining <= prefs.countdownSeconds && !isRest ? 'warn' : ''}`}>{fmtClock(Math.ceil(remaining))}</div>
        <div className="player-kcal">{t('player.kcalSoFar', { n: Math.round(liveKcal), extra: step?.reps ? t('player.tapWhenDone') : '' })}</div>
      </div>

      <div className="player-controls">
        <button className="iconbtn" aria-label={t('player.previous')} onClick={previous}><IconPrev /></button>
        <button className="player-main" aria-label={phase === 'running' ? t('player.pause') : t('player.resume')} onClick={phase === 'running' ? pause : resume}>{phase === 'running' ? <IconPause size={32} /> : <IconPlay size={32} />}</button>
        <button className="iconbtn" aria-label={t('player.next')} onClick={skip}><IconNext /></button>
      </div>

      <div className="player-next">
        <span className="k">{t('player.nextHeader')}</span>
        <span className="sep" />
        <div className="m">
          {nextStep ? <><span className="t">{nextStep.label}</span><span className="s">{nextStep.reps ? `${nextStep.reps} ${t('unit.reps')}` : `${nextStep.seconds} ${t('unit.s')}`}{steps[idx + 2] ? t('player.thenNext', { name: steps[idx + 2].label }) : ''}</span></> : <><span className="t">{t('player.finish')}</span><span className="s">{t('player.lastStep')}</span></>}
        </div>
      </div>
      {audioSheetEl}
    </div>
  );
}
