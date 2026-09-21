import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Read view of one note: tappable checkboxes, clickable links, tags, links list, share / pin / delete.
import { useMemo } from 'react';
import { formatDateTime } from '../../lib/dates.js';
import { put, remove } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { checkProgress, displayTitle, extractLinks, groupName, noteToText, parseBody, splitLinks, toggleCheck } from '../../lib/notes.js';
import { back, navigate } from '../../lib/router.js';
import { useNote, useNoteGroup } from '../../lib/queries.js';
import { Button, IconButton, Progress, Screen, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCheck, IconEdit, IconExternal, IconPin, IconPinFilled, IconShare, IconTrash } from '../../ui/icons.js';
import { GroupBadge } from './notes-ui.js';
export function NoteViewScreen({ id }) {
    const t = useT();
    const note = useNote(id);
    const group = useNoteGroup(note?.groupId);
    const lines = useMemo(() => parseBody(note?.body ?? ''), [note?.body]);
    const links = useMemo(() => extractLinks(note?.body ?? ''), [note?.body]);
    const prog = useMemo(() => checkProgress(note?.body ?? ''), [note?.body]);
    if (note === null) {
        navigate('/notes', { replace: true });
        return _jsx(Screen, { className: "screen-no-tabs" });
    }
    if (!note)
        return _jsx(Screen, { className: "screen-no-tabs" });
    const backTo = `/notes/group/${note.groupId}`;
    const save = (patch) => put('notes', { ...note, ...patch, updatedAt: Date.now() });
    const toggle = (index) => save({ body: toggleCheck(note.body, index) });
    const togglePin = async () => { await save({ pinned: !note.pinned }); toast(note.pinned ? t('notes.unpinned') : t('notes.pinnedToast')); };
    const share = async () => {
        const text = noteToText(note, group ?? undefined);
        try {
            if (navigator.share) {
                await navigator.share({ title: displayTitle(note), text });
                return;
            }
            await navigator.clipboard.writeText(text);
            toast(t('shopping.copiedToClipboard'));
        }
        catch { /* cancelled */ }
    };
    const del = async () => {
        const ok = await confirmDialog({ title: t('notes.deleteNoteTitle', { name: displayTitle(note) }), confirmLabel: t('common.delete'), danger: true });
        if (!ok)
            return;
        await remove('notes', note.id);
        navigate(backTo, { replace: true });
    };
    const uncheckAll = async () => {
        let body = note.body;
        for (const l of lines)
            if (l.kind === 'check' && l.checked)
                body = toggleCheck(body, l.index);
        await save({ body });
    };
    return (_jsxs(Screen, { className: "screen-no-tabs notes", children: [_jsx(TopBar, { onBack: () => back(backTo), title: _jsxs("button", { type: "button", className: "hstack", style: { gap: 8 }, onClick: () => navigate(backTo), children: [_jsx(GroupBadge, { group: group ?? undefined, size: 26 }), _jsx("span", { className: "small bold", style: { color: group?.color }, children: groupName(group ?? undefined) })] }), right: _jsxs(_Fragment, { children: [_jsx(IconButton, { label: note.pinned ? t('notes.unpin') : t('notes.pin'), tone: note.pinned ? 'notes' : 'default', onClick: togglePin, children: note.pinned ? _jsx(IconPinFilled, { size: 18 }) : _jsx(IconPin, { size: 18 }) }), _jsx(IconButton, { label: t('common.share'), onClick: share, children: _jsx(IconShare, { size: 18 }) }), _jsx(IconButton, { label: t('common.edit'), tone: "notes", onClick: () => navigate(`/notes/note/${note.id}/edit`), children: _jsx(IconEdit, { size: 18 }) })] }) }), _jsx("h1", { className: "note-view-title", children: displayTitle(note) }), _jsxs("div", { className: "note-meta small muted", children: [_jsx("span", { children: t('notes.edited', { when: formatDateTime(note.updatedAt) }) }), note.tags.map((tag) => _jsxs("button", { type: "button", className: "tag tag-notes", onClick: () => navigate(`/notes?q=${encodeURIComponent(tag)}`), children: ["#", tag] }, tag))] }), prog.total > 0 && (_jsxs("div", { className: "check-summary", children: [_jsx(Progress, { value: prog.done, max: prog.total, color: "var(--notes)", height: 6 }), _jsxs("span", { className: "small bold num", children: [prog.done, "/", prog.total] }), prog.done > 0 && _jsx("button", { type: "button", className: "small c-notes bold", onClick: uncheckAll, children: t('common.uncheckAll') })] })), note.body.trim() ? (_jsx("div", { className: "note-body", children: lines.map((l) => l.kind === 'check' ? (_jsxs("button", { type: "button", className: `note-check ${l.checked ? 'done' : ''}`, onClick: () => toggle(l.index), children: [_jsx("span", { className: `check ${l.checked ? 'on' : ''}`, children: l.checked && _jsx(IconCheck, { size: 13, strokeWidth: 3 }) }), _jsx("span", { className: "note-check-text", children: _jsx(Inline, { text: l.text }) })] }, l.index)) : (_jsx("span", { className: "note-line", children: _jsx(Inline, { text: l.text }) }, l.index))) })) : (_jsx("div", { className: "muted", style: { padding: '8px 0 20px' }, children: t('notes.emptyNote') })), links.length > 0 && (_jsxs("div", { className: "mt-lg", children: [_jsxs("div", { className: "section-label", children: [t('notes.links'), _jsx("span", { className: "count muted", children: links.length })] }), _jsx("div", { className: "list", children: links.map((l) => (_jsxs("a", { className: "link-row", href: l.href, target: "_blank", rel: "noopener noreferrer", children: [_jsx("div", { className: "thumb", children: _jsx(IconExternal, { size: 18 }) }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: l.label }), _jsx("div", { className: "row-sub", children: l.href })] })] }, l.href))) })] })), _jsx("div", { className: "small muted mt-lg", style: { textAlign: 'center' }, children: t('notes.created', { when: formatDateTime(note.createdAt) }) }), _jsx(Button, { variant: "ghost", full: true, className: "mt c-danger", icon: _jsx(IconTrash, { size: 16 }), onClick: del, children: t('notes.deleteNote') })] }));
}
/** Inline text with URLs turned into links (opened in the system browser). */
function Inline({ text }) {
    const segs = splitLinks(text);
    return _jsx(_Fragment, { children: segs.map((s, i) => (s.kind === 'link' ? _jsx("a", { className: "note-link", href: s.href, target: "_blank", rel: "noopener noreferrer", onClick: (e) => e.stopPropagation(), children: s.text }, i) : _jsx("span", { children: s.text }, i))) });
}
