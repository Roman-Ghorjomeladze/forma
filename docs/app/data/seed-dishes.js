import { round } from '../lib/nutrition.js';
// Nutrition per 100 g (kcal, protein, carbs, fat). Approximate reference values.
/** Nutrition per 100 g: [kcal, protein, carbs, fat]. Also used for ingredient autocomplete in the dish editor. */
export const PER100 = {
    'Chicken breast': [165, 31, 0, 3.6], 'Turkey breast': [135, 30, 0, 1], 'Lean beef (5%)': [137, 21, 0, 5], 'Salmon fillet': [208, 20, 0, 13],
    'Cod fillet': [82, 18, 0, 0.7], 'Shrimp': [99, 24, 0.2, 0.3], 'Tuna (canned in water)': [116, 26, 0, 1],
    'Egg': [144, 12.6, 0.8, 9.6], 'Greek yogurt (0%)': [59, 10, 3.6, 0.4], 'Cottage cheese (5%)': [98, 11, 3.4, 4.3], 'Matsoni': [60, 3.3, 4.5, 3.3],
    'Milk (2%)': [50, 3.4, 4.8, 2], 'Feta': [264, 14, 4, 21], 'Whey protein': [375, 75, 10, 5],
    'Rolled oats': [379, 13, 68, 6.5], 'Rice (cooked)': [130, 2.7, 28, 0.3], 'Buckwheat (cooked)': [92, 3.4, 20, 0.6], 'Quinoa (cooked)': [120, 4.4, 21, 1.9],
    'Pasta (dry)': [371, 13, 75, 1.5], 'Potatoes': [77, 2, 17, 0.1], 'Sweet potato': [86, 1.6, 20, 0.1], 'Whole wheat bread': [250, 13, 41, 3.5], 'Tortilla wrap': [300, 8, 50, 7],
    'Lentils (dry)': [352, 25, 63, 1], 'Chickpeas (cooked)': [164, 9, 27, 2.6], 'Red beans (cooked)': [127, 8.7, 22.8, 0.5],
    'Broccoli': [34, 2.8, 7, 0.4], 'Spinach': [23, 2.9, 3.6, 0.4], 'Tomato': [18, 0.9, 3.9, 0.2], 'Cherry tomatoes': [18, 0.9, 3.9, 0.2], 'Cucumber': [15, 0.7, 3.6, 0.1],
    'Bell pepper': [26, 1, 6, 0.3], 'Zucchini': [17, 1.2, 3.1, 0.3], 'Onion': [40, 1.1, 9.3, 0.1], 'Carrot': [41, 0.9, 9.6, 0.2], 'Garlic': [149, 6.4, 33, 0.5], 'Mushrooms': [22, 3.1, 3.3, 0.3],
    'Banana': [89, 1.1, 23, 0.3], 'Apple': [52, 0.3, 14, 0.2], 'Mixed berries': [50, 0.7, 12, 0.3], 'Avocado': [160, 2, 9, 15], 'Lemon juice': [22, 0.4, 7, 0.2],
    'Olive oil': [884, 0, 0, 100], 'Butter': [717, 0.9, 0.1, 81], 'Peanut butter': [588, 25, 20, 50], 'Almonds': [579, 21, 22, 50], 'Walnuts': [654, 15, 14, 65],
    'Honey': [304, 0.3, 82, 0], 'Soy sauce': [53, 8, 5, 0], 'Cilantro': [23, 2.1, 3.7, 0.5], 'Dill': [43, 3.5, 7, 1.1], 'Tomato passata': [35, 1.5, 6, 0.3],
    'Chicken stock': [4, 0.4, 0.4, 0.1], 'Coriander & spices': [300, 12, 50, 10],
};
// Grams per common unit for the ingredients that use them.
export const UNIT_G = { tbsp: 14, tsp: 5, slice: 40, pcs: 1, scoop: 30, ml: 1, g: 1, cup: 240, clove: 4, wrap: 60, half: 70 };
export const PIECE_G = { Egg: 50, Banana: 120, Apple: 180, 'Tortilla wrap': 60, Avocado: 140, Onion: 110, 'Bell pepper': 120, Zucchini: 200, Carrot: 70, Garlic: 4, Tomato: 120, Lemon: 60 };
let n = 0;
function ing(name, amount, unit) {
    const per = PER100[name];
    let grams = amount;
    if (unit === 'pcs')
        grams = amount * (PIECE_G[name] ?? 100);
    else if (unit === 'clove')
        grams = amount * 4;
    else if (unit === 'half')
        grams = amount * 70;
    else
        grams = amount * (UNIT_G[unit] ?? 1);
    const f = per ? grams / 100 : 0;
    const [k, p, c, fat] = per ?? [0, 0, 0, 0];
    n += 1;
    return { id: `seed_ing_${n}`, name, amount, unit, kcal: round(k * f), protein: round(p * f, 1), carbs: round(c * f, 1), fat: round(fat * f, 1) };
}
const seeds = [
    {
        id: 'dish_yogurt_bowl', name: 'Greek yogurt power bowl', category: 'breakfast', servings: 1, prepMin: 5, cookMin: 0, tags: ['high protein', 'no cook', 'quick'],
        ingredients: [ing('Greek yogurt (0%)', 250, 'g'), ing('Rolled oats', 40, 'g'), ing('Mixed berries', 100, 'g'), ing('Whey protein', 15, 'g'), ing('Almonds', 15, 'g'), ing('Honey', 1, 'tsp')],
        steps: ['Stir the whey into the yogurt until smooth.', 'Top with oats, berries and chopped almonds.', 'Drizzle honey. Let it sit 5 minutes if you like softer oats.'],
    },
    {
        id: 'dish_protein_oats', name: 'Protein oatmeal with banana', category: 'breakfast', servings: 1, prepMin: 2, cookMin: 6, tags: ['high protein', 'quick'],
        ingredients: [ing('Rolled oats', 60, 'g'), ing('Milk (2%)', 250, 'ml'), ing('Whey protein', 25, 'g'), ing('Banana', 1, 'pcs'), ing('Peanut butter', 1, 'tsp')],
        steps: ['Simmer oats in milk for 5–6 minutes, stirring.', 'Take off the heat, wait a minute, then stir in the whey (too hot and it clumps).', 'Top with sliced banana and peanut butter.'],
    },
    {
        id: 'dish_omelette', name: 'Spinach & feta omelette with toast', category: 'breakfast', servings: 1, prepMin: 5, cookMin: 8, tags: ['high protein', 'vegetarian'],
        ingredients: [ing('Egg', 3, 'pcs'), ing('Spinach', 60, 'g'), ing('Tomato', 1, 'pcs'), ing('Feta', 30, 'g'), ing('Whole wheat bread', 1, 'slice'), ing('Olive oil', 1, 'tsp')],
        steps: ['Whisk eggs with a pinch of salt and pepper.', 'Wilt spinach in olive oil 1 minute, pour in eggs.', 'When almost set, add crumbled feta and diced tomato, fold in half.', 'Serve with toasted bread.'],
    },
    {
        id: 'dish_protein_pancakes', name: 'Protein pancakes', category: 'breakfast', servings: 1, prepMin: 5, cookMin: 10, tags: ['high protein', 'weekend'],
        ingredients: [ing('Rolled oats', 50, 'g'), ing('Egg', 2, 'pcs'), ing('Banana', 1, 'pcs'), ing('Whey protein', 30, 'g'), ing('Mixed berries', 80, 'g'), ing('Butter', 1, 'tsp')],
        steps: ['Blend oats, eggs, banana and whey into a thick batter.', 'Cook small pancakes over medium heat in a lightly buttered pan, ~2 minutes per side.', 'Serve with berries.'],
    },
    {
        id: 'dish_chicken_rice', name: 'Chicken rice bowl', category: 'lunch', servings: 1, prepMin: 10, cookMin: 20, tags: ['high protein', 'meal prep'],
        ingredients: [ing('Chicken breast', 200, 'g'), ing('Rice (cooked)', 200, 'g'), ing('Broccoli', 150, 'g'), ing('Olive oil', 1, 'tbsp'), ing('Soy sauce', 1, 'tbsp'), ing('Garlic', 1, 'clove')],
        steps: ['Cut chicken into strips, season with salt, pepper and garlic.', 'Sear in olive oil 3–4 minutes per side until cooked through.', 'Steam broccoli 4 minutes.', 'Serve over rice with soy sauce.'],
        notes: 'Cook 4 portions at once for the week.',
    },
    {
        id: 'dish_turkey_wrap', name: 'Turkey avocado wrap', category: 'lunch', servings: 1, prepMin: 8, cookMin: 0, tags: ['no cook', 'quick'],
        ingredients: [ing('Tortilla wrap', 1, 'pcs'), ing('Turkey breast', 120, 'g'), ing('Avocado', 1, 'half'), ing('Spinach', 30, 'g'), ing('Tomato', 1, 'pcs'), ing('Greek yogurt (0%)', 30, 'g')],
        steps: ['Spread mashed avocado and yogurt on the wrap.', 'Layer turkey, spinach and sliced tomato.', 'Roll tightly, cut in half.'],
    },
    {
        id: 'dish_tuna_salad', name: 'Tuna & chickpea salad', category: 'lunch', servings: 1, prepMin: 10, cookMin: 0, tags: ['high protein', 'no cook'],
        ingredients: [ing('Tuna (canned in water)', 150, 'g'), ing('Chickpeas (cooked)', 150, 'g'), ing('Cucumber', 150, 'g'), ing('Cherry tomatoes', 120, 'g'), ing('Olive oil', 1, 'tbsp'), ing('Lemon juice', 1, 'tbsp')],
        steps: ['Drain tuna and chickpeas.', 'Dice cucumber, halve tomatoes.', 'Toss everything with olive oil, lemon, salt and pepper.'],
    },
    {
        id: 'dish_lobio', name: 'Lobio (Georgian bean stew)', category: 'lunch', servings: 3, prepMin: 10, cookMin: 30, tags: ['vegetarian', 'georgian', 'meal prep'],
        ingredients: [ing('Red beans (cooked)', 600, 'g'), ing('Onion', 1, 'pcs'), ing('Walnuts', 40, 'g'), ing('Garlic', 2, 'clove'), ing('Cilantro', 20, 'g'), ing('Coriander & spices', 1, 'tbsp'), ing('Olive oil', 1, 'tbsp'), ing('Whole wheat bread', 3, 'slice')],
        steps: ['Soften the onion in oil, add garlic and spices (coriander, blue fenugreek, chili).', 'Add beans with some of their liquid, simmer 20 minutes, mash a third of them.', 'Stir in ground walnuts and cilantro; season with salt and a splash of vinegar.', 'Serve with bread (or mchadi).'],
    },
    {
        id: 'dish_salmon', name: 'Salmon, potatoes & greens', category: 'dinner', servings: 2, prepMin: 10, cookMin: 25, tags: ['high protein', 'fish'],
        ingredients: [ing('Salmon fillet', 300, 'g'), ing('Potatoes', 400, 'g'), ing('Broccoli', 300, 'g'), ing('Olive oil', 2, 'tbsp'), ing('Lemon juice', 2, 'tbsp'), ing('Dill', 10, 'g'), ing('Garlic', 2, 'clove')],
        steps: ['Halve the potatoes, toss with 1 tbsp oil and salt, roast at 220 °C for 25 minutes.', 'Season salmon with salt, pepper, garlic and dill; add to the tray for the last 12 minutes.', 'Steam broccoli 4 minutes.', 'Finish with lemon juice and the remaining oil.'],
    },
    {
        id: 'dish_beef_stirfry', name: 'Beef & vegetable stir-fry', category: 'dinner', servings: 2, prepMin: 15, cookMin: 15, tags: ['high protein'],
        ingredients: [ing('Lean beef (5%)', 400, 'g'), ing('Bell pepper', 2, 'pcs'), ing('Zucchini', 1, 'pcs'), ing('Onion', 1, 'pcs'), ing('Garlic', 2, 'clove'), ing('Soy sauce', 3, 'tbsp'), ing('Olive oil', 1, 'tbsp'), ing('Buckwheat (cooked)', 300, 'g')],
        steps: ['Slice beef thinly against the grain.', 'Sear beef in a very hot pan 2 minutes, set aside.', 'Stir-fry onion, pepper, zucchini and garlic 5 minutes.', 'Return beef, add soy sauce, toss 1 minute. Serve over buckwheat.'],
    },
    {
        id: 'dish_lentil_soup', name: 'Chicken & lentil soup', category: 'dinner', servings: 4, prepMin: 15, cookMin: 35, tags: ['meal prep', 'high protein'],
        ingredients: [ing('Chicken breast', 400, 'g'), ing('Lentils (dry)', 250, 'g'), ing('Carrot', 2, 'pcs'), ing('Onion', 1, 'pcs'), ing('Garlic', 3, 'clove'), ing('Tomato passata', 200, 'g'), ing('Chicken stock', 1200, 'ml'), ing('Olive oil', 1, 'tbsp')],
        steps: ['Sweat onion, carrot and garlic in oil 5 minutes.', 'Add lentils, passata and stock; simmer 20 minutes.', 'Add diced chicken, simmer 12 more minutes until lentils are soft.', 'Season generously; keeps 4 days in the fridge.'],
    },
    {
        id: 'dish_shrimp_pasta', name: 'Garlic shrimp pasta', category: 'dinner', servings: 2, prepMin: 10, cookMin: 15, tags: ['fish', 'quick'],
        ingredients: [ing('Pasta (dry)', 160, 'g'), ing('Shrimp', 300, 'g'), ing('Cherry tomatoes', 300, 'g'), ing('Garlic', 3, 'clove'), ing('Olive oil', 1.5, 'tbsp'), ing('Spinach', 100, 'g'), ing('Lemon juice', 1, 'tbsp')],
        steps: ['Cook pasta al dente, keep a cup of the water.', 'Fry garlic in oil 1 minute, add tomatoes, cook until they burst.', 'Add shrimp, cook 3 minutes; add spinach until wilted.', 'Toss with pasta, lemon and a splash of pasta water.'],
    },
    {
        id: 'dish_cod_quinoa', name: 'Baked cod with quinoa & spinach', category: 'dinner', servings: 2, prepMin: 10, cookMin: 20, tags: ['fish', 'light', 'high protein'],
        ingredients: [ing('Cod fillet', 400, 'g'), ing('Quinoa (cooked)', 300, 'g'), ing('Spinach', 200, 'g'), ing('Cherry tomatoes', 200, 'g'), ing('Olive oil', 1.5, 'tbsp'), ing('Lemon juice', 2, 'tbsp'), ing('Garlic', 2, 'clove')],
        steps: ['Bake cod with lemon, garlic, salt and half the oil at 200 °C for 15 minutes.', 'Sauté spinach and tomatoes in the remaining oil.', 'Serve over quinoa.'],
    },
    {
        id: 'dish_cottage_berries', name: 'Cottage cheese & berries', category: 'snack', servings: 1, prepMin: 2, cookMin: 0, tags: ['high protein', 'no cook'],
        ingredients: [ing('Cottage cheese (5%)', 200, 'g'), ing('Mixed berries', 100, 'g'), ing('Honey', 1, 'tsp')],
        steps: ['Combine and eat. That is the whole recipe.'],
    },
    {
        id: 'dish_protein_shake', name: 'Banana peanut protein shake', category: 'snack', servings: 1, prepMin: 3, cookMin: 0, tags: ['high protein', 'post workout'],
        ingredients: [ing('Milk (2%)', 300, 'ml'), ing('Whey protein', 30, 'g'), ing('Banana', 1, 'pcs'), ing('Peanut butter', 1, 'tbsp')],
        steps: ['Blend everything with a few ice cubes until smooth.'],
    },
    {
        id: 'dish_apple_pb', name: 'Apple with peanut butter', category: 'snack', servings: 1, prepMin: 2, cookMin: 0, tags: ['no cook', 'quick'],
        ingredients: [ing('Apple', 1, 'pcs'), ing('Peanut butter', 1, 'tbsp')],
        steps: ['Slice the apple, dip in peanut butter.'],
    },
    {
        id: 'dish_matsoni', name: 'Matsoni with walnuts & honey', category: 'snack', servings: 1, prepMin: 2, cookMin: 0, tags: ['georgian', 'no cook'],
        ingredients: [ing('Matsoni', 250, 'g'), ing('Walnuts', 20, 'g'), ing('Honey', 1, 'tsp')],
        steps: ['Spoon matsoni into a bowl, top with crushed walnuts and honey.'],
    },
];
export function seedDishes(now = Date.now()) {
    return seeds.map((s) => ({ ...s, notes: s.notes ?? '', favorite: false, createdAt: now, updatedAt: now }));
}
