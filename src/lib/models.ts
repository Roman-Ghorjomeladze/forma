// Domain model. Everything is stored in IndexedDB (see db.ts) and exported as JSON for backups.

export type ExerciseKind = 'time' | 'reps';

export type Demo =
  | { type: 'builtin'; key: string }
  | { type: 'blob'; blobId: string }
  | { type: 'video'; file: string }
  | { type: 'none' };

export interface Exercise {
  id: string;
  name: string;
  muscles: string[];
  equipment: string[];
  kind: ExerciseKind;
  /** Metabolic equivalent of task; kcal/h ≈ MET × kg. */
  met: number;
  /** Seconds per rep, used to estimate time (and kcal) of rep-based blocks. */
  secPerRep: number;
  /** Default duration (time) or reps (reps) suggested in the builder. */
  defaultAmount: number;
  demo: Demo;
  cues: string[];
  isCustom: boolean;
  createdAt: number;
  updatedAt: number;
}

export type Block =
  | { id: string; type: 'exercise'; exerciseId: string; seconds?: number; reps?: number }
  | { id: string; type: 'rest'; seconds: number }
  | { id: string; type: 'group'; name?: string; rounds: number; restBetweenRounds: number; blocks: Block[] };

export interface Workout {
  id: string;
  name: string;
  description: string;
  blocks: Block[];
  color: string;
  createdAt: number;
  updatedAt: number;
}

/** A flat, fully-expanded step of a workout (groups unrolled). */
export interface Step {
  index: number;
  type: 'exercise' | 'rest';
  label: string;
  seconds: number;
  reps?: number;
  exerciseId?: string;
  met: number;
  round?: { n: number; of: number; name?: string };
}

export interface Session {
  id: string;
  workoutId: string;
  workoutName: string;
  startedAt: number;
  endedAt: number;
  kcal: number;
  completedSteps: number;
  totalSteps: number;
  activeSeconds: number;
}

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface Nutrition { kcal: number; protein: number; carbs: number; fat: number }

export interface Ingredient extends Nutrition {
  id: string;
  name: string;
  amount: number;
  unit: string; // g, ml, pcs, tbsp, tsp, cup…
}

export interface Dish {
  id: string;
  name: string;
  category: MealCategory;
  servings: number;
  prepMin: number;
  cookMin: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
  notes: string;
  imageBlobId?: string;
  /** If set, replaces the computed per-serving nutrition. */
  nutritionOverride?: Nutrition;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MealSlot {
  id: string;
  date: string; // YYYY-MM-DD
  slot: MealCategory;
  dishId: string;
  servings: number;
  eaten: boolean;
  order: number;
}

export interface ScheduleEntry {
  weekday: number; // 0 = Sunday … 6 = Saturday
  workoutId: string;
}

export interface StoredBlob { id: string; blob: Blob; type: string; name: string }

export type Theme = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'ka';

export interface Profile {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  weekStartsOn: 0 | 1;
}

export interface Prefs {
  theme: Theme;
  sound: boolean;
  voice: boolean;
  music: boolean; // background motivational music during workouts
  countdownSeconds: number; // "3-2-1" cue length
  keepAwake: boolean;
  language: Lang;
}

/** Georgian for Georgian-locale devices, English otherwise. */
function detectLanguage(): Lang {
  try {
    const langs = (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
    if (langs.some((l) => l?.toLowerCase().startsWith('ka'))) return 'ka';
  } catch { /* ignore */ }
  return 'en';
}

export const DEFAULT_PROFILE: Profile = {
  weightKg: 90,
  heightCm: 178,
  age: 30,
  sex: 'male',
  targetKcal: 2100,
  targetProtein: 165,
  targetCarbs: 200,
  targetFat: 62,
  weekStartsOn: 1,
};

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  sound: true,
  voice: true,
  music: true,
  countdownSeconds: 3,
  keepAwake: true,
  language: detectLanguage(),
};
