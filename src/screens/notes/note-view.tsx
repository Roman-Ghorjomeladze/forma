// Read view of one note: tappable checkboxes, clickable links, tags, links list, share / pin / delete.
import { useMemo } from 'react';
import { formatDateTime } from '../../lib/dates.js';
import { put, remove } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import type { Note } from '../../lib/models.js';
import { checkProgress, displayTitle, extractLinks, groupName, noteToText, parseBody, splitLinks, toggleCheck } from '../../lib/notes.js';
import { back, navigate } from '../../lib/router.js';
import { useNote, useNoteGroup } from '../../lib/queries.js';
import { Button, IconButton, Progress, Screen, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCheck, IconEdit, IconExternal, IconPin, IconPinFilled, IconShare, IconTrash } from '../../ui/icons.js';
import { GroupBadge } from './notes-ui.js';

export function NoteViewScreen({ id }: { id: string }) {
  const t = useT();
  const note = useNote(id);
  const group = useNoteGroup(note?.groupId);
  const lines = useMemo(() => parseBody(note?.body ?? ''), [note?.body]);
  const links = useMemo(() => extractLinks(note?.body ?? ''), [note?.body]);
  const prog = useMemo(() => checkProgress(note?.body ?? ''), [note?.body]);

  if (note === null) { navigate('/notes', { replace: true }); return <Screen className="screen-no-tabs" />; }
  if (!note) return <Screen className="screen-no-tabs" />;
  const backTo = `/notes/group/${note.groupId}`;

  const save = (patch: Partial<Note>) => put('notes', { ...note, ...patch, updatedAt: Date.now() });
  const toggle = (index: number) => save({ body: toggleCheck(note.body, index) });
  const togglePin = async () => { await save({ pinned: !note.pinned }); toast(note.pinned ? t('notes.unpinned') : t('notes.pinnedToast')); };
  const share = async () => {
    const text = noteToText(note, group ?? undefined);
    try {
      if (navigator.share) { await navigator.share({ title: displayTitle(note), text }); return; }
      await navigator.clipboard.writeText(text);
      toast(t('shopping.copiedToClipboard'));
    } catch { /* cancelled */ }
  };
  const del = async () => {
    const ok = await confirmDialog({ title: t('notes.deleteNoteTitle', { name: displayTitle(note) }), confirmLabel: t('common.delete'), danger: true });
    if (!ok) return;
    await remove('notes', note.id);
    navigate(backTo, { replace: true });
  };
  const uncheckAll = async () => {
    let body = note.body;
    for (const l of lines) if (l.kind === 'check' && l.checked) body = toggleCheck(body, l.index);
    await save({ body });
  };

  return (
    <Screen className="screen-no-tabs notes">
      <TopBar onBack={() => back(backTo)} title={<button type="button" className="hstack" style={{ gap: 8 }} onClick={() => navigate(backTo)}><GroupBadge group={group ?? undefined} size={26} /><span className="small bold" style={{ color: group?.color }}>{groupName(group ?? undefined)}</span></button>} right={<>
        <IconButton label={note.pinned ? t('notes.unpin') : t('notes.pin')} tone={note.pinned ? 'notes' : 'default'} onClick={togglePin}>{note.pinned ? <IconPinFilled size={18} /> : <IconPin size={18} />}</IconButton>
        <IconButton label={t('common.share')} onClick={share}><IconShare size={18} /></IconButton>
        <IconButton label={t('common.edit')} tone="notes" onClick={() => navigate(`/notes/note/${note.id}/edit`)}><IconEdit size={18} /></IconButton>
      </>} />

      <h1 className="note-view-title">{displayTitle(note)}</h1>
      <div className="note-meta small muted">
        <span>{t('notes.edited', { when: formatDateTime(note.updatedAt) })}</span>
        {note.tags.map((tag) => <button key={tag} type="button" className="tag tag-notes" onClick={() => navigate(`/notes?q=${encodeURIComponent(tag)}`)}>#{tag}</button>)}
      </div>

      {prog.total > 0 && (
        <div className="check-summary">
          <Progress value={prog.done} max={prog.total} color="var(--notes)" height={6} />
          <span className="small bold num">{prog.done}/{prog.total}</span>
          {prog.done > 0 && <button type="button" className="small c-notes bold" onClick={uncheckAll}>{t('common.uncheckAll')}</button>}
        </div>
      )}

      {note.body.trim() ? (
        <div className="note-body">
          {lines.map((l) => l.kind === 'check' ? (
            <button key={l.index} type="button" className={`note-check ${l.checked ? 'done' : ''}`} onClick={() => toggle(l.index)}>
              <span className={`check ${l.checked ? 'on' : ''}`}>{l.checked && <IconCheck size={13} strokeWidth={3} />}</span>
              <span className="note-check-text"><Inline text={l.text} /></span>
            </button>
          ) : (
            <span key={l.index} className="note-line"><Inline text={l.text} /></span>
          ))}
        </div>
      ) : (
        <div className="muted" style={{ padding: '8px 0 20px' }}>{t('notes.emptyNote')}</div>
      )}

      {links.length > 0 && (
        <div className="mt-lg">
          <div className="section-label">{t('notes.links')}<span className="count muted">{links.length}</span></div>
          <div className="list">
            {links.map((l) => (
              <a key={l.href} className="link-row" href={l.href} target="_blank" rel="noopener noreferrer">
                <div className="thumb"><IconExternal size={18} /></div>
                <div className="row-main"><div className="row-title">{l.label}</div><div className="row-sub">{l.href}</div></div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="small muted mt-lg" style={{ textAlign: 'center' }}>{t('notes.created', { when: formatDateTime(note.createdAt) })}</div>
      <Button variant="ghost" full className="mt c-danger" icon={<IconTrash size={16} />} onClick={del}>{t('notes.deleteNote')}</Button>
    </Screen>
  );
}

/** Inline text with URLs turned into links (opened in the system browser). */
function Inline({ text }: { text: string }) {
  const segs = splitLinks(text);
  return <>{segs.map((s, i) => (s.kind === 'link' ? <a key={i} className="note-link" href={s.href} target="_blank" rel="noopener noreferrer" onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>{s.text}</a> : <span key={i}>{s.text}</span>))}</>;
}
