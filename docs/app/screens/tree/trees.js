import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { deleteTree, generationCount, newTree } from '../../lib/tree.js';
import { navigate } from '../../lib/router.js';
import { useAllPersons, useAllUnions, useTrees } from '../../lib/queries.js';
import { Button, Empty, Field, IconButton, Screen, Sheet, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconChevron, IconEdit, IconPlus, IconTree } from '../../ui/icons.js';
import { AppsButton } from '../pocket/pocket-ui.js';
import { Avatar, PersonRow } from './tree-ui.js';
export function TreesScreen() {
    const t = useT();
    const trees = useTrees();
    const persons = useAllPersons();
    const unions = useAllUnions();
    const [editing, setEditing] = useState(undefined);
    const byTree = useMemo(() => {
        const p = new Map();
        const u = new Map();
        for (const x of persons ?? []) {
            if (!p.has(x.treeId))
                p.set(x.treeId, []);
            p.get(x.treeId).push(x);
        }
        for (const x of unions ?? []) {
            if (!u.has(x.treeId))
                u.set(x.treeId, []);
            u.get(x.treeId).push(x);
        }
        return { p, u };
    }, [persons, unions]);
    const recent = useMemo(() => [...(persons ?? [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3), [persons]);
    const treeName = (id) => trees?.find((x) => x.id === id)?.name ?? '';
    return (_jsxs(Screen, { className: "screen-no-tabs tree", children: [_jsx(TopBar, { large: true, left: _jsx(AppsButton, {}), title: _jsx("span", { className: "c-tree", children: t('tree.title') }), eyebrow: t('tree.subtitle'), right: _jsx(IconButton, { label: t('tree.newTree'), tone: "tree", onClick: () => setEditing(null), children: _jsx(IconPlus, {}) }) }), trees && trees.length === 0 && _jsx(Empty, { icon: _jsx(IconTree, { size: 40 }), title: t('tree.noTrees'), text: t('tree.noTreesText'), action: _jsx(Button, { variant: "tree", icon: _jsx(IconPlus, { size: 18 }), onClick: () => setEditing(null), children: t('tree.newTree') }) }), _jsxs("div", { className: "stack", children: [(trees ?? []).map((tr) => {
                        const ps = byTree.p.get(tr.id) ?? [];
                        const us = byTree.u.get(tr.id) ?? [];
                        const families = us.filter((u) => u.partnerIds.length === 2).length;
                        return (_jsxs("div", { role: "button", tabIndex: 0, className: "card card-tappable tree-card", onClick: () => navigate(`/tree/${tr.id}`), onKeyDown: (e) => { if (e.key === 'Enter')
                                navigate(`/tree/${tr.id}`); }, children: [_jsxs("div", { className: "hstack", children: [_jsx("div", { className: "thumb thumb-tree", children: _jsx(IconTree, { size: 24 }) }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", style: { fontSize: 17 }, children: tr.name }), _jsx("div", { className: "row-sub", children: t('tree.stats', { people: ps.length, gens: generationCount(ps, us), families }) })] }), _jsx("span", { onClick: (e) => e.stopPropagation(), children: _jsx(IconButton, { label: t('common.edit'), className: "iconbtn-plain", onClick: () => setEditing(tr), children: _jsx(IconEdit, { size: 18 }) }) }), _jsx(IconChevron, { size: 18, className: "muted" })] }), _jsxs("div", { className: "hstack", style: { marginTop: 10 }, children: [_jsxs("div", { className: "av-stack", children: [ps.slice(0, 4).map((p) => _jsx(Avatar, { person: p, size: 30 }, p.id)), ps.length > 4 && _jsxs("span", { className: "av av-u", style: { width: 30, height: 30, fontSize: 11 }, children: ["+", ps.length - 4] })] }), _jsx("span", { className: "small muted", children: t('tree.lastEdited', { when: relative(tr.updatedAt, t) }) })] })] }, tr.id));
                    }), trees && trees.length > 0 && _jsxs("button", { type: "button", className: "addslot", onClick: () => setEditing(null), children: [_jsx(IconPlus, { size: 18 }), " ", t('tree.newTree')] })] }), recent.length > 0 && (_jsxs("div", { className: "mt-lg", children: [_jsx("div", { className: "section-label", children: t('tree.recentlyAdded') }), _jsx("div", { className: "list", children: recent.map((p) => _jsx(PersonRow, { person: p, sub: treeName(p.treeId), onClick: () => navigate(`/tree/${p.treeId}?p=${p.id}`) }, p.id)) })] })), _jsx(TreeSheet, { tree: editing ?? undefined, open: editing !== undefined, onClose: () => setEditing(undefined), peopleCount: editing ? (byTree.p.get(editing.id) ?? []).length : 0 })] }));
}
function relative(ts, t) {
    const days = Math.floor((Date.now() - ts) / 86400e3);
    if (days <= 0)
        return t('tree.today');
    if (days === 1)
        return t('tree.yesterday');
    return t('tree.daysAgo', { n: days });
}
export function TreeSheet({ tree, open, onClose, peopleCount, onCreated }) {
    const t = useT();
    const [draft, setDraft] = useState(() => tree ?? newTree());
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open)
            setDraft(tree ?? newTree());
    }
    const save = async () => {
        const name = draft.name.trim();
        if (!name) {
            toast(t('pocket.nameRequired'));
            return;
        }
        const final = { ...draft, name, updatedAt: Date.now() };
        await put('trees', final);
        onClose();
        if (!tree) {
            onCreated ? onCreated(final) : navigate(`/tree/${final.id}`);
        }
    };
    const del = async () => {
        if (!tree)
            return;
        const ok = await confirmDialog({ title: t('tree.deleteTreeTitle', { name: tree.name }), message: t('tree.deleteTreeText', { n: peopleCount }), confirmLabel: t('common.delete'), danger: true });
        if (!ok)
            return;
        await deleteTree(tree.id);
        onClose();
        navigate('/tree', { replace: true });
    };
    return (_jsxs(Sheet, { open: open, onClose: onClose, title: tree ? t('tree.editTree') : t('tree.newTree'), footer: _jsxs(_Fragment, { children: [tree && _jsx(Button, { variant: "danger", onClick: del, children: t('common.delete') }), _jsx(Button, { variant: "tree", onClick: save, children: tree ? t('common.save') : t('common.add') })] }), children: [_jsx(Field, { label: t('tree.treeName'), children: _jsx(TextInput, { value: draft.name, onChange: (v) => setDraft({ ...draft, name: v }), placeholder: t('tree.treeNamePlaceholder'), autoFocus: !tree }) }), _jsx(Field, { label: t('tree.treeNotes'), children: _jsx(TextArea, { value: draft.notes, onChange: (v) => setDraft({ ...draft, notes: v }), rows: 2 }) })] }));
}
