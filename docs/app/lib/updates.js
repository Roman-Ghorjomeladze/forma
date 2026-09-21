// Manual service-worker update controls (Settings → App). Data in IndexedDB is never touched here.
/** Asks the browser to re-fetch sw.js. Resolves 'updated' when a new worker took over (the page reloads
 *  via controllerchange), 'none' when we are already on the latest build, 'unsupported' without a SW. */
export async function checkForUpdate(timeoutMs = 6000) {
    if (!('serviceWorker' in navigator))
        return 'unsupported';
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg)
        return 'unsupported';
    try {
        await reg.update();
    }
    catch { /* offline — fall through, we may still have a waiting worker */ }
    const activate = (w) => w.postMessage('SKIP_WAITING');
    if (reg.waiting) {
        activate(reg.waiting);
        return 'updated';
    }
    const nw = reg.installing;
    if (!nw)
        return 'none';
    return new Promise((resolve) => {
        const timer = window.setTimeout(() => resolve('none'), timeoutMs);
        nw.addEventListener('statechange', () => {
            if (nw.state === 'installed') {
                window.clearTimeout(timer);
                if (reg.waiting)
                    activate(reg.waiting);
                resolve('updated');
            }
            if (nw.state === 'redundant') {
                window.clearTimeout(timer);
                resolve('none');
            }
        });
    });
}
/** Drops every cached app file and the service worker, then reloads from the network. IndexedDB stays. */
export async function reinstallAppFiles() {
    try {
        if ('serviceWorker' in navigator) {
            for (const r of await navigator.serviceWorker.getRegistrations())
                await r.unregister();
        }
        if ('caches' in window)
            for (const k of await caches.keys())
                await caches.delete(k);
    }
    finally {
        location.replace(location.pathname + '?r=' + Date.now() + '#/');
    }
}
