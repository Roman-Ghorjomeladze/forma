let sentinel = null;
let wanted = false;
async function acquire() {
    const nav = navigator;
    if (!nav.wakeLock || sentinel)
        return;
    try {
        sentinel = await nav.wakeLock.request('screen');
        sentinel.addEventListener('release', () => { sentinel = null; });
    }
    catch {
        sentinel = null;
    }
}
document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible')
        acquire();
});
export async function keepAwake(on) {
    wanted = on;
    if (on)
        await acquire();
    else if (sentinel) {
        try {
            await sentinel.release();
        }
        catch { /* ignore */ }
        sentinel = null;
    }
}
