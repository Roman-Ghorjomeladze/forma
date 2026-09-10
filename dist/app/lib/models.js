// Domain model. Everything is stored in IndexedDB (see db.ts) and exported as JSON for backups.
export const MEAL_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack'];
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
};
