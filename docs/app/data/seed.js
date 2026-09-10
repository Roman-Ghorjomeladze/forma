import { bulkPut, count, getSetting, setSetting } from '../lib/db.js';
import { addDays, startOfWeek, todayKey } from '../lib/dates.js';
import { seedDishes } from './seed-dishes.js';
import { seedExercises } from './seed-exercises.js';
export function seedWorkouts(now = Date.now()) {
    return [
        {
            id: 'wo_full_body', name: 'Full body circuit', description: 'Warm-up, three rounds of five moves, and a stretch. No equipment.', color: '#F0532D', createdAt: now, updatedAt: now,
            blocks: [
                { id: 'b1', type: 'exercise', exerciseId: 'ex_jumping_jacks', seconds: 60 },
                { id: 'b2', type: 'rest', seconds: 20 },
                {
                    id: 'g1', type: 'group', name: 'Circuit', rounds: 3, restBetweenRounds: 60,
                    blocks: [
                        { id: 'b3', type: 'exercise', exerciseId: 'ex_squats', reps: 15 },
                        { id: 'b4', type: 'rest', seconds: 20 },
                        { id: 'b5', type: 'exercise', exerciseId: 'ex_push_ups', reps: 12 },
                        { id: 'b6', type: 'rest', seconds: 20 },
                        { id: 'b7', type: 'exercise', exerciseId: 'ex_lunges', reps: 12 },
                        { id: 'b8', type: 'rest', seconds: 20 },
                        { id: 'b9', type: 'exercise', exerciseId: 'ex_mountain_climbers', seconds: 30 },
                        { id: 'b10', type: 'rest', seconds: 20 },
                        { id: 'b11', type: 'exercise', exerciseId: 'ex_plank', seconds: 45 },
                    ],
                },
                { id: 'b12', type: 'rest', seconds: 30 },
                { id: 'b13', type: 'exercise', exerciseId: 'ex_stretch', seconds: 90 },
            ],
        },
        {
            id: 'wo_hiit', name: 'HIIT 12', description: '12 minutes: 40 s on / 20 s off, two rounds of six.', color: '#4C8BF5', createdAt: now, updatedAt: now,
            blocks: [
                {
                    id: 'g2', type: 'group', name: 'Round', rounds: 2, restBetweenRounds: 45,
                    blocks: [
                        { id: 'h1', type: 'exercise', exerciseId: 'ex_high_knees', seconds: 40 }, { id: 'h2', type: 'rest', seconds: 20 },
                        { id: 'h3', type: 'exercise', exerciseId: 'ex_jump_squats', seconds: 40 }, { id: 'h4', type: 'rest', seconds: 20 },
                        { id: 'h5', type: 'exercise', exerciseId: 'ex_burpees', seconds: 40 }, { id: 'h6', type: 'rest', seconds: 20 },
                        { id: 'h7', type: 'exercise', exerciseId: 'ex_mountain_climbers', seconds: 40 }, { id: 'h8', type: 'rest', seconds: 20 },
                        { id: 'h9', type: 'exercise', exerciseId: 'ex_bicycle_crunch', seconds: 40 }, { id: 'h10', type: 'rest', seconds: 20 },
                        { id: 'h11', type: 'exercise', exerciseId: 'ex_jumping_jacks', seconds: 40 }, { id: 'h12', type: 'rest', seconds: 20 },
                    ],
                },
            ],
        },
        {
            id: 'wo_core', name: 'Core 8', description: 'Eight minutes of abs and lower back.', color: '#2FAF6E', createdAt: now, updatedAt: now,
            blocks: [
                { id: 'c1', type: 'exercise', exerciseId: 'ex_plank', seconds: 45 }, { id: 'c2', type: 'rest', seconds: 15 },
                { id: 'c3', type: 'exercise', exerciseId: 'ex_crunches', reps: 20 }, { id: 'c4', type: 'rest', seconds: 15 },
                { id: 'c5', type: 'exercise', exerciseId: 'ex_leg_raises', reps: 12 }, { id: 'c6', type: 'rest', seconds: 15 },
                { id: 'c7', type: 'exercise', exerciseId: 'ex_side_plank', seconds: 40 }, { id: 'c8', type: 'rest', seconds: 15 },
                { id: 'c9', type: 'exercise', exerciseId: 'ex_bicycle_crunch', reps: 20 }, { id: 'c10', type: 'rest', seconds: 15 },
                { id: 'c11', type: 'exercise', exerciseId: 'ex_superman', reps: 12 }, { id: 'c12', type: 'rest', seconds: 15 },
                { id: 'c13', type: 'exercise', exerciseId: 'ex_bird_dog', reps: 12 }, { id: 'c14', type: 'rest', seconds: 15 },
                { id: 'c15', type: 'exercise', exerciseId: 'ex_glute_bridge', reps: 15 },
            ],
        },
    ];
}
export function seedWeekPlan(weekStartsOn = 1) {
    const start = startOfWeek(todayKey(), weekStartsOn);
    const plan = [
        ['dish_yogurt_bowl', 'dish_chicken_rice', 'dish_salmon', 'dish_cottage_berries'],
        ['dish_protein_oats', 'dish_turkey_wrap', 'dish_beef_stirfry', 'dish_apple_pb'],
        ['dish_omelette', 'dish_lobio', 'dish_lentil_soup', 'dish_protein_shake'],
        ['dish_yogurt_bowl', 'dish_chicken_rice', 'dish_shrimp_pasta', 'dish_matsoni'],
        ['dish_protein_oats', 'dish_tuna_salad', 'dish_cod_quinoa', 'dish_cottage_berries'],
        ['dish_protein_pancakes', 'dish_lobio', 'dish_beef_stirfry', 'dish_apple_pb'],
        ['dish_omelette', 'dish_turkey_wrap', 'dish_lentil_soup', 'dish_protein_shake'],
    ];
    const slots = [];
    plan.forEach((day, i) => {
        const date = addDays(start, i);
        ['breakfast', 'lunch', 'dinner', 'snack'].forEach((slot, j) => {
            slots.push({ id: `seed_${date}_${slot}`, date, slot, dishId: day[j], servings: 1, eaten: false, order: 0 });
        });
    });
    return slots;
}
export const seedSchedule = [
    { weekday: 1, workoutId: 'wo_full_body' },
    { weekday: 3, workoutId: 'wo_hiit' },
    { weekday: 5, workoutId: 'wo_full_body' },
    { weekday: 6, workoutId: 'wo_core' },
];
/** Seeds starter content on first launch only. */
export async function seedIfEmpty() {
    const done = await getSetting('seeded', false);
    if (done)
        return false;
    const existing = await count('exercises');
    if (existing === 0) {
        const now = Date.now();
        await bulkPut('exercises', seedExercises(now));
        await bulkPut('dishes', seedDishes(now));
        await bulkPut('workouts', seedWorkouts(now));
        await bulkPut('mealSlots', seedWeekPlan(1));
        await bulkPut('schedule', seedSchedule);
    }
    await setSetting('seeded', true);
    return true;
}
/** Re-adds any starter exercises/dishes that were deleted (keeps user edits). */
export async function restoreStarterContent() {
    const now = Date.now();
    const { getAll } = await import('../lib/db.js');
    const haveEx = new Set((await getAll('exercises')).map((e) => e.id));
    const haveDish = new Set((await getAll('dishes')).map((d) => d.id));
    const haveWo = new Set((await getAll('workouts')).map((w) => w.id));
    await bulkPut('exercises', seedExercises(now).filter((e) => !haveEx.has(e.id)));
    await bulkPut('dishes', seedDishes(now).filter((d) => !haveDish.has(d.id)));
    await bulkPut('workouts', seedWorkouts(now).filter((w) => !haveWo.has(w.id)));
}
