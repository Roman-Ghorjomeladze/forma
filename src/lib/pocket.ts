// Pocket helpers: default categories, money formatting, totals and CSV export.
import { bulkPut, count, getAll, put, bulkRemove, getByIndex, remove } from './db.js';
import { uid } from './ids.js';
import { tGlobal } from './i18n.js';
import type { Category, Expense, Project } from './models.js';

export const OTHER_CATEGORY_ID = 'cat_other';

const DEFAULT_CATEGORIES: Omit<Category, 'createdAt'>[] = [
  { id: 'cat_materials', name: 'Materials', color: '#E39A1C', icon: 'box', order: 0 },
  { id: 'cat_labor', name: 'Labor', color: '#4C8BF5', icon: 'wrench', order: 1 },
  { id: 'cat_furniture', name: 'Furniture', color: '#B76DE0', icon: 'sofa', order: 2 },
  { id: 'cat_tools', name: 'Tools', color: '#2FAF6E', icon: 'hammer', order: 3 },
  { id: 'cat_transport', name: 'Transport', color: '#1FA8A8', icon: 'truck', order: 4 },
  { id: OTHER_CATEGORY_ID, name: 'Other', color: '#9A978F', icon: 'tag', order: 5 },
];

const SEED_KEY_BY_ID: Record<string, string> = {
  cat_materials: 'pocket.cat.materials', cat_labor: 'pocket.cat.labor', cat_furniture: 'pocket.cat.furniture',
  cat_tools: 'pocket.cat.tools', cat_transport: 'pocket.cat.transport', cat_other: 'pocket.cat.other',
};

/** Seeded categories keep their English name in the DB; show the localized one unless the user renamed it. */
export function categoryName(c: Category): string {
  const key = SEED_KEY_BY_ID[c.id];
  if (key && c.name === DEFAULT_CATEGORIES.find((d) => d.id === c.id)?.name) return tGlobal(key);
  return c.name;
}

export async function seedCategoriesIfEmpty(): Promise<void> {
  if ((await count('categories')) > 0) return;
  const now = Date.now();
  await bulkPut('categories', DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: now })));
}

/** Makes sure the fallback "Other" category exists (used when a category is deleted). */
export async function ensureOtherCategory(): Promise<Category> {
  const all = await getAll('categories');
  const found = all.find((c) => c.id === OTHER_CATEGORY_ID);
  if (found) return found;
  const c: Category = { ...DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1], order: all.length, createdAt: Date.now() };
  await put('categories', c);
  return c;
}

export async function deleteCategory(id: string): Promise<void> {
  const other = await ensureOtherCategory();
  if (id === other.id) return;
  const all = await getAll('expenses');
  const moved = all.filter((e) => e.categoryId === id).map((e) => ({ ...e, categoryId: other.id, updatedAt: Date.now() }));
  await bulkPut('expenses', moved);
  await remove('categories', id);
}

export async function deleteProject(id: string): Promise<void> {
  const rows = await getByIndex('expenses', 'projectId', id);
  await bulkRemove('expenses', rows.map((r) => r.id));
  await remove('projects', id);
}

export function newProject(partial: Partial<Project> = {}): Project {
  const now = Date.now();
  return { id: uid('prj'), name: '', notes: '', categoryBudgets: {}, status: 'active', startDate: new Date().toISOString().slice(0, 10), createdAt: now, updatedAt: now, ...partial };
}

export function newExpense(projectId: string, categoryId: string, partial: Partial<Expense> = {}): Expense {
  const now = Date.now();
  return { id: uid('exp'), projectId, categoryId, title: '', amount: 0, date: new Date().toISOString().slice(0, 10), note: '', createdAt: now, updatedAt: now, ...partial };
}

// ---- money ----------------------------------------------------------------------------------
export function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: Number.isInteger(abs) ? 0 : 2 });
  return n < 0 ? `−${s}` : s;
}

export function fmtLari(n: number): string { return `₾${fmtMoney(n)}`; }

// ---- totals ---------------------------------------------------------------------------------
export function sum(rows: Expense[]): number { return rows.reduce((a, e) => a + e.amount, 0); }

export interface CategoryTotal { categoryId: string; total: number; count: number; pct: number }

export function totalsByCategory(rows: Expense[]): CategoryTotal[] {
  const m = new Map<string, CategoryTotal>();
  for (const e of rows) {
    const t = m.get(e.categoryId) ?? { categoryId: e.categoryId, total: 0, count: 0, pct: 0 };
    t.total += e.amount; t.count++;
    m.set(e.categoryId, t);
  }
  const total = sum(rows);
  return [...m.values()].map((t) => ({ ...t, pct: total > 0 ? (t.total / total) * 100 : 0 })).sort((a, b) => b.total - a.total);
}

export function groupByMonth(rows: Expense[]): { month: string; rows: Expense[]; total: number }[] {
  const m = new Map<string, Expense[]>();
  for (const e of rows) {
    const k = e.date.slice(0, 7);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(e);
  }
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, list]) => ({ month, rows: list, total: sum(list) }));
}

export function busiestMonth(rows: Expense[]): string | null {
  const g = groupByMonth(rows);
  if (g.length === 0) return null;
  return g.reduce((best, x) => (x.total > best.total ? x : best), g[0]).month;
}

// ---- CSV ------------------------------------------------------------------------------------
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function expensesToCsv(rows: Expense[], categories: Map<string, Category>, project?: Project): string {
  const head = ['date', 'title', 'category', 'amount_gel', 'note', 'project'];
  const lines = [head.join(',')];
  for (const e of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
    const c = categories.get(e.categoryId);
    lines.push([e.date, e.title, c ? categoryName(c) : '', e.amount, e.note, project?.name ?? ''].map(csvCell).join(','));
  }
  return '﻿' + lines.join('\n');
}

export async function shareOrDownloadText(name: string, text: string, type = 'text/csv'): Promise<'shared' | 'downloaded'> {
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  try {
    const file = new File([text], name, { type });
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: name });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'shared';
  }
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
