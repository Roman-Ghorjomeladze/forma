// One group: its notes (pinned first), tag filter chips, edit-group sheet, new-note FAB.
import { useMemo, useState } from 'react';
import { setSetting } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { allTags, groupName, relativeTime } from '../../lib/notes.js';
import { navigate } from '../../lib/router.js';
import { useNoteGroup, useNoteGroups, useNotesInGroup } from '../../lib/queries.js';
import { Chip, Empty, IconButton, Screen, TopBar } from '../../ui/components.js';
import { IconEdit, IconNotes, IconPlus } from '../../ui/icons.js';
import { Fab } from '../pocket/pocket-ui.js';
import { GroupBadge, GroupSheet, NoteRow } from './notes-ui.js';
import { LAST_GROUP_KEY } from './notes.js';

export function NoteGroupScreen({ id }: { id: string }) {
  const t = useT();
  const group = useNoteGroup(id);
  const groups = useNoteGroups();
  const notes = useNotesInGroup(id);
  const [editing, setEditing] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const tags = useMemo(() => allTags(notes ?? []), [notes]);
  const shown = useMemo(() => (notes ?? []).filter((n) => !tag || n.tags.includes(tag)), [notes, tag]);
  const last = (notes ?? []).reduce((a, n) => Math.max(a, n.updatedAt), 0);

  if (group === null) { navigate('/notes', { replace: true }); return <Screen className="screen-no-tabs" />; }
  if (!group || !notes) return <Screen className="screen-no-tabs" />;

  const add = () => { setSetting(LAST_GROUP_KEY, group.id); navigate(`/notes/note/new?group=${group.id}`); };

  return (
    <Screen className="screen-no-tabs notes">
      <TopBar large backTo="/notes" left={undefined} title={<span className="hstack" style={{ gap: 10 }}><GroupBadge group={group} size={34} /><span style={{ color: group.color }}>{groupName(group)}</span></span>} eyebrow={notes.length === 1 ? t('notes.noteCount') : t('notes.notesCount', { n: notes.length })} right={<IconButton label={t('notes.editGroup')} onClick={() => setEditing(true)}><IconEdit size={18} /></IconButton>} />

      {tags.length > 0 && (
        <div className="chips" style={{ marginBottom: 12 }}>
          <Chip tone="notes" active={tag === null} onClick={() => setTag(null)}>{t('pocket.all')}</Chip>
          {tags.map((x) => <Chip key={x.tag} tone="notes" active={tag === x.tag} onClick={() => setTag(tag === x.tag ? null : x.tag)}>#{x.tag} <span className="muted">{x.n}</span></Chip>)}
        </div>
      )}

      {notes.length === 0 ? (
        <Empty icon={<IconNotes size={40} />} title={t('notes.emptyGroup')} text={t('notes.emptyGroupText')} />
      ) : (
        <div className="list mb">{shown.map((n) => <NoteRow key={n.id} note={n} group={group} />)}</div>
      )}
      {last > 0 && <div className="small muted" style={{ textAlign: 'center' }}>{t('tree.lastEdited', { when: relativeTime(last) })}</div>}

      <Fab tone="notes" onClick={add}><IconPlus size={20} strokeWidth={2.5} /> {t('notes.newNote')}</Fab>
      <GroupSheet group={group} open={editing} onClose={() => setEditing(false)} nextOrder={groups?.length ?? 0} noteCount={notes.length} />
    </Screen>
  );
}
