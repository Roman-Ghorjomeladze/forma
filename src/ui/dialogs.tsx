// App-wide confirm dialog + toasts driven by a tiny store (rendered once in App).
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './components.js';

interface ConfirmState { title: string; message?: string; confirmLabel: string; cancelLabel: string; danger: boolean; resolve: (ok: boolean) => void }
interface ToastState { id: number; text: string }

let confirmState: ConfirmState | null = null;
let toasts: ToastState[] = [];
const subs = new Set<() => void>();
const emit = () => { for (const s of subs) s(); };
const sub = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };

export function confirmDialog(opts: { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState = { title: opts.title, message: opts.message, confirmLabel: opts.confirmLabel ?? 'OK', cancelLabel: opts.cancelLabel ?? 'Cancel', danger: opts.danger ?? false, resolve };
    emit();
  });
}

let toastId = 0;
export function toast(text: string, ms = 2200) {
  const id = ++toastId;
  toasts = [...toasts.filter((t) => t.text !== text).slice(-2), { id, text }];
  emit();
  window.setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); emit(); }, ms);
}

export function DialogHost() {
  const c = useSyncExternalStore(sub, () => confirmState);
  const ts = useSyncExternalStore(sub, () => toasts);
  const close = (ok: boolean) => { c?.resolve(ok); confirmState = null; emit(); };
  return createPortal(
    <>
      {c && (
        <div className="sheet-backdrop dialog-backdrop" onClick={() => close(false)}>
          <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
            <div className="dialog-title">{c.title}</div>
            {c.message && <div className="dialog-message">{c.message}</div>}
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => close(false)}>{c.cancelLabel}</Button>
              <Button variant={c.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{c.confirmLabel}</Button>
            </div>
          </div>
        </div>
      )}
      <div className="toasts" aria-live="polite">
        {ts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
      </div>
    </>,
    document.body,
  );
}
