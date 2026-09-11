import { bulkPut, count, getSetting, setSetting } from '../lib/db.js';
import { addDays, startOfWeek, todayKey } from '../lib/dates.js';
import { seedDishes } from './seed-dishes.js';
import { seedExercises } from './seed-exercises.js';
import { seedVideoLibrary } from './exercise-video-library.js';
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
        {
            id: 'wo_upper_body', name: 'Upper body strength', description: 'Push, pull and a core finisher for chest, back, shoulders and arms. No equipment.', color: '#B45CDE', createdAt: now, updatedAt: now,
            blocks: [
                { id: 'u1', type: 'exercise', exerciseId: 'ex_push_ups', reps: 12 }, { id: 'u2', type: 'rest', seconds: 20 },
                { id: 'u3', type: 'exercise', exerciseId: 'exv_bodyweight-chest-incline-push-up', reps: 12 }, { id: 'u4', type: 'rest', seconds: 20 },
                { id: 'u5', type: 'exercise', exerciseId: 'exv_bodyweight-back-inverted-row', reps: 10 }, { id: 'u6', type: 'rest', seconds: 20 },
                { id: 'u7', type: 'exercise', exerciseId: 'ex_dips', reps: 12 }, { id: 'u8', type: 'rest', seconds: 20 },
                { id: 'u9', type: 'exercise', exerciseId: 'exv_bodyweight-arms-shoulders-pike-push-up', reps: 10 }, { id: 'u10', type: 'rest', seconds: 20 },
                { id: 'u11', type: 'exercise', exerciseId: 'exv_bodyweight-arms-shoulders-tricep-extension', reps: 12 }, { id: 'u12', type: 'rest', seconds: 20 },
                { id: 'u13', type: 'exercise', exerciseId: 'ex_plank', seconds: 45 },
            ],
        },
        {
            id: 'wo_lower_body', name: 'Lower body strength', description: 'Squats, lunges and single-leg work for quads, glutes and hamstrings. No equipment.', color: '#E0A72E', createdAt: now, updatedAt: now,
            blocks: [
                { id: 'l1', type: 'exercise', exerciseId: 'ex_squats', reps: 15 }, { id: 'l2', type: 'rest', seconds: 20 },
                { id: 'l3', type: 'exercise', exerciseId: 'ex_lunges', reps: 12 }, { id: 'l4', type: 'rest', seconds: 20 },
                { id: 'l5', type: 'exercise', exerciseId: 'exv_bodyweight-legs-bulgarian-split-squat', reps: 10 }, { id: 'l6', type: 'rest', seconds: 20 },
                { id: 'l7', type: 'exercise', exerciseId: 'ex_glute_bridge', reps: 15 }, { id: 'l8', type: 'rest', seconds: 20 },
                { id: 'l9', type: 'exercise', exerciseId: 'exv_bodyweight-legs-single-leg-deadlift', reps: 10 }, { id: 'l10', type: 'rest', seconds: 20 },
                { id: 'l11', type: 'exercise', exerciseId: 'exv_bodyweight-legs-sumo-squat', reps: 15 }, { id: 'l12', type: 'rest', seconds: 20 },
                { id: 'l13', type: 'exercise', exerciseId: 'exv_bodyweight-legs-calf-raise', reps: 20 },
            ],
        },
        {
            id: 'wo_mobility', name: 'Mobility & stretch', description: 'A gentle full-body stretch flow to loosen up or cool down. No equipment.', color: '#5BA3A0', createdAt: now, updatedAt: now,
            blocks: [
                { id: 'm1', type: 'exercise', exerciseId: 'ex_stretch', seconds: 60 }, { id: 'm2', type: 'rest', seconds: 10 },
                { id: 'm3', type: 'exercise', exerciseId: 'exv_stretching-upper-body-childs-pose-back-stretch', seconds: 40 }, { id: 'm4', type: 'rest', seconds: 10 },
                { id: 'm5', type: 'exercise', exerciseId: 'exv_stretching-lower-body-standing-quadricep-stretch', seconds: 30 }, { id: 'm6', type: 'rest', seconds: 10 },
                { id: 'm7', type: 'exercise', exerciseId: 'exv_stretching-lower-body-kneeling-hamstring-stretch', seconds: 30 }, { id: 'm8', type: 'rest', seconds: 10 },
                { id: 'm9', type: 'exercise', exerciseId: 'exv_stretching-upper-body-doorway-chest-stretch', seconds: 30 }, { id: 'm10', type: 'rest', seconds: 10 },
                { id: 'm11', type: 'exercise', exerciseId: 'exv_stretching-lower-body-hip-flexor-stretch', seconds: 30 }, { id: 'm12', type: 'rest', seconds: 10 },
                { id: 'm13', type: 'exercise', exerciseId: 'exv_stretching-upper-body-rear-deltoid-stretch', seconds: 30 }, { id: 'm14', type: 'rest', seconds: 10 },
                { id: 'm15', type: 'exercise', exerciseId: 'exv_stretching-lower-body-lunging-calf-stretch', seconds: 30 },
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
    { weekday: 2, workoutId: 'wo_upper_body' },
    { weekday: 3, workoutId: 'wo_hiit' },
    { weekday: 4, workoutId: 'wo_lower_body' },
    { weekday: 5, workoutId: 'wo_core' },
    { weekday: 6, workoutId: 'wo_mobility' },
    // Sunday (weekday 0) is left as a rest day.
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
        await bulkPut('exercises', seedVideoLibrary(now));
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
    await bulkPut('exercises', seedVideoLibrary(now).filter((e) => !haveEx.has(e.id)));
    await bulkPut('dishes', seedDishes(now).filter((d) => !haveDish.has(d.id)));
    await bulkPut('workouts', seedWorkouts(now).filter((w) => !haveWo.has(w.id)));
}
