import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Note editor: big title, auto-growing plain-text body, checkbox / link tools, tags, group, pin.
import { useEffect, useMemo, useRef, useState } from 'react';
import { put, setSetting } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { allTags, groupName, newNote } from '../../lib/notes.js';
import { back, navigate, useRoute } from '../../lib/router.js';
import { useAllNotes, useNote, useNoteGroups } from '../../lib/queries.js';
import { Button, Chip, Field, Screen, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCheckSquare, IconLink, IconPin } from '../../ui/icons.js';
import { LAST_GROUP_KEY } from './notes.js';
import { GroupBadge, TagInput } from './notes-ui.js';
const CHECK_PREFIX = /^(\s*)\[( |x|X)\] ?/;
export function NoteEditScreen({ id }) {
    const t = useT();
    const route = useRoute();
    const existing = useNote(id);
    const groups = useNoteGroups();
    const all = useAllNotes();
    const [draft, setDraft] = useState(() => (id ? null : newNote(route.query.get('group') ?? '')));
    const [dirty, setDirty] = useState(false);
    const bodyRef = useRef(null);
    useEffect(() => { if (id && existing)
        setDraft(existing); }, [id, existing]);
    // default the group of a brand-new note to the first one if the URL didn't say
    useEffect(() => { if (!id && groups && groups.length && draft && !groups.some((g) => g.id === draft.groupId))
        setDraft({ ...draft, groupId: groups[0].id }); }, [id, groups, draft]);
    const suggestions = useMemo(() => allTags(all ?? []).map((x) => x.tag), [all]);
    // auto-grow the body
    useEffect(() => {
        const el = bodyRef.current;
        if (!el)
            return;
        el.style.height = 'auto';
        el.style.height = Math.max(el.scrollHeight, 0) + 'px';
    }, [draft?.body]);
    if (id && existing === null) {
        navigate('/notes', { replace: true });
        return _jsx(Screen, { className: "screen-no-tabs" });
    }
    if (!draft || !groups)
        return _jsx(Screen, { className: "screen-no-tabs" });
    const set = (patch) => { setDraft({ ...draft, ...patch }); setDirty(true); };
    const doneTo = id ? `/notes/note/${id}` : (draft.groupId ? `/notes/group/${draft.groupId}` : '/notes');
    const save = async () => {
        const title = draft.title.trim();
        const body = draft.body.replace(/\s+$/, '');
        if (!title && !body.trim()) {
            toast(t('notes.nothingToSave'));
            return;
        }
        if (!groups.some((g) => g.id === draft.groupId)) {
            toast(t('notes.pickGroup'));
            return;
        }
        await put('notes', { ...draft, title, body, updatedAt: Date.now() });
        await setSetting(LAST_GROUP_KEY, draft.groupId);
        setDirty(false);
        if (id)
            back(doneTo);
        else
            navigate(`/notes/note/${draft.id}`, { replace: true });
    };
    const leave = async () => {
        if (dirty && (draft.title.trim() || draft.body.trim())) {
            const ok = await confirmDialog({ title: t('notes.discardTitle'), message: t('notes.discardText'), confirmLabel: t('common.discard'), cancelLabel: t('notes.keepEditing'), danger: true });
            if (!ok)
                return;
        }
        back(id ? doneTo : '/notes');
    };
    /** Replace the body keeping the caret where the caller wants it. */
    const setBody = (body, caret) => {
        set({ body });
        requestAnimationFrame(() => { const el = bodyRef.current; if (el) {
            if (document.activeElement !== el)
                el.focus();
            el.setSelectionRange(caret, caret);
        } });
    };
    const toggleCheckbox = () => {
        const el = bodyRef.current;
        const body = draft.body;
        const pos = el ? el.selectionStart : body.length;
        const start = body.lastIndexOf('\n', pos - 1) + 1;
        const endIdx = body.indexOf('\n', pos);
        const end = endIdx < 0 ? body.length : endIdx;
        const line = body.slice(start, end);
        const m = CHECK_PREFIX.exec(line);
        const next = m ? line.slice(m[0].length) : '[ ] ' + line;
        const delta = next.length - line.length;
        setBody(body.slice(0, start) + next + body.slice(end), Math.max(start, pos + delta));
    };
    const onKeyDown = (e) => {
        if (e.key !== 'Enter')
            return;
        const el = e.target;
        const body = draft.body;
        const pos = el.selectionStart;
        const start = body.lastIndexOf('\n', pos - 1) + 1;
        const line = body.slice(start, pos);
        const m = CHECK_PREFIX.exec(line);
        if (!m)
            return;
        e.preventDefault();
        if (line.slice(m[0].length).trim() === '') {
            // Enter on an empty checkbox line ends the list
            setBody(body.slice(0, start) + body.slice(pos), start);
        }
        else {
            const ins = '\n' + m[1] + '[ ] ';
            setBody(body.slice(0, pos) + ins + body.slice(pos), pos + ins.length);
        }
    };
    const pasteLink = async () => {
        try {
            const text = (await navigator.clipboard.readText()).trim();
            if (!/^(https?:\/\/|www\.)\S+$/i.test(text)) {
                toast(t('notes.clipboardNoLink'));
                return;
            }
            const el = bodyRef.current;
            const body = draft.body;
            const pos = el ? el.selectionStart : body.length;
            const before = body.slice(0, pos);
            const sep = before && !before.endsWith('\n') ? '\n' : '';
            const ins = sep + text + '\n';
            setBody(before + ins + body.slice(pos), pos + ins.length);
        }
        catch {
            toast(t('notes.clipboardNoLink'));
        }
    };
    return (_jsxs(Screen, { className: "screen-no-tabs notes", children: [_jsx(TopBar, { onBack: leave, title: id ? t('notes.editNote') : t('notes.newNote'), right: _jsx(Button, { size: "sm", variant: "notes", onClick: save, children: t('common.save') }) }), _jsx("input", { className: "note-title-input", value: draft.title, placeholder: t('notes.titlePlaceholder'), onChange: (e) => set({ title: e.target.value }), autoFocus: !id && !draft.body, enterKeyHint: "next", onKeyDown: (e) => { if (e.key === 'Enter') {
                    e.preventDefault();
                    bodyRef.current?.focus();
                } } }), _jsx("textarea", { ref: bodyRef, className: "note-editor", value: draft.body, placeholder: t('notes.bodyPlaceholder'), onChange: (e) => set({ body: e.target.value }), onKeyDown: onKeyDown, rows: 6, autoFocus: !!id || !!draft.body }), _jsxs("div", { className: "note-tools", onMouseDown: (e) => e.preventDefault(), children: [_jsxs("button", { type: "button", className: "chip", onClick: toggleCheckbox, children: [_jsx(IconCheckSquare, { size: 16 }), " ", t('notes.checkbox')] }), _jsxs("button", { type: "button", className: "chip", onClick: pasteLink, children: [_jsx(IconLink, { size: 16 }), " ", t('notes.pasteLink')] }), _jsxs("button", { type: "button", className: `chip chip-notes ${draft.pinned ? 'chip-active' : ''}`, onClick: () => set({ pinned: !draft.pinned }), children: [_jsx(IconPin, { size: 16 }), " ", draft.pinned ? t('notes.pinnedChip') : t('notes.pin')] })] }), _jsxs("div", { className: "mt-lg", children: [_jsx(Field, { label: t('notes.group'), children: _jsx("div", { className: "cat-chips", children: groups.map((g) => _jsxs(Chip, { tone: "notes", active: g.id === draft.groupId, onClick: () => set({ groupId: g.id }), children: [_jsx(GroupBadge, { group: g, size: 20 }), " ", groupName(g)] }, g.id)) }) }), _jsx(Field, { label: t('notes.tags'), hint: t('notes.tagsHint'), children: _jsx(TagInput, { tags: draft.tags, onChange: (tags) => set({ tags }), suggestions: suggestions }) })] }), _jsx(Button, { variant: "notes", full: true, size: "lg", className: "mt-lg", onClick: save, children: id ? t('common.saveChanges') : t('notes.saveNote') })] }));
}
