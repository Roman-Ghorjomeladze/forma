export function uid(prefix = ''): string {
  const c = globalThis.crypto;
  const core = c && 'randomUUID' in c ? c.randomUUID().replace(/-/g, '').slice(0, 16) : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${core}` : core;
}
