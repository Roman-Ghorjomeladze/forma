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

/** A user-uploaded audio file to play as background music during workouts (metadata only - the file itself lives in `blobs`). */
export interface MusicTrack { id: string; name: string; blobId: string; addedAt: number }

export type Theme = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'ka';

export interface Profile {
  /** Shown in the launcher greeting. */
  name: string;
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
  name: '',
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

// ============================================================================================
// Pocket — big expenses grouped by project, each expense in one category. Single currency (₾).
// ============================================================================================
export type ProjectStatus = 'active' | 'done';

export interface Project {
  id: string;
  name: string;
  notes: string;
  /** Planned total, in ₾. Undefined = no budget set. */
  budget?: number;
  /** Optional per-category limits, keyed by category id. */
  categoryBudgets: Record<string, number>;
  status: ProjectStatus;
  startDate: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string; // hex
  icon: CategoryIcon;
  order: number;
  createdAt: number;
}

export type CategoryIcon = 'box' | 'wrench' | 'sofa' | 'hammer' | 'tag' | 'truck' | 'bolt' | 'drop' | 'paint' | 'home' | 'doc' | 'cart' | 'heart' | 'gift' | 'car' | 'plane';
export const CATEGORY_ICONS: CategoryIcon[] = ['box', 'wrench', 'sofa', 'hammer', 'tag', 'truck', 'bolt', 'drop', 'paint', 'home', 'doc', 'cart', 'heart', 'gift', 'car', 'plane'];
export const CATEGORY_COLORS = ['#E39A1C', '#4C8BF5', '#B76DE0', '#2FAF6E', '#F0532D', '#E9B52A', '#1FA8A8', '#D9488A', '#7A6A52', '#9A978F'];

export interface Expense {
  id: string;
  projectId: string;
  categoryId: string;
  title: string;
  amount: number; // ₾
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================================
// Family Tree — several trees; each tree has persons and "unions" (a couple, or a single parent)
// that own the children. Parent/child links always go through a union so layout is simple.
// ============================================================================================
export interface Tree {
  id: string;
  name: string;
  notes: string;
  /** Person the canvas centres on when opened (defaults to the first person). */
  rootPersonId?: string;
  createdAt: number;
  updatedAt: number;
}

export type Sex = 'm' | 'f' | 'u';

export interface Person {
  id: string;
  treeId: string;
  firstName: string;
  lastName: string;
  maidenName: string;
  sex: Sex;
  /** Partial ISO dates allowed: "1958", "1958-04" or "1958-04-12". Empty = unknown. */
  birthDate: string;
  deathDate: string;
  /** True when the person has died but the date is unknown. */
  deceased: boolean;
  birthPlace: string;
  notes: string;
  photoBlobId?: string;
  /** Manual canvas position; when unset the auto-layout decides. */
  pos?: { x: number; y: number };
  createdAt: number;
  updatedAt: number;
}

export type UnionStatus = 'married' | 'partners' | 'divorced' | 'separated' | 'widowed' | 'unknown';
export const UNION_STATUSES: UnionStatus[] = ['married', 'partners', 'divorced', 'separated', 'widowed', 'unknown'];

export interface Union {
  id: string;
  treeId: string;
  /** 0, 1 or 2 partner ids. 1 = single/unknown other parent, 0 = "unknown parents" placeholder. */
  partnerIds: string[];
  status: UnionStatus;
  startYear: string;
  endYear: string;
  /** Children in display order. */
  childIds: string[];
  createdAt: number;
  updatedAt: number;
}

// ============================================================================================
// Flags — the country list lives in src/data/countries.ts; only quiz results are stored.
// ============================================================================================
export type Continent = 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania';
export const CONTINENTS: Continent[] = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];
export type ContinentFilter = Continent | 'all';

export type QuizMode = 'flag' | 'country' | 'capital';
export const QUIZ_MODES: QuizMode[] = ['flag', 'country', 'capital'];
export const QUIZ_LENGTH = 10;

export interface QuizResult {
  id: string;
  mode: QuizMode;
  continent: ContinentFilter;
  score: number;
  total: number;
  /** country codes answered wrong (asked again first next time) */
  missed: string[];
  playedAt: number;
}
