import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export function NoteGroupScreen({ id }) {
    const t = useT();
    const group = useNoteGroup(id);
    const groups = useNoteGroups();
    const notes = useNotesInGroup(id);
    const [editing, setEditing] = useState(false);
    const [tag, setTag] = useState(null);
    const tags = useMemo(() => allTags(notes ?? []), [notes]);
    const shown = useMemo(() => (notes ?? []).filter((n) => !tag || n.tags.includes(tag)), [notes, tag]);
    const last = (notes ?? []).reduce((a, n) => Math.max(a, n.updatedAt), 0);
    if (group === null) {
        navigate('/notes', { replace: true });
        return _jsx(Screen, { className: "screen-no-tabs" });
    }
    if (!group || !notes)
        return _jsx(Screen, { className: "screen-no-tabs" });
    const add = () => { setSetting(LAST_GROUP_KEY, group.id); navigate(`/notes/note/new?group=${group.id}`); };
    return (_jsxs(Screen, { className: "screen-no-tabs notes", children: [_jsx(TopBar, { large: true, backTo: "/notes", left: undefined, title: _jsxs("span", { className: "hstack", style: { gap: 10 }, children: [_jsx(GroupBadge, { group: group, size: 34 }), _jsx("span", { style: { color: group.color }, children: groupName(group) })] }), eyebrow: notes.length === 1 ? t('notes.noteCount') : t('notes.notesCount', { n: notes.length }), right: _jsx(IconButton, { label: t('notes.editGroup'), onClick: () => setEditing(true), children: _jsx(IconEdit, { size: 18 }) }) }), tags.length > 0 && (_jsxs("div", { className: "chips", style: { marginBottom: 12 }, children: [_jsx(Chip, { tone: "notes", active: tag === null, onClick: () => setTag(null), children: t('pocket.all') }), tags.map((x) => _jsxs(Chip, { tone: "notes", active: tag === x.tag, onClick: () => setTag(tag === x.tag ? null : x.tag), children: ["#", x.tag, " ", _jsx("span", { className: "muted", children: x.n })] }, x.tag))] })), notes.length === 0 ? (_jsx(Empty, { icon: _jsx(IconNotes, { size: 40 }), title: t('notes.emptyGroup'), text: t('notes.emptyGroupText') })) : (_jsx("div", { className: "list mb", children: shown.map((n) => _jsx(NoteRow, { note: n, group: group }, n.id)) })), last > 0 && _jsx("div", { className: "small muted", style: { textAlign: 'center' }, children: t('tree.lastEdited', { when: relativeTime(last) }) }), _jsxs(Fab, { tone: "notes", onClick: add, children: [_jsx(IconPlus, { size: 20, strokeWidth: 2.5 }), " ", t('notes.newNote')] }), _jsx(GroupSheet, { group: group, open: editing, onClose: () => setEditing(false), nextOrder: groups?.length ?? 0, noteCount: notes.length })] }));
}
