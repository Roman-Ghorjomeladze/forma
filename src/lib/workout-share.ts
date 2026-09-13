// Export / import of individual workouts (as opposed to the whole-database backup in backup.ts).
//
// A share file is self-contained: besides the workouts it carries every exercise they reference
// (so a recipient without a custom exercise — or with an older exercise library — can still play
// the workout) and the custom demo GIFs of those exercises, base64-encoded. Built-in video demos
// are referenced by file path only; they ship with every copy of the app.
import { bulkPut, get, getAll, notify, put } from './db.js';
import { uid } from './ids.js';
import type { Block, Exercise, StoredBlob, Workout } from './models.js';

export interface SharedBlob { id: string; type: string; name: string; data: string }

export interface WorkoutShareFile {
  app: 'forma';
  kind: 'workouts';
  version: 1;
  exportedAt: string;
  workouts: Workout[];
  exercises: Exercise[];
  blobs: SharedBlob[];
}

export const SHARE_FILE_EXT = '.forma-workouts.json';

// ---- helpers ------------------------------------------------------------------------------
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Every exercise id referenced anywhere in a block tree (groups included). */
export function referencedExerciseIds(blocks: Block[], into = new Set<string>()): Set<string> {
  for (const b of blocks) {
    if (b.type === 'exercise') into.add(b.exerciseId);
    else if (b.type === 'group') referencedExerciseIds(b.blocks, into);
  }
  return into;
}

function slug(s: string): string {
  return s.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 40) || 'workout';
}

// ---- export -------------------------------------------------------------------------------
export async function buildShareFile(workouts: Workout[]): Promise<WorkoutShareFile> {
  const ids = new Set<string>();
  for (const w of workouts) referencedExerciseIds(w.blocks, ids);
  const all = await getAll('exercises');
  const exercises = all.filter((e) => ids.has(e.id));
  const blobs: SharedBlob[] = [];
  for (const e of exercises) {
    if (e.demo.type !== 'blob') continue;
    const row = await get('blobs', e.demo.blobId) as StoredBlob | undefined;
    if (row) blobs.push({ id: row.id, type: row.type, name: row.name, data: await blobToBase64(row.blob) });
  }
  return { app: 'forma', kind: 'workouts', version: 1, exportedAt: new Date().toISOString(), workouts, exercises, blobs };
}

export function shareFileName(workouts: Workout[]): string {
  if (workouts.length === 1) return `${slug(workouts[0].name)}${SHARE_FILE_EXT}`;
  return `${workouts.length}-workouts-${new Date().toISOString().slice(0, 10)}${SHARE_FILE_EXT}`;
}

/** iOS/Android: system share sheet (AirDrop, Messages, WhatsApp, Files…). Elsewhere: download. */
export async function shareWorkouts(workouts: Workout[], title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const data = await buildShareFile(workouts);
  const name = shareFileName(workouts);
  const json = JSON.stringify(data);
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancelled';
    // fall through to a plain download on any other share failure
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}

// ---- import -------------------------------------------------------------------------------
export class ShareParseError extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null; }

function validBlocks(v: unknown): v is Block[] {
  if (!Array.isArray(v)) return false;
  return v.every((b) => isRecord(b) && typeof b.id === 'string' && (
    (b.type === 'exercise' && typeof b.exerciseId === 'string') ||
    (b.type === 'rest' && typeof b.seconds === 'number') ||
    (b.type === 'group' && typeof b.rounds === 'number' && validBlocks(b.blocks))
  ));
}

/** Parse and sanity-check a share file (also accepts a full backup, taking its workouts + exercises). */
export function parseShareFile(text: string): WorkoutShareFile {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new ShareParseError('not json'); }
  if (!isRecord(raw) || raw.app !== 'forma') throw new ShareParseError('not a forma file');

  let workouts: unknown; let exercises: unknown; let blobs: unknown;
  if (raw.kind === 'workouts') {
    ({ workouts, exercises, blobs } = raw);
  } else if (isRecord(raw.tables)) {
    // A whole-app backup: pull just the workout-related tables out of it.
    const t = raw.tables as Record<string, unknown>;
    workouts = t.workouts; exercises = t.exercises; blobs = t.blobs;
  } else {
    throw new ShareParseError('unknown kind');
  }

  const ws = (Array.isArray(workouts) ? workouts : []).filter((w): w is Workout =>
    isRecord(w) && typeof w.id === 'string' && typeof w.name === 'string' && validBlocks(w.blocks));
  if (ws.length === 0) throw new ShareParseError('no workouts');
  const exs = (Array.isArray(exercises) ? exercises : []).filter((e): e is Exercise =>
    isRecord(e) && typeof e.id === 'string' && typeof e.name === 'string' && isRecord(e.demo));
  const bls = (Array.isArray(blobs) ? blobs : []).filter((b): b is SharedBlob =>
    isRecord(b) && typeof b.id === 'string' && typeof b.data === 'string');

  // Only keep exercises/blobs the workouts actually use (matters when reading a full backup).
  const used = new Set<string>();
  for (const w of ws) referencedExerciseIds(w.blocks, used);
  const usedEx = exs.filter((e) => used.has(e.id));
  const usedBlobIds = new Set(usedEx.map((e) => (e.demo.type === 'blob' ? e.demo.blobId : '')));
  const usedBlobs = bls.filter((b) => usedBlobIds.has(b.id));

  return { app: 'forma', kind: 'workouts', version: 1, exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '', workouts: ws, exercises: usedEx, blobs: usedBlobs };
}

export interface ImportPlan {
  file: WorkoutShareFile;
  /** Per workout: does one with the same id already exist here? */
  existing: Set<string>;
  /** Exercises referenced by the file that this device does not have (and will be added). */
  missingExercises: Exercise[];
  /** Exercise ids referenced by the file that neither this device nor the file has. */
  unresolvable: Set<string>;
}

export async function planImport(file: WorkoutShareFile): Promise<ImportPlan> {
  const [localWorkouts, localExercises] = await Promise.all([getAll('workouts'), getAll('exercises')]);
  const localWorkoutIds = new Set(localWorkouts.map((w) => w.id));
  const localExerciseIds = new Set(localExercises.map((e) => e.id));
  const fileExerciseIds = new Set(file.exercises.map((e) => e.id));
  const existing = new Set(file.workouts.filter((w) => localWorkoutIds.has(w.id)).map((w) => w.id));
  const missingExercises = file.exercises.filter((e) => !localExerciseIds.has(e.id));
  const unresolvable = new Set<string>();
  for (const w of file.workouts) for (const id of referencedExerciseIds(w.blocks)) if (!localExerciseIds.has(id) && !fileExerciseIds.has(id)) unresolvable.add(id);
  return { file, existing, missingExercises, unresolvable };
}

function reId(blocks: Block[]): Block[] {
  return blocks.map((b) => (b.type === 'group' ? { ...b, id: uid('b'), blocks: reId(b.blocks) } : { ...b, id: uid('b') }));
}

export interface ImportResult { added: number; updated: number; exercisesAdded: number }

/**
 * Import the chosen workouts. Exercises already on this device are left untouched (the local copy
 * wins); missing ones are added together with their GIFs. A workout whose id already exists is
 * replaced when `mode` is 'update', or stored as a fresh copy when 'copy'.
 */
export async function applyImport(plan: ImportPlan, selectedIds: Set<string>, mode: 'update' | 'copy'): Promise<ImportResult> {
  const chosen = plan.file.workouts.filter((w) => selectedIds.has(w.id));
  if (chosen.length === 0) return { added: 0, updated: 0, exercisesAdded: 0 };

  // exercises needed by the chosen workouts only
  const needed = new Set<string>();
  for (const w of chosen) referencedExerciseIds(w.blocks, needed);
  const localExerciseIds = new Set((await getAll('exercises')).map((e) => e.id));
  const newExercises = plan.file.exercises.filter((e) => needed.has(e.id) && !localExerciseIds.has(e.id));
  const now = Date.now();
  const blobById = new Map(plan.file.blobs.map((b) => [b.id, b]));
  const blobsToSave: StoredBlob[] = [];
  const exercisesToSave: Exercise[] = [];
  for (const e of newExercises) {
    let demo = e.demo;
    if (demo.type === 'blob') {
      const b = blobById.get(demo.blobId);
      if (b) {
        const existingBlob = await get('blobs', b.id);
        if (!existingBlob) blobsToSave.push({ id: b.id, type: b.type, name: b.name, blob: base64ToBlob(b.data, b.type || 'image/gif') });
      } else {
        demo = { type: 'none' }; // GIF missing from the file — keep the exercise, drop the demo
      }
    }
    exercisesToSave.push({ ...e, demo, isCustom: true, createdAt: e.createdAt || now, updatedAt: now });
  }
  await bulkPut('blobs', blobsToSave);
  await bulkPut('exercises', exercisesToSave);

  let added = 0, updated = 0;
  const toSave: Workout[] = [];
  for (const w of chosen) {
    const exists = plan.existing.has(w.id);
    if (exists && mode === 'update') {
      const local = await get('workouts', w.id);
      toSave.push({ ...w, createdAt: local?.createdAt ?? w.createdAt ?? now, updatedAt: now });
      updated++;
    } else {
      toSave.push({ ...w, id: exists ? uid('wo') : w.id, blocks: exists ? reId(w.blocks) : w.blocks, createdAt: now, updatedAt: now });
      added++;
    }
  }
  if (toSave.length === 1) await put('workouts', toSave[0]); else await bulkPut('workouts', toSave);
  notify('workouts', 'exercises', 'blobs');
  return { added, updated, exercisesAdded: exercisesToSave.length };
}
