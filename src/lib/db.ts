// A tiny promise-based IndexedDB layer with change notifications (no dependencies).
import type { Dish, Exercise, MealSlot, MusicTrack, ScheduleEntry, Session, StoredBlob, Workout } from './models.js';

export const DB_NAME = 'forma';
export const DB_VERSION = 2;

export type TableName = 'exercises' | 'workouts' | 'sessions' | 'dishes' | 'mealSlots' | 'schedule' | 'blobs' | 'musicTracks' | 'settings';

interface SettingRow { key: string; value: unknown }

type RowOf<T extends TableName> =
  T extends 'exercises' ? Exercise :
  T extends 'workouts' ? Workout :
  T extends 'sessions' ? Session :
  T extends 'dishes' ? Dish :
  T extends 'mealSlots' ? MealSlot :
  T extends 'schedule' ? ScheduleEntry :
  T extends 'blobs' ? StoredBlob :
  T extends 'musicTracks' ? MusicTrack :
  SettingRow;

const KEY_PATH: Record<TableName, string> = {
  exercises: 'id', workouts: 'id', sessions: 'id', dishes: 'id', mealSlots: 'id', schedule: 'weekday', blobs: 'id', musicTracks: 'id', settings: 'key',
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of Object.keys(KEY_PATH) as TableName[]) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: KEY_PATH[name] });
          if (name === 'mealSlots') store.createIndex('date', 'date');
          if (name === 'sessions') store.createIndex('startedAt', 'startedAt');
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

// ---- change bus ---------------------------------------------------------------------------
type Listener = (tables: Set<TableName>) => void;
const listeners = new Set<Listener>();
let pending = new Set<TableName>();
let scheduled = false;

export function notify(...tables: TableName[]) {
  for (const t of tables) pending.add(t);
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    const batch = pending;
    pending = new Set();
    scheduled = false;
    for (const l of listeners) l(batch);
  });
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// ---- generic operations ---------------------------------------------------------------------
function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
  });
}

export async function getAll<T extends TableName>(table: T): Promise<RowOf<T>[]> {
  const db = await openDb();
  return reqToPromise(db.transaction(table, 'readonly').objectStore(table).getAll()) as Promise<RowOf<T>[]>;
}

export async function get<T extends TableName>(table: T, key: IDBValidKey): Promise<RowOf<T> | undefined> {
  const db = await openDb();
  return reqToPromise(db.transaction(table, 'readonly').objectStore(table).get(key)) as Promise<RowOf<T> | undefined>;
}

export async function getByIndex<T extends TableName>(table: T, index: string, value: IDBValidKey | IDBKeyRange): Promise<RowOf<T>[]> {
  const db = await openDb();
  return reqToPromise(db.transaction(table, 'readonly').objectStore(table).index(index).getAll(value)) as Promise<RowOf<T>[]>;
}

export async function put<T extends TableName>(table: T, row: RowOf<T>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(table, 'readwrite');
  tx.objectStore(table).put(row);
  await txDone(tx);
  notify(table);
}

export async function bulkPut<T extends TableName>(table: T, rows: RowOf<T>[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(table, 'readwrite');
  const store = tx.objectStore(table);
  for (const r of rows) store.put(r);
  await txDone(tx);
  notify(table);
}

export async function remove(table: TableName, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(table, 'readwrite');
  tx.objectStore(table).delete(key);
  await txDone(tx);
  notify(table);
}

export async function bulkRemove(table: TableName, keys: IDBValidKey[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(table, 'readwrite');
  const store = tx.objectStore(table);
  for (const k of keys) store.delete(k);
  await txDone(tx);
  notify(table);
}

export async function clear(table: TableName): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(table, 'readwrite');
  tx.objectStore(table).clear();
  await txDone(tx);
  notify(table);
}

export async function count(table: TableName): Promise<number> {
  const db = await openDb();
  return reqToPromise(db.transaction(table, 'readonly').objectStore(table).count());
}

export const ALL_TABLES: TableName[] = ['exercises', 'workouts', 'sessions', 'dishes', 'mealSlots', 'schedule', 'blobs', 'musicTracks', 'settings'];

// ---- settings helpers ---------------------------------------------------------------------
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await get('settings', key);
  return row ? (row.value as T) : fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await put('settings', { key, value });
}

// ---- blobs --------------------------------------------------------------------------------
export async function saveBlob(blob: Blob, name: string, id?: string): Promise<string> {
  const { uid } = await import('./ids.js');
  const blobId = id ?? uid('blob');
  await put('blobs', { id: blobId, blob, type: blob.type, name });
  return blobId;
}

export async function deleteBlob(blobId: string): Promise<void> {
  await remove('blobs', blobId);
}

export async function deleteDatabase(): Promise<void> {
  const db = await openDb();
  db.close();
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
