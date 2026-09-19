// Domain model. Everything is stored in IndexedDB (see db.ts) and exported as JSON for backups.
export const MEAL_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack'];
/** Georgian for Georgian-locale devices, English otherwise. */
function detectLanguage() {
    try {
        const langs = (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
        if (langs.some((l) => l?.toLowerCase().startsWith('ka')))
            return 'ka';
    }
    catch { /* ignore */ }
    return 'en';
}
export const DEFAULT_PROFILE = {
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
export const DEFAULT_PREFS = {
    theme: 'system',
    sound: true,
    voice: true,
    music: true,
    countdownSeconds: 3,
    keepAwake: true,
    language: detectLanguage(),
};
export const CATEGORY_ICONS = ['box', 'wrench', 'sofa', 'hammer', 'tag', 'truck', 'bolt', 'drop', 'paint', 'home', 'doc', 'cart', 'heart', 'gift', 'car', 'plane'];
export const CATEGORY_COLORS = ['#E39A1C', '#4C8BF5', '#B76DE0', '#2FAF6E', '#F0532D', '#E9B52A', '#1FA8A8', '#D9488A', '#7A6A52', '#9A978F'];
export const UNION_STATUSES = ['married', 'partners', 'divorced', 'separated', 'widowed', 'unknown'];
export const CONTINENTS = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];
export const QUIZ_MODES = ['flag', 'country', 'capital'];
export const QUIZ_LENGTH = 10;
