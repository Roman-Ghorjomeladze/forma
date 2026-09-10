// Keeps the screen on during a workout (Wake Lock API — iOS 16.4+ in Safari / installed PWAs).
type WakeLockSentinelLike = { release(): Promise<void>; addEventListener(t: 'release', fn: () => void): void };

let sentinel: WakeLockSentinelLike | null = null;
let wanted = false;

async function acquire() {
  const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } };
  if (!nav.wakeLock || sentinel) return;
  try {
    sentinel = await nav.wakeLock.request('screen');
    sentinel.addEventListener('release', () => { sentinel = null; });
  } catch { sentinel = null; }
}

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') acquire();
});

export async function keepAwake(on: boolean) {
  wanted = on;
  if (on) await acquire();
  else if (sentinel) { try { await sentinel.release(); } catch { /* ignore */ } sentinel = null; }
}
