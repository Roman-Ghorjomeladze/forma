// Shared pieces for Notes screens: group badge + sheet, note rows, highlighted text, tag input.
import { useState, type ReactNode } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { CATEGORY_ICONS, type CategoryIcon, type Note, type NoteGroup } from '../../lib/models.js';
import { checkProgress, deleteGroup, displayTitle, excerpt, groupName, highlight, newGroup, normalizeTag, NOTE_GROUP_COLORS, relativeTime } from '../../lib/notes.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, Sheet, TextInput } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { CategoryGlyph, IconCheckSquare, IconClose, IconLink, IconPinFilled } from '../../ui/icons.js';

export function GroupBadge({ group, size = 40 }: { group: NoteGroup | undefined; size?: number }) {
  const color = group?.color ?? '#9A978F';
  return (
    <div className="cat-badge" style={{ width: size, height: size, background: `${color}22`, color }}>
      <CategoryGlyph name={group?.icon ?? 'doc'} size={Math.round(size * 0.5)} />
    </div>
  );
}

/** Text with search-token matches wrapped in <mark class="hl">. */
export function Highlighted({ text, q }: { text: string; q: string }) {
  if (!q.trim()) return <>{text}</>;
  return <>{highlight(text, q).map((p, i) => (p.hit ? <mark key={i} className="hl">{p.text}</mark> : <span key={i}>{p.text}</span>))}</>;
}

export function NoteRow({ note, group, showGroup = false, q = '', snippet, onClick }: { note: Note; group?: NoteGroup; showGroup?: boolean; q?: string; snippet?: string; onClick?: () => void }) {
  const t = useT();
  const prog = checkProgress(note.body);
  const sub = snippet ?? excerpt(note);
  const hasLink = /https?:\/\/|www\./i.test(note.body);
  return (
    <button type="button" className="note-row" onClick={onClick ?? (() => navigate(`/notes/note/${note.id}`))}>
      <div className="note-row-head">
        {note.pinned && <IconPinFilled size={14} className="c-notes" />}
        <span className="note-row-title"><Highlighted text={displayTitle(note)} q={q} /></span>
        {prog.total > 0 && <span className={`small num bold ${prog.done === prog.total ? 'c-notes' : 'muted'}`}><IconCheckSquare size={13} /> {prog.done}/{prog.total}</span>}
        {hasLink && <IconLink size={14} className="muted" />}
      </div>
      {sub && <div className="note-row-sub"><Highlighted text={sub} q={q} /></div>}
      <div className="note-row-meta">
        {showGroup && group && <><span className="note-dot" style={{ background: group.color }} /><span>{groupName(group)}</span><span>·</span></>}
        <span>{relativeTime(note.updatedAt)}</span>
        {note.tags.slice(0, 4).map((tag) => <span key={tag} className="tag tag-notes"><Highlighted text={'#' + tag} q={q} /></span>)}
        {note.tags.length > 4 && <span>+{note.tags.length - 4}</span>}
        {!showGroup && !sub && !note.tags.length ? <span className="muted">{t('notes.emptyNote')}</span> : null}
      </div>
    </button>
  );
}

/** Chips-style tag editor: Enter/comma/space adds, backspace on empty removes the last one. */
export function TagInput({ tags, onChange, suggestions = [] }: { tags: string[]; onChange: (tags: string[]) => void; suggestions?: string[] }) {
  const t = useT();
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag) return;
    if (!tags.includes(tag)) onChange([...tags, tag]);
    setText('');
  };
  const remove = (tag: string) => onChange(tags.filter((x) => x !== tag));
  const hints = suggestions.filter((s) => !tags.includes(s) && (!text || s.includes(normalizeTag(text)))).slice(0, 6);
  return (
    <div>
      <div className="tag-input">
        {tags.map((tag) => <span key={tag} className="tag tag-notes">#{tag}<button type="button" aria-label={t('common.remove')} onClick={() => remove(tag)}><IconClose size={13} /></button></span>)}
        <input
          value={text}
          placeholder={tags.length ? '' : t('notes.tagsPlaceholder')}
          onChange={(e: { target: HTMLInputElement }) => { const v = e.target.value; if (/[,\s]$/.test(v)) add(v); else setText(v); }}
          onKeyDown={(e: { key: string; preventDefault: () => void }) => {
            if (e.key === 'Enter') { e.preventDefault(); add(text); }
            else if (e.key === 'Backspace' && !text && tags.length) remove(tags[tags.length - 1]);
          }}
          onBlur={() => add(text)}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>
      {hints.length > 0 && (
        <div className="hstack wrap" style={{ marginTop: 8, gap: 6 }}>
          {hints.map((s) => <button key={s} type="button" className="tag" onClick={() => add(s)}>#{s}</button>)}
        </div>
      )}
    </div>
  );
}

/** Create / edit a group in a bottom sheet. */
export function GroupSheet({ open, onClose, group, nextOrder, noteCount = 0, onSaved }: { open: boolean; onClose: () => void; group?: NoteGroup; nextOrder: number; noteCount?: number; onSaved?: (g: NoteGroup) => void }) {
  const t = useT();
  const [draft, setDraft] = useState<NoteGroup>(() => group ?? newGroup({ order: nextOrder }));
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) setDraft(group ?? newGroup({ order: nextOrder, color: NOTE_GROUP_COLORS[nextOrder % NOTE_GROUP_COLORS.length] })); }

  const save = async () => {
    const name = draft.name.trim();
    if (!name) { toast(t('pocket.nameRequired')); return; }
    const final = { ...draft, name, updatedAt: Date.now() };
    await put('noteGroups', final);
    onSaved?.(final);
    onClose();
  };
  const del = async () => {
    if (!group) return;
    const ok = await confirmDialog({ title: t('notes.deleteGroupTitle', { name: groupName(group) }), message: noteCount ? t('notes.deleteGroupText', { n: noteCount }) : undefined, confirmLabel: t('common.delete'), danger: true });
    if (!ok) return;
    await deleteGroup(group.id);
    onClose();
    navigate('/notes', { replace: true });
  };

  return (
    <Sheet open={open} onClose={onClose} title={group ? t('notes.editGroup') : t('notes.newGroup')} footer={<>
      {group && <Button variant="danger" onClick={del}>{t('common.delete')}</Button>}
      <Button variant="notes" onClick={save}>{group ? t('common.save') : t('common.add')}</Button>
    </>}>
      <Field label={t('notes.groupName')}><TextInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder={t('notes.groupNamePlaceholder')} autoFocus={!group} /></Field>
      <Field label={t('pocket.colour')}>
        <div className="swatches">
          {NOTE_GROUP_COLORS.map((c) => <button key={c} type="button" aria-label={c} className={`swatch ${c === draft.color ? 'active' : ''}`} style={{ background: c }} onClick={() => setDraft({ ...draft, color: c })} />)}
        </div>
      </Field>
      <Field label={t('pocket.icon')}>
        <div className="icon-grid">
          {CATEGORY_ICONS.map((i: CategoryIcon) => <button key={i} type="button" aria-label={i} className={`icon-pick ${i === draft.icon ? 'active' : ''}`} onClick={() => setDraft({ ...draft, icon: i })} style={i === draft.icon ? { background: draft.color, color: '#fff' } : undefined}><CategoryGlyph name={i} size={20} /></button>)}
        </div>
      </Field>
    </Sheet>
  );
}

export function SectionLabel({ children, count }: { children: ReactNode; count?: number }) {
  return <div className="section-label">{children}{count !== undefined && <span className="count muted">{count}</span>}</div>;
}
