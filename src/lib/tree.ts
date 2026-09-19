// Family Tree helpers: names & dates, relationship queries and the mutations that keep the
// person/union graph consistent.
import { bulkPut, bulkRemove, deleteBlob, get, getByIndex, put, remove } from './db.js';
import { uid } from './ids.js';
import { tGlobal } from './i18n.js';
import type { Person, Sex, Tree, Union, UnionStatus } from './models.js';

// ---- names & dates --------------------------------------------------------------------------
export function fullName(p: Person): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || '—';
}

export function initials(p: Person): string {
  const a = p.firstName.trim()[0] ?? '';
  const b = p.lastName.trim()[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

export function yearOf(date: string): number | null {
  const m = /^(\d{4})/.exec(date.trim());
  return m ? Number(m[1]) : null;
}

/** Normalises user input like "1958", "1958-4", "12.04.1958", "04/1958" into "1958", "1958-04" or "1958-04-12". */
export function normalizeDate(input: string): string {
  const s = input.trim();
  if (!s) return '';
  let m = /^(\d{4})(?:[-./](\d{1,2}))?(?:[-./](\d{1,2}))?$/.exec(s);
  if (m) return [m[1], m[2]?.padStart(2, '0'), m[3]?.padStart(2, '0')].filter(Boolean).join('-');
  m = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/.exec(s); // dd.mm.yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{1,2})[-./](\d{4})$/.exec(s); // mm.yyyy
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  return s;
}

const MONTHS: Record<string, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ka: ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'],
};

export function formatPartialDate(date: string, lang: 'en' | 'ka'): string {
  const [y, m, d] = date.split('-');
  if (!y) return '';
  const months = MONTHS[lang];
  if (m && d) return `${Number(d)} ${months[Number(m) - 1] ?? m} ${y}`;
  if (m) return `${months[Number(m) - 1] ?? m} ${y}`;
  return y;
}

/** "1958 – 2009", "1958 –", "– 2009" or "" — the short line under a name. */
export function lifeSpan(p: Person): string {
  const b = yearOf(p.birthDate), d = yearOf(p.deathDate);
  if (b && (d || p.deceased)) return `${b} – ${d ?? ''}`.trim();
  if (b) return `${b} –`;
  if (d) return `– ${d}`;
  return p.deceased ? '†' : '';
}

export function ageOf(p: Person): number | null {
  const b = yearOf(p.birthDate);
  if (!b) return null;
  if (p.deceased && !p.deathDate) return null;
  const endStr = p.deathDate || new Date().toISOString().slice(0, 10);
  const e = yearOf(endStr);
  if (!e) return null;
  const [, bm = '01', bd = '01'] = p.birthDate.split('-');
  const [, em = '06', ed = '15'] = endStr.split('-');
  let age = e - b;
  if (Number(em) < Number(bm) || (Number(em) === Number(bm) && Number(ed) < Number(bd))) age--;
  return age;
}

export function newPerson(treeId: string, partial: Partial<Person> = {}): Person {
  const now = Date.now();
  return { id: uid('per'), treeId, firstName: '', lastName: '', maidenName: '', sex: 'u', birthDate: '', deathDate: '', deceased: false, birthPlace: '', notes: '', createdAt: now, updatedAt: now, ...partial };
}

export function newTree(partial: Partial<Tree> = {}): Tree {
  const now = Date.now();
  return { id: uid('tree'), name: '', notes: '', createdAt: now, updatedAt: now, ...partial };
}

function newUnion(treeId: string, partial: Partial<Union> = {}): Union {
  const now = Date.now();
  return { id: uid('uni'), treeId, partnerIds: [], status: 'unknown', startYear: '', endYear: '', childIds: [], createdAt: now, updatedAt: now, ...partial };
}

export function statusLabel(s: UnionStatus): string { return tGlobal(`tree.status.${s}`); }

// ---- relationship queries (pure, on in-memory lists) -----------------------------------------
export interface Graph {
  persons: Map<string, Person>;
  unions: Map<string, Union>;
  /** unions where the person is a partner */
  unionsOf: Map<string, Union[]>;
  /** the union the person is a child of (at most one) */
  parentUnionOf: Map<string, Union>;
}

export function buildGraph(persons: Person[], unions: Union[]): Graph {
  const g: Graph = { persons: new Map(persons.map((p) => [p.id, p])), unions: new Map(unions.map((u) => [u.id, u])), unionsOf: new Map(), parentUnionOf: new Map() };
  for (const u of unions) {
    for (const pid of u.partnerIds) { if (!g.unionsOf.has(pid)) g.unionsOf.set(pid, []); g.unionsOf.get(pid)!.push(u); }
    for (const cid of u.childIds) g.parentUnionOf.set(cid, u);
  }
  for (const list of g.unionsOf.values()) list.sort((a, b) => a.createdAt - b.createdAt);
  return g;
}

export function partnersOf(g: Graph, id: string): { person: Person; union: Union }[] {
  const out: { person: Person; union: Union }[] = [];
  for (const u of g.unionsOf.get(id) ?? []) for (const pid of u.partnerIds) if (pid !== id) { const p = g.persons.get(pid); if (p) out.push({ person: p, union: u }); }
  return out;
}

export function parentsOf(g: Graph, id: string): Person[] {
  const u = g.parentUnionOf.get(id);
  return u ? u.partnerIds.map((pid) => g.persons.get(pid)).filter((p): p is Person => !!p) : [];
}

export function childrenOf(g: Graph, id: string): { person: Person; union: Union }[] {
  const out: { person: Person; union: Union }[] = [];
  for (const u of g.unionsOf.get(id) ?? []) for (const cid of u.childIds) { const p = g.persons.get(cid); if (p) out.push({ person: p, union: u }); }
  return out;
}

export function siblingsOf(g: Graph, id: string): Person[] {
  const u = g.parentUnionOf.get(id);
  return u ? u.childIds.filter((c) => c !== id).map((c) => g.persons.get(c)).filter((p): p is Person => !!p) : [];
}

export function grandchildrenCount(g: Graph, id: string): number {
  let n = 0;
  for (const c of childrenOf(g, id)) n += childrenOf(g, c.person.id).length;
  return n;
}

/** Number of distinct generations, counted along parent→child edges. */
export function generationCount(persons: Person[], unions: Union[]): number {
  if (persons.length === 0) return 0;
  const levels = assignLevels(buildGraph(persons, unions));
  let min = Infinity, max = -Infinity;
  for (const l of levels.values()) { min = Math.min(min, l); max = Math.max(max, l); }
  return Number.isFinite(min) ? max - min + 1 : 1;
}

/** Levels: partners share a level, children are one below. Disconnected components each start at 0. */
export function assignLevels(g: Graph, rootId?: string): Map<string, number> {
  const level = new Map<string, number>();
  const order = [...g.persons.values()].sort((a, b) => a.createdAt - b.createdAt);
  const seeds = rootId && g.persons.has(rootId) ? [rootId, ...order.map((p) => p.id)] : order.map((p) => p.id);
  for (const seed of seeds) {
    if (level.has(seed)) continue;
    level.set(seed, 0);
    const queue = [seed];
    while (queue.length) {
      const id = queue.shift()!;
      const l = level.get(id)!;
      const visit = (other: string, lv: number) => { if (!level.has(other)) { level.set(other, lv); queue.push(other); } };
      for (const u of g.unionsOf.get(id) ?? []) {
        for (const pid of u.partnerIds) visit(pid, l);
        for (const cid of u.childIds) visit(cid, l + 1);
      }
      const pu = g.parentUnionOf.get(id);
      if (pu) {
        for (const pid of pu.partnerIds) visit(pid, l - 1);
        for (const cid of pu.childIds) visit(cid, l);
      }
    }
  }
  return level;
}

// ---- mutations --------------------------------------------------------------------------------
async function touchTree(treeId: string) {
  const t = await get('trees', treeId);
  if (t) await put('trees', { ...t, updatedAt: Date.now() });
}

async function saveUnion(u: Union) {
  if (u.partnerIds.length === 0 && u.childIds.length === 0) await remove('unions', u.id);
  else await put('unions', { ...u, updatedAt: Date.now() });
}

export async function addPerson(p: Person): Promise<Person> {
  await put('persons', p);
  await touchTree(p.treeId);
  return p;
}

/** Adds (or links) a parent above `child`. Fails softly if the child already has two parents. */
export async function addParent(g: Graph, child: Person, parent: Person): Promise<boolean> {
  const u = g.parentUnionOf.get(child.id);
  if (u) {
    if (u.partnerIds.includes(parent.id)) return true;
    if (u.partnerIds.length >= 2) return false;
    if (!g.persons.has(parent.id)) await put('persons', parent);
    await saveUnion({ ...u, partnerIds: [...u.partnerIds, parent.id] });
  } else {
    if (!g.persons.has(parent.id)) await put('persons', parent);
    await saveUnion(newUnion(child.treeId, { partnerIds: [parent.id], childIds: [child.id] }));
  }
  await touchTree(child.treeId);
  return true;
}

export async function addPartner(g: Graph, person: Person, partner: Person, status: UnionStatus = 'married', startYear = ''): Promise<boolean> {
  if (partner.id === person.id) return false;
  for (const u of g.unionsOf.get(person.id) ?? []) if (u.partnerIds.includes(partner.id)) return true;
  if (!g.persons.has(partner.id)) await put('persons', partner);
  await saveUnion(newUnion(person.treeId, { partnerIds: [person.id, partner.id], status, startYear }));
  await touchTree(person.treeId);
  return true;
}

/** Adds (or links) a child of `person` and `otherParentId` (or a single-parent union when null). */
export async function addChild(g: Graph, person: Person, child: Person, otherParentId: string | null): Promise<boolean> {
  if (child.id === person.id) return false;
  if (g.parentUnionOf.has(child.id)) return false;
  const wanted = otherParentId ? [person.id, otherParentId] : [person.id];
  let u = (g.unionsOf.get(person.id) ?? []).find((x) => x.partnerIds.length === wanted.length && wanted.every((id) => x.partnerIds.includes(id)));
  if (!g.persons.has(child.id)) await put('persons', child);
  if (!u) u = newUnion(person.treeId, { partnerIds: wanted });
  await saveUnion({ ...u, childIds: [...u.childIds, child.id] });
  await touchTree(person.treeId);
  return true;
}

export async function addSibling(g: Graph, person: Person, sibling: Person): Promise<boolean> {
  if (sibling.id === person.id) return false;
  if (g.parentUnionOf.has(sibling.id)) return false;
  let u = g.parentUnionOf.get(person.id);
  if (!g.persons.has(sibling.id)) await put('persons', sibling);
  if (!u) u = newUnion(person.treeId, { partnerIds: [], childIds: [person.id] });
  await saveUnion({ ...u, childIds: [...u.childIds, sibling.id] });
  await touchTree(person.treeId);
  return true;
}

export async function updateUnion(u: Union, patch: Partial<Union>): Promise<void> {
  await saveUnion({ ...u, ...patch });
  await touchTree(u.treeId);
}

export async function unlinkPartner(u: Union, personId: string): Promise<void> {
  await saveUnion({ ...u, partnerIds: u.partnerIds.filter((id) => id !== personId) });
  await touchTree(u.treeId);
}

export async function unlinkChild(u: Union, childId: string): Promise<void> {
  await saveUnion({ ...u, childIds: u.childIds.filter((id) => id !== childId) });
  await touchTree(u.treeId);
}

export async function removePerson(g: Graph, id: string): Promise<void> {
  const p = g.persons.get(id);
  for (const u of g.unionsOf.get(id) ?? []) await saveUnion({ ...u, partnerIds: u.partnerIds.filter((x) => x !== id) });
  const pu = g.parentUnionOf.get(id);
  if (pu) await saveUnion({ ...pu, childIds: pu.childIds.filter((x) => x !== id) });
  if (p?.photoBlobId) await deleteBlob(p.photoBlobId).catch(() => {});
  await remove('persons', id);
  if (p) {
    const tree = await get('trees', p.treeId);
    if (tree?.rootPersonId === id) await put('trees', { ...tree, rootPersonId: undefined, updatedAt: Date.now() });
    else await touchTree(p.treeId);
  }
}

export async function deleteTree(id: string): Promise<void> {
  const persons = await getByIndex('persons', 'treeId', id);
  const unions = await getByIndex('unions', 'treeId', id);
  for (const p of persons) if (p.photoBlobId) await deleteBlob(p.photoBlobId).catch(() => {});
  await bulkRemove('persons', persons.map((p) => p.id));
  await bulkRemove('unions', unions.map((u) => u.id));
  await remove('trees', id);
}

/** Clears every manual position in a tree so the auto-layout takes over again. */
export async function resetPositions(persons: Person[]): Promise<void> {
  const changed = persons.filter((p) => p.pos).map((p) => ({ ...p, pos: undefined, updatedAt: Date.now() }));
  await bulkPut('persons', changed);
}

export function oppositeSex(s: Sex): Sex { return s === 'm' ? 'f' : s === 'f' ? 'm' : 'u'; }
