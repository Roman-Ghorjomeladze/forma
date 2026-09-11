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
    countdownSeconds: 3,
    keepAwake: true,
    language: detectLanguage(),
};
