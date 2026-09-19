import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// The family tree canvas: an infinite pan/zoom surface with people as cards, couples joined by a
// ring and children hanging from the couple. Works with mouse, trackpad and touch (pinch).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { navigate, useRoute } from '../../lib/router.js';
import { usePersons, useTree, useUnions } from '../../lib/queries.js';
import { buildGraph, childrenOf, fullName, lifeSpan, parentsOf, partnersOf, resetPositions } from '../../lib/tree.js';
import { layoutTree, NODE_H, NODE_W, unionGeometry } from '../../lib/tree-layout.js';
import { Button, Empty, IconButton } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconBack, IconChevron, IconClose, IconFit, IconLayers, IconMinus, IconMore, IconPlus, IconSearch, IconTree } from '../../ui/icons.js';
import { PersonDetails } from './person-details.js';
import { AddRelativeSheet, Avatar, PersonEditSheet, PersonRow } from './tree-ui.js';
import { TreeSheet } from './trees.js';
const MIN_S = 0.2, MAX_S = 2.5;
const clampS = (s) => Math.min(MAX_S, Math.max(MIN_S, s));
function useWide() {
    const [wide, setWide] = useState(() => matchMedia('(min-width: 900px)').matches);
    useEffect(() => {
        const mq = matchMedia('(min-width: 900px)');
        const fn = () => setWide(mq.matches);
        mq.addEventListener('change', fn);
        return () => mq.removeEventListener('change', fn);
    }, []);
    return wide;
}
export function TreeCanvasScreen({ treeId }) {
    const t = useT();
    const route = useRoute();
    const tree = useTree(treeId);
    const persons = usePersons(treeId);
    const unions = useUnions(treeId);
    const wide = useWide();
    const [selected, setSelected] = useState(route.query.get('p'));
    const [view, setView] = useState({ tx: 0, ty: 0, s: 1 });
    const viewRef = useRef(view);
    viewRef.current = view;
    const [drag, setDrag] = useState(null);
    const [search, setSearch] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [newOpen, setNewOpen] = useState(false);
    const [treeSheet, setTreeSheet] = useState(false);
    const viewportRef = useRef(null);
    const searchRef = useRef(null);
    const fitted = useRef(false);
    const g = useMemo(() => buildGraph(persons ?? [], unions ?? []), [persons, unions]);
    const layout = useMemo(() => layoutTree(persons ?? [], unions ?? [], g, tree?.rootPersonId), [persons, unions, g, tree?.rootPersonId]);
    const pos = useMemo(() => { const m = new Map(layout.pos); if (drag)
        m.set(drag.id, drag.pt); return m; }, [layout, drag]);
    const geometry = useMemo(() => unionGeometry(unions ?? [], pos), [unions, pos]);
    const selectedPerson = selected ? g.persons.get(selected) ?? null : null;
    const minLevel = useMemo(() => Math.min(0, ...layout.level.values()), [layout]);
    useEffect(() => { if (selected && persons && !persons.some((p) => p.id === selected))
        setSelected(null); }, [persons, selected]);
    // Let the canvas use the full window width on large screens.
    useEffect(() => { document.documentElement.classList.add('wide-app'); return () => document.documentElement.classList.remove('wide-app'); }, []);
    const viewportSize = () => { const el = viewportRef.current; return { w: el?.clientWidth ?? window.innerWidth, h: el?.clientHeight ?? window.innerHeight }; };
    const fit = useCallback(() => {
        const { w, h } = viewportSize();
        const b = layout.bounds;
        const bw = b.maxX - b.minX, bh = b.maxY - b.minY;
        const pad = 60;
        const s = clampS(Math.min((w - pad * 2) / Math.max(bw, 1), (h - pad * 2 - 120) / Math.max(bh, 1), 1.15));
        setView({ s, tx: (w - bw * s) / 2 - b.minX * s, ty: (h - bh * s) / 2 - b.minY * s + 20 });
    }, [layout]);
    const centerOn = useCallback((id, scale) => {
        const p = layout.pos.get(id);
        if (!p)
            return;
        const { w, h } = viewportSize();
        const s = scale ?? Math.max(viewRef.current.s, 0.8);
        setView({ s, tx: w / 2 - (p.x + NODE_W / 2) * s, ty: h / 2 - (p.y + NODE_H / 2) * s - (wide ? 0 : 40) });
    }, [layout, wide]);
    useEffect(() => {
        if (!persons || fitted.current || persons.length === 0)
            return;
        fitted.current = true;
        const p = route.query.get('p');
        if (p && layout.pos.has(p))
            centerOn(p, 1);
        else
            fit();
    }, [persons, layout, fit, centerOn, route.query]);
    const zoomBy = (f, cx, cy) => {
        const { w, h } = viewportSize();
        const x = cx ?? w / 2, y = cy ?? h / 2;
        setView((v) => {
            const s = clampS(v.s * f);
            const k = s / v.s;
            return { s, tx: x - (x - v.tx) * k, ty: y - (y - v.ty) * k };
        });
    };
    // ---- gestures ---------------------------------------------------------------------------
    const pointers = useRef(new Map());
    const gesture = useRef(null);
    const onPointerDown = (e) => {
        const el = e.currentTarget;
        // Real controls inside the viewport (empty-state button etc.) keep their normal click behaviour.
        if (e.target.closest?.('button, a, input, textarea, select'))
            return;
        try {
            el.setPointerCapture(e.pointerId);
        }
        catch { /* ignore */ }
        const rect = el.getBoundingClientRect();
        const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        pointers.current.set(e.pointerId, pt);
        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            gesture.current = { kind: 'pinch', start: pt, view: viewRef.current, moved: true, dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
            setDrag(null);
            return;
        }
        const node = e.target.closest?.('[data-pid]');
        if (node) {
            const id = node.dataset.pid;
            gesture.current = { kind: 'node', start: pt, view: viewRef.current, moved: false, id, origin: layout.pos.get(id) };
        }
        else {
            gesture.current = { kind: 'pan', start: pt, view: viewRef.current, moved: false };
        }
    };
    const onPointerMove = (e) => {
        const gs = gesture.current;
        if (!gs || !pointers.current.has(e.pointerId))
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        pointers.current.set(e.pointerId, pt);
        if (gs.kind === 'pinch' && pointers.current.size >= 2) {
            const [a, b] = [...pointers.current.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const s = clampS(gs.view.s * (dist / (gs.dist || 1)));
            const wx = (gs.mid.x - gs.view.tx) / gs.view.s, wy = (gs.mid.y - gs.view.ty) / gs.view.s;
            setView({ s, tx: mid.x - wx * s, ty: mid.y - wy * s });
            return;
        }
        const dx = pt.x - gs.start.x, dy = pt.y - gs.start.y;
        if (!gs.moved && Math.hypot(dx, dy) < 5)
            return;
        gs.moved = true;
        if (gs.kind === 'node' && gs.origin)
            setDrag({ id: gs.id, pt: { x: gs.origin.x + dx / gs.view.s, y: gs.origin.y + dy / gs.view.s } });
        else if (gs.kind === 'pan')
            setView({ ...gs.view, tx: gs.view.tx + dx, ty: gs.view.ty + dy });
    };
    const onPointerUp = async (e) => {
        pointers.current.delete(e.pointerId);
        const gs = gesture.current;
        if (!gs)
            return;
        if (gs.kind === 'pinch') {
            if (pointers.current.size === 0)
                gesture.current = null;
            return;
        }
        gesture.current = null;
        if (gs.kind === 'node') {
            if (!gs.moved) {
                setSelected(gs.id);
                return;
            }
            const p = g.persons.get(gs.id);
            const d = drag;
            if (p && d && d.id === p.id)
                await put('persons', { ...p, pos: { x: Math.round(d.pt.x), y: Math.round(d.pt.y) }, updatedAt: Date.now() });
            setDrag(null);
        }
        else if (!gs.moved) {
            setSelected(null);
        }
    };
    useEffect(() => { setDrag(null); }, [persons]);
    useEffect(() => {
        const el = viewportRef.current;
        if (!el)
            return;
        const onWheel = (e) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            if (e.ctrlKey || e.metaKey)
                zoomBy(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top);
            else
                setView((v) => ({ ...v, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY }));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);
    useEffect(() => {
        const onKey = (e) => {
            const tag = e.target?.tagName;
            const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearch('');
                setTimeout(() => searchRef.current?.focus(), 30);
                return;
            }
            if (e.key === 'Escape') {
                if (search !== null)
                    setSearch(null);
                else
                    setSelected(null);
                return;
            }
            if (typing)
                return;
            if (e.key === 'f')
                fit();
            else if (e.key === '+' || e.key === '=')
                zoomBy(1.25);
            else if (e.key === '-')
                zoomBy(0.8);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [fit, search]);
    const autoArrange = async () => {
        if (!persons)
            return;
        if (persons.some((p) => p.pos)) {
            const ok = await confirmDialog({ title: t('tree.autoArrangeTitle'), message: t('tree.autoArrangeText'), confirmLabel: t('tree.autoArrange') });
            if (!ok)
                return;
            await resetPositions(persons);
        }
        setTimeout(fit, 50);
    };
    if (tree === undefined || !persons || !unions)
        return _jsx("div", { className: "tree-canvas" });
    if (tree === null) {
        navigate('/tree', { replace: true });
        return null;
    }
    const results = search !== null ? persons.filter((p) => !search.trim() || fullName(p).toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => fullName(a).localeCompare(fullName(b))).slice(0, 40) : [];
    const selectAndCenter = (id) => { setSelected(id); centerOn(id); setSearch(null); };
    const peekSub = (p) => {
        const parents = parentsOf(g, p.id).map((x) => x.firstName || fullName(x));
        const partners = partnersOf(g, p.id).map((x) => x.person.firstName || fullName(x.person));
        const kids = childrenOf(g, p.id).length;
        const bits = [];
        if (parents.length)
            bits.push(`${p.sex === 'f' ? '♀' : p.sex === 'm' ? '♂' : ''} ${parents.join(' & ')}`.trim());
        if (partners.length)
            bits.push(`♥ ${partners.join(', ')}`);
        if (kids)
            bits.push(kids === 1 ? t('tree.childCount') : t('tree.childrenCount', { n: kids }));
        return bits.join(' · ') || lifeSpan(p);
    };
    const canvas = (_jsxs("div", { ref: viewportRef, className: "tree-viewport", onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp, children: [_jsxs("div", { className: "tree-world", style: { transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})` }, children: [_jsx("svg", { className: "tree-lines", "aria-hidden": "true", children: geometry.map(({ union, ring, partnerCenters, childTops, bus }) => {
                            const ended = union.status === 'divorced' || union.status === 'separated';
                            return (_jsxs("g", { className: ended ? 'ended' : '', children: [partnerCenters.length === 2 && _jsx("line", { x1: partnerCenters[0].x, y1: partnerCenters[0].y, x2: partnerCenters[1].x, y2: partnerCenters[1].y }), ring && bus !== null && _jsx("line", { x1: ring.x, y1: ring.y, x2: ring.x, y2: bus }), bus !== null && childTops.length > 0 && ring && _jsx("line", { x1: Math.min(ring.x, ...childTops.map((c) => c.pt.x)), y1: bus, x2: Math.max(ring.x, ...childTops.map((c) => c.pt.x)), y2: bus }), bus !== null && childTops.map((c) => _jsx("line", { x1: c.pt.x, y1: bus, x2: c.pt.x, y2: c.pt.y }, c.id)), ring && partnerCenters.length === 2 && _jsx("circle", { className: "ring", cx: ring.x, cy: ring.y, r: 6 }), ring && partnerCenters.length !== 2 && childTops.length > 0 && _jsx("circle", { className: "ring small", cx: ring.x, cy: ring.y, r: 4 })] }, union.id));
                        }) }), persons.map((p) => {
                        const pt = pos.get(p.id);
                        if (!pt)
                            return null;
                        return (_jsxs("div", { "data-pid": p.id, className: `tn ${selected === p.id ? 'sel' : ''} ${p.deceased ? 'dead' : ''} ${drag?.id === p.id ? 'dragging' : ''}`, style: { left: pt.x, top: pt.y }, title: fullName(p), children: [_jsx(Avatar, { person: p, size: 34 }), _jsxs("div", { className: "tn-text", children: [_jsx("div", { className: "tn-name", children: p.firstName || fullName(p) }), _jsx("div", { className: "tn-sub", children: lifeSpan(p) || p.lastName })] })] }, p.id));
                    })] }), persons.length === 0 && (_jsx("div", { className: "tree-empty", children: _jsx(Empty, { icon: _jsx(IconTree, { size: 40 }), title: t('tree.emptyCanvas'), text: t('tree.emptyCanvasText'), action: _jsx(Button, { variant: "tree", icon: _jsx(IconPlus, { size: 18 }), onClick: () => setNewOpen(true), children: t('tree.addFirstPerson') }) }) }))] }));
    const topbar = (_jsxs("div", { className: "tree-top", children: [_jsx(IconButton, { label: t('common.back'), className: "float", onClick: () => navigate('/tree'), children: _jsx(IconBack, {}) }), _jsxs("button", { type: "button", className: "tree-title float", onClick: () => { setSearch(''); setTimeout(() => searchRef.current?.focus(), 30); }, children: [_jsx("span", { className: "bold", children: tree.name }), _jsx("span", { className: "small muted", children: persons.length === 1 ? t('tree.personCount1') : t('tree.peopleCount', { n: persons.length }) }), _jsx("span", { style: { flex: 1 } }), _jsx(IconSearch, { size: 18, className: "muted" }), wide && _jsx("kbd", { children: "\u2318K" })] }), _jsx(IconButton, { label: t('tree.moreOptions'), className: "float", onClick: () => setTreeSheet(true), children: _jsx(IconMore, {}) })] }));
    const zoomBar = (_jsxs("div", { className: "tree-zoom float", children: [_jsx(IconButton, { label: t('tree.zoomOut'), className: "iconbtn-plain", onClick: () => zoomBy(0.8), children: _jsx(IconMinus, { size: 18 }) }), _jsxs("span", { className: "num small bold", style: { width: 44, textAlign: 'center' }, children: [Math.round(view.s * 100), "%"] }), _jsx(IconButton, { label: t('tree.zoomIn'), className: "iconbtn-plain", onClick: () => zoomBy(1.25), children: _jsx(IconPlus, { size: 18 }) }), _jsx("span", { className: "vsep" }), _jsx(IconButton, { label: t('tree.fit'), className: "iconbtn-plain", onClick: fit, children: _jsx(IconFit, { size: 18 }) }), _jsx(IconButton, { label: t('tree.autoArrange'), className: "iconbtn-plain", onClick: autoArrange, children: _jsx(IconLayers, { size: 18 }) })] }));
    const minimap = persons.length > 1 ? _jsx(Minimap, { pos: pos, bounds: layout.bounds, view: view, viewport: viewportSize(), selected: selected, onJump: (x, y) => { const { w, h } = viewportSize(); setView((v) => ({ ...v, tx: w / 2 - x * v.s, ty: h / 2 - y * v.s })); } }) : null;
    const fab = _jsx("button", { type: "button", className: "fab fab-tree fab-round", "aria-label": t('tree.addPerson'), onClick: () => (selectedPerson ? setAddOpen(true) : setNewOpen(true)), children: _jsx(IconPlus, { size: 24, strokeWidth: 2.5 }) });
    const sheets = (_jsxs(_Fragment, { children: [_jsx(AddRelativeSheet, { open: addOpen, onClose: () => setAddOpen(false), person: selectedPerson, g: g, onAdded: (p) => { setSelected(p.id); setTimeout(() => centerOn(p.id), 80); } }), _jsx(PersonEditSheet, { open: newOpen, onClose: () => setNewOpen(false), treeId: treeId, onSaved: (p) => { setSelected(p.id); fitted.current = false; } }), _jsx(TreeSheet, { tree: tree, open: treeSheet, onClose: () => setTreeSheet(false), peopleCount: persons.length }), search !== null && (_jsx("div", { className: "tree-search", onClick: () => setSearch(null), children: _jsxs("div", { className: "tree-search-box", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "searchbar", style: { margin: 0 }, children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { ref: searchRef, className: "input", value: search, placeholder: t('tree.search'), onChange: (e) => setSearch(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && results[0])
                                        selectAndCenter(results[0].id); } })] }), _jsxs("div", { className: "list", style: { marginTop: 10, maxHeight: '50vh', overflowY: 'auto' }, children: [results.length === 0 && _jsx("div", { className: "row small muted", children: t('tree.noMatches') }), results.map((p) => _jsx(PersonRow, { person: p, sub: lifeSpan(p), onClick: () => selectAndCenter(p.id) }, p.id))] })] }) }))] }));
    if (wide) {
        return (_jsxs("div", { className: "tree-canvas wide", children: [_jsxs("div", { className: "tree-stage", children: [canvas, topbar, _jsx("div", { className: "tree-bottom-left", children: zoomBar }), _jsxs("div", { className: "tree-bottom-right", children: [_jsx("span", { className: "tree-hint float", children: t('tree.hint') }), _jsx(Button, { variant: "tree", icon: _jsx(IconPlus, { size: 18, strokeWidth: 2.5 }), onClick: () => (selectedPerson ? setAddOpen(true) : setNewOpen(true)), children: selectedPerson ? t('tree.addRelative') : t('tree.addPerson') })] }), _jsx("div", { className: "tree-minimap-wrap", children: minimap })] }), _jsx("aside", { className: "tree-panel", children: selectedPerson ? (_jsx(PersonDetails, { person: selectedPerson, g: g, tree: tree, level: (layout.level.get(selectedPerson.id) ?? 0) - minLevel, wide: true, onSelect: (id) => { setSelected(id); centerOn(id); }, onClose: () => setSelected(null), onCenter: () => centerOn(selectedPerson.id) }, selectedPerson.id)) : (_jsxs("div", { className: "tree-panel-empty", children: [_jsx(IconTree, { size: 36, className: "muted" }), _jsx("div", { className: "bold", children: tree.name }), _jsx("div", { className: "small muted", children: t('tree.shortcuts') }), _jsx("div", { className: "small muted", children: t('tree.hintPhone') })] })) }), sheets] }));
    }
    return (_jsxs("div", { className: "tree-canvas", children: [canvas, topbar, _jsx("div", { className: "tree-bottom-left", children: zoomBar }), !selectedPerson && _jsx("div", { className: "tree-minimap-wrap phone", children: minimap }), _jsx("div", { className: "tree-bottom-right", children: fab }), selectedPerson && (_jsxs("div", { className: "tree-peek float", children: [_jsx(Avatar, { person: selectedPerson, size: 36 }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: fullName(selectedPerson) }), _jsx("div", { className: "row-sub", children: peekSub(selectedPerson) })] }), _jsx(IconButton, { label: t('common.close'), className: "iconbtn-plain", onClick: () => setSelected(null), children: _jsx(IconClose, { size: 16 }) }), _jsx(IconButton, { label: t('tree.open'), tone: "tree", onClick: () => navigate(`/tree/${treeId}/person/${selectedPerson.id}`), children: _jsx(IconChevron, { size: 18 }) })] })), sheets] }));
}
function Minimap({ pos, bounds, view, viewport, selected, onJump }) {
    const W = 110, H = 72, pad = 6;
    const bw = Math.max(bounds.maxX - bounds.minX, 1), bh = Math.max(bounds.maxY - bounds.minY, 1);
    const k = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
    const ox = pad + ((W - pad * 2) - bw * k) / 2 - bounds.minX * k, oy = pad + ((H - pad * 2) - bh * k) / 2 - bounds.minY * k;
    const vx = (-view.tx / view.s) * k + ox, vy = (-view.ty / view.s) * k + oy, vw = (viewport.w / view.s) * k, vh = (viewport.h / view.s) * k;
    return (_jsxs("svg", { className: "tree-minimap float", width: W, height: H, viewBox: `0 0 ${W} ${H}`, onClick: (e) => { const r = e.currentTarget.getBoundingClientRect(); onJump((e.clientX - r.left - ox) / k, (e.clientY - r.top - oy) / k); }, children: [[...pos.entries()].map(([id, p]) => _jsx("rect", { x: p.x * k + ox, y: p.y * k + oy, width: Math.max(2, NODE_W * k), height: Math.max(1.5, NODE_H * k), rx: 1, className: id === selected ? 'sel' : '' }, id)), _jsx("rect", { className: "vp", x: vx, y: vy, width: vw, height: vh, rx: 2 })] }));
}
