export const DB_NAME = 'forma';
export const DB_VERSION = 5;
const KEY_PATH = {
    exercises: 'id', workouts: 'id', sessions: 'id', dishes: 'id', mealSlots: 'id', schedule: 'weekday', blobs: 'id', musicTracks: 'id', settings: 'key',
    projects: 'id', categories: 'id', expenses: 'id', trees: 'id', persons: 'id', unions: 'id', quizResults: 'id', noteGroups: 'id', notes: 'id',
};
let dbPromise = null;
export function openDb() {
    if (dbPromise)
        return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            for (const name of Object.keys(KEY_PATH)) {
                if (!db.objectStoreNames.contains(name)) {
                    const store = db.createObjectStore(name, { keyPath: KEY_PATH[name] });
                    if (name === 'mealSlots')
                        store.createIndex('date', 'date');
                    if (name === 'sessions')
                        store.createIndex('startedAt', 'startedAt');
                    if (name === 'expenses')
                        store.createIndex('projectId', 'projectId');
                    if (name === 'persons' || name === 'unions')
                        store.createIndex('treeId', 'treeId');
                    if (name === 'notes')
                        store.createIndex('groupId', 'groupId');
                }
            }
        };
        req.onsuccess = () => {
            const db = req.result;
            db.onversionchange = () => db.close();
            resolve(db);
        };
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
    return dbPromise;
}
const listeners = new Set();
let pending = new Set();
let scheduled = false;
export function notify(...tables) {
    for (const t of tables)
        pending.add(t);
    if (scheduled)
        return;
    scheduled = true;
    queueMicrotask(() => {
        const batch = pending;
        pending = new Set();
        scheduled = false;
        for (const l of listeners)
            l(batch);
    });
}
export function subscribe(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
// ---- generic operations ---------------------------------------------------------------------
function reqToPromise(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
function txDone(tx) {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
    });
}
export async function getAll(table) {
    const db = await openDb();
    return reqToPromise(db.transaction(table, 'readonly').objectStore(table).getAll());
}
export async function get(table, key) {
    const db = await openDb();
    return reqToPromise(db.transaction(table, 'readonly').objectStore(table).get(key));
}
export async function getByIndex(table, index, value) {
    const db = await openDb();
    return reqToPromise(db.transaction(table, 'readonly').objectStore(table).index(index).getAll(value));
}
export async function put(table, row) {
    const db = await openDb();
    const tx = db.transaction(table, 'readwrite');
    tx.objectStore(table).put(row);
    await txDone(tx);
    notify(table);
}
export async function bulkPut(table, rows) {
    if (rows.length === 0)
        return;
    const db = await openDb();
    const tx = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    for (const r of rows)
        store.put(r);
    await txDone(tx);
    notify(table);
}
export async function remove(table, key) {
    const db = await openDb();
    const tx = db.transaction(table, 'readwrite');
    tx.objectStore(table).delete(key);
    await txDone(tx);
    notify(table);
}
export async function bulkRemove(table, keys) {
    if (keys.length === 0)
        return;
    const db = await openDb();
    const tx = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    for (const k of keys)
        store.delete(k);
    await txDone(tx);
    notify(table);
}
export async function clear(table) {
    const db = await openDb();
    const tx = db.transaction(table, 'readwrite');
    tx.objectStore(table).clear();
    await txDone(tx);
    notify(table);
}
export async function count(table) {
    const db = await openDb();
    return reqToPromise(db.transaction(table, 'readonly').objectStore(table).count());
}
export const ALL_TABLES = ['exercises', 'workouts', 'sessions', 'dishes', 'mealSlots', 'schedule', 'blobs', 'musicTracks', 'settings', 'projects', 'categories', 'expenses', 'trees', 'persons', 'unions', 'quizResults', 'noteGroups', 'notes'];
// ---- settings helpers ---------------------------------------------------------------------
export async function getSetting(key, fallback) {
    const row = await get('settings', key);
    return row ? row.value : fallback;
}
export async function setSetting(key, value) {
    await put('settings', { key, value });
}
// ---- blobs --------------------------------------------------------------------------------
export async function saveBlob(blob, name, id) {
    const { uid } = await import('./ids.js');
    const blobId = id ?? uid('blob');
    await put('blobs', { id: blobId, blob, type: blob.type, name });
    return blobId;
}
export async function deleteBlob(blobId) {
    await remove('blobs', blobId);
}
export async function deleteDatabase() {
    const db = await openDb();
    db.close();
    dbPromise = null;
    await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
    });
}
