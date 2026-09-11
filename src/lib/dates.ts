// Small date helpers (local time, ISO "YYYY-MM-DD" keys).
import { getLang, tGlobal } from './i18n.js';

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Start of the week containing `key` (weekStartsOn: 0 = Sunday, 1 = Monday). */
export function startOfWeek(key: string, weekStartsOn: 0 | 1 = 1): string {
  const d = fromKey(key);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return toKey(d);
}

export function weekDays(startKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
}

const WEEKDAY_SHORT: Record<string, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ka: ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'],
};
const WEEKDAY_LONG: Record<string, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ka: ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'],
};
const MONTH_SHORT: Record<string, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ka: ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'],
};

export function weekdayShort(key: string): string { return WEEKDAY_SHORT[getLang()][fromKey(key).getDay()]; }
export function weekdayLong(key: string): string { return WEEKDAY_LONG[getLang()][fromKey(key).getDay()]; }
export function weekdayName(weekday: number, long = false): string { return (long ? WEEKDAY_LONG : WEEKDAY_SHORT)[getLang()][weekday]; }
export function dayOfMonth(key: string): number { return fromKey(key).getDate(); }

export function formatLong(key: string): string {
  const d = fromKey(key);
  return `${WEEKDAY_LONG[getLang()][d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[getLang()][d.getMonth()]}`;
}

export function formatShort(key: string): string {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTH_SHORT[getLang()][d.getMonth()]}`;
}

export function formatRange(startKey: string, endKey: string): string {
  const a = fromKey(startKey), b = fromKey(endKey);
  const months = MONTH_SHORT[getLang()];
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${months[a.getMonth()]}`;
  return `${a.getDate()} ${months[a.getMonth()]} – ${b.getDate()} ${months[b.getMonth()]}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTH_SHORT[getLang()][d.getMonth()]} · ${hh}:${mm}`;
}

export function relativeDay(key: string): string {
  const t = todayKey();
  if (key === t) return tGlobal('today.title'); // "Today"
  if (key === addDays(t, 1)) return tGlobal('date.tomorrow');
  if (key === addDays(t, -1)) return tGlobal('date.yesterday');
  return formatLong(key);
}

/** "m:ss" or "h:mm:ss" */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** "24 min" / "1 h 05 min" / "45 s" */
export function fmtDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const secUnit = tGlobal('unit.s'), hUnit = tGlobal('unit.h'), minUnit = tGlobal('unit.min');
  if (s < 60) return `${s} ${secUnit}`;
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  if (h > 0) return `${h} ${hUnit} ${String(m).padStart(2, '0')} ${minUnit}`;
  return `${m} ${minUnit}`;
}
