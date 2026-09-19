import { useMemo, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import type { Person, Tree, Union } from '../../lib/models.js';
import { deleteTree, generationCount, newTree } from '../../lib/tree.js';
import { navigate } from '../../lib/router.js';
import { useAllPersons, useAllUnions, useTrees } from '../../lib/queries.js';
import { Button, Empty, Field, IconButton, Screen, Sheet, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconChevron, IconEdit, IconPlus, IconTree } from '../../ui/icons.js';
import { AppsButton } from '../pocket/pocket-ui.js';
import { Avatar, PersonRow } from './tree-ui.js';

export function TreesScreen() {
  const t = useT();
  const trees = useTrees();
  const persons = useAllPersons();
  const unions = useAllUnions();
  const [editing, setEditing] = useState<Tree | null | undefined>(undefined);

  const byTree = useMemo(() => {
    const p = new Map<string, Person[]>(); const u = new Map<string, Union[]>();
    for (const x of persons ?? []) { if (!p.has(x.treeId)) p.set(x.treeId, []); p.get(x.treeId)!.push(x); }
    for (const x of unions ?? []) { if (!u.has(x.treeId)) u.set(x.treeId, []); u.get(x.treeId)!.push(x); }
    return { p, u };
  }, [persons, unions]);
  const recent = useMemo(() => [...(persons ?? [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3), [persons]);
  const treeName = (id: string) => trees?.find((x) => x.id === id)?.name ?? '';

  return (
    <Screen className="screen-no-tabs tree">
      <TopBar large left={<AppsButton />} title={<span className="c-tree">{t('tree.title')}</span>} eyebrow={t('tree.subtitle')} right={<IconButton label={t('tree.newTree')} tone="tree" onClick={() => setEditing(null)}><IconPlus /></IconButton>} />
      {trees && trees.length === 0 && <Empty icon={<IconTree size={40} />} title={t('tree.noTrees')} text={t('tree.noTreesText')} action={<Button variant="tree" icon={<IconPlus size={18} />} onClick={() => setEditing(null)}>{t('tree.newTree')}</Button>} />}
      <div className="stack">
        {(trees ?? []).map((tr) => {
          const ps = byTree.p.get(tr.id) ?? [];
          const us = byTree.u.get(tr.id) ?? [];
          const families = us.filter((u) => u.partnerIds.length === 2).length;
          return (
            <div key={tr.id} role="button" tabIndex={0} className="card card-tappable tree-card" onClick={() => navigate(`/tree/${tr.id}`)} onKeyDown={(e: { key: string }) => { if (e.key === 'Enter') navigate(`/tree/${tr.id}`); }}>
              <div className="hstack">
                <div className="thumb thumb-tree"><IconTree size={24} /></div>
                <div className="row-main">
                  <div className="row-title" style={{ fontSize: 17 }}>{tr.name}</div>
                  <div className="row-sub">{t('tree.stats', { people: ps.length, gens: generationCount(ps, us), families })}</div>
                </div>
                <span onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}><IconButton label={t('common.edit')} className="iconbtn-plain" onClick={() => setEditing(tr)}><IconEdit size={18} /></IconButton></span>
                <IconChevron size={18} className="muted" />
              </div>
              <div className="hstack" style={{ marginTop: 10 }}>
                <div className="av-stack">{ps.slice(0, 4).map((p) => <Avatar key={p.id} person={p} size={30} />)}{ps.length > 4 && <span className="av av-u" style={{ width: 30, height: 30, fontSize: 11 }}>+{ps.length - 4}</span>}</div>
                <span className="small muted">{t('tree.lastEdited', { when: relative(tr.updatedAt, t) })}</span>
              </div>
            </div>
          );
        })}
        {trees && trees.length > 0 && <button type="button" className="addslot" onClick={() => setEditing(null)}><IconPlus size={18} /> {t('tree.newTree')}</button>}
      </div>
      {recent.length > 0 && (
        <div className="mt-lg">
          <div className="section-label">{t('tree.recentlyAdded')}</div>
          <div className="list">{recent.map((p) => <PersonRow key={p.id} person={p} sub={treeName(p.treeId)} onClick={() => navigate(`/tree/${p.treeId}?p=${p.id}`)} />)}</div>
        </div>
      )}
      <TreeSheet tree={editing ?? undefined} open={editing !== undefined} onClose={() => setEditing(undefined)} peopleCount={editing ? (byTree.p.get(editing.id) ?? []).length : 0} />
    </Screen>
  );
}

function relative(ts: number, t: (k: string, v?: Record<string, string | number>) => string): string {
  const days = Math.floor((Date.now() - ts) / 86400e3);
  if (days <= 0) return t('tree.today');
  if (days === 1) return t('tree.yesterday');
  return t('tree.daysAgo', { n: days });
}

export function TreeSheet({ tree, open, onClose, peopleCount, onCreated }: { tree?: Tree; open: boolean; onClose: () => void; peopleCount: number; onCreated?: (t: Tree) => void }) {
  const t = useT();
  const [draft, setDraft] = useState<Tree>(() => tree ?? newTree());
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) setDraft(tree ?? newTree()); }
  const save = async () => {
    const name = draft.name.trim();
    if (!name) { toast(t('pocket.nameRequired')); return; }
    const final = { ...draft, name, updatedAt: Date.now() };
    await put('trees', final);
    onClose();
    if (!tree) { onCreated ? onCreated(final) : navigate(`/tree/${final.id}`); }
  };
  const del = async () => {
    if (!tree) return;
    const ok = await confirmDialog({ title: t('tree.deleteTreeTitle', { name: tree.name }), message: t('tree.deleteTreeText', { n: peopleCount }), confirmLabel: t('common.delete'), danger: true });
    if (!ok) return;
    await deleteTree(tree.id);
    onClose();
    navigate('/tree', { replace: true });
  };
  return (
    <Sheet open={open} onClose={onClose} title={tree ? t('tree.editTree') : t('tree.newTree')} footer={<>{tree && <Button variant="danger" onClick={del}>{t('common.delete')}</Button>}<Button variant="tree" onClick={save}>{tree ? t('common.save') : t('common.add')}</Button></>}>
      <Field label={t('tree.treeName')}><TextInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder={t('tree.treeNamePlaceholder')} autoFocus={!tree} /></Field>
      <Field label={t('tree.treeNotes')}><TextArea value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} rows={2} /></Field>
    </Sheet>
  );
}
