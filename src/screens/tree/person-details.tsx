// Person details — rendered as a full screen on phones and as the side panel on wide screens.
import { useState, type ReactNode } from 'react';
import { put } from '../../lib/db.js';
import { useLang, useT } from '../../lib/i18n.js';
import type { Person, Tree, Union, UnionStatus } from '../../lib/models.js';
import { UNION_STATUSES } from '../../lib/models.js';
import { ageOf, childrenOf, formatPartialDate, fullName, grandchildrenCount, lifeSpan, parentsOf, partnersOf, removePerson, siblingsOf, statusLabel, unlinkChild, unlinkPartner, updateUnion, type Graph } from '../../lib/tree.js';
import { Button, Chip, Field, IconButton, Select, Sheet, TextInput } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconClose, IconEdit, IconFit, IconPlus, IconTarget } from '../../ui/icons.js';
import { AddRelativeSheet, Avatar, PersonEditSheet, PersonRow, unionSub, type RelKind } from './tree-ui.js';

export function PersonDetails({ person, g, tree, level, onSelect, onClose, onCenter, wide = false, header }: {
  person: Person; g: Graph; tree: Tree; level?: number; onSelect: (id: string) => void; onClose?: () => void; onCenter?: () => void; wide?: boolean; header?: ReactNode;
}) {
  const t = useT();
  const lang = useLang();
  const [edit, setEdit] = useState(false);
  const [add, setAdd] = useState<RelKind | null>(null);
  const [editUnion, setEditUnion] = useState<Union | null>(null);

  const partners = partnersOf(g, person.id);
  const children = childrenOf(g, person.id);
  const parents = parentsOf(g, person.id);
  const siblings = siblingsOf(g, person.id);
  const grand = grandchildrenCount(g, person.id);
  const age = ageOf(person);
  const parentUnion = g.parentUnionOf.get(person.id);

  const remove = async () => {
    const ok = await confirmDialog({ title: t('tree.removePersonTitle', { name: fullName(person) }), message: t('tree.removePersonText'), confirmLabel: t('common.remove'), danger: true });
    if (!ok) return;
    await removePerson(g, person.id);
    setEdit(false);
    onClose?.();
  };
  const setRoot = async () => { await put('trees', { ...tree, rootPersonId: person.id, updatedAt: Date.now() }); toast(t('tree.rootSet')); };

  const dateLine = [person.birthDate ? `${t('tree.born')} ${formatPartialDate(person.birthDate, lang)}` : '', person.birthPlace, age !== null ? t('tree.age', { n: age }) : ''].filter(Boolean).join(' · ');
  const deathLine = person.deathDate ? `${t('tree.died')} ${formatPartialDate(person.deathDate, lang)}` : person.deceased ? t('tree.deceased') : '';

  return (
    <div className={`person-details ${wide ? 'wide' : ''}`}>
      {header}
      <div className={`person-hero ${wide ? '' : 'center'}`}>
        <Avatar person={person} size={wide ? 64 : 88} className="av-ring" />
        <div className="person-hero-text">
          <div className="title-large" style={{ fontSize: wide ? 22 : 26 }}>{fullName(person)}</div>
          {person.maidenName && <div className="small muted">({person.maidenName})</div>}
          {dateLine && <div className="small muted">{dateLine}</div>}
          {deathLine && <div className="small muted">{deathLine}</div>}
        </div>
        {wide && onClose && <IconButton label={t('common.close')} onClick={onClose}><IconClose size={18} /></IconButton>}
      </div>
      <div className="tags" style={{ justifyContent: wide ? 'flex-start' : 'center' }}>
        {level !== undefined && <span className="tag tag-tree">{t('tree.generation', { n: level + 1 })}</span>}
        {children.length > 0 && <span className="tag">{children.length === 1 ? t('tree.childCount') : t('tree.childrenCount', { n: children.length })}</span>}
        {grand > 0 && <span className="tag">{grand === 1 ? t('tree.grandchildCount') : t('tree.grandchildrenCount', { n: grand })}</span>}
      </div>
      <div className="hstack" style={{ justifyContent: wide ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
        <Chip onClick={() => setEdit(true)}><IconEdit size={15} /> {t('common.edit')}</Chip>
        <Chip tone="tree" active onClick={() => setAdd('child')}><IconPlus size={15} /> {t('tree.addRelative')}</Chip>
        {onCenter && <Chip onClick={onCenter}><IconFit size={15} /> {t('tree.centerOn')}</Chip>}
        {tree.rootPersonId !== person.id && <Chip onClick={setRoot}><IconTarget size={15} /> {t('tree.setRoot')}</Chip>}
      </div>

      <Block label={partners.length > 1 ? t('tree.partners') : t('tree.partner')}>
        {partners.map(({ person: p, union }) => <PersonRow key={union.id + p.id} person={p} sub={unionSub(union, t) || statusLabel(union.status)} onClick={() => onSelect(p.id)} right={<IconButton label={t('tree.editRelationship')} className="iconbtn-plain" onClick={() => setEditUnion(union)}><IconEdit size={16} /></IconButton>} />)}
        <AddRow label={t('tree.addPartnerBtn')} onClick={() => setAdd('partner')} />
      </Block>

      <Block label={t('tree.children')}>
        {children.map(({ person: c, union }) => {
          const other = union.partnerIds.find((id) => id !== person.id);
          const op = other ? g.persons.get(other) : undefined;
          return <PersonRow key={c.id} person={c} sub={[lifeSpan(c), op ? t('tree.withPartner', { name: op.firstName || fullName(op) }) : ''].filter(Boolean).join(' · ')} onClick={() => onSelect(c.id)} />;
        })}
        <AddRow label={t('tree.addChildBtn')} onClick={() => setAdd('child')} />
      </Block>

      <Block label={t('tree.parents')}>
        {parents.map((p) => <PersonRow key={p.id} person={p} sub={lifeSpan(p)} onClick={() => onSelect(p.id)} />)}
        {parents.length < 2 && <PersonRow person={null} placeholder={parents.length === 1 ? (parents[0].sex === 'f' ? t('tree.unknownFather') : parents[0].sex === 'm' ? t('tree.unknownMother') : t('tree.unknownParent')) : t('tree.unknownParent')} sub={t('tree.tapToAdd')} onClick={() => setAdd('parent')} />}
        {parents.length === 0 && parentUnion && parentUnion.partnerIds.length === 0 && <PersonRow person={null} placeholder={t('tree.unknownParent')} sub={t('tree.tapToAdd')} onClick={() => setAdd('parent')} />}
      </Block>

      <Block label={t('tree.siblings')}>
        {siblings.map((p) => <PersonRow key={p.id} person={p} sub={lifeSpan(p)} onClick={() => onSelect(p.id)} />)}
        <AddRow label={t('tree.addSiblingBtn')} onClick={() => setAdd('sibling')} />
      </Block>

      {person.notes && <Block label={t('tree.notes')}><div className="row" style={{ display: 'block', fontSize: 14, lineHeight: 1.45 }}>{person.notes}</div></Block>}

      <PersonEditSheet open={edit} onClose={() => setEdit(false)} person={person} treeId={person.treeId} onRemove={remove} />
      <AddRelativeSheet open={add !== null} onClose={() => setAdd(null)} person={person} g={g} initialKind={add ?? undefined} onAdded={(p) => onSelect(p.id)} />
      <UnionSheet union={editUnion} onClose={() => setEditUnion(null)} g={g} me={person} />
    </div>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return <div className="stack" style={{ gap: 6 }}><div className="section-label" style={{ margin: 0 }}>{label}</div><div className="list">{children}</div></div>;
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="row row-tappable add-row" onClick={onClick}><span className="av av-add"><IconPlus size={16} /></span><span className="row-title muted">{label}</span></button>;
}

function UnionSheet({ union, onClose, g, me }: { union: Union | null; onClose: () => void; g: Graph; me: Person }) {
  const t = useT();
  const [draft, setDraft] = useState<Union | null>(null);
  const key = union?.id ?? '';
  const [seen, setSeen] = useState('');
  if (key !== seen) { setSeen(key); setDraft(union ? { ...union } : null); }
  if (!union || !draft) return null;
  const other = union.partnerIds.map((id) => g.persons.get(id)).find((p) => p && p.id !== me.id);
  const save = async () => { await updateUnion(union, { status: draft.status, startYear: draft.startYear.trim(), endYear: draft.endYear.trim() }); onClose(); };
  const unlink = async () => {
    const ok = await confirmDialog({ title: t('tree.removeRelationshipTitle', { a: me.firstName || fullName(me), b: other ? other.firstName || fullName(other) : '?' }), confirmLabel: t('tree.removeRelationship'), danger: true });
    if (!ok) return;
    await unlinkPartner(union, other?.id ?? '');
    onClose();
  };
  return (
    <Sheet open={!!union} onClose={onClose} title={t('tree.editRelationship')} footer={<><Button variant="danger" onClick={unlink}>{t('tree.removeRelationship')}</Button><Button variant="tree" onClick={save}>{t('common.save')}</Button></>}>
      <div className="hstack mb"><Avatar person={me} size={32} /><span className="muted">+</span><Avatar person={other ?? null} size={32} /><span className="small">{other ? fullName(other) : ''}</span></div>
      <Field label={t('tree.status')}><Select<UnionStatus> value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} options={UNION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} /></Field>
      <div className="grid-2">
        <Field label={t('tree.year')}><TextInput value={draft.startYear} onChange={(v) => setDraft({ ...draft, startYear: v })} placeholder="1982" inputMode="numeric" /></Field>
        <Field label={t('tree.until', { year: '' }).trim()}><TextInput value={draft.endYear} onChange={(v) => setDraft({ ...draft, endYear: v })} placeholder="—" inputMode="numeric" /></Field>
      </div>
      {union.childIds.length > 0 && (
        <Field label={t('tree.children')}>
          <div className="list">
            {union.childIds.map((cid) => { const c = g.persons.get(cid); return c ? <PersonRow key={cid} person={c} sub={lifeSpan(c)} right={<IconButton label={t('common.remove')} className="iconbtn-plain" onClick={async () => { const ok = await confirmDialog({ title: t('tree.removeChildTitle', { name: fullName(c) }), confirmLabel: t('common.remove'), danger: true }); if (ok) await unlinkChild(union, cid); }}><IconClose size={16} /></IconButton>} /> : null; })}
          </div>
        </Field>
      )}
    </Sheet>
  );
}
