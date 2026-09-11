import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react';
import { subscribe, getSetting, setSetting, get } from './db.js';
import { DEFAULT_PREFS, DEFAULT_PROFILE } from './models.js';
/** Re-runs an async query whenever any of the given tables change. */
export function useLiveQuery(query, tables, deps = []) {
    const [value, setValue] = useState(undefined);
    const queryRef = useRef(query);
    queryRef.current = query;
    const tablesKey = tables === 'all' ? 'all' : tables.join(',');
    useEffect(() => {
        let alive = true;
        let running = false;
        let again = false;
        const run = async () => {
            if (running) {
                again = true;
                return;
            }
            running = true;
            try {
                const v = await queryRef.current();
                if (alive)
                    setValue(v);
            }
            catch (e) {
                console.error('live query failed', e);
            }
            finally {
                running = false;
                if (again) {
                    again = false;
                    run();
                }
            }
        };
        run();
        const unsub = subscribe((changed) => {
            if (tables === 'all' || tables.some((t) => changed.has(t)))
                run();
        });
        return () => { alive = false; unsub(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tablesKey, ...deps]);
    return value;
}
// ---- settings (profile + prefs) as small shared stores --------------------------------------
function createSettingStore(key, fallback) {
    let state = fallback;
    let loaded = false;
    const subs = new Set();
    const emit = () => { for (const s of subs)
        s(); };
    const load = async () => {
        const v = await getSetting(key, {});
        state = { ...fallback, ...v };
        loaded = true;
        emit();
    };
    const loading = load();
    subscribe((changed) => { if (changed.has('settings'))
        get('settings', key).then((row) => { if (row) {
            state = { ...fallback, ...row.value };
            emit();
        } }); });
    return {
        loading,
        isLoaded: () => loaded,
        get: () => state,
        subscribe: (fn) => { subs.add(fn); return () => { subs.delete(fn); }; },
        async update(patch) {
            state = { ...state, ...patch };
            emit();
            await setSetting(key, state);
        },
    };
}
export const profileStore = createSettingStore('profile', DEFAULT_PROFILE);
export const prefsStore = createSettingStore('prefs', DEFAULT_PREFS);
export function useProfile() {
    const p = useSyncExternalStore(profileStore.subscribe, profileStore.get);
    return [p, profileStore.update];
}
export function usePrefs() {
    const p = useSyncExternalStore(prefsStore.subscribe, prefsStore.get);
    return [p, prefsStore.update];
}
/** Object URL for a stored blob id (revoked on unmount). */
export function useBlobUrl(blobId) {
    const [url, setUrl] = useState(undefined);
    useEffect(() => {
        let objectUrl;
        let alive = true;
        if (!blobId) {
            setUrl(undefined);
            return;
        }
        get('blobs', blobId).then((row) => {
            if (!alive || !row)
                return;
            objectUrl = URL.createObjectURL(row.blob);
            setUrl(objectUrl);
        });
        return () => { alive = false; if (objectUrl)
            URL.revokeObjectURL(objectUrl); };
    }, [blobId]);
    return url;
}
/** Object URLs for a list of stored blob ids, in order (revoked on change/unmount). Used for the custom music playlist. */
export function useBlobUrls(blobIds) {
    const [urls, setUrls] = useState([]);
    const key = blobIds.join(',');
    useEffect(() => {
        let alive = true;
        const created = [];
        if (blobIds.length === 0) {
            setUrls([]);
            return;
        }
        (async () => {
            const list = [];
            for (const id of blobIds) {
                const row = await get('blobs', id);
                if (row) {
                    const u = URL.createObjectURL(row.blob);
                    list.push(u);
                    created.push(u);
                }
            }
            if (alive)
                setUrls(list);
            else
                created.forEach((u) => URL.revokeObjectURL(u));
        })();
        return () => { alive = false; created.forEach((u) => URL.revokeObjectURL(u)); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return urls;
}
/** Boolean that becomes true once and can be reset (for transient UI like "Saved ✓"). */
export function useFlash(ms = 1600) {
    const [on, setOn] = useState(false);
    const t = useRef(undefined);
    const trigger = useCallback(() => {
        setOn(true);
        window.clearTimeout(t.current);
        t.current = window.setTimeout(() => setOn(false), ms);
    }, [ms]);
    return [on, trigger];
}
/** Returns a stable "now" that ticks every `ms` while mounted. */
export function useNow(ms = 30_000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), ms);
        return () => window.clearInterval(id);
    }, [ms]);
    return now;
}
