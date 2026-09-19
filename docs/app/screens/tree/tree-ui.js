import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Shared Family Tree UI: avatars, person rows, the person editor sheet and the add-relative sheet.
import { useEffect, useMemo, useRef, useState } from 'react';
import { deleteBlob, put, saveBlob } from '../../lib/db.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { useLang, useT } from '../../lib/i18n.js';
import { UNION_STATUSES } from '../../lib/models.js';
import { addChild, addParent, addPartner, addPerson, addSibling, fullName, initials, lifeSpan, newPerson, normalizeDate, oppositeSex, parentsOf, partnersOf, statusLabel } from '../../lib/tree.js';
import { Button, Field, Row, Segmented, Select, Sheet, TextArea, TextInput, Toggle } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconArrowDown, IconArrowUp, IconCamera, IconChevron, IconHeart, IconLink, IconSearch, IconSiblings, IconTrash } from '../../ui/icons.js';
export function Avatar({ person, size = 36, className = '' }) {
    const url = useBlobUrl(person?.photoBlobId);
    const sex = person?.sex ?? 'u';
    return (_jsx("div", { className: `av av-${sex} ${className}`, style: { width: size, height: size, fontSize: Math.round(size * 0.36) }, children: url ? _jsx("img", { src: url, alt: "" }) : person ? initials(person) : '?' }));
}
export function PersonRow({ person, sub, onClick, right, placeholder }) {
    return (_jsxs(Row, { onClick: onClick, right: right ?? (onClick ? _jsx(IconChevron, { size: 18, className: "muted" }) : undefined), children: [_jsx(Avatar, { person: person }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: `row-title ${person ? '' : 'muted'}`, children: person ? fullName(person) : placeholder }), sub && _jsx("div", { className: "row-sub", children: sub })] })] }));
}
export function unionSub(u, t) {
    const parts = [];
    if (u.status !== 'unknown')
        parts.push(statusLabel(u.status));
    if (u.startYear)
        parts.push(u.status === 'married' ? t('tree.marriedIn', { year: u.startYear }) : t('tree.together', { year: u.startYear }));
    if (u.endYear)
        parts.push(t('tree.until', { year: u.endYear }));
    return parts.join(' · ');
}
async function resizeImage(file, max = 600) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
}
// ---- person editor ---------------------------------------------------------------------------
export function PersonEditSheet({ open, onClose, person, treeId, onSaved, onRemove }) {
    const t = useT();
    const [draft, setDraft] = useState(() => person ?? newPerson(treeId));
    const [pendingPhoto, setPendingPhoto] = useState(undefined); // undefined = untouched, null = remove
    const [busy, setBusy] = useState(false);
    const fileRef = useRef(null);
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setDraft(person ?? newPerson(treeId));
            setPendingPhoto(undefined);
        }
    }
    const previewUrl = useMemo(() => (pendingPhoto ? URL.createObjectURL(pendingPhoto) : undefined), [pendingPhoto]);
    useEffect(() => () => { if (previewUrl)
        URL.revokeObjectURL(previewUrl); }, [previewUrl]);
    const storedUrl = useBlobUrl(pendingPhoto === null ? undefined : draft.photoBlobId);
    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
    const save = async () => {
        const firstName = draft.firstName.trim();
        if (!firstName) {
            toast(t('tree.firstNameRequired'));
            return;
        }
        setBusy(true);
        try {
            let photoBlobId = draft.photoBlobId;
            if (pendingPhoto === null && photoBlobId) {
                await deleteBlob(photoBlobId).catch(() => { });
                photoBlobId = undefined;
            }
            if (pendingPhoto) {
                if (photoBlobId)
                    await deleteBlob(photoBlobId).catch(() => { });
                photoBlobId = await saveBlob(pendingPhoto, `${firstName}.jpg`);
            }
            const final = { ...draft, firstName, lastName: draft.lastName.trim(), maidenName: draft.maidenName.trim(), birthDate: normalizeDate(draft.birthDate), deathDate: normalizeDate(draft.deathDate), deceased: draft.deceased || !!normalizeDate(draft.deathDate), photoBlobId, updatedAt: Date.now() };
            await (person ? put('persons', final) : addPerson(final));
            onSaved?.(final);
            onClose();
        }
        finally {
            setBusy(false);
        }
    };
    const photo = previewUrl ?? storedUrl;
    return (_jsxs(Sheet, { open: open, onClose: onClose, title: person ? t('tree.editPerson') : t('tree.newPerson'), footer: _jsxs(_Fragment, { children: [person && onRemove && _jsx(Button, { variant: "danger", icon: _jsx(IconTrash, { size: 18 }), onClick: onRemove, children: t('common.remove') }), _jsx(Button, { variant: "tree", onClick: save, disabled: busy, children: t('common.save') })] }), children: [_jsxs("div", { className: "hstack mb", style: { gap: 14 }, children: [_jsx("button", { type: "button", className: `av av-${draft.sex} av-btn`, style: { width: 64, height: 64, fontSize: 22 }, onClick: () => fileRef.current?.click(), "aria-label": t('tree.addPhoto'), children: photo ? _jsx("img", { src: photo, alt: "" }) : draft.firstName || draft.lastName ? initials(draft) : _jsx(IconCamera, { size: 24 }) }), _jsxs("div", { className: "stack", style: { gap: 6 }, children: [_jsxs("div", { className: "hstack", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => fileRef.current?.click(), children: photo ? t('tree.changePhoto') : t('tree.addPhoto') }), photo && _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setPendingPhoto(null), children: t('tree.removePhoto') })] }), _jsx("div", { className: "small muted", children: t('tree.photoHint') })] }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", hidden: true, onChange: async (e) => { const f = e.target.files?.[0]; if (f)
                            setPendingPhoto(await resizeImage(f)); e.target.value = ''; } })] }), _jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('tree.firstName'), children: _jsx(TextInput, { value: draft.firstName, onChange: (v) => set({ firstName: v }), autoFocus: !person }) }), _jsx(Field, { label: t('tree.lastName'), children: _jsx(TextInput, { value: draft.lastName, onChange: (v) => set({ lastName: v }) }) })] }), _jsx(Field, { label: t('tree.sex'), children: _jsx(Segmented, { value: draft.sex, onChange: (v) => set({ sex: v }), options: [{ value: 'm', label: t('tree.male') }, { value: 'f', label: t('tree.female') }, { value: 'u', label: '—' }] }) }), draft.sex === 'f' && _jsx(Field, { label: t('tree.maidenName'), hint: t('common.optional'), children: _jsx(TextInput, { value: draft.maidenName, onChange: (v) => set({ maidenName: v }) }) }), _jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('tree.born'), hint: t('tree.dateHint'), children: _jsx(TextInput, { value: draft.birthDate, onChange: (v) => set({ birthDate: v }), placeholder: "1958-04-12", inputMode: "numeric" }) }), _jsx(Field, { label: t('tree.died'), children: _jsx(TextInput, { value: draft.deathDate, onChange: (v) => set({ deathDate: v }), placeholder: "\u2014", inputMode: "numeric" }) })] }), _jsx(Field, { label: t('tree.deceased'), inline: true, children: _jsx(Toggle, { checked: draft.deceased || !!draft.deathDate, onChange: (v) => set({ deceased: v, deathDate: v ? draft.deathDate : '' }) }) }), _jsx(Field, { label: t('tree.birthPlace'), children: _jsx(TextInput, { value: draft.birthPlace, onChange: (v) => set({ birthPlace: v }), placeholder: "Batumi" }) }), _jsx(Field, { label: t('tree.notes'), children: _jsx(TextArea, { value: draft.notes, onChange: (v) => set({ notes: v }), rows: 3 }) })] }));
}
export function AddRelativeSheet({ open, onClose, person, g, onAdded, initialKind }) {
    const t = useT();
    const lang = useLang();
    const [kind, setKind] = useState(initialKind ?? 'child');
    const [mode, setMode] = useState('new');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [sex, setSex] = useState('u');
    const [born, setBorn] = useState('');
    const [otherParent, setOtherParent] = useState(null);
    const [status, setStatus] = useState('married');
    const [startYear, setStartYear] = useState('');
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState(false);
    const parents = person ? parentsOf(g, person.id) : [];
    const partners = person ? partnersOf(g, person.id) : [];
    const parentsFull = parents.length >= 2;
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open && person) {
            const k = initialKind ?? (parentsFull ? 'child' : 'child');
            setKind(k);
            setMode('new');
            setFirstName('');
            setBorn('');
            setQuery('');
            setStartYear('');
            setOtherParent(partners[0]?.person.id ?? null);
            applyDefaults(k, person);
        }
    }
    function applyDefaults(k, p) {
        if (k === 'partner') {
            setLastName('');
            setSex(oppositeSex(p.sex));
            setStatus('married');
        }
        else if (k === 'parent') {
            const existing = parentsOf(g, p.id)[0];
            setLastName(existing?.sex === 'f' || p.sex === 'f' ? p.lastName : p.lastName);
            setSex(existing ? oppositeSex(existing.sex) : 'm');
        }
        else {
            setLastName(p.lastName);
            setSex('u');
        }
    }
    const pickKind = (k) => { if (!person)
        return; setKind(k); applyDefaults(k, person); };
    const candidates = useMemo(() => {
        if (!person)
            return [];
        const q = query.trim().toLowerCase();
        return [...g.persons.values()].filter((p) => p.id !== person.id && (!q || fullName(p).toLowerCase().includes(q))).sort((a, b) => fullName(a).localeCompare(fullName(b))).slice(0, 30);
    }, [g, person, query]);
    const commit = async (target, isNew) => {
        if (!person)
            return;
        setBusy(true);
        try {
            let ok = false;
            if (kind === 'parent')
                ok = await addParent(g, person, target);
            else if (kind === 'partner')
                ok = await addPartner(g, person, target, status, startYear.trim());
            else if (kind === 'child')
                ok = await addChild(g, person, target, otherParent);
            else
                ok = await addSibling(g, person, target);
            if (!ok) {
                toast(t('tree.noMatches'));
                return;
            }
            toast(isNew ? t('tree.added', { name: fullName(target) }) : t('tree.linked', { name: fullName(target) }));
            onAdded?.(target);
            onClose();
        }
        finally {
            setBusy(false);
        }
    };
    const submitNew = async () => {
        if (!person)
            return;
        const fn = firstName.trim();
        if (!fn) {
            toast(t('tree.firstNameRequired'));
            return;
        }
        await commit(newPerson(person.treeId, { firstName: fn, lastName: lastName.trim(), sex, birthDate: normalizeDate(born) }), true);
    };
    if (!person)
        return null;
    const kinds = [
        { k: 'parent', icon: _jsx(IconArrowUp, { size: 20 }), label: t('tree.rel.parent'), desc: t('tree.rel.parentDesc'), disabled: parentsFull },
        { k: 'partner', icon: _jsx(IconHeart, { size: 20 }), label: t('tree.rel.partner'), desc: t('tree.rel.partnerDesc') },
        { k: 'child', icon: _jsx(IconArrowDown, { size: 20 }), label: t('tree.rel.child'), desc: t('tree.rel.childDesc') },
        { k: 'sibling', icon: _jsx(IconSiblings, { size: 20 }), label: t('tree.rel.sibling'), desc: t('tree.rel.siblingDesc') },
    ];
    const submitLabel = kind === 'parent' ? t('tree.addParentBtn') : kind === 'partner' ? t('tree.addPartnerBtn') : kind === 'child' ? t('tree.addChildBtn') : t('tree.addSiblingBtn');
    return (_jsxs(Sheet, { open: open, onClose: onClose, title: t('tree.addRelative'), footer: mode === 'new' ? _jsx(Button, { variant: "tree", onClick: submitNew, disabled: busy, children: submitLabel }) : undefined, children: [_jsxs("div", { className: "hstack mb", style: { padding: '8px 12px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }, children: [_jsx(Avatar, { person: person, size: 32 }), _jsx("div", { className: "small", children: t('tree.relativeOf', { name: fullName(person) }) })] }), _jsx("div", { className: "rel-grid mb", children: kinds.map((x) => (_jsxs("button", { type: "button", className: `rel-opt ${kind === x.k ? 'active' : ''}`, disabled: x.disabled, onClick: () => pickKind(x.k), children: [_jsx("span", { className: "rel-icon", children: x.icon }), _jsx("span", { className: "rel-name", children: x.label }), _jsx("span", { className: "rel-desc", children: x.desc })] }, x.k))) }), kind === 'child' && (_jsx(Field, { label: t('tree.otherParent'), children: _jsxs("div", { className: "chips", style: { margin: 0, padding: 0 }, children: [partners.map(({ person: pp }) => _jsx("button", { type: "button", className: `chip chip-tree ${otherParent === pp.id ? 'chip-active' : ''}`, onClick: () => setOtherParent(pp.id), children: pp.firstName || fullName(pp) }, pp.id)), _jsx("button", { type: "button", className: `chip chip-tree ${otherParent === null ? 'chip-active' : ''}`, onClick: () => setOtherParent(null), children: t('tree.unknown') })] }) })), kind === 'partner' && (_jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('tree.status'), children: _jsx(Select, { value: status, onChange: setStatus, options: UNION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) }) }), _jsx(Field, { label: t('tree.year'), children: _jsx(TextInput, { value: startYear, onChange: setStartYear, placeholder: "1982", inputMode: "numeric" }) })] })), _jsx(Segmented, { value: mode, onChange: setMode, options: [{ value: 'new', label: t('tree.newPerson') }, { value: 'link', label: t('tree.linkExistingBtn') }] }), _jsx("div", { style: { height: 14 } }), mode === 'new' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('tree.firstName'), children: _jsx(TextInput, { value: firstName, onChange: setFirstName, autoFocus: true }) }), _jsx(Field, { label: t('tree.lastName'), children: _jsx(TextInput, { value: lastName, onChange: setLastName }) })] }), _jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('tree.sex'), children: _jsx(Segmented, { value: sex, onChange: setSex, options: [{ value: 'm', label: t('tree.male') }, { value: 'f', label: t('tree.female') }, { value: 'u', label: '—' }] }) }), _jsx(Field, { label: t('tree.born'), hint: t('tree.dateHint'), children: _jsx(TextInput, { value: born, onChange: setBorn, placeholder: "1984", inputMode: "numeric" }) })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", value: query, placeholder: t('tree.search'), onChange: (e) => setQuery(e.target.value) })] }), _jsxs("div", { className: "list", children: [candidates.length === 0 && _jsx("div", { className: "row muted small", children: t('tree.noMatches') }), candidates.map((p) => _jsx(PersonRow, { person: p, sub: lifeSpan(p) || formatMaybe(p, lang), onClick: () => commit(p, false), right: _jsx(IconLink, { size: 18, className: "muted" }) }, p.id))] })] }))] }));
}
function formatMaybe(p, _lang) { return p.birthPlace; }
