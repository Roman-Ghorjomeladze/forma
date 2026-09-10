import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// App-wide confirm dialog + toasts driven by a tiny store (rendered once in App).
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './components.js';
let confirmState = null;
let toasts = [];
const subs = new Set();
const emit = () => { for (const s of subs)
    s(); };
const sub = (fn) => { subs.add(fn); return () => { subs.delete(fn); }; };
export function confirmDialog(opts) {
    return new Promise((resolve) => {
        confirmState = { title: opts.title, message: opts.message, confirmLabel: opts.confirmLabel ?? 'OK', cancelLabel: opts.cancelLabel ?? 'Cancel', danger: opts.danger ?? false, resolve };
        emit();
    });
}
let toastId = 0;
export function toast(text, ms = 2200) {
    const id = ++toastId;
    toasts = [...toasts.filter((t) => t.text !== text).slice(-2), { id, text }];
    emit();
    window.setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); emit(); }, ms);
}
export function DialogHost() {
    const c = useSyncExternalStore(sub, () => confirmState);
    const ts = useSyncExternalStore(sub, () => toasts);
    const close = (ok) => { c?.resolve(ok); confirmState = null; emit(); };
    return createPortal(_jsxs(_Fragment, { children: [c && (_jsx("div", { className: "sheet-backdrop dialog-backdrop", onClick: () => close(false), children: _jsxs("div", { className: "dialog", role: "alertdialog", "aria-modal": "true", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "dialog-title", children: c.title }), c.message && _jsx("div", { className: "dialog-message", children: c.message }), _jsxs("div", { className: "dialog-actions", children: [_jsx(Button, { variant: "secondary", onClick: () => close(false), children: c.cancelLabel }), _jsx(Button, { variant: c.danger ? 'danger' : 'primary', onClick: () => close(true), children: c.confirmLabel })] })] }) })), _jsx("div", { className: "toasts", "aria-live": "polite", children: ts.map((t) => _jsx("div", { className: "toast", children: t.text }, t.id)) })] }), document.body);
}
