import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Person details — rendered as a full screen on phones and as the side panel on wide screens.
import { useState } from 'react';
import { put } from '../../lib/db.js';
import { useLang, useT } from '../../lib/i18n.js';
import { UNION_STATUSES } from '../../lib/models.js';
import { ageOf, childrenOf, formatPartialDate, fullName, grandchildrenCount, lifeSpan, parentsOf, partnersOf, removePerson, siblingsOf, statusLabel, unlinkChild, unlinkPartner, updateUnion } from '../../lib/tree.js';
import { Button, Chip, Field, IconButton, Select, Sheet, TextInput } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconClose, IconEdit, IconFit, IconPlus, IconTarget } from '../../ui/icons.js';
import { AddRelativeSheet, Avatar, PersonEditSheet, PersonRow, unionSub } from './tree-ui.js';
export function PersonDetails({ person, g, tree, level, onSelect, onClose, onCenter, wide = false, header }) {
    const t = useT();
    const lang = useLang();
    const [edit, setEdit] = useState(false);
    const [add, setAdd] = useState(null);
    const [editUnion, setEditUnion] = useState(null);
    const partners = partnersOf(g, person.id);
    const children = childrenOf(g, person.id);
    const parents = parentsOf(g, person.id);
    const siblings = siblingsOf(g, person.id);
    const grand = grandchildrenCount(g, person.id);
    const age = ageOf(person);
    const parentUnion = g.parentUnionOf.get(person.id);
    const remove = async () => {
        const ok = await confirmDialog({ title: t('tree.removePersonTitle', { name: fullName(person) }), message: t('tree.removePersonText'), confirmLabel: t('common.remove'), danger: true });
        if (!ok)
            return;
        await removePerson(g, person.id);
        setEdit(false);
        onClose?.();
    };
    const setRoot = async () => { await put('trees', { ...tree, rootPersonId: person.id, updatedAt: Date.now() }); toast(t('tree.rootSet')); };
    const dateLine = [person.birthDate ? `${t('tree.born')} ${formatPartialDate(person.birthDate, lang)}` : '', person.birthPlace, age !== null ? t('tree.age', { n: age }) : ''].filter(Boolean).join(' · ');
    const deathLine = person.deathDate ? `${t('tree.died')} ${formatPartialDate(person.deathDate, lang)}` : person.deceased ? t('tree.deceased') : '';
    return (_jsxs("div", { className: `person-details ${wide ? 'wide' : ''}`, children: [header, _jsxs("div", { className: `person-hero ${wide ? '' : 'center'}`, children: [_jsx(Avatar, { person: person, size: wide ? 64 : 88, className: "av-ring" }), _jsxs("div", { className: "person-hero-text", children: [_jsx("div", { className: "title-large", style: { fontSize: wide ? 22 : 26 }, children: fullName(person) }), person.maidenName && _jsxs("div", { className: "small muted", children: ["(", person.maidenName, ")"] }), dateLine && _jsx("div", { className: "small muted", children: dateLine }), deathLine && _jsx("div", { className: "small muted", children: deathLine })] }), wide && onClose && _jsx(IconButton, { label: t('common.close'), onClick: onClose, children: _jsx(IconClose, { size: 18 }) })] }), _jsxs("div", { className: "tags", style: { justifyContent: wide ? 'flex-start' : 'center' }, children: [level !== undefined && _jsx("span", { className: "tag tag-tree", children: t('tree.generation', { n: level + 1 }) }), children.length > 0 && _jsx("span", { className: "tag", children: children.length === 1 ? t('tree.childCount') : t('tree.childrenCount', { n: children.length }) }), grand > 0 && _jsx("span", { className: "tag", children: grand === 1 ? t('tree.grandchildCount') : t('tree.grandchildrenCount', { n: grand }) })] }), _jsxs("div", { className: "hstack", style: { justifyContent: wide ? 'flex-start' : 'center', flexWrap: 'wrap' }, children: [_jsxs(Chip, { onClick: () => setEdit(true), children: [_jsx(IconEdit, { size: 15 }), " ", t('common.edit')] }), _jsxs(Chip, { tone: "tree", active: true, onClick: () => setAdd('child'), children: [_jsx(IconPlus, { size: 15 }), " ", t('tree.addRelative')] }), onCenter && _jsxs(Chip, { onClick: onCenter, children: [_jsx(IconFit, { size: 15 }), " ", t('tree.centerOn')] }), tree.rootPersonId !== person.id && _jsxs(Chip, { onClick: setRoot, children: [_jsx(IconTarget, { size: 15 }), " ", t('tree.setRoot')] })] }), _jsxs(Block, { label: partners.length > 1 ? t('tree.partners') : t('tree.partner'), children: [partners.map(({ person: p, union }) => _jsx(PersonRow, { person: p, sub: unionSub(union, t) || statusLabel(union.status), onClick: () => onSelect(p.id), right: _jsx(IconButton, { label: t('tree.editRelationship'), className: "iconbtn-plain", onClick: () => setEditUnion(union), children: _jsx(IconEdit, { size: 16 }) }) }, union.id + p.id)), _jsx(AddRow, { label: t('tree.addPartnerBtn'), onClick: () => setAdd('partner') })] }), _jsxs(Block, { label: t('tree.children'), children: [children.map(({ person: c, union }) => {
                        const other = union.partnerIds.find((id) => id !== person.id);
                        const op = other ? g.persons.get(other) : undefined;
                        return _jsx(PersonRow, { person: c, sub: [lifeSpan(c), op ? t('tree.withPartner', { name: op.firstName || fullName(op) }) : ''].filter(Boolean).join(' · '), onClick: () => onSelect(c.id) }, c.id);
                    }), _jsx(AddRow, { label: t('tree.addChildBtn'), onClick: () => setAdd('child') })] }), _jsxs(Block, { label: t('tree.parents'), children: [parents.map((p) => _jsx(PersonRow, { person: p, sub: lifeSpan(p), onClick: () => onSelect(p.id) }, p.id)), parents.length < 2 && _jsx(PersonRow, { person: null, placeholder: parents.length === 1 ? (parents[0].sex === 'f' ? t('tree.unknownFather') : parents[0].sex === 'm' ? t('tree.unknownMother') : t('tree.unknownParent')) : t('tree.unknownParent'), sub: t('tree.tapToAdd'), onClick: () => setAdd('parent') }), parents.length === 0 && parentUnion && parentUnion.partnerIds.length === 0 && _jsx(PersonRow, { person: null, placeholder: t('tree.unknownParent'), sub: t('tree.tapToAdd'), onClick: () => setAdd('parent') })] }), _jsxs(Block, { label: t('tree.siblings'), children: [siblings.map((p) => _jsx(PersonRow, { person: p, sub: lifeSpan(p), onClick: () => onSelect(p.id) }, p.id)), _jsx(AddRow, { label: t('tree.addSiblingBtn'), onClick: () => setAdd('sibling') })] }), person.notes && _jsx(Block, { label: t('tree.notes'), children: _jsx("div", { className: "row", style: { display: 'block', fontSize: 14, lineHeight: 1.45 }, children: person.notes }) }), _jsx(PersonEditSheet, { open: edit, onClose: () => setEdit(false), person: person, treeId: person.treeId, onRemove: remove }), _jsx(AddRelativeSheet, { open: add !== null, onClose: () => setAdd(null), person: person, g: g, initialKind: add ?? undefined, onAdded: (p) => onSelect(p.id) }), _jsx(UnionSheet, { union: editUnion, onClose: () => setEditUnion(null), g: g, me: person })] }));
}
function Block({ label, children }) {
    return _jsxs("div", { className: "stack", style: { gap: 6 }, children: [_jsx("div", { className: "section-label", style: { margin: 0 }, children: label }), _jsx("div", { className: "list", children: children })] });
}
function AddRow({ label, onClick }) {
    return _jsxs("button", { type: "button", className: "row row-tappable add-row", onClick: onClick, children: [_jsx("span", { className: "av av-add", children: _jsx(IconPlus, { size: 16 }) }), _jsx("span", { className: "row-title muted", children: label })] });
}
function UnionSheet({ union, onClose, g, me }) {
    const t = useT();
    const [draft, setDraft] = useState(null);
    const key = union?.id ?? '';
    const [seen, setSeen] = useState('');
    if (key !== seen) {
        setSeen(key);
        setDraft(union ? { ...union } : null);
    }
    if (!union || !draft)
        return null;
    const other = union.partnerIds.map((id) => g.persons.get(id)).find((p) => p && p.id !== me.id);
    const save = async () => { await updateUnion(union, { status: draft.status, startYear: draft.startYear.trim(), endYear: draft.endYear.trim() }); onClose(); };
    const unlink = async () => {
        const ok = await confirmDialog({ title: t('tree.removeRelationshipTitle', { a: me.firstName || fullName(me), b: other ? other.firstName || fullName(other) : '?' }), confirmLabel: t('tree.removeRelationship'), danger: true });
        if (!ok)
            return;
        await unlinkPartner(union, other?.id ?? '');
        onClose();
    };
    return (_jsxs(Sheet, { open: !!union, onClose: onClose, title: t('tree.editRelationship'), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "danger", onClick: unlink, children: t('tree.removeRelationship') }), _jsx(Button, { variant: "tree", onClick: save, children: t('common.save') })] }), children: [_jsxs("div", { className: "hstack mb", children: [_jsx(Avatar, { person: me, size: 32 }), _jsx("span", { className: "muted", children: "+" }), _jsx(Avatar, { person: other ?? null, size: 32 }), _jsx("span", { className: "small", children: other ? fullName(other) : '' })] }), _jsx(Field, { label: t('tree.status'), children: _jsx(Select, { value: draft.status, onChange: (v) => setDraft({ ...draft, status: v }), options: UNION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) }) }), _jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('tree.year'), children: _jsx(TextInput, { value: draft.startYear, onChange: (v) => setDraft({ ...draft, startYear: v }), placeholder: "1982", inputMode: "numeric" }) }), _jsx(Field, { label: t('tree.until', { year: '' }).trim(), children: _jsx(TextInput, { value: draft.endYear, onChange: (v) => setDraft({ ...draft, endYear: v }), placeholder: "\u2014", inputMode: "numeric" }) })] }), union.childIds.length > 0 && (_jsx(Field, { label: t('tree.children'), children: _jsx("div", { className: "list", children: union.childIds.map((cid) => { const c = g.persons.get(cid); return c ? _jsx(PersonRow, { person: c, sub: lifeSpan(c), right: _jsx(IconButton, { label: t('common.remove'), className: "iconbtn-plain", onClick: async () => { const ok = await confirmDialog({ title: t('tree.removeChildTitle', { name: fullName(c) }), confirmLabel: t('common.remove'), danger: true }); if (ok)
                                await unlinkChild(union, cid); }, children: _jsx(IconClose, { size: 16 }) }) }, cid) : null; }) }) }))] }));
}
