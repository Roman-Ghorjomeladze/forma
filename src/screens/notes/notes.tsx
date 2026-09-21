// Notes home: search across everything, pinned notes, groups grid, recent notes.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSetting, setSetting } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import type { NoteGroup } from '../../lib/models.js';
import { groupName, relativeTime, searchNotes } from '../../lib/notes.js';
import { navigate, useRoute } from '../../lib/router.js';
import { useAllNotes, useNoteGroups } from '../../lib/queries.js';
import { Chip, Empty, IconButton, Screen, TopBar } from '../../ui/components.js';
import { IconChevron, IconClose, IconNotes, IconPlus, IconSearch } from '../../ui/icons.js';
import { AppsButton, Fab } from '../pocket/pocket-ui.js';
import { GroupBadge, GroupSheet, NoteRow, SectionLabel } from './notes-ui.js';

export const LAST_GROUP_KEY = 'notes:lastGroup';

export function NotesHomeScreen() {
  const t = useT();
  const route = useRoute();
  const groups = useNoteGroups();
  const notes = useAllNotes();
  const [q, setQ] = useState(route.query.get('q') ?? '');
  const [editing, setEditing] = useState<NoteGroup | null | undefined>(undefined);
  const [tag, setTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // keep the query in the URL so back navigation from a result returns to the same search
  useEffect(() => {
    const cur = route.query.get('q') ?? '';
    if (cur === q) return;
    const id = window.setTimeout(() => navigate(q ? `/notes?q=${encodeURIComponent(q)}` : '/notes', { replace: true }), 150);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const groupMap = useMemo(() => new Map((groups ?? []).map((g) => [g.id, g])), [groups]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes ?? []) m.set(n.groupId, (m.get(n.groupId) ?? 0) + 1);
    return m;
  }, [notes]);
  const lastEdited = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes ?? []) m.set(n.groupId, Math.max(m.get(n.groupId) ?? 0, n.updatedAt));
    return m;
  }, [notes]);
  const hits = useMemo(() => (q.trim() ? searchNotes(notes ?? [], groupMap, q) : []), [notes, groupMap, q]);
  const pinned = useMemo(() => (notes ?? []).filter((n) => n.pinned).slice(0, 6), [notes]);
  const recent = useMemo(() => [...(notes ?? [])].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5), [notes]);
  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes ?? []) for (const x of n.tags) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([x]) => x);
  }, [notes]);
  const tagged = useMemo(() => (tag ? (notes ?? []).filter((n) => n.tags.includes(tag)) : []), [notes, tag]);

  const newNote = async () => {
    const last = await getSetting<string>(LAST_GROUP_KEY, '');
    const g = groupMap.get(last) ?? groups?.[0];
    navigate(g ? `/notes/note/new?group=${g.id}` : '/notes/note/new');
  };

  const searching = q.trim().length > 0;

  return (
    <Screen className="screen-no-tabs notes">
      <TopBar large left={<AppsButton />} title={<span className="c-notes">{t('notes.title')}</span>} eyebrow={notes && groups ? t('notes.subtitleCounts', { n: notes.length, g: groups.length }) : t('notes.subtitle')} right={<IconButton label={t('notes.newGroup')} tone="notes" onClick={() => setEditing(null)}><IconPlus /></IconButton>} />

      <div className="searchbar">
        <IconSearch size={18} />
        <input ref={inputRef} className="input" type="search" value={q} placeholder={t('notes.searchPlaceholder')} onChange={(e: { target: HTMLInputElement }) => { setQ(e.target.value); setTag(null); }} autoCapitalize="none" enterKeyHint="search" />
        {q && <button type="button" className="clear" aria-label={t('common.clear')} onClick={() => { setQ(''); inputRef.current?.focus(); }}><IconClose size={16} /></button>}
      </div>

      {searching ? (
        <>
          <SectionLabel count={hits.length}>{t('notes.results')}</SectionLabel>
          {hits.length === 0 ? (
            <Empty icon={<IconSearch size={40} />} title={t('notes.noResults')} text={t('notes.noResultsText', { q })} />
          ) : (
            <div className="list">{hits.map((h) => <NoteRow key={h.note.id} note={h.note} group={groupMap.get(h.note.groupId)} showGroup q={q} snippet={h.snippet} />)}</div>
          )}
        </>
      ) : (
        <>
          {tags.length > 0 && (
            <div className="chips" style={{ marginBottom: 12 }}>
              {tags.map((x) => <Chip key={x} tone="notes" active={tag === x} onClick={() => setTag(tag === x ? null : x)}>#{x}</Chip>)}
            </div>
          )}

          {tag ? (
            <>
              <SectionLabel count={tagged.length}>#{tag}</SectionLabel>
              <div className="list mb">{tagged.map((n) => <NoteRow key={n.id} note={n} group={groupMap.get(n.groupId)} showGroup />)}</div>
            </>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <SectionLabel>{t('notes.pinned')}</SectionLabel>
                  <div className="list mb">{pinned.map((n) => <NoteRow key={n.id} note={n} group={groupMap.get(n.groupId)} showGroup />)}</div>
                </>
              )}

              <SectionLabel count={groups?.length}>{t('notes.groups')}</SectionLabel>
              {groups && groups.length === 0 && notes && notes.length === 0 && (
                <Empty icon={<IconNotes size={40} />} title={t('notes.noNotes')} text={t('notes.noNotesText')} />
              )}
              <div className="group-grid mb">
                {(groups ?? []).map((g) => <GroupTile key={g.id} group={g} count={counts.get(g.id) ?? 0} last={lastEdited.get(g.id)} />)}
                <button type="button" className="group-tile" style={{ borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', color: 'var(--muted)', minHeight: 72 }} onClick={() => setEditing(null)}><IconPlus size={18} /> <span className="small bold">{t('notes.newGroup')}</span></button>
              </div>

              {recent.length > 0 && (
                <>
                  <SectionLabel>{t('notes.recent')}</SectionLabel>
                  <div className="list mb">{recent.map((n) => <NoteRow key={n.id} note={n} group={groupMap.get(n.groupId)} showGroup />)}</div>
                </>
              )}
            </>
          )}
        </>
      )}

      {!searching && <Fab tone="notes" onClick={newNote}><IconPlus size={20} strokeWidth={2.5} /> {t('notes.newNote')}</Fab>}
      <GroupSheet group={editing ?? undefined} open={editing !== undefined} onClose={() => setEditing(undefined)} nextOrder={groups?.length ?? 0} noteCount={editing ? counts.get(editing.id) ?? 0 : 0} onSaved={(g) => { if (!editing) { setSetting(LAST_GROUP_KEY, g.id); navigate(`/notes/group/${g.id}`); } }} />
    </Screen>
  );
}

function GroupTile({ group, count, last }: { group: NoteGroup; count: number; last?: number }) {
  const t = useT();
  return (
    <button type="button" className="group-tile" onClick={() => navigate(`/notes/group/${group.id}`)}>
      <div className="hstack" style={{ alignItems: 'flex-start' }}>
        <GroupBadge group={group} size={38} />
        <span style={{ flex: 1 }} />
        <IconChevron size={16} className="muted" />
      </div>
      <div className="row-main">
        <div className="row-title">{groupName(group)}</div>
        <div className="row-sub">{count === 1 ? t('notes.noteCount') : t('notes.notesCount', { n: count })}{last ? ` · ${relativeTime(last)}` : ''}</div>
      </div>
    </button>
  );
}
