import { get, getAll, getByIndex } from './db.js';
import { useLiveQuery } from './hooks.js';
import type { Dish, Exercise, MealSlot, MusicTrack, ScheduleEntry, Session, Workout } from './models.js';

export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(async () => (await getAll('exercises')).sort((a, b) => a.name.localeCompare(b.name)), ['exercises']);
}

export function useExerciseMap(): Map<string, Exercise> | undefined {
  return useLiveQuery(async () => new Map((await getAll('exercises')).map((e) => [e.id, e])), ['exercises']);
}

export function useExercise(id: string | undefined): Exercise | null | undefined {
  return useLiveQuery(async () => (id ? (await get('exercises', id)) ?? null : null), ['exercises'], [id]);
}

export function useWorkouts(): Workout[] | undefined {
  return useLiveQuery(async () => (await getAll('workouts')).sort((a, b) => b.updatedAt - a.updatedAt), ['workouts']);
}

export function useWorkout(id: string | undefined): Workout | null | undefined {
  return useLiveQuery(async () => (id ? (await get('workouts', id)) ?? null : null), ['workouts'], [id]);
}

export function useDishes(): Dish[] | undefined {
  return useLiveQuery(async () => (await getAll('dishes')).sort((a, b) => a.name.localeCompare(b.name)), ['dishes']);
}

export function useDishMap(): Map<string, Dish> | undefined {
  return useLiveQuery(async () => new Map((await getAll('dishes')).map((d) => [d.id, d])), ['dishes']);
}

export function useDish(id: string | undefined): Dish | null | undefined {
  return useLiveQuery(async () => (id ? (await get('dishes', id)) ?? null : null), ['dishes'], [id]);
}

export function useMealSlots(dates: string[]): MealSlot[] | undefined {
  const key = dates.join(',');
  return useLiveQuery(async () => {
    if (dates.length === 0) return [];
    const range = IDBKeyRange.bound(dates[0], dates[dates.length - 1]);
    const rows = await getByIndex('mealSlots', 'date', range);
    return rows.sort((a, b) => a.order - b.order);
  }, ['mealSlots'], [key]);
}

export function useSessions(limit = 200): Session[] | undefined {
  return useLiveQuery(async () => (await getAll('sessions')).sort((a, b) => b.startedAt - a.startedAt).slice(0, limit), ['sessions'], [limit]);
}

export function useSchedule(): ScheduleEntry[] | undefined {
  return useLiveQuery(async () => getAll('schedule'), ['schedule']);
}

export function useMusicTracks(): MusicTrack[] | undefined {
  return useLiveQuery(async () => (await getAll('musicTracks')).sort((a, b) => a.addedAt - b.addedAt), ['musicTracks']);
}
