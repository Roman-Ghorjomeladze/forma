import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Notes home: search across everything, pinned notes, groups grid, recent notes.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSetting, setSetting } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
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
    const [editing, setEditing] = useState(undefined);
    const [tag, setTag] = useState(null);
    const inputRef = useRef(null);
    // keep the query in the URL so back navigation from a result returns to the same search
    useEffect(() => {
        const cur = route.query.get('q') ?? '';
        if (cur === q)
            return;
        const id = window.setTimeout(() => navigate(q ? `/notes?q=${encodeURIComponent(q)}` : '/notes', { replace: true }), 150);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);
    const groupMap = useMemo(() => new Map((groups ?? []).map((g) => [g.id, g])), [groups]);
    const counts = useMemo(() => {
        const m = new Map();
        for (const n of notes ?? [])
            m.set(n.groupId, (m.get(n.groupId) ?? 0) + 1);
        return m;
    }, [notes]);
    const lastEdited = useMemo(() => {
        const m = new Map();
        for (const n of notes ?? [])
            m.set(n.groupId, Math.max(m.get(n.groupId) ?? 0, n.updatedAt));
        return m;
    }, [notes]);
    const hits = useMemo(() => (q.trim() ? searchNotes(notes ?? [], groupMap, q) : []), [notes, groupMap, q]);
    const pinned = useMemo(() => (notes ?? []).filter((n) => n.pinned).slice(0, 6), [notes]);
    const recent = useMemo(() => [...(notes ?? [])].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5), [notes]);
    const tags = useMemo(() => {
        const m = new Map();
        for (const n of notes ?? [])
            for (const x of n.tags)
                m.set(x, (m.get(x) ?? 0) + 1);
        return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([x]) => x);
    }, [notes]);
    const tagged = useMemo(() => (tag ? (notes ?? []).filter((n) => n.tags.includes(tag)) : []), [notes, tag]);
    const newNote = async () => {
        const last = await getSetting(LAST_GROUP_KEY, '');
        const g = groupMap.get(last) ?? groups?.[0];
        navigate(g ? `/notes/note/new?group=${g.id}` : '/notes/note/new');
    };
    const searching = q.trim().length > 0;
    return (_jsxs(Screen, { className: "screen-no-tabs notes", children: [_jsx(TopBar, { large: true, left: _jsx(AppsButton, {}), title: _jsx("span", { className: "c-notes", children: t('notes.title') }), eyebrow: notes && groups ? t('notes.subtitleCounts', { n: notes.length, g: groups.length }) : t('notes.subtitle'), right: _jsx(IconButton, { label: t('notes.newGroup'), tone: "notes", onClick: () => setEditing(null), children: _jsx(IconPlus, {}) }) }), _jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { ref: inputRef, className: "input", type: "search", value: q, placeholder: t('notes.searchPlaceholder'), onChange: (e) => { setQ(e.target.value); setTag(null); }, autoCapitalize: "none", enterKeyHint: "search" }), q && _jsx("button", { type: "button", className: "clear", "aria-label": t('common.clear'), onClick: () => { setQ(''); inputRef.current?.focus(); }, children: _jsx(IconClose, { size: 16 }) })] }), searching ? (_jsxs(_Fragment, { children: [_jsx(SectionLabel, { count: hits.length, children: t('notes.results') }), hits.length === 0 ? (_jsx(Empty, { icon: _jsx(IconSearch, { size: 40 }), title: t('notes.noResults'), text: t('notes.noResultsText', { q }) })) : (_jsx("div", { className: "list", children: hits.map((h) => _jsx(NoteRow, { note: h.note, group: groupMap.get(h.note.groupId), showGroup: true, q: q, snippet: h.snippet }, h.note.id)) }))] })) : (_jsxs(_Fragment, { children: [tags.length > 0 && (_jsx("div", { className: "chips", style: { marginBottom: 12 }, children: tags.map((x) => _jsxs(Chip, { tone: "notes", active: tag === x, onClick: () => setTag(tag === x ? null : x), children: ["#", x] }, x)) })), tag ? (_jsxs(_Fragment, { children: [_jsxs(SectionLabel, { count: tagged.length, children: ["#", tag] }), _jsx("div", { className: "list mb", children: tagged.map((n) => _jsx(NoteRow, { note: n, group: groupMap.get(n.groupId), showGroup: true }, n.id)) })] })) : (_jsxs(_Fragment, { children: [pinned.length > 0 && (_jsxs(_Fragment, { children: [_jsx(SectionLabel, { children: t('notes.pinned') }), _jsx("div", { className: "list mb", children: pinned.map((n) => _jsx(NoteRow, { note: n, group: groupMap.get(n.groupId), showGroup: true }, n.id)) })] })), _jsx(SectionLabel, { count: groups?.length, children: t('notes.groups') }), groups && groups.length === 0 && notes && notes.length === 0 && (_jsx(Empty, { icon: _jsx(IconNotes, { size: 40 }), title: t('notes.noNotes'), text: t('notes.noNotesText') })), _jsxs("div", { className: "group-grid mb", children: [(groups ?? []).map((g) => _jsx(GroupTile, { group: g, count: counts.get(g.id) ?? 0, last: lastEdited.get(g.id) }, g.id)), _jsxs("button", { type: "button", className: "group-tile", style: { borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', color: 'var(--muted)', minHeight: 72 }, onClick: () => setEditing(null), children: [_jsx(IconPlus, { size: 18 }), " ", _jsx("span", { className: "small bold", children: t('notes.newGroup') })] })] }), recent.length > 0 && (_jsxs(_Fragment, { children: [_jsx(SectionLabel, { children: t('notes.recent') }), _jsx("div", { className: "list mb", children: recent.map((n) => _jsx(NoteRow, { note: n, group: groupMap.get(n.groupId), showGroup: true }, n.id)) })] }))] }))] })), !searching && _jsxs(Fab, { tone: "notes", onClick: newNote, children: [_jsx(IconPlus, { size: 20, strokeWidth: 2.5 }), " ", t('notes.newNote')] }), _jsx(GroupSheet, { group: editing ?? undefined, open: editing !== undefined, onClose: () => setEditing(undefined), nextOrder: groups?.length ?? 0, noteCount: editing ? counts.get(editing.id) ?? 0 : 0, onSaved: (g) => { if (!editing) {
                    setSetting(LAST_GROUP_KEY, g.id);
                    navigate(`/notes/group/${g.id}`);
                } } })] }));
}
function GroupTile({ group, count, last }) {
    const t = useT();
    return (_jsxs("button", { type: "button", className: "group-tile", onClick: () => navigate(`/notes/group/${group.id}`), children: [_jsxs("div", { className: "hstack", style: { alignItems: 'flex-start' }, children: [_jsx(GroupBadge, { group: group, size: 38 }), _jsx("span", { style: { flex: 1 } }), _jsx(IconChevron, { size: 16, className: "muted" })] }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: groupName(group) }), _jsxs("div", { className: "row-sub", children: [count === 1 ? t('notes.noteCount') : t('notes.notesCount', { n: count }), last ? ` · ${relativeTime(last)}` : ''] })] })] }));
}
