import type { Block, Exercise, Step, Workout } from './models.js';

export const REST_MET = 1.3;

/** kcal burned for `seconds` at a given MET and body weight. */
export function kcalFor(met: number, weightKg: number, seconds: number): number {
  return (met * weightKg * seconds) / 3600;
}

export function blockSeconds(block: Block, ex: Map<string, Exercise>): number {
  if (block.type === 'rest') return block.seconds;
  if (block.type === 'exercise') {
    const e = ex.get(block.exerciseId);
    if (block.seconds != null) return block.seconds;
    if (block.reps != null) return Math.round(block.reps * (e?.secPerRep ?? 3));
    return e ? (e.kind === 'time' ? e.defaultAmount : Math.round(e.defaultAmount * e.secPerRep)) : 30;
  }
  const inner = block.blocks.reduce((s, b) => s + blockSeconds(b, ex), 0);
  return inner * block.rounds + block.restBetweenRounds * Math.max(0, block.rounds - 1);
}

/** Unroll groups into a flat list of timed steps. */
export function expandWorkout(workout: Workout, ex: Map<string, Exercise>): Step[] {
  const steps: Step[] = [];
  const push = (s: Omit<Step, 'index'>) => steps.push({ ...s, index: steps.length });

  const walk = (blocks: Block[], round?: Step['round']) => {
    for (const b of blocks) {
      if (b.type === 'rest') {
        push({ type: 'rest', label: 'Rest', seconds: b.seconds, met: REST_MET, round });
      } else if (b.type === 'exercise') {
        const e = ex.get(b.exerciseId);
        const seconds = blockSeconds(b, ex);
        const reps = b.reps ?? (b.seconds == null && e?.kind === 'reps' ? e.defaultAmount : undefined);
        push({ type: 'exercise', label: e?.name ?? 'Exercise', seconds, reps, exerciseId: b.exerciseId, met: e?.met ?? 4, round });
      } else {
        for (let r = 1; r <= b.rounds; r++) {
          walk(b.blocks, { n: r, of: b.rounds, name: b.name });
          if (r < b.rounds && b.restBetweenRounds > 0) {
            push({ type: 'rest', label: 'Round rest', seconds: b.restBetweenRounds, met: REST_MET, round: { n: r, of: b.rounds, name: b.name } });
          }
        }
      }
    }
  };
  walk(workout.blocks);
  return steps;
}

export interface WorkoutEstimate { seconds: number; activeSeconds: number; kcal: number; steps: number; exercises: number }

export function estimateWorkout(workout: Workout, ex: Map<string, Exercise>, weightKg: number): WorkoutEstimate {
  const steps = expandWorkout(workout, ex);
  let seconds = 0, active = 0, kcal = 0, exercises = 0;
  for (const s of steps) {
    seconds += s.seconds;
    kcal += kcalFor(s.met, weightKg, s.seconds);
    if (s.type === 'exercise') { active += s.seconds; exercises++; }
  }
  return { seconds, activeSeconds: active, kcal, steps: steps.length, exercises };
}

/** Mifflin-St Jeor resting energy, times a light-activity factor, for a target suggestion. */
export function suggestDailyKcal(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female', goal: 'lose' | 'maintain' | 'gain' = 'maintain'): number {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const tdee = bmr * 1.45;
  const adj = goal === 'lose' ? -400 : goal === 'gain' ? 300 : 0;
  return Math.round((tdee + adj) / 10) * 10;
}
