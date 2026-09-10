import type { Dish, Ingredient, MealSlot, Nutrition } from './models.js';

export const ZERO: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function add(a: Nutrition, b: Nutrition, factor = 1): Nutrition {
  return { kcal: a.kcal + b.kcal * factor, protein: a.protein + b.protein * factor, carbs: a.carbs + b.carbs * factor, fat: a.fat + b.fat * factor };
}

export function scale(n: Nutrition, factor: number): Nutrition {
  return { kcal: n.kcal * factor, protein: n.protein * factor, carbs: n.carbs * factor, fat: n.fat * factor };
}

/** Total nutrition for the whole recipe (all servings). */
export function dishTotal(dish: Pick<Dish, 'ingredients' | 'nutritionOverride' | 'servings'>): Nutrition {
  if (dish.nutritionOverride) return scale(dish.nutritionOverride, Math.max(1, dish.servings));
  return dish.ingredients.reduce((acc, i) => add(acc, i), ZERO);
}

/** Per-serving nutrition. */
export function perServing(dish: Pick<Dish, 'ingredients' | 'nutritionOverride' | 'servings'>): Nutrition {
  if (dish.nutritionOverride) return dish.nutritionOverride;
  return scale(dishTotal(dish), 1 / Math.max(1, dish.servings));
}

export function slotNutrition(slot: MealSlot, dish: Dish | undefined): Nutrition {
  if (!dish) return ZERO;
  return scale(perServing(dish), slot.servings);
}

export function dayNutrition(slots: MealSlot[], dishes: Map<string, Dish>, onlyEaten = false): Nutrition {
  return slots.reduce((acc, s) => (onlyEaten && !s.eaten ? acc : add(acc, slotNutrition(s, dishes.get(s.dishId)))), ZERO);
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Scale an ingredient's nutrition when its amount changes (values are stored per the given amount). */
export function rescaleIngredient(i: Ingredient, newAmount: number): Ingredient {
  if (!i.amount || i.amount <= 0) return { ...i, amount: newAmount };
  const f = newAmount / i.amount;
  return { ...i, amount: newAmount, kcal: round(i.kcal * f, 1), protein: round(i.protein * f, 1), carbs: round(i.carbs * f, 1), fat: round(i.fat * f, 1) };
}

/** Build an aggregated shopping list from meal slots. */
export interface ShoppingItem { key: string; name: string; unit: string; amount: number; dishes: string[] }

export function shoppingList(slots: MealSlot[], dishes: Map<string, Dish>): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const s of slots) {
    const d = dishes.get(s.dishId);
    if (!d) continue;
    const factor = s.servings / Math.max(1, d.servings);
    for (const i of d.ingredients) {
      const key = `${i.name.trim().toLowerCase()}|${i.unit.trim().toLowerCase()}`;
      const cur = map.get(key) ?? { key, name: i.name.trim(), unit: i.unit, amount: 0, dishes: [] };
      cur.amount += i.amount * factor;
      if (!cur.dishes.includes(d.name)) cur.dishes.push(d.name);
      map.set(key, cur);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function fmtAmount(n: number): string {
  if (n >= 100) return String(Math.round(n));
  if (n >= 10) return String(round(n, 1)).replace(/\.0$/, '');
  return String(round(n, 2)).replace(/\.?0+$/, '');
}
