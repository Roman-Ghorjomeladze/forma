import { assignLevels } from './tree.js';
export const NODE_W = 132;
export const NODE_H = 64;
export const H_GAP = 26; // between unrelated neighbours in a row
export const COUPLE_GAP = 38; // between partners (room for the ring)
export const ROW_GAP = 96; // vertical space between rows
export const COMPONENT_GAP = 140;
/** Connected components over the union graph. */
function components(g) {
    const seen = new Set();
    const out = [];
    const sorted = [...g.persons.values()].sort((a, b) => a.createdAt - b.createdAt);
    for (const p of sorted) {
        if (seen.has(p.id))
            continue;
        const comp = [];
        const queue = [p.id];
        seen.add(p.id);
        while (queue.length) {
            const id = queue.shift();
            comp.push(id);
            const nb = [];
            for (const u of g.unionsOf.get(id) ?? [])
                nb.push(...u.partnerIds, ...u.childIds);
            const pu = g.parentUnionOf.get(id);
            if (pu)
                nb.push(...pu.partnerIds, ...pu.childIds);
            for (const n of nb)
                if (g.persons.has(n) && !seen.has(n)) {
                    seen.add(n);
                    queue.push(n);
                }
        }
        out.push(comp);
    }
    return out;
}
/** Groups the persons of one row into chains of partners (a - b - c for someone with two partners). */
function buildChains(ids, g, level) {
    const set = new Set(ids);
    const adj = new Map();
    for (const id of ids)
        adj.set(id, new Set());
    for (const id of ids)
        for (const u of g.unionsOf.get(id) ?? [])
            for (const o of u.partnerIds)
                if (o !== id && set.has(o) && level.get(o) === level.get(id)) {
                    adj.get(id).add(o);
                    adj.get(o).add(id);
                }
    const seen = new Set();
    const chains = [];
    for (const id of ids) {
        if (seen.has(id))
            continue;
        // collect the connected group
        const group = [];
        const stack = [id];
        seen.add(id);
        while (stack.length) {
            const x = stack.pop();
            group.push(x);
            for (const n of adj.get(x))
                if (!seen.has(n)) {
                    seen.add(n);
                    stack.push(n);
                }
        }
        // walk it linearly from an endpoint (degree <= 1) so partners end up adjacent
        let start = group.find((x) => adj.get(x).size <= 1) ?? group[0];
        const ordered = [];
        const used = new Set();
        let cur = start;
        while (cur) {
            ordered.push(cur);
            used.add(cur);
            cur = [...adj.get(cur)].find((n) => !used.has(n));
        }
        for (const x of group)
            if (!used.has(x))
                ordered.push(x);
        chains.push({ ids: ordered, x: 0, w: ordered.length * NODE_W + (ordered.length - 1) * COUPLE_GAP });
    }
    return chains;
}
function pack(chains, startX = 0) {
    let x = startX;
    for (const c of chains) {
        c.x = x;
        x += c.w + H_GAP;
    }
}
function centerOf(c) { return c.x + c.w / 2; }
function nodeCenter(id, chainsByLevel, idx) {
    const m = idx.get(id);
    if (!m)
        return null;
    const c = chainsByLevel[m.level][m.chain];
    return c.x + m.i * (NODE_W + COUPLE_GAP) + NODE_W / 2;
}
function layoutComponent(ids, g, level) {
    const min = Math.min(...ids.map((id) => level.get(id) ?? 0));
    const rows = new Map();
    for (const id of ids) {
        const l = (level.get(id) ?? 0) - min;
        if (!rows.has(l))
            rows.set(l, []);
        rows.get(l).push(id);
    }
    const depth = Math.max(...rows.keys()) + 1;
    const chainsByLevel = [];
    for (let l = 0; l < depth; l++)
        chainsByLevel.push(buildChains(rows.get(l) ?? [], g, level));
    const rebuildIndex = () => {
        const idx = new Map();
        chainsByLevel.forEach((chains, l) => chains.forEach((c, ci) => c.ids.forEach((id, i) => idx.set(id, { level: l, chain: ci, i }))));
        return idx;
    };
    let idx = rebuildIndex();
    chainsByLevel.forEach((chains) => pack(chains));
    // --- ordering: barycenter sweeps (parents above, children below) ---
    const parentKey = (c) => {
        const xs = [];
        for (const id of c.ids) {
            const pu = g.parentUnionOf.get(id);
            if (pu)
                for (const pid of pu.partnerIds) {
                    const x = nodeCenter(pid, chainsByLevel, idx);
                    if (x !== null)
                        xs.push(x);
                }
        }
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    };
    const childKey = (c) => {
        const xs = [];
        for (const id of c.ids)
            for (const u of g.unionsOf.get(id) ?? [])
                for (const cid of u.childIds) {
                    const x = nodeCenter(cid, chainsByLevel, idx);
                    if (x !== null)
                        xs.push(x);
                }
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    };
    const sortBy = (chains, key) => {
        const keyed = chains.map((c, i) => ({ c, i, k: key(c) }));
        // chains without a key keep their relative order, slotted after keyed ones near their old index
        keyed.sort((a, b) => {
            const ka = a.k ?? centerOf(a.c), kb = b.k ?? centerOf(b.c);
            return ka - kb || a.i - b.i;
        });
        return keyed.map((k) => k.c);
    };
    for (let iter = 0; iter < 4; iter++) {
        for (let l = 1; l < depth; l++) {
            chainsByLevel[l] = sortBy(chainsByLevel[l], parentKey);
            pack(chainsByLevel[l]);
            idx = rebuildIndex();
        }
        for (let l = depth - 2; l >= 0; l--) {
            chainsByLevel[l] = sortBy(chainsByLevel[l], childKey);
            pack(chainsByLevel[l]);
            idx = rebuildIndex();
        }
    }
    // --- x refinement: parents centred over children (bottom-up), then children under parents ---
    const place = (chains, key) => {
        let prevRight = -Infinity;
        for (const c of chains) {
            const k = key(c);
            let x = k !== null ? k - c.w / 2 : c.x;
            if (x < prevRight + H_GAP)
                x = prevRight === -Infinity ? x : prevRight + H_GAP;
            c.x = x;
            prevRight = c.x + c.w;
        }
    };
    for (let pass = 0; pass < 2; pass++) {
        for (let l = depth - 2; l >= 0; l--) {
            place(chainsByLevel[l], childKey);
            idx = rebuildIndex();
        }
        for (let l = 1; l < depth; l++) {
            // only pull a chain under its parents when every member shares the same parent union
            place(chainsByLevel[l], (c) => {
                const pus = new Set(c.ids.map((id) => g.parentUnionOf.get(id)?.id ?? null));
                if (pus.size !== 1 || pus.has(null))
                    return null;
                return parentKey(c);
            });
            idx = rebuildIndex();
        }
    }
    // --- normalise so the component starts at x = 0 ---
    let minX = Infinity, maxX = -Infinity;
    for (const chains of chainsByLevel)
        for (const c of chains) {
            minX = Math.min(minX, c.x);
            maxX = Math.max(maxX, c.x + c.w);
        }
    if (!Number.isFinite(minX)) {
        minX = 0;
        maxX = 0;
    }
    const pos = new Map();
    chainsByLevel.forEach((chains, l) => chains.forEach((c) => c.ids.forEach((id, i) => pos.set(id, { x: c.x - minX + i * (NODE_W + COUPLE_GAP), y: l * (NODE_H + ROW_GAP) }))));
    return { pos, width: maxX - minX, height: depth * (NODE_H + ROW_GAP) - ROW_GAP };
}
export function layoutTree(persons, unions, g, rootId) {
    const level = assignLevels(g, rootId);
    const pos = new Map();
    let offsetX = 0;
    const comps = components(g);
    // put the root's component first
    if (rootId)
        comps.sort((a, b) => (a.includes(rootId) ? -1 : 0) - (b.includes(rootId) ? -1 : 0));
    for (const comp of comps) {
        const r = layoutComponent(comp, g, level);
        for (const [id, p] of r.pos)
            pos.set(id, { x: p.x + offsetX, y: p.y });
        offsetX += r.width + COMPONENT_GAP;
    }
    // manual overrides
    for (const p of persons)
        if (p.pos && pos.has(p.id))
            pos.set(p.id, { x: p.pos.x, y: p.pos.y });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pos.values()) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x + NODE_W);
        maxY = Math.max(maxY, p.y + NODE_H);
    }
    if (!Number.isFinite(minX)) {
        minX = 0;
        minY = 0;
        maxX = NODE_W;
        maxY = NODE_H;
    }
    void unions;
    return { pos, level, bounds: { minX, minY, maxX, maxY } };
}
/** Where each union's ring sits and the polylines to its children (for the SVG layer). */
export function unionGeometry(unions, pos) {
    const out = [];
    for (const u of unions) {
        const partnerCenters = u.partnerIds.map((id) => pos.get(id)).filter((p) => !!p).map((p) => ({ x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 }));
        const childTops = u.childIds.map((id) => ({ id, pt: pos.get(id) })).filter((c) => !!c.pt).map((c) => ({ id: c.id, pt: { x: c.pt.x + NODE_W / 2, y: c.pt.y } }));
        let ring = null;
        if (partnerCenters.length === 2)
            ring = { x: (partnerCenters[0].x + partnerCenters[1].x) / 2, y: (partnerCenters[0].y + partnerCenters[1].y) / 2 };
        else if (partnerCenters.length === 1)
            ring = { x: partnerCenters[0].x, y: partnerCenters[0].y + NODE_H / 2 };
        else if (childTops.length)
            ring = { x: childTops.reduce((a, c) => a + c.pt.x, 0) / childTops.length, y: Math.min(...childTops.map((c) => c.pt.y)) - ROW_GAP / 2 - 18 };
        const bus = childTops.length && ring ? Math.max(ring.y + 14, Math.min(...childTops.map((c) => c.pt.y)) - ROW_GAP / 2) : null;
        out.push({ union: u, ring, partnerCenters, childTops, bus });
    }
    return out;
}
