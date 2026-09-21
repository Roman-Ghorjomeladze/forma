import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Shared pieces for Notes screens: group badge + sheet, note rows, highlighted text, tag input.
import { useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { CATEGORY_ICONS } from '../../lib/models.js';
import { checkProgress, deleteGroup, displayTitle, excerpt, groupName, highlight, newGroup, normalizeTag, NOTE_GROUP_COLORS, relativeTime } from '../../lib/notes.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, Sheet, TextInput } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { CategoryGlyph, IconCheckSquare, IconClose, IconLink, IconPinFilled } from '../../ui/icons.js';
export function GroupBadge({ group, size = 40 }) {
    const color = group?.color ?? '#9A978F';
    return (_jsx("div", { className: "cat-badge", style: { width: size, height: size, background: `${color}22`, color }, children: _jsx(CategoryGlyph, { name: group?.icon ?? 'doc', size: Math.round(size * 0.5) }) }));
}
/** Text with search-token matches wrapped in <mark class="hl">. */
export function Highlighted({ text, q }) {
    if (!q.trim())
        return _jsx(_Fragment, { children: text });
    return _jsx(_Fragment, { children: highlight(text, q).map((p, i) => (p.hit ? _jsx("mark", { className: "hl", children: p.text }, i) : _jsx("span", { children: p.text }, i))) });
}
export function NoteRow({ note, group, showGroup = false, q = '', snippet, onClick }) {
    const t = useT();
    const prog = checkProgress(note.body);
    const sub = snippet ?? excerpt(note);
    const hasLink = /https?:\/\/|www\./i.test(note.body);
    return (_jsxs("button", { type: "button", className: "note-row", onClick: onClick ?? (() => navigate(`/notes/note/${note.id}`)), children: [_jsxs("div", { className: "note-row-head", children: [note.pinned && _jsx(IconPinFilled, { size: 14, className: "c-notes" }), _jsx("span", { className: "note-row-title", children: _jsx(Highlighted, { text: displayTitle(note), q: q }) }), prog.total > 0 && _jsxs("span", { className: `small num bold ${prog.done === prog.total ? 'c-notes' : 'muted'}`, children: [_jsx(IconCheckSquare, { size: 13 }), " ", prog.done, "/", prog.total] }), hasLink && _jsx(IconLink, { size: 14, className: "muted" })] }), sub && _jsx("div", { className: "note-row-sub", children: _jsx(Highlighted, { text: sub, q: q }) }), _jsxs("div", { className: "note-row-meta", children: [showGroup && group && _jsxs(_Fragment, { children: [_jsx("span", { className: "note-dot", style: { background: group.color } }), _jsx("span", { children: groupName(group) }), _jsx("span", { children: "\u00B7" })] }), _jsx("span", { children: relativeTime(note.updatedAt) }), note.tags.slice(0, 4).map((tag) => _jsx("span", { className: "tag tag-notes", children: _jsx(Highlighted, { text: '#' + tag, q: q }) }, tag)), note.tags.length > 4 && _jsxs("span", { children: ["+", note.tags.length - 4] }), !showGroup && !sub && !note.tags.length ? _jsx("span", { className: "muted", children: t('notes.emptyNote') }) : null] })] }));
}
/** Chips-style tag editor: Enter/comma/space adds, backspace on empty removes the last one. */
export function TagInput({ tags, onChange, suggestions = [] }) {
    const t = useT();
    const [text, setText] = useState('');
    const add = (raw) => {
        const tag = normalizeTag(raw);
        if (!tag)
            return;
        if (!tags.includes(tag))
            onChange([...tags, tag]);
        setText('');
    };
    const remove = (tag) => onChange(tags.filter((x) => x !== tag));
    const hints = suggestions.filter((s) => !tags.includes(s) && (!text || s.includes(normalizeTag(text)))).slice(0, 6);
    return (_jsxs("div", { children: [_jsxs("div", { className: "tag-input", children: [tags.map((tag) => _jsxs("span", { className: "tag tag-notes", children: ["#", tag, _jsx("button", { type: "button", "aria-label": t('common.remove'), onClick: () => remove(tag), children: _jsx(IconClose, { size: 13 }) })] }, tag)), _jsx("input", { value: text, placeholder: tags.length ? '' : t('notes.tagsPlaceholder'), onChange: (e) => { const v = e.target.value; if (/[,\s]$/.test(v))
                            add(v);
                        else
                            setText(v); }, onKeyDown: (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                add(text);
                            }
                            else if (e.key === 'Backspace' && !text && tags.length)
                                remove(tags[tags.length - 1]);
                        }, onBlur: () => add(text), autoCapitalize: "none", autoCorrect: "off" })] }), hints.length > 0 && (_jsx("div", { className: "hstack wrap", style: { marginTop: 8, gap: 6 }, children: hints.map((s) => _jsxs("button", { type: "button", className: "tag", onClick: () => add(s), children: ["#", s] }, s)) }))] }));
}
/** Create / edit a group in a bottom sheet. */
export function GroupSheet({ open, onClose, group, nextOrder, noteCount = 0, onSaved }) {
    const t = useT();
    const [draft, setDraft] = useState(() => group ?? newGroup({ order: nextOrder }));
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open)
            setDraft(group ?? newGroup({ order: nextOrder, color: NOTE_GROUP_COLORS[nextOrder % NOTE_GROUP_COLORS.length] }));
    }
    const save = async () => {
        const name = draft.name.trim();
        if (!name) {
            toast(t('pocket.nameRequired'));
            return;
        }
        const final = { ...draft, name, updatedAt: Date.now() };
        await put('noteGroups', final);
        onSaved?.(final);
        onClose();
    };
    const del = async () => {
        if (!group)
            return;
        const ok = await confirmDialog({ title: t('notes.deleteGroupTitle', { name: groupName(group) }), message: noteCount ? t('notes.deleteGroupText', { n: noteCount }) : undefined, confirmLabel: t('common.delete'), danger: true });
        if (!ok)
            return;
        await deleteGroup(group.id);
        onClose();
        navigate('/notes', { replace: true });
    };
    return (_jsxs(Sheet, { open: open, onClose: onClose, title: group ? t('notes.editGroup') : t('notes.newGroup'), footer: _jsxs(_Fragment, { children: [group && _jsx(Button, { variant: "danger", onClick: del, children: t('common.delete') }), _jsx(Button, { variant: "notes", onClick: save, children: group ? t('common.save') : t('common.add') })] }), children: [_jsx(Field, { label: t('notes.groupName'), children: _jsx(TextInput, { value: draft.name, onChange: (v) => setDraft({ ...draft, name: v }), placeholder: t('notes.groupNamePlaceholder'), autoFocus: !group }) }), _jsx(Field, { label: t('pocket.colour'), children: _jsx("div", { className: "swatches", children: NOTE_GROUP_COLORS.map((c) => _jsx("button", { type: "button", "aria-label": c, className: `swatch ${c === draft.color ? 'active' : ''}`, style: { background: c }, onClick: () => setDraft({ ...draft, color: c }) }, c)) }) }), _jsx(Field, { label: t('pocket.icon'), children: _jsx("div", { className: "icon-grid", children: CATEGORY_ICONS.map((i) => _jsx("button", { type: "button", "aria-label": i, className: `icon-pick ${i === draft.icon ? 'active' : ''}`, onClick: () => setDraft({ ...draft, icon: i }), style: i === draft.icon ? { background: draft.color, color: '#fff' } : undefined, children: _jsx(CategoryGlyph, { name: i, size: 20 }) }, i)) }) })] }));
}
export function SectionLabel({ children, count }) {
    return _jsxs("div", { className: "section-label", children: [children, count !== undefined && _jsx("span", { className: "count muted", children: count })] });
}
