// Flags helpers: localized names, continent filtering, quiz generation and stats.
import { COUNTRIES, type Country } from '../data/countries.js';
import { uid } from './ids.js';
import { tGlobal } from './i18n.js';
import type { Continent, ContinentFilter, Lang, QuizMode, QuizResult } from './models.js';
import { QUIZ_LENGTH } from './models.js';

export const flagUrl = (c: string) => `./flags/${c}.svg`;

export function countryName(c: Country, lang: Lang): string { return lang === 'ka' ? c.nk : c.n; }
export function capitalName(c: Country, lang: Lang): string { return lang === 'ka' ? c.capk : c.cap; }
export function continentName(r: ContinentFilter): string { return r === 'all' ? tGlobal('flags.all') : tGlobal(`flags.continent.${r}`); }
export function continentShort(r: ContinentFilter): string { return r === 'all' ? tGlobal('flags.all') : tGlobal(`flags.continentShort.${r}`); }

export const byCode = new Map(COUNTRIES.map((c) => [c.c, c]));

export function filterCountries(filter: ContinentFilter, lang: Lang): Country[] {
  const list = filter === 'all' ? COUNTRIES : COUNTRIES.filter((c) => c.r === filter);
  return [...list].sort((a, b) => countryName(a, lang).localeCompare(countryName(b, lang), lang === 'ka' ? 'ka' : 'en'));
}

export function searchCountries(list: Country[], q: string, lang: Lang): Country[] {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return list.filter((c) => countryName(c, lang).toLowerCase().includes(s) || c.n.toLowerCase().includes(s) || capitalName(c, lang).toLowerCase().includes(s) || c.cap.toLowerCase().includes(s));
}

// ---- random helpers -------------------------------------------------------------------------
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---- quiz --------------------------------------------------------------------------------------
export interface Question {
  mode: QuizMode;
  /** the country being asked about */
  answer: Country;
  /** 4 countries in display order; the option text/flag comes from each one depending on the mode */
  options: Country[];
}

/** Builds a round: countries missed in recent rounds of this mode come first, the rest is random. */
export function buildQuiz(mode: QuizMode, continent: ContinentFilter, history: QuizResult[], length = QUIZ_LENGTH): Question[] {
  const pool = continent === 'all' ? COUNTRIES : COUNTRIES.filter((c) => c.r === continent);
  if (pool.length < 4) return [];
  const recentMissed = new Set(history.filter((r) => r.mode === mode).slice(0, 5).flatMap((r) => r.missed));
  const missedFirst = shuffle(pool.filter((c) => recentMissed.has(c.c))).slice(0, Math.min(4, length));
  const rest = shuffle(pool.filter((c) => !missedFirst.includes(c)));
  const asked = shuffle([...missedFirst, ...rest.slice(0, length - missedFirst.length)]);
  return asked.map((answer) => {
    // distractors from the same continent first (harder), then the rest of the pool, then the world
    const ok = (c: Country) => c.c !== answer.c && (mode !== 'capital' || c.cap !== answer.cap);
    const same = pool.filter((c) => ok(c) && c.r === answer.r);
    const rest = pool.filter((c) => ok(c) && c.r !== answer.r);
    const world = COUNTRIES.filter((c) => ok(c) && !pool.includes(c));
    const distractors = [...shuffle(same), ...shuffle(rest), ...shuffle(world)].slice(0, 3);
    return { mode, answer, options: shuffle([answer, ...distractors]) };
  });
}

export function newResult(mode: QuizMode, continent: ContinentFilter, score: number, total: number, missed: string[]): QuizResult {
  return { id: uid('qz'), mode, continent, score, total, missed, playedAt: Date.now() };
}

// ---- stats ---------------------------------------------------------------------------------------
export function bestScore(history: QuizResult[], mode: QuizMode, continent: ContinentFilter): QuizResult | null {
  let best: QuizResult | null = null;
  for (const r of history) if (r.mode === mode && r.continent === continent && (!best || r.score / r.total > best.score / best.total)) best = r;
  return best;
}

export function accuracy(history: QuizResult[]): number {
  const total = history.reduce((a, r) => a + r.total, 0);
  return total ? Math.round((history.reduce((a, r) => a + r.score, 0) / total) * 100) : 0;
}

export function perfectRounds(history: QuizResult[]): number { return history.filter((r) => r.score === r.total).length; }

/** Countries the user has got wrong in recent rounds (any mode), most recent first, unique. */
export function weakSpots(history: QuizResult[], limit = 12): Country[] {
  const seen = new Set<string>();
  const out: Country[] = [];
  for (const r of history) for (const code of r.missed) { if (!seen.has(code)) { seen.add(code); const c = byCode.get(code); if (c) out.push(c); } }
  return out.slice(0, limit);
}

export function resultTitleKey(score: number, total: number): string {
  const p = score / total;
  if (p === 1) return 'flags.result.perfect';
  if (p >= 0.8) return 'flags.result.great';
  if (p >= 0.5) return 'flags.result.ok';
  return 'flags.result.keepGoing';
}

export const CONTINENT_LIST: Continent[] = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];
