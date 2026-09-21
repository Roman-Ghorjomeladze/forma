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
export function useMusicTracks() {
    return useLiveQuery(async () => (await getAll('musicTracks')).sort((a, b) => a.addedAt - b.addedAt), ['musicTracks']);
}
// ---- Pocket ---------------------------------------------------------------------------------
export function useProjects() {
    return useLiveQuery(async () => (await getAll('projects')).sort((a, b) => (a.status === b.status ? b.updatedAt - a.updatedAt : a.status === 'active' ? -1 : 1)), ['projects']);
}
export function useProject(id) {
    return useLiveQuery(async () => (id ? (await get('projects', id)) ?? null : null), ['projects'], [id]);
}
export function useCategories() {
    return useLiveQuery(async () => (await getAll('categories')).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)), ['categories']);
}
export function useCategoryMap() {
    return useLiveQuery(async () => new Map((await getAll('categories')).map((c) => [c.id, c])), ['categories']);
}
export function useExpenses(projectId) {
    return useLiveQuery(async () => (projectId ? (await getByIndex('expenses', 'projectId', projectId)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt) : []), ['expenses'], [projectId]);
}
export function useAllExpenses() {
    return useLiveQuery(async () => (await getAll('expenses')).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), ['expenses']);
}
export function useExpense(id) {
    return useLiveQuery(async () => (id ? (await get('expenses', id)) ?? null : null), ['expenses'], [id]);
}
// ---- Family tree ----------------------------------------------------------------------------
export function useTrees() {
    return useLiveQuery(async () => (await getAll('trees')).sort((a, b) => b.updatedAt - a.updatedAt), ['trees']);
}
export function useTree(id) {
    return useLiveQuery(async () => (id ? (await get('trees', id)) ?? null : null), ['trees'], [id]);
}
export function usePersons(treeId) {
    return useLiveQuery(async () => (treeId ? getByIndex('persons', 'treeId', treeId) : []), ['persons'], [treeId]);
}
export function useAllPersons() {
    return useLiveQuery(async () => getAll('persons'), ['persons']);
}
export function useUnions(treeId) {
    return useLiveQuery(async () => (treeId ? getByIndex('unions', 'treeId', treeId) : []), ['unions'], [treeId]);
}
export function usePerson(id) {
    return useLiveQuery(async () => (id ? (await get('persons', id)) ?? null : null), ['persons'], [id]);
}
export function useAllUnions() {
    return useLiveQuery(async () => getAll('unions'), ['unions']);
}
export function useQuizResults() {
    return useLiveQuery(async () => (await getAll('quizResults')).sort((a, b) => b.playedAt - a.playedAt), ['quizResults']);
}
// ---- Notes ----------------------------------------------------------------------------------
export function useNoteGroups() {
    return useLiveQuery(async () => (await getAll('noteGroups')).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt), ['noteGroups']);
}
export function useNoteGroup(id) {
    return useLiveQuery(async () => (id ? (await get('noteGroups', id)) ?? null : null), ['noteGroups'], [id]);
}
/** Pinned first, then most recently edited. */
export function sortNotes(rows) {
    return rows.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}
export function useAllNotes() {
    return useLiveQuery(async () => sortNotes(await getAll('notes')), ['notes']);
}
export function useNotesInGroup(groupId) {
    return useLiveQuery(async () => (groupId ? sortNotes(await getByIndex('notes', 'groupId', groupId)) : []), ['notes'], [groupId]);
}
export function useNote(id) {
    return useLiveQuery(async () => (id ? (await get('notes', id)) ?? null : null), ['notes'], [id]);
}
// ---- Meds -----------------------------------------------------------------------------------
const STATUS_ORDER = { active: 0, paused: 1, done: 2 };
export function useMedications() {
    return useLiveQuery(async () => (await getAll('medications')).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.createdAt - b.createdAt), ['medications']);
}
export function useMedication(id) {
    return useLiveQuery(async () => (id ? (await get('medications', id)) ?? null : null), ['medications'], [id]);
}
export function useDoseLogs(date) {
    return useLiveQuery(async () => getByIndex('doseLogs', 'date', date), ['doseLogs'], [date]);
}
export function useDoseLogsInRange(from, to) {
    return useLiveQuery(async () => getByIndex('doseLogs', 'date', IDBKeyRange.bound(from, to)), ['doseLogs'], [from, to]);
}
export function useMedLogs(medId) {
    return useLiveQuery(async () => (medId ? (await getByIndex('doseLogs', 'medId', medId)).sort((a, b) => b.at - a.at) : []), ['doseLogs'], [medId]);
}
