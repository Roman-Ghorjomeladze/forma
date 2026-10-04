import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Shared Lingua UI: swipeable flip card, word-tile sentence builder, speak button, light rich text.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { useCourse, useCourseContent, useProgress } from '../../lib/lingua.js';
import { Empty, Screen, TopBar } from '../../ui/components.js';
import { IconVolume } from '../../ui/icons.js';
export function useLingua(cid) {
    const t = useT();
    const course = useCourse(cid);
    const content = useCourseContent(course);
    const prog = useProgress(course?.id);
    if (course === null)
        return _jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { title: "Lingua", backTo: "/lang" }), _jsx(Empty, { title: t('lang.notFound') })] });
    if (content && 'error' in content)
        return _jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { title: course?.title ?? 'Lingua', backTo: "/lang" }), _jsx(Empty, { title: t('lang.loadFailed'), text: content.error })] });
    if (!course || !content || !prog)
        return _jsx(Screen, { className: "screen-no-tabs", children: _jsxs("div", { className: "lang-loading", children: [_jsx("span", { className: "spinner" }), t('lang.loading')] }) });
    return { course, content, prog };
}
export const isCtx = (x) => !!x && typeof x === 'object' && 'course' in x && 'prog' in x;
// ---- speak button ---------------------------------------------------------------------------------
export function SpeakButton({ text, tag, rate = 1, size = 18, className = '', label }) {
    const t = useT();
    const [on, setOn] = useState(false);
    return (_jsx("button", { type: "button", className: `speak-btn ${on ? 'on' : ''} ${className}`, "aria-label": label ?? t('lang.listen'), onClick: (e) => { e.stopPropagation(); setOn(true); say(text, tag, rate, () => setOn(false)); window.setTimeout(() => setOn(false), 6000); }, children: _jsx(IconVolume, { size: size }) }));
}
// ---- rich text (paragraphs, "- " bullets, **bold**) ------------------------------------------------
function inline(s) {
    const parts = s.split(/(\*\*[^*]+\*\*|~~[^~]+~~)/g);
    return parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? _jsx("b", { children: p.slice(2, -2) }, i) : p.startsWith('~~') && p.endsWith('~~') ? _jsx("s", { children: p.slice(2, -2) }, i) : p));
}
export function RichText({ text }) {
    const blocks = [];
    let bullets = [];
    const flush = () => { if (bullets.length) {
        blocks.push(_jsx("ul", { children: bullets.map((b, i) => _jsx("li", { children: inline(b) }, i)) }, blocks.length));
        bullets = [];
    } };
    for (const line of text.split('\n')) {
        const l = line.trim();
        if (!l) {
            flush();
            continue;
        }
        if (/^[-•]\s+/.test(l))
            bullets.push(l.replace(/^[-•]\s+/, ''));
        else {
            flush();
            blocks.push(_jsx("p", { children: inline(l) }, blocks.length));
        }
    }
    flush();
    return _jsx("div", { className: "rich", children: blocks });
}
// ---- swipeable flashcard ------------------------------------------------------------------------------
export function SwipeCard({ front, back, showBoth, onAnswer, flipped, onFlip, hintLeft, hintRight, disabled }) {
    const ref = useRef(null);
    const start = useRef(null);
    const [dx, setDx] = useState(0);
    const [leaving, setLeaving] = useState(0);
    const finish = (ok) => {
        setLeaving(ok ? 1 : -1);
        window.setTimeout(() => { setLeaving(0); setDx(0); onAnswer(ok); }, 180);
    };
    const onDown = (e) => {
        if (disabled)
            return;
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        ref.current?.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => { if (start.current)
        setDx(e.clientX - start.current.x); };
    const onUp = (e) => {
        const s = start.current;
        start.current = null;
        if (!s)
            return;
        const d = e.clientX - s.x;
        const dy = Math.abs(e.clientY - s.y);
        if (Math.abs(d) > 90)
            finish(d > 0);
        else {
            setDx(0);
            if (Math.abs(d) < 8 && dy < 8 && !showBoth)
                onFlip();
        }
    };
    const x = leaving ? leaving * 600 : dx;
    const tint = Math.max(-1, Math.min(1, dx / 120));
    return (_jsxs("div", { className: "swipe-wrap", children: [_jsx("div", { className: "swipe-hint left", style: { opacity: tint < 0 ? -tint : 0 }, children: hintLeft }), _jsx("div", { className: "swipe-hint right", style: { opacity: tint > 0 ? tint : 0 }, children: hintRight }), _jsx("div", { ref: ref, className: `swipe-card ${start.current ? 'dragging' : ''}`, style: { transform: `translateX(${x}px) rotate(${x / 22}deg)`, transition: start.current ? 'none' : 'transform 0.18s ease' }, onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: () => { start.current = null; setDx(0); }, children: _jsx("div", { className: `flip ${flipped || showBoth ? 'is-flipped' : ''} ${showBoth ? 'both' : ''}`, style: { boxShadow: tint ? `0 0 0 3px ${tint > 0 ? 'var(--meals)' : 'var(--danger)'}` : undefined }, children: showBoth ? (_jsxs("div", { className: "flip-face both-face", children: [front, _jsx("div", { className: "both-sep" }), back] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flip-face front", children: front }), _jsx("div", { className: "flip-face back", children: back })] })) }) })] }));
}
export function makeTiles(words, distractors = []) {
    const all = [...words, ...distractors];
    const shuffled = all.map((text, i) => ({ id: i, text })).sort(() => Math.random() - 0.5);
    // avoid presenting the tiles already in the right order
    if (distractors.length === 0 && shuffled.every((x, i) => x.id === i) && shuffled.length > 1)
        shuffled.reverse();
    return shuffled;
}
export function TileBuilder({ tiles, picked, onChange, locked, state }) {
    const byId = useMemo(() => new Map(tiles.map((x) => [x.id, x])), [tiles]);
    return (_jsxs("div", { className: "tiles", children: [_jsxs("div", { className: `tile-answer ${state ?? ''}`, children: [picked.length === 0 && _jsx("span", { className: "tile-placeholder" }), picked.map((id) => (_jsx("button", { type: "button", className: "tile tile-in", disabled: locked, onClick: () => onChange(picked.filter((x) => x !== id)), children: byId.get(id)?.text }, id)))] }), _jsx("div", { className: "tile-bank", children: tiles.map((x) => {
                    const used = picked.includes(x.id);
                    return _jsx("button", { type: "button", className: `tile ${used ? 'tile-used' : ''}`, disabled: locked || used, onClick: () => onChange([...picked, x.id]), children: x.text }, x.id);
                }) })] }));
}
export function LevelTag({ level }) {
    return _jsx("span", { className: `lvl lvl-${level}`, children: level });
}
export function Ring({ value, max, size = 64, stroke = 7, children, color = 'var(--lingua)' }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = max > 0 ? Math.min(1, value / max) : 0;
    return (_jsxs("div", { className: "ring", style: { width: size, height: size }, children: [_jsxs("svg", { width: size, height: size, children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: "currentColor", strokeOpacity: 0.15, strokeWidth: stroke }), pct > 0 && _jsx("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeDasharray: `${c * pct} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})` })] }), _jsx("div", { className: "ring-inner", children: children })] }));
}
/** Seconds spent on a screen — logged when it unmounts. */
export function useStopwatch() {
    const startedAt = useRef(Date.now());
    useEffect(() => { startedAt.current = Date.now(); }, []);
    return () => Math.round((Date.now() - startedAt.current) / 1000);
}
export function posLabel(t, pos) {
    if (!pos || pos === 'other')
        return '';
    const k = `lang.pos.${pos}`;
    const v = t(k);
    return v === k ? pos : v;
}
