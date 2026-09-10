import { get, getAll, getByIndex } from './db.js';
import { useLiveQuery } from './hooks.js';
export function useExercises() {
    return useLiveQuery(async () => (await getAll('exercises')).sort((a, b) => a.name.localeCompare(b.name)), ['exercises']);
}
export function useExerciseMap() {
    return useLiveQuery(async () => new Map((await getAll('exercises')).map((e) => [e.id, e])), ['exercises']);
}
export function useExercise(id) {
    return useLiveQuery(async () => (id ? (await get('exercises', id)) ?? null : null), ['exercises'], [id]);
}
export function useWorkouts() {
    return useLiveQuery(async () => (await getAll('workouts')).sort((a, b) => b.updatedAt - a.updatedAt), ['workouts']);
}
export function useWorkout(id) {
    return useLiveQuery(async () => (id ? (await get('workouts', id)) ?? null : null), ['workouts'], [id]);
}
export function useDishes() {
    return useLiveQuery(async () => (await getAll('dishes')).sort((a, b) => a.name.localeCompare(b.name)), ['dishes']);
}
export function useDishMap() {
    return useLiveQuery(async () => new Map((await getAll('dishes')).map((d) => [d.id, d])), ['dishes']);
}
export function useDish(id) {
    return useLiveQuery(async () => (id ? (await get('dishes', id)) ?? null : null), ['dishes'], [id]);
}
export function useMealSlots(dates) {
    const key = dates.join(',');
    return useLiveQuery(async () => {
        if (dates.length === 0)
            return [];
        const range = IDBKeyRange.bound(dates[0], dates[dates.length - 1]);
        const rows = await getByIndex('mealSlots', 'date', range);
        return rows.sort((a, b) => a.order - b.order);
    }, ['mealSlots'], [key]);
}
export function useSessions(limit = 200) {
    return useLiveQuery(async () => (await getAll('sessions')).sort((a, b) => b.startedAt - a.startedAt).slice(0, limit), ['sessions'], [limit]);
}
export function useSchedule() {
    return useLiveQuery(async () => getAll('schedule'), ['schedule']);
}
