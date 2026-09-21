// JSON backup / restore of the whole database (blobs are base64-encoded).
import { ALL_TABLES, DB_VERSION, bulkPut, clear, getAll, notify, type TableName } from './db.js';
import type { StoredBlob } from './models.js';

export interface BackupFile {
  app: 'forma';
  version: 1;
  /** Schema version of the database that wrote the file (informational; missing tables import as empty). */
  dbVersion?: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

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

export async function exportBackup(): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  for (const t of ALL_TABLES) {
    const rows = await getAll(t);
    if (t === 'blobs') {
      tables[t] = await Promise.all((rows as StoredBlob[]).map(async (b) => ({ id: b.id, type: b.type, name: b.name, data: await blobToBase64(b.blob) })));
    } else {
      tables[t] = rows;
    }
  }
  return { app: 'forma', version: 1, dbVersion: DB_VERSION, exportedAt: new Date().toISOString(), tables };
}

export async function importBackup(file: BackupFile, mode: 'replace' | 'merge'): Promise<void> {
  if (file.app !== 'forma' || !file.tables) throw new Error('Not a Forma backup file');
  for (const t of ALL_TABLES) {
    const rows = (file.tables[t] ?? []) as unknown[];
    if (mode === 'replace') await clear(t);
    if (t === 'blobs') {
      const blobs = (rows as { id: string; type: string; name: string; data: string }[]).map((r) => ({ id: r.id, type: r.type, name: r.name, blob: base64ToBlob(r.data, r.type) }));
      await bulkPut('blobs', blobs);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await bulkPut(t as TableName, rows as any[]);
    }
  }
  notify(...ALL_TABLES);
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function shareOrDownloadJson(name: string, data: unknown): Promise<'shared' | 'downloaded'> {
  const json = JSON.stringify(data);
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: 'Forma backup' });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'shared';
  }
  downloadJson(name, data);
  return 'downloaded';
}
