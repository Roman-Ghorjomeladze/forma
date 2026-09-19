// Shared Family Tree UI: avatars, person rows, the person editor sheet and the add-relative sheet.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { deleteBlob, put, saveBlob } from '../../lib/db.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { useLang, useT } from '../../lib/i18n.js';
import type { Person, Sex, Union, UnionStatus } from '../../lib/models.js';
import { UNION_STATUSES } from '../../lib/models.js';
import { addChild, addParent, addPartner, addPerson, addSibling, fullName, initials, lifeSpan, newPerson, normalizeDate, oppositeSex, parentsOf, partnersOf, statusLabel, type Graph } from '../../lib/tree.js';
import { Button, Field, Row, Segmented, Select, Sheet, TextArea, TextInput, Toggle } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconArrowDown, IconArrowUp, IconCamera, IconChevron, IconHeart, IconLink, IconSearch, IconSiblings, IconTrash } from '../../ui/icons.js';

export function Avatar({ person, size = 36, className = '' }: { person: Person | null; size?: number; className?: string }) {
  const url = useBlobUrl(person?.photoBlobId);
  const sex = person?.sex ?? 'u';
  return (
    <div className={`av av-${sex} ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {url ? <img src={url} alt="" /> : person ? initials(person) : '?'}
    </div>
  );
}

export function PersonRow({ person, sub, onClick, right, placeholder }: { person: Person | null; sub?: ReactNode; onClick?: () => void; right?: ReactNode; placeholder?: string }) {
  return (
    <Row onClick={onClick} right={right ?? (onClick ? <IconChevron size={18} className="muted" /> : undefined)}>
      <Avatar person={person} />
      <div className="row-main">
        <div className={`row-title ${person ? '' : 'muted'}`}>{person ? fullName(person) : placeholder}</div>
        {sub && <div className="row-sub">{sub}</div>}
      </div>
    </Row>
  );
}

export function unionSub(u: Union, t: (k: string, v?: Record<string, string | number>) => string): string {
  const parts: string[] = [];
  if (u.status !== 'unknown') parts.push(statusLabel(u.status));
  if (u.startYear) parts.push(u.status === 'married' ? t('tree.marriedIn', { year: u.startYear }) : t('tree.together', { year: u.startYear }));
  if (u.endYear) parts.push(t('tree.until', { year: u.endYear }));
  return parts.join(' · ');
}

async function resizeImage(file: File, max = 600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
}

// ---- person editor ---------------------------------------------------------------------------
export function PersonEditSheet({ open, onClose, person, treeId, onSaved, onRemove }: { open: boolean; onClose: () => void; person?: Person; treeId: string; onSaved?: (p: Person) => void; onRemove?: () => void }) {
  const t = useT();
  const [draft, setDraft] = useState<Person>(() => person ?? newPerson(treeId));
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null | undefined>(undefined); // undefined = untouched, null = remove
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setDraft(person ?? newPerson(treeId)); setPendingPhoto(undefined); } }
  const previewUrl = useMemo(() => (pendingPhoto ? URL.createObjectURL(pendingPhoto) : undefined), [pendingPhoto]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const storedUrl = useBlobUrl(pendingPhoto === null ? undefined : draft.photoBlobId);

  const set = (patch: Partial<Person>) => setDraft((d) => ({ ...d, ...patch }));
  const save = async () => {
    const firstName = draft.firstName.trim();
    if (!firstName) { toast(t('tree.firstNameRequired')); return; }
    setBusy(true);
    try {
      let photoBlobId = draft.photoBlobId;
      if (pendingPhoto === null && photoBlobId) { await deleteBlob(photoBlobId).catch(() => {}); photoBlobId = undefined; }
      if (pendingPhoto) { if (photoBlobId) await deleteBlob(photoBlobId).catch(() => {}); photoBlobId = await saveBlob(pendingPhoto, `${firstName}.jpg`); }
      const final: Person = { ...draft, firstName, lastName: draft.lastName.trim(), maidenName: draft.maidenName.trim(), birthDate: normalizeDate(draft.birthDate), deathDate: normalizeDate(draft.deathDate), deceased: draft.deceased || !!normalizeDate(draft.deathDate), photoBlobId, updatedAt: Date.now() };
      await (person ? put('persons', final) : addPerson(final));
      onSaved?.(final);
      onClose();
    } finally { setBusy(false); }
  };

  const photo = previewUrl ?? storedUrl;
  return (
    <Sheet open={open} onClose={onClose} title={person ? t('tree.editPerson') : t('tree.newPerson')} footer={<>
      {person && onRemove && <Button variant="danger" icon={<IconTrash size={18} />} onClick={onRemove}>{t('common.remove')}</Button>}
      <Button variant="tree" onClick={save} disabled={busy}>{t('common.save')}</Button>
    </>}>
      <div className="hstack mb" style={{ gap: 14 }}>
        <button type="button" className={`av av-${draft.sex} av-btn`} style={{ width: 64, height: 64, fontSize: 22 }} onClick={() => fileRef.current?.click()} aria-label={t('tree.addPhoto')}>
          {photo ? <img src={photo} alt="" /> : draft.firstName || draft.lastName ? initials(draft) : <IconCamera size={24} />}
        </button>
        <div className="stack" style={{ gap: 6 }}>
          <div className="hstack">
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>{photo ? t('tree.changePhoto') : t('tree.addPhoto')}</Button>
            {photo && <Button size="sm" variant="ghost" onClick={() => setPendingPhoto(null)}>{t('tree.removePhoto')}</Button>}
          </div>
          <div className="small muted">{t('tree.photoHint')}</div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e: { target: HTMLInputElement }) => { const f = e.target.files?.[0]; if (f) setPendingPhoto(await resizeImage(f)); e.target.value = ''; }} />
      </div>
      <div className="grid-2">
        <Field label={t('tree.firstName')}><TextInput value={draft.firstName} onChange={(v) => set({ firstName: v })} autoFocus={!person} /></Field>
        <Field label={t('tree.lastName')}><TextInput value={draft.lastName} onChange={(v) => set({ lastName: v })} /></Field>
      </div>
      <Field label={t('tree.sex')}>
        <Segmented<Sex> value={draft.sex} onChange={(v) => set({ sex: v })} options={[{ value: 'm', label: t('tree.male') }, { value: 'f', label: t('tree.female') }, { value: 'u', label: '—' }]} />
      </Field>
      {draft.sex === 'f' && <Field label={t('tree.maidenName')} hint={t('common.optional')}><TextInput value={draft.maidenName} onChange={(v) => set({ maidenName: v })} /></Field>}
      <div className="grid-2">
        <Field label={t('tree.born')} hint={t('tree.dateHint')}><TextInput value={draft.birthDate} onChange={(v) => set({ birthDate: v })} placeholder="1958-04-12" inputMode="numeric" /></Field>
        <Field label={t('tree.died')}><TextInput value={draft.deathDate} onChange={(v) => set({ deathDate: v })} placeholder="—" inputMode="numeric" /></Field>
      </div>
      <Field label={t('tree.deceased')} inline><Toggle checked={draft.deceased || !!draft.deathDate} onChange={(v) => set({ deceased: v, deathDate: v ? draft.deathDate : '' })} /></Field>
      <Field label={t('tree.birthPlace')}><TextInput value={draft.birthPlace} onChange={(v) => set({ birthPlace: v })} placeholder="Batumi" /></Field>
      <Field label={t('tree.notes')}><TextArea value={draft.notes} onChange={(v) => set({ notes: v })} rows={3} /></Field>
    </Sheet>
  );
}

// ---- add relative ----------------------------------------------------------------------------
export type RelKind = 'parent' | 'partner' | 'child' | 'sibling';

export function AddRelativeSheet({ open, onClose, person, g, onAdded, initialKind }: { open: boolean; onClose: () => void; person: Person | null; g: Graph; onAdded?: (p: Person) => void; initialKind?: RelKind }) {
  const t = useT();
  const lang = useLang();
  const [kind, setKind] = useState<RelKind>(initialKind ?? 'child');
  const [mode, setMode] = useState<'new' | 'link'>('new');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<Sex>('u');
  const [born, setBorn] = useState('');
  const [otherParent, setOtherParent] = useState<string | null>(null);
  const [status, setStatus] = useState<UnionStatus>('married');
  const [startYear, setStartYear] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const parents = person ? parentsOf(g, person.id) : [];
  const partners = person ? partnersOf(g, person.id) : [];
  const parentsFull = parents.length >= 2;

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && person) {
      const k = initialKind ?? (parentsFull ? 'child' : 'child');
      setKind(k); setMode('new'); setFirstName(''); setBorn(''); setQuery(''); setStartYear('');
      setOtherParent(partners[0]?.person.id ?? null);
      applyDefaults(k, person);
    }
  }

  function applyDefaults(k: RelKind, p: Person) {
    if (k === 'partner') { setLastName(''); setSex(oppositeSex(p.sex)); setStatus('married'); }
    else if (k === 'parent') { const existing = parentsOf(g, p.id)[0]; setLastName(existing?.sex === 'f' || p.sex === 'f' ? p.lastName : p.lastName); setSex(existing ? oppositeSex(existing.sex) : 'm'); }
    else { setLastName(p.lastName); setSex('u'); }
  }
  const pickKind = (k: RelKind) => { if (!person) return; setKind(k); applyDefaults(k, person); };

  const candidates = useMemo(() => {
    if (!person) return [];
    const q = query.trim().toLowerCase();
    return [...g.persons.values()].filter((p) => p.id !== person.id && (!q || fullName(p).toLowerCase().includes(q))).sort((a, b) => fullName(a).localeCompare(fullName(b))).slice(0, 30);
  }, [g, person, query]);

  const commit = async (target: Person, isNew: boolean) => {
    if (!person) return;
    setBusy(true);
    try {
      let ok = false;
      if (kind === 'parent') ok = await addParent(g, person, target);
      else if (kind === 'partner') ok = await addPartner(g, person, target, status, startYear.trim());
      else if (kind === 'child') ok = await addChild(g, person, target, otherParent);
      else ok = await addSibling(g, person, target);
      if (!ok) { toast(t('tree.noMatches')); return; }
      toast(isNew ? t('tree.added', { name: fullName(target) }) : t('tree.linked', { name: fullName(target) }));
      onAdded?.(target);
      onClose();
    } finally { setBusy(false); }
  };
  const submitNew = async () => {
    if (!person) return;
    const fn = firstName.trim();
    if (!fn) { toast(t('tree.firstNameRequired')); return; }
    await commit(newPerson(person.treeId, { firstName: fn, lastName: lastName.trim(), sex, birthDate: normalizeDate(born) }), true);
  };

  if (!person) return null;
  const kinds: { k: RelKind; icon: ReactNode; label: string; desc: string; disabled?: boolean }[] = [
    { k: 'parent', icon: <IconArrowUp size={20} />, label: t('tree.rel.parent'), desc: t('tree.rel.parentDesc'), disabled: parentsFull },
    { k: 'partner', icon: <IconHeart size={20} />, label: t('tree.rel.partner'), desc: t('tree.rel.partnerDesc') },
    { k: 'child', icon: <IconArrowDown size={20} />, label: t('tree.rel.child'), desc: t('tree.rel.childDesc') },
    { k: 'sibling', icon: <IconSiblings size={20} />, label: t('tree.rel.sibling'), desc: t('tree.rel.siblingDesc') },
  ];
  const submitLabel = kind === 'parent' ? t('tree.addParentBtn') : kind === 'partner' ? t('tree.addPartnerBtn') : kind === 'child' ? t('tree.addChildBtn') : t('tree.addSiblingBtn');

  return (
    <Sheet open={open} onClose={onClose} title={t('tree.addRelative')} footer={mode === 'new' ? <Button variant="tree" onClick={submitNew} disabled={busy}>{submitLabel}</Button> : undefined}>
      <div className="hstack mb" style={{ padding: '8px 12px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Avatar person={person} size={32} />
        <div className="small">{t('tree.relativeOf', { name: fullName(person) })}</div>
      </div>
      <div className="rel-grid mb">
        {kinds.map((x) => (
          <button key={x.k} type="button" className={`rel-opt ${kind === x.k ? 'active' : ''}`} disabled={x.disabled} onClick={() => pickKind(x.k)}>
            <span className="rel-icon">{x.icon}</span>
            <span className="rel-name">{x.label}</span>
            <span className="rel-desc">{x.desc}</span>
          </button>
        ))}
      </div>

      {kind === 'child' && (
        <Field label={t('tree.otherParent')}>
          <div className="chips" style={{ margin: 0, padding: 0 }}>
            {partners.map(({ person: pp }) => <button key={pp.id} type="button" className={`chip chip-tree ${otherParent === pp.id ? 'chip-active' : ''}`} onClick={() => setOtherParent(pp.id)}>{pp.firstName || fullName(pp)}</button>)}
            <button type="button" className={`chip chip-tree ${otherParent === null ? 'chip-active' : ''}`} onClick={() => setOtherParent(null)}>{t('tree.unknown')}</button>
          </div>
        </Field>
      )}
      {kind === 'partner' && (
        <div className="grid-2">
          <Field label={t('tree.status')}><Select<UnionStatus> value={status} onChange={setStatus} options={UNION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} /></Field>
          <Field label={t('tree.year')}><TextInput value={startYear} onChange={setStartYear} placeholder="1982" inputMode="numeric" /></Field>
        </div>
      )}

      <Segmented<'new' | 'link'> value={mode} onChange={setMode} options={[{ value: 'new', label: t('tree.newPerson') }, { value: 'link', label: t('tree.linkExistingBtn') }]} />
      <div style={{ height: 14 }} />

      {mode === 'new' ? (
        <>
          <div className="grid-2">
            <Field label={t('tree.firstName')}><TextInput value={firstName} onChange={setFirstName} autoFocus /></Field>
            <Field label={t('tree.lastName')}><TextInput value={lastName} onChange={setLastName} /></Field>
          </div>
          <div className="grid-2">
            <Field label={t('tree.sex')}><Segmented<Sex> value={sex} onChange={setSex} options={[{ value: 'm', label: t('tree.male') }, { value: 'f', label: t('tree.female') }, { value: 'u', label: '—' }]} /></Field>
            <Field label={t('tree.born')} hint={t('tree.dateHint')}><TextInput value={born} onChange={setBorn} placeholder="1984" inputMode="numeric" /></Field>
          </div>
        </>
      ) : (
        <>
          <div className="searchbar"><IconSearch size={18} /><input className="input" value={query} placeholder={t('tree.search')} onChange={(e: { target: HTMLInputElement }) => setQuery(e.target.value)} /></div>
          <div className="list">
            {candidates.length === 0 && <div className="row muted small">{t('tree.noMatches')}</div>}
            {candidates.map((p) => <PersonRow key={p.id} person={p} sub={lifeSpan(p) || formatMaybe(p, lang)} onClick={() => commit(p, false)} right={<IconLink size={18} className="muted" />} />)}
          </div>
        </>
      )}
    </Sheet>
  );
}

function formatMaybe(p: Person, _lang: string): string { return p.birthPlace; }
