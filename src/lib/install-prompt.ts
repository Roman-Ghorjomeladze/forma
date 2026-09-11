// Captures the browser's native "beforeinstallprompt" event (fired on Android Chrome,
// desktop Chrome/Edge, and other Chromium browsers once PWA installability criteria are
// met) so any screen can offer a real one-tap install button instead of manual steps.
// Imported eagerly from app.tsx's static import graph, so the listener is registered at
// boot — before the user necessarily visits Settings.

type Listener = () => void;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<Listener>();

function notify() { listeners.forEach((l) => l()); }

if (typeof window !== 'undefined') {
  try {
    if (matchMedia('(display-mode: standalone)').matches) installed = true;
  } catch { /* ignore */ }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export function canPromptInstall(): boolean { return !!deferred; }
export function isInstalled(): boolean { return installed; }
export function subscribeInstall(fn: Listener): () => void { listeners.add(fn); return () => listeners.delete(fn); }

/** Shows the browser's native install prompt. Resolves to what the user chose, or 'unavailable' if no prompt is captured. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const ev = deferred;
  deferred = null;
  notify();
  await ev.prompt();
  const choice = await ev.userChoice;
  return choice.outcome;
}
