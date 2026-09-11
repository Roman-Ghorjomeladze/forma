import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { put } from '../../lib/db.js';
import { fmtClock, fmtDuration } from '../../lib/dates.js';
import { expandWorkout, kcalFor } from '../../lib/calories.js';
import { localizedWorkoutName } from '../../data/seed-i18n.js';
import { usePrefs, useProfile } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { useLang, useT } from '../../lib/i18n.js';
import { useExerciseMap, useWorkout } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { sounds, speak, stopSpeaking, unlockAudio } from '../../lib/audio.js';
import { keepAwake } from '../../lib/wakelock.js';
import { Button, Empty, Row, Stat } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconClose, IconHourglass, IconNext, IconPause, IconPlay, IconPrev, IconVolume } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';
const LEAD_IN = 5;
export function PlayerScreen({ id }) {
    const t = useT();
    const lang = useLang();
    const workout = useWorkout(id);
    const exMap = useExerciseMap();
    const [profile] = useProfile();
    const [prefs, setPrefs] = usePrefs();
    const steps = useMemo(() => (workout && exMap ? expandWorkout(workout, exMap, lang) : []), [workout, exMap, lang]);
    const workoutName = workout ? localizedWorkoutName(workout.id, workout.name, lang) : '';
    const [phase, setPhase] = useState('ready');
    const [now, setNow] = useState(() => Date.now());
    const t2 = useRef({ index: -1, stepStartedAt: 0, pausedAt: null, sessionStartedAt: 0, completedSeconds: 0, completedKcal: 0, activeSeconds: 0, cuedSecond: -1, announced: -2 });
    const [, force] = useState(0);
    const rerender = () => force((x) => x + 1);
    const savedRef = useRef(false);
    const [session, setSession] = useState(null);
    const weight = profile.weightKg;
    const soundOn = prefs.sound;
    const stepAt = (i) => steps[i];
    const durationOf = (i) => (i < 0 ? LEAD_IN : stepAt(i)?.seconds ?? 0);
    const announce = useCallback((i) => {
        const s = stepAt(i);
        if (!s)
            return;
        if (soundOn)
            (s.type === 'rest' ? sounds.rest : sounds.go)();
        if (s.type === 'rest')
            speak(t('player.say.rest', { n: s.seconds }));
        else
            speak(s.reps ? t('player.say.exerciseReps', { label: s.label, reps: s.reps }) : t('player.say.exerciseSeconds', { label: s.label, n: s.seconds }));
        t2.current.announced = i;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [steps, soundOn, t]);
    const finish = useCallback(async () => {
        if (savedRef.current || !workout)
            return;
        savedRef.current = true;
        const tm = t2.current;
        const endedAt = Date.now();
        const completed = Math.max(0, Math.min(steps.length, tm.index));
        const s = {
            id: uid('ses'), workoutId: workout.id, workoutName: workout.name, startedAt: tm.sessionStartedAt || endedAt, endedAt,
            kcal: Math.round(tm.completedKcal * 10) / 10, completedSteps: completed, totalSteps: steps.length, activeSeconds: Math.round(tm.activeSeconds),
        };
        setSession(s);
        setPhase('done');
        keepAwake(false);
        stopSpeaking();
        if (soundOn)
            sounds.done();
        speak(t('player.say.complete'));
        if (completed > 0)
            await put('sessions', s);
    }, [workout, steps.length, soundOn, t]);
    /** Mark the current step as completed (fully or partially) and move to `next`. */
    const advanceTo = useCallback((next, opts = {}) => {
        const tm = t2.current;
        const cur = tm.index;
        if (cur >= 0) {
            const s = stepAt(cur);
            if (s) {
                const elapsed = opts.partial ? Math.min(s.seconds, (Date.now() - tm.stepStartedAt) / 1000) : s.seconds;
                tm.completedSeconds += elapsed;
                tm.completedKcal += kcalFor(s.met, weight, elapsed);
                if (s.type === 'exercise')
                    tm.activeSeconds += elapsed;
            }
        }
        tm.index = next;
        tm.stepStartedAt = Date.now();
        tm.cuedSecond = -1;
        if (next >= steps.length) {
            finish();
            return;
        }
        announce(next);
        rerender();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [steps, weight, announce, finish]);
    // main clock
    useEffect(() => {
        if (phase !== 'running')
            return;
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
                    if (s) {
                        tm.completedSeconds += s.seconds;
                        tm.completedKcal += kcalFor(s.met, weight, s.seconds);
                        if (s.type === 'exercise')
                            tm.activeSeconds += s.seconds;
                    }
                }
                tm.index = nextIndex;
                tm.stepStartedAt = nowMs - overshoot * 1000;
                tm.cuedSecond = -1;
                if (nextIndex >= steps.length) {
                    finish();
                    return;
                }
                if (document.visibilityState === 'visible' && overshoot < 2)
                    announce(nextIndex);
                remaining = durationOf(tm.index) - (nowMs - tm.stepStartedAt) / 1000;
                rerender();
            }
            // countdown cues
            const secLeft = Math.ceil(remaining);
            if (secLeft <= prefs.countdownSeconds && secLeft >= 1 && tm.cuedSecond !== secLeft && durationOf(tm.index) > prefs.countdownSeconds) {
                tm.cuedSecond = secLeft;
                if (soundOn)
                    sounds.tick();
                if (tm.index >= 0 || true)
                    speak(String(secLeft), { rate: 1.2 });
            }
            const dur = durationOf(tm.index);
            if (tm.index >= 0 && dur >= 40 && Math.abs(remaining - dur / 2) < 0.12 && tm.cuedSecond !== -2) {
                tm.cuedSecond = -2;
                if (soundOn)
                    sounds.halfway();
                speak(t('player.say.halfway'));
            }
        };
        tick();
        const idInt = window.setInterval(tick, 100);
        const onVis = () => { if (document.visibilityState === 'visible')
            tick(); };
        document.addEventListener('visibilitychange', onVis);
        return () => { window.clearInterval(idInt); document.removeEventListener('visibilitychange', onVis); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, steps, weight, prefs.countdownSeconds, soundOn, t]);
    useEffect(() => () => { keepAwake(false); stopSpeaking(); }, []);
    const start = () => {
        unlockAudio();
        const tm = t2.current;
        tm.sessionStartedAt = Date.now();
        tm.index = -1;
        tm.stepStartedAt = Date.now();
        tm.cuedSecond = -1;
        setPhase('running');
        if (prefs.keepAwake)
            keepAwake(true);
        speak(t('player.say.getReadyFirstUp', { label: steps[0]?.label ?? '' }));
    };
    const pause = () => { t2.current.pausedAt = Date.now(); setPhase('paused'); stopSpeaking(); keepAwake(false); };
    const resume = () => {
        const tm = t2.current;
        if (tm.pausedAt) {
            tm.stepStartedAt += Date.now() - tm.pausedAt;
            tm.sessionStartedAt += 0;
            tm.pausedAt = null;
        }
        unlockAudio();
        setPhase('running');
        if (prefs.keepAwake)
            keepAwake(true);
    };
    const skip = () => { unlockAudio(); advanceTo(t2.current.index + 1, { partial: true }); if (phase === 'paused')
        resume(); };
    const previous = () => {
        const tm = t2.current;
        const elapsed = (Date.now() - tm.stepStartedAt) / 1000;
        if (elapsed > 3 || tm.index <= 0) {
            tm.stepStartedAt = Date.now();
            tm.cuedSecond = -1;
            rerender();
            return;
        }
        // going back: un-count the previous step
        const prev = stepAt(tm.index - 1);
        if (prev) {
            tm.completedSeconds -= prev.seconds;
            tm.completedKcal -= kcalFor(prev.met, weight, prev.seconds);
            if (prev.type === 'exercise')
                tm.activeSeconds -= prev.seconds;
        }
        tm.index -= 1;
        tm.stepStartedAt = Date.now();
        tm.cuedSecond = -1;
        announce(tm.index);
        rerender();
    };
    const quit = async () => {
        if (phase === 'ready' || phase === 'done') {
            navigate(`/workouts/${id}`, { replace: true });
            return;
        }
        const wasRunning = phase === 'running';
        if (wasRunning)
            pause();
        const ok = await confirmDialog({ title: t('player.endWorkoutTitle'), message: t('player.endWorkoutMsg'), confirmLabel: t('player.end'), cancelLabel: t('player.keepGoing'), danger: true });
        if (ok) {
            advanceTo(t2.current.index, { partial: true });
            t2.current.index = Math.max(0, t2.current.index);
            finish();
        }
        else if (wasRunning)
            resume();
    };
    if (workout === undefined || !exMap)
        return _jsx("div", { className: "player" });
    if (workout === null || steps.length === 0)
        return _jsx("div", { className: "player", children: _jsx(Empty, { title: t('player.nothingToPlay'), text: t('player.noExercisesYet'), action: _jsx(Button, { variant: "secondary", onClick: () => navigate('/workouts'), children: t('common.back') }) }) });
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
        return (_jsxs("div", { className: "player", children: [_jsxs("div", { className: "player-head", children: [_jsx("span", {}), _jsx("div", { className: "player-head-mid", children: _jsx("span", { className: "t", children: workoutName }) }), _jsx("button", { className: "iconbtn", "aria-label": t('player.close'), onClick: () => navigate('/workouts', { replace: true }), children: _jsx(IconClose, { size: 18 }) })] }), _jsxs("div", { className: "player-done", children: [_jsxs("div", { children: [_jsx("div", { className: "player-phase", children: pct >= 100 ? t('player.complete') : t('player.pctDone', { pct }) }), _jsx("div", { className: "big", children: pct >= 100 ? t('player.niceWork') : t('player.goodEffort') })] }), _jsxs("div", { className: "stats stats-3", children: [_jsx(Stat, { value: fmtClock(Math.round((session.endedAt - session.startedAt) / 1000)), label: t('player.totalTime') }), _jsx(Stat, { value: `${Math.round(session.kcal)}`, label: t('player.kcalBurned') }), _jsx(Stat, { value: `${session.completedSteps}/${session.totalSteps}`, label: t('player.stepsLabel') })] }), _jsx("div", { className: "small", style: { color: '#9A978F' }, children: t('player.activeOfWork', { d: fmtDuration(session.activeSeconds), kg: weight }) }), _jsx(Button, { size: "lg", full: true, onClick: () => navigate('/', { replace: true }), children: t('common.done') }), _jsx(Button, { variant: "ghost", full: true, onClick: () => navigate(`/workouts/${id}`, { replace: true }), children: t('player.backToWorkout') })] })] }));
    }
    if (phase === 'ready') {
        return (_jsxs("div", { className: "player", children: [_jsxs("div", { className: "player-head", children: [_jsx("button", { className: "iconbtn", "aria-label": t('player.close'), onClick: quit, children: _jsx(IconClose, { size: 18 }) }), _jsxs("div", { className: "player-head-mid", children: [_jsx("span", { className: "t", children: workoutName }), _jsxs("span", { className: "s", children: [fmtDuration(totalSeconds), " \u00B7 ", steps.filter((s) => s.type === 'exercise').length, " ", t('unit.exercises'), " \u00B7 ~", Math.round(totalKcal), " ", t('unit.kcal')] })] }), _jsx("button", { className: "iconbtn", "aria-label": soundOn ? t('common.mute') : t('common.unmute'), onClick: () => setPrefs({ sound: !soundOn, voice: !soundOn }), children: _jsx(IconVolume, { size: 18, off: !soundOn }) })] }), _jsxs("div", { className: "player-ready", children: [_jsx("div", { className: "player-demo", children: _jsx(ExerciseVisual, { exercise: steps[0].exerciseId ? exMap.get(steps[0].exerciseId) : undefined, size: "player" }) }), _jsxs("div", { className: "list", style: { maxHeight: '32dvh', overflowY: 'auto' }, children: [steps.slice(0, 12).map((s) => (_jsxs(Row, { children: [_jsx("div", { className: "row-main", children: _jsxs("div", { className: "row-title", style: s.type === 'rest' ? { color: '#9A978F', fontWeight: 500 } : undefined, children: [s.label, s.round && s.type === 'exercise' ? _jsxs("span", { style: { color: '#9A978F' }, children: [" \u00B7 R", s.round.n] }) : ''] }) }), _jsx("div", { className: "row-right", style: { color: '#9A978F' }, children: s.reps ? `${s.reps} ${t('unit.reps')}` : `${s.seconds} ${t('unit.s')}` })] }, s.index))), steps.length > 12 && _jsx(Row, { children: _jsx("div", { className: "row-sub", children: t('player.andMoreSteps', { n: steps.length - 12 }) }) })] }), _jsx(Button, { size: "lg", full: true, icon: _jsx(IconPlay, { size: 22 }), onClick: start, children: t('today.start') }), _jsx("div", { className: "small", style: { color: '#9A978F', textAlign: 'center' }, children: t('player.keepScreenOnHint') })] })] }));
    }
    const isRest = idx < 0 || step?.type === 'rest';
    return (_jsxs("div", { className: "player", children: [_jsxs("div", { className: "player-head", children: [_jsx("button", { className: "iconbtn", "aria-label": t('player.endWorkout'), onClick: quit, children: _jsx(IconClose, { size: 18 }) }), _jsxs("div", { className: "player-head-mid", children: [_jsx("span", { className: "t", children: workoutName }), _jsxs("span", { className: "s", children: [step?.round ? t('player.roundOf', { n: step.round.n, of: step.round.of }) : '', t('player.elapsed', { clock: fmtClock(sessionElapsed) })] })] }), _jsx("button", { className: "iconbtn", "aria-label": soundOn ? t('common.mute') : t('common.unmute'), onClick: () => setPrefs({ sound: !soundOn, voice: !soundOn }), children: _jsx(IconVolume, { size: 18, off: !soundOn }) })] }), _jsx("div", { className: "player-progress", "aria-hidden": "true", children: steps.map((s, i) => (_jsx("div", { className: s.type === 'rest' ? 'rest' : '', children: _jsx("div", { style: { width: i < idx ? '100%' : i === idx ? `${stepPct}%` : '0%' } }) }, s.index))) }), _jsxs("div", { className: `player-demo ${isRest ? 'rest' : ''}`, children: [idx < 0 ? _jsx(ExerciseVisual, { exercise: steps[0].exerciseId ? exMap.get(steps[0].exerciseId) : undefined, size: "player" })
                        : step?.type === 'rest' ? _jsx(IconHourglass, { size: 64 })
                            : _jsx(ExerciseVisual, { exercise: exercise, size: "player", animated: phase === 'running' }), step?.type === 'exercise' && exercise?.demo.type === 'builtin' && _jsx("span", { className: "player-badge", children: t('player.demo') }), phase === 'paused' && _jsx("span", { className: "player-badge", style: { left: 14, right: 'auto', color: '#F3F1EC' }, children: t('player.paused') })] }), _jsxs("div", { className: "player-label", children: [_jsx("div", { className: `player-phase ${isRest ? 'rest' : ''}`, children: idx < 0 ? t('player.getReady') : step?.type === 'rest' ? (step.label === 'Round rest' || step.label === t('step.roundRest') ? t('player.roundRestCaps') : t('player.restCaps')) : t('player.workCaps') }), _jsx("div", { className: "player-name", children: idx < 0 ? steps[0].label : step?.type === 'rest' ? (nextStep ? t('player.nextLabel', { name: nextStep.label }) : t('player.almostDone')) : step?.label }), _jsx("div", { className: "player-cue", children: idx >= 0 && step?.type === 'exercise' ? (step.reps ? t('player.repsWithCue', { reps: step.reps, cue: exercise?.cues[0] ?? '' }) : exercise?.cues[0] ?? '') : idx < 0 ? t('player.startingSoon') : nextStep?.reps ? `${nextStep.reps} ${t('unit.reps')}` : nextStep ? `${nextStep.seconds} ${t('unit.s')}` : '' })] }), _jsxs("div", { className: "player-time", children: [_jsx("div", { className: `player-clock ${remaining <= prefs.countdownSeconds && !isRest ? 'warn' : ''}`, children: fmtClock(Math.ceil(remaining)) }), _jsx("div", { className: "player-kcal", children: t('player.kcalSoFar', { n: Math.round(liveKcal), extra: step?.reps ? t('player.tapWhenDone') : '' }) })] }), _jsxs("div", { className: "player-controls", children: [_jsx("button", { className: "iconbtn", "aria-label": t('player.previous'), onClick: previous, children: _jsx(IconPrev, {}) }), _jsx("button", { className: "player-main", "aria-label": phase === 'running' ? t('player.pause') : t('player.resume'), onClick: phase === 'running' ? pause : resume, children: phase === 'running' ? _jsx(IconPause, { size: 32 }) : _jsx(IconPlay, { size: 32 }) }), _jsx("button", { className: "iconbtn", "aria-label": t('player.next'), onClick: skip, children: _jsx(IconNext, {}) })] }), _jsxs("div", { className: "player-next", children: [_jsx("span", { className: "k", children: t('player.nextHeader') }), _jsx("span", { className: "sep" }), _jsx("div", { className: "m", children: nextStep ? _jsxs(_Fragment, { children: [_jsx("span", { className: "t", children: nextStep.label }), _jsxs("span", { className: "s", children: [nextStep.reps ? `${nextStep.reps} ${t('unit.reps')}` : `${nextStep.seconds} ${t('unit.s')}`, steps[idx + 2] ? t('player.thenNext', { name: steps[idx + 2].label }) : ''] })] }) : _jsxs(_Fragment, { children: [_jsx("span", { className: "t", children: t('player.finish') }), _jsx("span", { className: "s", children: t('player.lastStep') })] }) })] })] }));
}
