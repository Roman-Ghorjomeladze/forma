import { useEffect, useMemo, useRef, useState } from 'react';
import { PER100, PIECE_G, UNIT_G } from '../../data/seed-dishes.js';
import { get, put, saveBlob } from '../../lib/db.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { MEAL_CATEGORIES, type Dish, type Ingredient, type MealCategory, type Nutrition } from '../../lib/models.js';
import { perServing, rescaleIngredient, round } from '../../lib/nutrition.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Field, IconButton, NumberInput, Screen, Select, Stat, TextArea, TextInput, Toggle, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCamera, IconPlus, IconTrash } from '../../ui/icons.js';

const LABEL: Record<MealCategory, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const UNITS = ['g', 'ml', 'pcs', 'tbsp', 'tsp', 'slice', 'cup', 'scoop', 'clove', 'half'];

function blank(): Dish {
  const now = Date.now();
  return { id: uid('dish'), name: '', category: 'lunch', servings: 1, prepMin: 10, cookMin: 15, tags: [], ingredients: [], steps: [''], notes: '', favorite: false, createdAt: now, updatedAt: now };
}

function newIngredient(): Ingredient {
  return { id: uid('ing'), name: '', amount: 100, unit: 'g', kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

/** Nutrition for a known ingredient name at a given amount/unit. */
function lookup(name: string, amount: number, unit: string): Nutrition | null {
  const key = Object.keys(PER100).find((k) => k.toLowerCase() === name.trim().toLowerCase());
  if (!key) return null;
  let grams = amount;
  if (unit === 'pcs') grams = amount * (PIECE_G[key] ?? 100);
  else grams = amount * (UNIT_G[unit] ?? 1);
  const [k, p, c, f] = PER100[key];
  const x = grams / 100;
  return { kcal: round(k * x), protein: round(p * x, 1), carbs: round(c * x, 1), fat: round(f * x, 1) };
}

async function resizeImage(file: File, max = 1200): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
}

export function DishEditScreen({ id }: { id?: string }) {
  const route = useRoute();
  const [dish, setDish] = useState<Dish | null>(id ? null : blank());
  const [tagsText, setTagsText] = useState('');
  const [useOverride, setUseOverride] = useState(false);
  const [pendingImage, setPendingImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const existingUrl = useBlobUrl(dish?.imageBlobId);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    get('dishes', id).then((d) => {
      if (!d) { navigate('/meals/dishes', { replace: true }); return; }
      setDish({ ...d, steps: d.steps.length ? d.steps : [''] });
      setTagsText(d.tags.join(', '));
      setUseOverride(!!d.nutritionOverride);
    });
  }, [id]);

  useEffect(() => {
    if (!pendingImage) { setPreview(undefined); return; }
    const u = URL.createObjectURL(pendingImage);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [pendingImage]);

  const computed = useMemo(() => (dish ? perServing({ ...dish, nutritionOverride: undefined }) : null), [dish]);

  if (!dish) return <Screen className="screen-no-tabs" />;

  const patch = (p: Partial<Dish>) => setDish({ ...dish, ...p });
  const setIng = (i: number, p: Partial<Ingredient>) => patch({ ingredients: dish.ingredients.map((x, k) => (k === i ? { ...x, ...p } : x)) });

  const onNameBlur = (i: number) => {
    const ing = dish.ingredients[i];
    const n = lookup(ing.name, ing.amount, ing.unit);
    if (n && ing.kcal === 0 && ing.protein === 0) setIng(i, n);
  };
  const onAmountChange = (i: number, amount: number) => {
    const ing = dish.ingredients[i];
    const n = lookup(ing.name, amount, ing.unit);
    setIng(i, n ? { amount, ...n } : rescaleIngredient(ing, amount));
  };
  const onUnitChange = (i: number, unit: string) => {
    const ing = dish.ingredients[i];
    const n = lookup(ing.name, ing.amount, unit);
    setIng(i, n ? { unit, ...n } : { unit });
  };

  const save = async () => {
    if (!dish.name.trim()) { toast('Give the dish a name'); return; }
    setSaving(true);
    try {
      let imageBlobId = dish.imageBlobId;
      if (pendingImage) imageBlobId = await saveBlob(pendingImage, dish.name);
      const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
      const steps = dish.steps.map((s) => s.trim()).filter(Boolean);
      const ingredients = dish.ingredients.filter((i) => i.name.trim());
      const nutritionOverride = useOverride ? dish.nutritionOverride ?? computed ?? undefined : undefined;
      const final: Dish = { ...dish, name: dish.name.trim(), tags, steps, ingredients, imageBlobId, nutritionOverride, updatedAt: Date.now() };
      await put('dishes', final);
      const date = route.query.get('date');
      const slot = route.query.get('slot') as MealCategory | null;
      if (!id && date && slot) {
        await put('mealSlots', { id: uid('slot'), date, slot, dishId: final.id, servings: 1, eaten: false, order: Date.now() });
        toast(`Saved and added to ${slot}`);
        navigate('/meals', { replace: true });
      } else {
        toast('Saved');
        navigate(`/meals/dish/${final.id}`, { replace: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (id) navigate(`/meals/dish/${id}`, { replace: true });
    else if (dish.name || dish.ingredients.length) { if (await confirmDialog({ title: 'Discard this dish?', confirmLabel: 'Discard', danger: true })) navigate('/meals/dishes', { replace: true }); }
    else navigate('/meals/dishes', { replace: true });
  };

  const override = dish.nutritionOverride ?? computed ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const shown = useOverride ? override : computed!;
  const imgUrl = preview ?? existingUrl;

  return (
    <Screen className="screen-no-tabs">
      <TopBar title={id ? 'Edit dish' : 'New dish'} onBack={cancel} right={<Button size="sm" variant="meals" onClick={save} disabled={saving}>Save</Button>} />

      <button className="demo-box mb" style={{ width: '100%', height: 150, borderRadius: 20 }} onClick={() => fileRef.current?.click()}>
        {imgUrl ? <img src={imgUrl} alt="" style={{ objectFit: 'cover' }} /> : <span className="hstack muted"><IconCamera />Add a photo</span>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e: { target: HTMLInputElement }) => { const f = e.target.files?.[0]; if (f) setPendingImage(await resizeImage(f)); }} />

      <Field label="Name"><TextInput value={dish.name} onChange={(v) => patch({ name: v })} placeholder="e.g. Chicken rice bowl" autoFocus={!id} /></Field>
      <Field label="Meal" inline><Select value={dish.category} onChange={(v) => patch({ category: v })} options={MEAL_CATEGORIES.map((c) => ({ value: c, label: LABEL[c] }))} /></Field>
      <Field label="Servings" inline><NumberInput value={dish.servings} min={1} max={50} onChange={(v) => patch({ servings: v })} /></Field>
      <Field label="Prep time" inline><NumberInput value={dish.prepMin} min={0} max={600} suffix="min" onChange={(v) => patch({ prepMin: v })} /></Field>
      <Field label="Cook time" inline><NumberInput value={dish.cookMin} min={0} max={600} suffix="min" onChange={(v) => patch({ cookMin: v })} /></Field>
      <Field label="Tags" hint="Comma separated, e.g. high protein, quick"><TextInput value={tagsText} onChange={setTagsText} placeholder="high protein, meal prep" /></Field>

      <div className="section-label mt-lg">Ingredients</div>
      <div className="small muted mb">Nutrition is for the amount you enter. Known ingredients (chicken breast, oats, olive oil…) auto-fill.</div>
      {dish.ingredients.map((ing, i) => (
        <div key={ing.id} className="ingredient-block">
          <div className="ingredient-editor">
            <input className="input" list="ingredient-names" placeholder="Ingredient" value={ing.name} onChange={(e: { target: HTMLInputElement }) => setIng(i, { name: e.target.value })} onBlur={() => onNameBlur(i)} />
            <input className="input" inputMode="decimal" placeholder="Amount" value={ing.amount || ''} onChange={(e: { target: HTMLInputElement }) => { const n = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(n)) onAmountChange(i, n); }} />
            <select className="input select" style={{ paddingRight: 8 }} value={ing.unit} onChange={(e: { target: HTMLSelectElement }) => onUnitChange(i, e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="ingredient-nutri">
            {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
              <div key={k}>
                <input className="input" inputMode="decimal" value={ing[k]} onChange={(e: { target: HTMLInputElement }) => { const n = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(n)) setIng(i, { [k]: n } as Partial<Ingredient>); }} />
                <div className="mini-label">{k === 'kcal' ? 'kcal' : `${k} g`}</div>
              </div>
            ))}
          </div>
          <div className="spread" style={{ marginTop: 6 }}>
            <span className="small muted">{Math.round(ing.kcal)} kcal</span>
            <IconButton label="Remove ingredient" className="iconbtn-plain" onClick={() => patch({ ingredients: dish.ingredients.filter((_, k) => k !== i) })}><IconTrash size={18} /></IconButton>
          </div>
        </div>
      ))}
      <datalist id="ingredient-names">{Object.keys(PER100).map((k) => <option key={k} value={k} />)}</datalist>
      <Button variant="secondary" full icon={<IconPlus size={18} />} onClick={() => patch({ ingredients: [...dish.ingredients, newIngredient()] })}>Add ingredient</Button>

      <div className="section-label mt-lg">Nutrition per serving</div>
      <div className="stats mb">
        <Stat tone="dark" value={Math.round(shown.kcal)} label="kcal" />
        <Stat tone="protein" value={`${Math.round(shown.protein)}g`} label="protein" />
        <Stat tone="carbs" value={`${Math.round(shown.carbs)}g`} label="carbs" />
        <Stat tone="fat" value={`${Math.round(shown.fat)}g`} label="fat" />
      </div>
      <Field label="Enter nutrition manually" inline hint={useOverride ? 'Overrides the ingredient totals.' : undefined}><Toggle checked={useOverride} onChange={(v) => { setUseOverride(v); if (v && !dish.nutritionOverride) patch({ nutritionOverride: computed ?? undefined }); }} /></Field>
      {useOverride && (
        <div className="ingredient-nutri mb">
          {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
            <div key={k}>
              <input className="input" inputMode="decimal" value={override[k]} onChange={(e: { target: HTMLInputElement }) => { const n = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(n)) patch({ nutritionOverride: { ...override, [k]: n } }); }} />
              <div className="mini-label">{k === 'kcal' ? 'kcal' : `${k} g`}</div>
            </div>
          ))}
        </div>
      )}

      <div className="section-label mt-lg">Cooking steps</div>
      {dish.steps.map((s, i) => (
        <div key={i} className="hstack mb" style={{ alignItems: 'flex-start' }}>
          <div className="step-n" style={{ marginTop: 10 }}>{i + 1}</div>
          <TextArea rows={2} value={s} placeholder="What to do…" onChange={(v) => patch({ steps: dish.steps.map((x, k) => (k === i ? v : x)) })} />
          <IconButton label="Remove step" className="iconbtn-plain" onClick={() => patch({ steps: dish.steps.filter((_, k) => k !== i) })}><IconTrash size={18} /></IconButton>
        </div>
      ))}
      <Button variant="secondary" full icon={<IconPlus size={18} />} onClick={() => patch({ steps: [...dish.steps, ''] })}>Add step</Button>

      <Field label="Notes" ><TextArea value={dish.notes} onChange={(v) => patch({ notes: v })} placeholder="Tips, substitutions, where you found it…" /></Field>

      <div className="stack mt-lg">
        <Button variant="meals" size="lg" full onClick={save} disabled={saving}>{id ? 'Save changes' : 'Create dish'}</Button>
        <Button variant="ghost" full onClick={cancel}>Cancel</Button>
      </div>
    </Screen>
  );
}
