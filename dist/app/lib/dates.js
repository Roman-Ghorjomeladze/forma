// Small date helpers (local time, ISO "YYYY-MM-DD" keys).
export function toKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
export function fromKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}
export function todayKey() {
    return toKey(new Date());
}
export function addDays(key, n) {
    const d = fromKey(key);
    d.setDate(d.getDate() + n);
    return toKey(d);
}
/** Start of the week containing `key` (weekStartsOn: 0 = Sunday, 1 = Monday). */
export function startOfWeek(key, weekStartsOn = 1) {
    const d = fromKey(key);
    const diff = (d.getDay() - weekStartsOn + 7) % 7;
    d.setDate(d.getDate() - diff);
    return toKey(d);
}
export function weekDays(startKey) {
    return Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
}
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function weekdayShort(key) { return WEEKDAY_SHORT[fromKey(key).getDay()]; }
export function weekdayLong(key) { return WEEKDAY_LONG[fromKey(key).getDay()]; }
export function weekdayName(weekday, long = false) { return (long ? WEEKDAY_LONG : WEEKDAY_SHORT)[weekday]; }
export function dayOfMonth(key) { return fromKey(key).getDate(); }
export function formatLong(key) {
    const d = fromKey(key);
    return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}
export function formatShort(key) {
    const d = fromKey(key);
    return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}
export function formatRange(startKey, endKey) {
    const a = fromKey(startKey), b = fromKey(endKey);
    if (a.getMonth() === b.getMonth())
        return `${a.getDate()}–${b.getDate()} ${MONTH_SHORT[a.getMonth()]}`;
    return `${a.getDate()} ${MONTH_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()]}`;
}
export function formatDateTime(ts) {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} · ${hh}:${mm}`;
}
export function relativeDay(key) {
    const t = todayKey();
    if (key === t)
        return 'Today';
    if (key === addDays(t, 1))
        return 'Tomorrow';
    if (key === addDays(t, -1))
        return 'Yesterday';
    return formatLong(key);
}
/** "m:ss" or "h:mm:ss" */
export function fmtClock(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0)
        return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
}
/** "24 min" / "1 h 05 min" / "45 s" */
export function fmtDuration(totalSeconds) {
    const s = Math.round(totalSeconds);
    if (s < 60)
        return `${s} s`;
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    if (h > 0)
        return `${h} h ${String(m).padStart(2, '0')} min`;
    return `${m} min`;
}
