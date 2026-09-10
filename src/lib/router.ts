// Minimal hash router: #/meals/dish/abc?tab=steps
import { useSyncExternalStore } from 'react';

export interface Route {
  path: string;          // "/meals/dish/abc"
  segments: string[];    // ["meals", "dish", "abc"]
  query: URLSearchParams;
}

function parse(): Route {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [p, q = ''] = raw.split('?');
  const path = p.startsWith('/') ? p : '/' + p;
  return { path, segments: path.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

let current = parse();
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse();
  for (const s of subs) s();
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (fn) => { subs.add(fn); return () => { subs.delete(fn); }; },
    () => current,
  );
}

export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  const hash = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) { current = parse(); for (const s of subs) s(); }
}

export function back(fallback: string) {
  if (history.length > 1 && sessionStorage.getItem('forma:navigated') === '1') history.back();
  else navigate(fallback, { replace: true });
}

window.addEventListener('hashchange', () => sessionStorage.setItem('forma:navigated', '1'), { once: true });
