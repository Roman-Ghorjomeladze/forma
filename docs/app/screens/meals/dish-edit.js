import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { PER100, PIECE_G, UNIT_G } from '../../data/seed-dishes.js';
import { get, put, saveBlob } from '../../lib/db.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { useT } from '../../lib/i18n.js';
import { uid } from '../../lib/ids.js';
import { MEAL_CATEGORIES } from '../../lib/models.js';
import { perServing, rescaleIngredient, round } from '../../lib/nutrition.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, Field, IconButton, NumberInput, Screen, Select, Stat, TextArea, TextInput, Toggle, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCamera, IconPlus, IconTrash } from '../../ui/icons.js';
const UNITS = ['g', 'ml', 'pcs', 'tbsp', 'tsp', 'slice', 'cup', 'scoop', 'clove', 'half'];
function blank() {
    const now = Date.now();
    return { id: uid('dish'), name: '', category: 'lunch', servings: 1, prepMin: 10, cookMin: 15, tags: [], ingredients: [], steps: [''], notes: '', favorite: false, createdAt: now, updatedAt: now };
}
function newIngredient() {
    return { id: uid('ing'), name: '', amount: 100, unit: 'g', kcal: 0, protein: 0, carbs: 0, fat: 0 };
}
/** Nutrition for a known ingredient name at a given amount/unit. */
function lookup(name, amount, unit) {
    const key = Object.keys(PER100).find((k) => k.toLowerCase() === name.trim().toLowerCase());
    if (!key)
        return null;
    let grams = amount;
    if (unit === 'pcs')
        grams = amount * (PIECE_G[key] ?? 100);
    else
        grams = amount * (UNIT_G[unit] ?? 1);
    const [k, p, c, f] = PER100[key];
    const x = grams / 100;
    return { kcal: round(k * x), protein: round(p * x, 1), carbs: round(c * x, 1), fat: round(f * x, 1) };
}
async function resizeImage(file, max = 1200) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
}
export function DishEditScreen({ id }) {
    const t = useT();
    const LABEL = { breakfast: t('meal.breakfast'), lunch: t('meal.lunch'), dinner: t('meal.dinner'), snack: t('meal.snack') };
    const route = useRoute();
    const [dish, setDish] = useState(id ? null : blank());
    const [tagsText, setTagsText] = useState('');
    const [useOverride, setUseOverride] = useState(false);
    const [pendingImage, setPendingImage] = useState(null);
    const [preview, setPreview] = useState(undefined);
    const existingUrl = useBlobUrl(dish?.imageBlobId);
    const fileRef = useRef(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!id)
            return;
        get('dishes', id).then((d) => {
            if (!d) {
                navigate('/meals/dishes', { replace: true });
                return;
            }
            setDish({ ...d, steps: d.steps.length ? d.steps : [''] });
            setTagsText(d.tags.join(', '));
            setUseOverride(!!d.nutritionOverride);
        });
    }, [id]);
    useEffect(() => {
        if (!pendingImage) {
            setPreview(undefined);
            return;
        }
        const u = URL.createObjectURL(pendingImage);
        setPreview(u);
        return () => URL.revokeObjectURL(u);
    }, [pendingImage]);
    const computed = useMemo(() => (dish ? perServing({ ...dish, nutritionOverride: undefined }) : null), [dish]);
    if (!dish)
        return _jsx(Screen, { className: "screen-no-tabs" });
    const patch = (p) => setDish({ ...dish, ...p });
    const setIng = (i, p) => patch({ ingredients: dish.ingredients.map((x, k) => (k === i ? { ...x, ...p } : x)) });
    const onNameBlur = (i) => {
        const ing = dish.ingredients[i];
        const n = lookup(ing.name, ing.amount, ing.unit);
        if (n && ing.kcal === 0 && ing.protein === 0)
            setIng(i, n);
    };
    const onAmountChange = (i, amount) => {
        const ing = dish.ingredients[i];
        const n = lookup(ing.name, amount, ing.unit);
        setIng(i, n ? { amount, ...n } : rescaleIngredient(ing, amount));
    };
    const onUnitChange = (i, unit) => {
        const ing = dish.ingredients[i];
        const n = lookup(ing.name, ing.amount, unit);
        setIng(i, n ? { unit, ...n } : { unit });
    };
    const save = async () => {
        if (!dish.name.trim()) {
            toast(t('dish.giveItAName'));
            return;
        }
        setSaving(true);
        try {
            let imageBlobId = dish.imageBlobId;
            if (pendingImage)
                imageBlobId = await saveBlob(pendingImage, dish.name);
            const tags = tagsText.split(',').map((tg) => tg.trim()).filter(Boolean);
            const steps = dish.steps.map((s) => s.trim()).filter(Boolean);
            const ingredients = dish.ingredients.filter((i) => i.name.trim());
            const nutritionOverride = useOverride ? dish.nutritionOverride ?? computed ?? undefined : undefined;
            const final = { ...dish, name: dish.name.trim(), tags, steps, ingredients, imageBlobId, nutritionOverride, updatedAt: Date.now() };
            await put('dishes', final);
            const date = route.query.get('date');
            const slot = route.query.get('slot');
            if (!id && date && slot) {
                await put('mealSlots', { id: uid('slot'), date, slot, dishId: final.id, servings: 1, eaten: false, order: Date.now() });
                toast(t('common.savedAndAddedTo', { meal: LABEL[slot].toLowerCase() }));
                navigate('/meals', { replace: true });
            }
            else {
                toast(t('common.saved'));
                navigate(`/meals/dish/${final.id}`, { replace: true });
            }
        }
        finally {
            setSaving(false);
        }
    };
    const cancel = async () => {
        if (id)
            navigate(`/meals/dish/${id}`, { replace: true });
        else if (dish.name || dish.ingredients.length) {
            if (await confirmDialog({ title: t('dish.discardTitle'), confirmLabel: t('common.discard'), danger: true }))
                navigate('/meals/dishes', { replace: true });
        }
        else
            navigate('/meals/dishes', { replace: true });
    };
    const override = dish.nutritionOverride ?? computed ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const shown = useOverride ? override : computed;
    const imgUrl = preview ?? existingUrl;
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { title: id ? t('dish.editDishTitle') : t('dish.newDishTitle'), onBack: cancel, right: _jsx(Button, { size: "sm", variant: "meals", onClick: save, disabled: saving, children: t('common.save') }) }), _jsx("button", { className: "demo-box mb", style: { width: '100%', height: 150, borderRadius: 20 }, onClick: () => fileRef.current?.click(), children: imgUrl ? _jsx("img", { src: imgUrl, alt: "", style: { objectFit: 'cover' } }) : _jsxs("span", { className: "hstack muted", children: [_jsx(IconCamera, {}), t('dish.addPhoto')] }) }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", hidden: true, onChange: async (e) => { const f = e.target.files?.[0]; if (f)
                    setPendingImage(await resizeImage(f)); } }), _jsx(Field, { label: t('dish.name'), children: _jsx(TextInput, { value: dish.name, onChange: (v) => patch({ name: v }), placeholder: t('dish.namePlaceholder'), autoFocus: !id }) }), _jsx(Field, { label: t('dish.mealField'), inline: true, children: _jsx(Select, { value: dish.category, onChange: (v) => patch({ category: v }), options: MEAL_CATEGORIES.map((c) => ({ value: c, label: LABEL[c] })) }) }), _jsx(Field, { label: t('dish.servingsField'), inline: true, children: _jsx(NumberInput, { value: dish.servings, min: 1, max: 50, onChange: (v) => patch({ servings: v }) }) }), _jsx(Field, { label: t('dish.prepTime'), inline: true, children: _jsx(NumberInput, { value: dish.prepMin, min: 0, max: 600, suffix: "min", onChange: (v) => patch({ prepMin: v }) }) }), _jsx(Field, { label: t('dish.cookTime'), inline: true, children: _jsx(NumberInput, { value: dish.cookMin, min: 0, max: 600, suffix: "min", onChange: (v) => patch({ cookMin: v }) }) }), _jsx(Field, { label: t('dish.tags'), hint: t('dish.tagsHint'), children: _jsx(TextInput, { value: tagsText, onChange: setTagsText, placeholder: t('dish.tagsPlaceholder') }) }), _jsx("div", { className: "section-label mt-lg", children: t('dish.ingredients') }), _jsx("div", { className: "small muted mb", children: t('dish.ingredientsHint') }), dish.ingredients.map((ing, i) => (_jsxs("div", { className: "ingredient-block", children: [_jsxs("div", { className: "ingredient-editor", children: [_jsx("input", { className: "input", list: "ingredient-names", placeholder: t('dish.ingredientPlaceholder'), value: ing.name, onChange: (e) => setIng(i, { name: e.target.value }), onBlur: () => onNameBlur(i) }), _jsx("input", { className: "input", inputMode: "decimal", placeholder: t('dish.amountPlaceholder'), value: ing.amount || '', onChange: (e) => { const n = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(n))
                                    onAmountChange(i, n); } }), _jsx("select", { className: "input select", style: { paddingRight: 8 }, value: ing.unit, onChange: (e) => onUnitChange(i, e.target.value), children: UNITS.map((u) => _jsx("option", { value: u, children: u }, u)) })] }), _jsx("div", { className: "ingredient-nutri", children: ['kcal', 'protein', 'carbs', 'fat'].map((k) => (_jsxs("div", { children: [_jsx("input", { className: "input", inputMode: "decimal", value: ing[k], onChange: (e) => { const n = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(n))
                                        setIng(i, { [k]: n }); } }), _jsx("div", { className: "mini-label", children: k === 'kcal' ? 'kcal' : `${k} g` })] }, k))) }), _jsxs("div", { className: "spread", style: { marginTop: 6 }, children: [_jsxs("span", { className: "small muted", children: [Math.round(ing.kcal), " ", t('unit.kcal')] }), _jsx(IconButton, { label: t('dish.removeIngredient'), className: "iconbtn-plain", onClick: () => patch({ ingredients: dish.ingredients.filter((_, k) => k !== i) }), children: _jsx(IconTrash, { size: 18 }) })] })] }, ing.id))), _jsx("datalist", { id: "ingredient-names", children: Object.keys(PER100).map((k) => _jsx("option", { value: k }, k)) }), _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconPlus, { size: 18 }), onClick: () => patch({ ingredients: [...dish.ingredients, newIngredient()] }), children: t('dish.addIngredient') }), _jsx("div", { className: "section-label mt-lg", children: t('dish.nutritionPerServing') }), _jsxs("div", { className: "stats mb", children: [_jsx(Stat, { tone: "dark", value: Math.round(shown.kcal), label: t('dish.kcal') }), _jsx(Stat, { tone: "protein", value: `${Math.round(shown.protein)}g`, label: t('dish.protein') }), _jsx(Stat, { tone: "carbs", value: `${Math.round(shown.carbs)}g`, label: t('dish.carbs') }), _jsx(Stat, { tone: "fat", value: `${Math.round(shown.fat)}g`, label: t('dish.fat') })] }), _jsx(Field, { label: t('dish.enterNutritionManually'), inline: true, hint: useOverride ? t('dish.overridesTotals') : undefined, children: _jsx(Toggle, { checked: useOverride, onChange: (v) => { setUseOverride(v); if (v && !dish.nutritionOverride)
                        patch({ nutritionOverride: computed ?? undefined }); } }) }), useOverride && (_jsx("div", { className: "ingredient-nutri mb", children: ['kcal', 'protein', 'carbs', 'fat'].map((k) => (_jsxs("div", { children: [_jsx("input", { className: "input", inputMode: "decimal", value: override[k], onChange: (e) => { const n = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(n))
                                patch({ nutritionOverride: { ...override, [k]: n } }); } }), _jsx("div", { className: "mini-label", children: k === 'kcal' ? 'kcal' : `${k} g` })] }, k))) })), _jsx("div", { className: "section-label mt-lg", children: t('dish.cookingSteps') }), dish.steps.map((s, i) => (_jsxs("div", { className: "hstack mb", style: { alignItems: 'flex-start' }, children: [_jsx("div", { className: "step-n", style: { marginTop: 10 }, children: i + 1 }), _jsx(TextArea, { rows: 2, value: s, placeholder: t('dish.stepPlaceholder'), onChange: (v) => patch({ steps: dish.steps.map((x, k) => (k === i ? v : x)) }) }), _jsx(IconButton, { label: t('dish.removeStep'), className: "iconbtn-plain", onClick: () => patch({ steps: dish.steps.filter((_, k) => k !== i) }), children: _jsx(IconTrash, { size: 18 }) })] }, i))), _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconPlus, { size: 18 }), onClick: () => patch({ steps: [...dish.steps, ''] }), children: t('dish.addStep') }), _jsx(Field, { label: t('dish.notes'), children: _jsx(TextArea, { value: dish.notes, onChange: (v) => patch({ notes: v }), placeholder: t('dish.notesPlaceholder') }) }), _jsxs("div", { className: "stack mt-lg", children: [_jsx(Button, { variant: "meals", size: "lg", full: true, onClick: save, disabled: saving, children: id ? t('common.saveChanges') : t('dish.createDish') }), _jsx(Button, { variant: "ghost", full: true, onClick: cancel, children: t('common.cancel') })] })] }));
}
