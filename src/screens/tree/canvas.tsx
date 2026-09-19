// The family tree canvas: an infinite pan/zoom surface with people as cards, couples joined by a
// ring and children hanging from the couple. Works with mouse, trackpad and touch (pinch).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import type { Person } from '../../lib/models.js';
import { navigate, useRoute } from '../../lib/router.js';
import { usePersons, useTree, useUnions } from '../../lib/queries.js';
import { buildGraph, childrenOf, fullName, lifeSpan, parentsOf, partnersOf, resetPositions } from '../../lib/tree.js';
import { layoutTree, NODE_H, NODE_W, unionGeometry, type Pt } from '../../lib/tree-layout.js';
import { Button, Empty, IconButton } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconBack, IconChevron, IconClose, IconFit, IconLayers, IconMinus, IconMore, IconPlus, IconSearch, IconTree } from '../../ui/icons.js';
import { PersonDetails } from './person-details.js';
import { AddRelativeSheet, Avatar, PersonEditSheet, PersonRow } from './tree-ui.js';
import { TreeSheet } from './trees.js';

interface View { tx: number; ty: number; s: number }
const MIN_S = 0.2, MAX_S = 2.5;
const clampS = (s: number) => Math.min(MAX_S, Math.max(MIN_S, s));

function useWide(): boolean {
  const [wide, setWide] = useState(() => matchMedia('(min-width: 900px)').matches);
  useEffect(() => {
    const mq = matchMedia('(min-width: 900px)');
    const fn = () => setWide(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return wide;
}

export function TreeCanvasScreen({ treeId }: { treeId: string }) {
  const t = useT();
  const route = useRoute();
  const tree = useTree(treeId);
  const persons = usePersons(treeId);
  const unions = useUnions(treeId);
  const wide = useWide();

  const [selected, setSelected] = useState<string | null>(route.query.get('p'));
  const [view, setView] = useState<View>({ tx: 0, ty: 0, s: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [drag, setDrag] = useState<{ id: string; pt: Pt } | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [treeSheet, setTreeSheet] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const fitted = useRef(false);

  const g = useMemo(() => buildGraph(persons ?? [], unions ?? []), [persons, unions]);
  const layout = useMemo(() => layoutTree(persons ?? [], unions ?? [], g, tree?.rootPersonId), [persons, unions, g, tree?.rootPersonId]);
  const pos = useMemo(() => { const m = new Map(layout.pos); if (drag) m.set(drag.id, drag.pt); return m; }, [layout, drag]);
  const geometry = useMemo(() => unionGeometry(unions ?? [], pos), [unions, pos]);
  const selectedPerson = selected ? g.persons.get(selected) ?? null : null;
  const minLevel = useMemo(() => Math.min(0, ...layout.level.values()), [layout]);
  useEffect(() => { if (selected && persons && !persons.some((p) => p.id === selected)) setSelected(null); }, [persons, selected]);

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

  const centerOn = useCallback((id: string, scale?: number) => {
    const p = layout.pos.get(id);
    if (!p) return;
    const { w, h } = viewportSize();
    const s = scale ?? Math.max(viewRef.current.s, 0.8);
    setView({ s, tx: w / 2 - (p.x + NODE_W / 2) * s, ty: h / 2 - (p.y + NODE_H / 2) * s - (wide ? 0 : 40) });
  }, [layout, wide]);

  useEffect(() => {
    if (!persons || fitted.current || persons.length === 0) return;
    fitted.current = true;
    const p = route.query.get('p');
    if (p && layout.pos.has(p)) centerOn(p, 1); else fit();
  }, [persons, layout, fit, centerOn, route.query]);

  const zoomBy = (f: number, cx?: number, cy?: number) => {
    const { w, h } = viewportSize();
    const x = cx ?? w / 2, y = cy ?? h / 2;
    setView((v) => {
      const s = clampS(v.s * f);
      const k = s / v.s;
      return { s, tx: x - (x - v.tx) * k, ty: y - (y - v.ty) * k };
    });
  };

  // ---- gestures ---------------------------------------------------------------------------
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ kind: 'pan' | 'node' | 'pinch'; start: Pt; view: View; moved: boolean; id?: string; origin?: Pt; dist?: number; mid?: Pt } | null>(null);

  const onPointerDown = (e: { pointerId: number; clientX: number; clientY: number; target: EventTarget; currentTarget: HTMLDivElement; preventDefault: () => void }) => {
    const el = e.currentTarget;
    // Real controls inside the viewport (empty-state button etc.) keep their normal click behaviour.
    if ((e.target as Element).closest?.('button, a, input, textarea, select')) return;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const rect = el.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    pointers.current.set(e.pointerId, pt);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', start: pt, view: viewRef.current, moved: true, dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      setDrag(null);
      return;
    }
    const node = (e.target as Element).closest?.('[data-pid]') as HTMLElement | null;
    if (node) {
      const id = node.dataset.pid!;
      gesture.current = { kind: 'node', start: pt, view: viewRef.current, moved: false, id, origin: layout.pos.get(id) };
    } else {
      gesture.current = { kind: 'pan', start: pt, view: viewRef.current, moved: false };
    }
  };
  const onPointerMove = (e: { pointerId: number; clientX: number; clientY: number; currentTarget: HTMLDivElement }) => {
    const gs = gesture.current;
    if (!gs || !pointers.current.has(e.pointerId)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    pointers.current.set(e.pointerId, pt);
    if (gs.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = clampS(gs.view.s * (dist / (gs.dist || 1)));
      const wx = (gs.mid!.x - gs.view.tx) / gs.view.s, wy = (gs.mid!.y - gs.view.ty) / gs.view.s;
      setView({ s, tx: mid.x - wx * s, ty: mid.y - wy * s });
      return;
    }
    const dx = pt.x - gs.start.x, dy = pt.y - gs.start.y;
    if (!gs.moved && Math.hypot(dx, dy) < 5) return;
    gs.moved = true;
    if (gs.kind === 'node' && gs.origin) setDrag({ id: gs.id!, pt: { x: gs.origin.x + dx / gs.view.s, y: gs.origin.y + dy / gs.view.s } });
    else if (gs.kind === 'pan') setView({ ...gs.view, tx: gs.view.tx + dx, ty: gs.view.ty + dy });
  };
  const onPointerUp = async (e: { pointerId: number }) => {
    pointers.current.delete(e.pointerId);
    const gs = gesture.current;
    if (!gs) return;
    if (gs.kind === 'pinch') { if (pointers.current.size === 0) gesture.current = null; return; }
    gesture.current = null;
    if (gs.kind === 'node') {
      if (!gs.moved) { setSelected(gs.id!); return; }
      const p = g.persons.get(gs.id!);
      const d = drag;
      if (p && d && d.id === p.id) await put('persons', { ...p, pos: { x: Math.round(d.pt.x), y: Math.round(d.pt.y) }, updatedAt: Date.now() });
      setDrag(null);
    } else if (!gs.moved) {
      setSelected(null);
    }
  };
  useEffect(() => { setDrag(null); }, [persons]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomBy(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top);
      else setView((v) => ({ ...v, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(''); setTimeout(() => searchRef.current?.focus(), 30); return; }
      if (e.key === 'Escape') { if (search !== null) setSearch(null); else setSelected(null); return; }
      if (typing) return;
      if (e.key === 'f') fit();
      else if (e.key === '+' || e.key === '=') zoomBy(1.25);
      else if (e.key === '-') zoomBy(0.8);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fit, search]);

  const autoArrange = async () => {
    if (!persons) return;
    if (persons.some((p) => p.pos)) {
      const ok = await confirmDialog({ title: t('tree.autoArrangeTitle'), message: t('tree.autoArrangeText'), confirmLabel: t('tree.autoArrange') });
      if (!ok) return;
      await resetPositions(persons);
    }
    setTimeout(fit, 50);
  };

  if (tree === undefined || !persons || !unions) return <div className="tree-canvas" />;
  if (tree === null) { navigate('/tree', { replace: true }); return null; }

  const results = search !== null ? persons.filter((p) => !search.trim() || fullName(p).toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => fullName(a).localeCompare(fullName(b))).slice(0, 40) : [];
  const selectAndCenter = (id: string) => { setSelected(id); centerOn(id); setSearch(null); };
  const peekSub = (p: Person) => {
    const parents = parentsOf(g, p.id).map((x) => x.firstName || fullName(x));
    const partners = partnersOf(g, p.id).map((x) => x.person.firstName || fullName(x.person));
    const kids = childrenOf(g, p.id).length;
    const bits: string[] = [];
    if (parents.length) bits.push(`${p.sex === 'f' ? '♀' : p.sex === 'm' ? '♂' : ''} ${parents.join(' & ')}`.trim());
    if (partners.length) bits.push(`♥ ${partners.join(', ')}`);
    if (kids) bits.push(kids === 1 ? t('tree.childCount') : t('tree.childrenCount', { n: kids }));
    return bits.join(' · ') || lifeSpan(p);
  };

  const canvas = (
    <div ref={viewportRef} className="tree-viewport" onPointerDown={onPointerDown as any} onPointerMove={onPointerMove as any} onPointerUp={onPointerUp as any} onPointerCancel={onPointerUp as any}>
      <div className="tree-world" style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})` }}>
        <svg className="tree-lines" aria-hidden="true">
          {geometry.map(({ union, ring, partnerCenters, childTops, bus }) => {
            const ended = union.status === 'divorced' || union.status === 'separated';
            return (
              <g key={union.id} className={ended ? 'ended' : ''}>
                {partnerCenters.length === 2 && <line x1={partnerCenters[0].x} y1={partnerCenters[0].y} x2={partnerCenters[1].x} y2={partnerCenters[1].y} />}
                {ring && bus !== null && <line x1={ring.x} y1={ring.y} x2={ring.x} y2={bus} />}
                {bus !== null && childTops.length > 0 && ring && <line x1={Math.min(ring.x, ...childTops.map((c) => c.pt.x))} y1={bus} x2={Math.max(ring.x, ...childTops.map((c) => c.pt.x))} y2={bus} />}
                {bus !== null && childTops.map((c) => <line key={c.id} x1={c.pt.x} y1={bus} x2={c.pt.x} y2={c.pt.y} />)}
                {ring && partnerCenters.length === 2 && <circle className="ring" cx={ring.x} cy={ring.y} r={6} />}
                {ring && partnerCenters.length !== 2 && childTops.length > 0 && <circle className="ring small" cx={ring.x} cy={ring.y} r={4} />}
              </g>
            );
          })}
        </svg>
        {persons.map((p) => {
          const pt = pos.get(p.id);
          if (!pt) return null;
          return (
            <div key={p.id} data-pid={p.id} className={`tn ${selected === p.id ? 'sel' : ''} ${p.deceased ? 'dead' : ''} ${drag?.id === p.id ? 'dragging' : ''}`} style={{ left: pt.x, top: pt.y }} title={fullName(p)}>
              <Avatar person={p} size={34} />
              <div className="tn-text">
                <div className="tn-name">{p.firstName || fullName(p)}</div>
                <div className="tn-sub">{lifeSpan(p) || p.lastName}</div>
              </div>
            </div>
          );
        })}
      </div>
      {persons.length === 0 && (
        <div className="tree-empty">
          <Empty icon={<IconTree size={40} />} title={t('tree.emptyCanvas')} text={t('tree.emptyCanvasText')} action={<Button variant="tree" icon={<IconPlus size={18} />} onClick={() => setNewOpen(true)}>{t('tree.addFirstPerson')}</Button>} />
        </div>
      )}
    </div>
  );

  const topbar = (
    <div className="tree-top">
      <IconButton label={t('common.back')} className="float" onClick={() => navigate('/tree')}><IconBack /></IconButton>
      <button type="button" className="tree-title float" onClick={() => { setSearch(''); setTimeout(() => searchRef.current?.focus(), 30); }}>
        <span className="bold">{tree.name}</span>
        <span className="small muted">{persons.length === 1 ? t('tree.personCount1') : t('tree.peopleCount', { n: persons.length })}</span>
        <span style={{ flex: 1 }} />
        <IconSearch size={18} className="muted" />
        {wide && <kbd>⌘K</kbd>}
      </button>
      <IconButton label={t('tree.moreOptions')} className="float" onClick={() => setTreeSheet(true)}><IconMore /></IconButton>
    </div>
  );

  const zoomBar = (
    <div className="tree-zoom float">
      <IconButton label={t('tree.zoomOut')} className="iconbtn-plain" onClick={() => zoomBy(0.8)}><IconMinus size={18} /></IconButton>
      <span className="num small bold" style={{ width: 44, textAlign: 'center' }}>{Math.round(view.s * 100)}%</span>
      <IconButton label={t('tree.zoomIn')} className="iconbtn-plain" onClick={() => zoomBy(1.25)}><IconPlus size={18} /></IconButton>
      <span className="vsep" />
      <IconButton label={t('tree.fit')} className="iconbtn-plain" onClick={fit}><IconFit size={18} /></IconButton>
      <IconButton label={t('tree.autoArrange')} className="iconbtn-plain" onClick={autoArrange}><IconLayers size={18} /></IconButton>
    </div>
  );

  const minimap = persons.length > 1 ? <Minimap pos={pos} bounds={layout.bounds} view={view} viewport={viewportSize()} selected={selected} onJump={(x, y) => { const { w, h } = viewportSize(); setView((v) => ({ ...v, tx: w / 2 - x * v.s, ty: h / 2 - y * v.s })); }} /> : null;

  const fab = <button type="button" className="fab fab-tree fab-round" aria-label={t('tree.addPerson')} onClick={() => (selectedPerson ? setAddOpen(true) : setNewOpen(true))}><IconPlus size={24} strokeWidth={2.5} /></button>;

  const sheets = (
    <>
      <AddRelativeSheet open={addOpen} onClose={() => setAddOpen(false)} person={selectedPerson} g={g} onAdded={(p) => { setSelected(p.id); setTimeout(() => centerOn(p.id), 80); }} />
      <PersonEditSheet open={newOpen} onClose={() => setNewOpen(false)} treeId={treeId} onSaved={(p) => { setSelected(p.id); fitted.current = false; }} />
      <TreeSheet tree={tree} open={treeSheet} onClose={() => setTreeSheet(false)} peopleCount={persons.length} />
      {search !== null && (
        <div className="tree-search" onClick={() => setSearch(null)}>
          <div className="tree-search-box" onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
            <div className="searchbar" style={{ margin: 0 }}><IconSearch size={18} /><input ref={searchRef} className="input" value={search} placeholder={t('tree.search')} onChange={(e: { target: HTMLInputElement }) => setSearch(e.target.value)} onKeyDown={(e: { key: string }) => { if (e.key === 'Enter' && results[0]) selectAndCenter(results[0].id); }} /></div>
            <div className="list" style={{ marginTop: 10, maxHeight: '50vh', overflowY: 'auto' }}>
              {results.length === 0 && <div className="row small muted">{t('tree.noMatches')}</div>}
              {results.map((p) => <PersonRow key={p.id} person={p} sub={lifeSpan(p)} onClick={() => selectAndCenter(p.id)} />)}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (wide) {
    return (
      <div className="tree-canvas wide">
        <div className="tree-stage">
          {canvas}{topbar}
          <div className="tree-bottom-left">{zoomBar}</div>
          <div className="tree-bottom-right">
            <span className="tree-hint float">{t('tree.hint')}</span>
            <Button variant="tree" icon={<IconPlus size={18} strokeWidth={2.5} />} onClick={() => (selectedPerson ? setAddOpen(true) : setNewOpen(true))}>{selectedPerson ? t('tree.addRelative') : t('tree.addPerson')}</Button>
          </div>
          <div className="tree-minimap-wrap">{minimap}</div>
        </div>
        <aside className="tree-panel">
          {selectedPerson ? (
            <PersonDetails key={selectedPerson.id} person={selectedPerson} g={g} tree={tree} level={(layout.level.get(selectedPerson.id) ?? 0) - minLevel} wide onSelect={(id) => { setSelected(id); centerOn(id); }} onClose={() => setSelected(null)} onCenter={() => centerOn(selectedPerson.id)} />
          ) : (
            <div className="tree-panel-empty">
              <IconTree size={36} className="muted" />
              <div className="bold">{tree.name}</div>
              <div className="small muted">{t('tree.shortcuts')}</div>
              <div className="small muted">{t('tree.hintPhone')}</div>
            </div>
          )}
        </aside>
        {sheets}
      </div>
    );
  }

  return (
    <div className="tree-canvas">
      {canvas}{topbar}
      <div className="tree-bottom-left">{zoomBar}</div>
      {!selectedPerson && <div className="tree-minimap-wrap phone">{minimap}</div>}
      <div className="tree-bottom-right">{fab}</div>
      {selectedPerson && (
        <div className="tree-peek float">
          <Avatar person={selectedPerson} size={36} />
          <div className="row-main">
            <div className="row-title">{fullName(selectedPerson)}</div>
            <div className="row-sub">{peekSub(selectedPerson)}</div>
          </div>
          <IconButton label={t('common.close')} className="iconbtn-plain" onClick={() => setSelected(null)}><IconClose size={16} /></IconButton>
          <IconButton label={t('tree.open')} tone="tree" onClick={() => navigate(`/tree/${treeId}/person/${selectedPerson.id}`)}><IconChevron size={18} /></IconButton>
        </div>
      )}
      {sheets}
    </div>
  );
}

function Minimap({ pos, bounds, view, viewport, selected, onJump }: { pos: Map<string, Pt>; bounds: { minX: number; minY: number; maxX: number; maxY: number }; view: View; viewport: { w: number; h: number }; selected: string | null; onJump: (x: number, y: number) => void }) {
  const W = 110, H = 72, pad = 6;
  const bw = Math.max(bounds.maxX - bounds.minX, 1), bh = Math.max(bounds.maxY - bounds.minY, 1);
  const k = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
  const ox = pad + ((W - pad * 2) - bw * k) / 2 - bounds.minX * k, oy = pad + ((H - pad * 2) - bh * k) / 2 - bounds.minY * k;
  const vx = (-view.tx / view.s) * k + ox, vy = (-view.ty / view.s) * k + oy, vw = (viewport.w / view.s) * k, vh = (viewport.h / view.s) * k;
  return (
    <svg className="tree-minimap float" width={W} height={H} viewBox={`0 0 ${W} ${H}`} onClick={(e: { clientX: number; clientY: number; currentTarget: SVGSVGElement }) => { const r = e.currentTarget.getBoundingClientRect(); onJump((e.clientX - r.left - ox) / k, (e.clientY - r.top - oy) / k); }}>
      {[...pos.entries()].map(([id, p]) => <rect key={id} x={p.x * k + ox} y={p.y * k + oy} width={Math.max(2, NODE_W * k)} height={Math.max(1.5, NODE_H * k)} rx={1} className={id === selected ? 'sel' : ''} />)}
      <rect className="vp" x={vx} y={vy} width={vw} height={vh} rx={2} />
    </svg>
  );
}
