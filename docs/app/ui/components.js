import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconBack, IconChevronDown, IconClose, IconMinus, IconPlus } from './icons.js';
import { back } from '../lib/router.js';
import { useT } from '../lib/i18n.js';
// ---- layout ---------------------------------------------------------------------------------
export function Screen({ children, className = '', padded = true }) {
    return _jsx("div", { className: `screen ${padded ? 'screen-padded' : ''} ${className}`, children: children });
}
export function TopBar({ title, eyebrow, backTo, right, large = false, onBack }) {
    const t = useT();
    return (_jsxs("header", { className: `topbar ${large ? 'topbar-large' : ''}`, children: [(backTo || onBack) && (_jsx("button", { className: "iconbtn", "aria-label": t('common.back'), onClick: () => (onBack ? onBack() : back(backTo)), children: _jsx(IconBack, {}) })), _jsxs("div", { className: "topbar-titles", children: [eyebrow && _jsx("div", { className: "eyebrow", children: eyebrow }), _jsx("h1", { className: large ? 'title-large' : 'title', children: title })] }), right && _jsx("div", { className: "topbar-right", children: right })] }));
}
export function Section({ title, right, children, className = '' }) {
    return (_jsxs("section", { className: `section ${className}`, children: [(title || right) && (_jsxs("div", { className: "section-head", children: [title && _jsx("h2", { className: "section-title", children: title }), right && _jsx("div", { className: "section-right", children: right })] })), children] }));
}
export function Card({ children, className = '', onClick, dark = false, style }) {
    const Tag = onClick ? 'button' : 'div';
    return _jsx(Tag, { className: `card ${dark ? 'card-dark' : ''} ${onClick ? 'card-tappable' : ''} ${className}`, onClick: onClick, style: style, children: children });
}
export function Row({ children, onClick, className = '', right }) {
    const inner = _jsxs(_Fragment, { children: [children, right && _jsx("div", { className: "row-right", children: right })] });
    if (onClick)
        return _jsx("button", { className: `row row-tappable ${className}`, onClick: onClick, children: inner });
    return _jsx("div", { className: `row ${className}`, children: inner });
}
export function Empty({ icon, title, text, action }) {
    return (_jsxs("div", { className: "empty", children: [icon && _jsx("div", { className: "empty-icon", children: icon }), _jsx("div", { className: "empty-title", children: title }), text && _jsx("div", { className: "empty-text", children: text }), action && _jsx("div", { className: "empty-action", children: action })] }));
}
export function Button({ children, onClick, variant = 'primary', size = 'md', full = false, disabled, type = 'button', className = '', icon }) {
    return (_jsxs("button", { type: type, className: `btn btn-${variant} btn-${size} ${full ? 'btn-full' : ''} ${className}`, onClick: onClick, disabled: disabled, children: [icon, children] }));
}
export function IconButton({ children, onClick, label, className = '', tone = 'default' }) {
    return _jsx("button", { type: "button", className: `iconbtn iconbtn-${tone} ${className}`, "aria-label": label, title: label, onClick: onClick, children: children });
}
export function Chip({ children, active = false, onClick, tone = 'default' }) {
    return _jsx("button", { type: "button", className: `chip chip-${tone} ${active ? 'chip-active' : ''}`, onClick: onClick, children: children });
}
export function Segmented({ value, options, onChange }) {
    return (_jsx("div", { className: "segmented", role: "tablist", children: options.map((o) => (_jsx("button", { type: "button", role: "tab", "aria-selected": o.value === value, className: `segmented-item ${o.value === value ? 'active' : ''}`, onClick: () => onChange(o.value), children: o.label }, o.value))) }));
}
export function Toggle({ checked, onChange, label }) {
    return (_jsx("button", { type: "button", role: "switch", "aria-checked": checked, "aria-label": label, className: `toggle ${checked ? 'on' : ''}`, onClick: () => onChange(!checked), children: _jsx("span", { className: "toggle-knob" }) }));
}
export function Field({ label, children, hint, inline = false }) {
    return (_jsxs("label", { className: `field ${inline ? 'field-inline' : ''}`, children: [_jsx("span", { className: "field-label", children: label }), children, hint && _jsx("span", { className: "field-hint", children: hint })] }));
}
export function TextInput({ value, onChange, placeholder, type = 'text', autoFocus, inputMode, className = '', onBlur }) {
    return _jsx("input", { className: `input ${className}`, type: type, value: value, placeholder: placeholder, autoFocus: autoFocus, inputMode: inputMode, onChange: (e) => onChange(e.target.value), onBlur: onBlur });
}
export function TextArea({ value, onChange, placeholder, rows = 3 }) {
    return _jsx("textarea", { className: "input textarea", rows: rows, value: value, placeholder: placeholder, onChange: (e) => onChange(e.target.value) });
}
export function NumberInput({ value, onChange, min = 0, max = 100000, step = 1, suffix, placeholder, className = '' }) {
    const [text, setText] = useState(value === '' ? '' : String(value));
    useEffect(() => { setText(value === '' ? '' : String(value)); }, [value]);
    return (_jsxs("span", { className: `numwrap ${className}`, children: [_jsx("input", { className: "input input-num", type: "text", inputMode: "decimal", value: text, placeholder: placeholder, onChange: (e) => {
                    const t = e.target.value.replace(',', '.');
                    setText(t);
                    const n = Number(t);
                    if (t !== '' && !Number.isNaN(n))
                        onChange(Math.min(max, Math.max(min, n)));
                }, onBlur: () => { if (text === '' || Number.isNaN(Number(text))) {
                    setText(String(value || 0));
                } } }), suffix && _jsx("span", { className: "numsuffix", children: suffix }), _jsx("span", { className: "sr-only", children: step })] }));
}
export function Stepper({ value, onChange, min = 0, max = 999, step = 1, format }) {
    const holdRef = useRef(undefined);
    const bump = (d) => onChange(Math.min(max, Math.max(min, Math.round((value + d) / step) * step)));
    const start = (d) => {
        bump(d);
        let n = 0;
        holdRef.current = window.setInterval(() => { n++; bump(d * (n > 10 ? 5 : 1)); }, n > 10 ? 80 : 140);
    };
    const stop = () => { window.clearInterval(holdRef.current); };
    const t = useT();
    return (_jsxs("div", { className: "stepper", children: [_jsx("button", { type: "button", className: "stepper-btn", "aria-label": t('common.decrease'), onPointerDown: () => start(-step), onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop, children: _jsx(IconMinus, { size: 18 }) }), _jsx("span", { className: "stepper-value", children: format ? format(value) : value }), _jsx("button", { type: "button", className: "stepper-btn", "aria-label": t('common.increase'), onPointerDown: () => start(step), onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop, children: _jsx(IconPlus, { size: 18 }) })] }));
}
export function Select({ value, options, onChange }) {
    return (_jsxs("span", { className: "selectwrap", children: [_jsx("select", { className: "input select", value: value, onChange: (e) => onChange(e.target.value), children: options.map((o) => _jsx("option", { value: o.value, children: o.label }, o.value)) }), _jsx(IconChevronDown, { size: 16, className: "select-caret" })] }));
}
export function Progress({ value, max, color, height = 8 }) {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    return _jsx("div", { className: "progress", style: { height }, children: _jsx("div", { className: "progress-bar", style: { width: `${pct}%`, background: color } }) });
}
export function MacroBar({ label, value, target, color }) {
    return (_jsxs("div", { className: "macro", children: [_jsxs("div", { className: "macro-head", children: [_jsx("span", { className: "macro-label", children: label }), _jsxs("span", { className: "macro-vals", children: [Math.round(value), _jsxs("span", { className: "muted", children: ["/", target, " g"] })] })] }), _jsx(Progress, { value: value, max: target, color: color, height: 5 })] }));
}
// ---- bottom sheet ---------------------------------------------------------------------------
export function Sheet({ open, onClose, title, children, footer, full = false }) {
    const t = useT();
    useEffect(() => {
        if (!open)
            return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => { if (e.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', onKey);
        return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    }, [open, onClose]);
    if (!open)
        return null;
    return createPortal(_jsx("div", { className: "sheet-backdrop", onClick: onClose, children: _jsxs("div", { className: `sheet ${full ? 'sheet-full' : ''}`, role: "dialog", "aria-modal": "true", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "sheet-handle" }), title && (_jsxs("div", { className: "sheet-head", children: [_jsx("div", { className: "sheet-title", children: title }), _jsx("button", { className: "iconbtn", "aria-label": t('common.close'), onClick: onClose, children: _jsx(IconClose, {}) })] })), _jsx("div", { className: "sheet-body", children: children }), footer && _jsx("div", { className: "sheet-footer", children: footer })] }) }), document.body);
}
export function Stat({ value, label, tone }) {
    return (_jsxs("div", { className: `stat ${tone ? `stat-${tone}` : ''}`, children: [_jsx("div", { className: "stat-value", children: value }), _jsx("div", { className: "stat-label", children: label })] }));
}
export function Kcal({ value, className = '' }) {
    return _jsxs("span", { className: `kcal ${className}`, children: [Math.round(value).toLocaleString(), _jsx("span", { className: "kcal-unit", children: " kcal" })] });
}
