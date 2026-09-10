import { useMemo, useState } from 'react';
import { MEAL_CATEGORIES, type MealCategory } from '../../lib/models.js';
import { perServing } from '../../lib/nutrition.js';
import { useDishes } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Chip, Empty, IconButton, Row, Screen, TopBar } from '../../ui/components.js';
import { IconBowl, IconPlus, IconSearch } from '../../ui/icons.js';
import { DishThumb } from './dish-thumb.js';

const LABEL: Record<MealCategory, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

export function DishListScreen() {
  const dishes = useDishes();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<MealCategory | 'all' | 'fav'>('all');

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (dishes ?? [])
      .filter((d) => cat === 'all' || (cat === 'fav' ? d.favorite : d.category === cat))
      .filter((d) => !ql || d.name.toLowerCase().includes(ql) || d.tags.some((t) => t.toLowerCase().includes(ql)) || d.ingredients.some((i) => i.name.toLowerCase().includes(ql)));
  }, [dishes, q, cat]);

  return (
    <Screen>
      <TopBar large backTo="/meals" title="Dishes" eyebrow={`${dishes?.length ?? 0} recipes`} right={<IconButton label="New dish" tone="meals" onClick={() => navigate('/meals/dish/new')}><IconPlus /></IconButton>} />
      <div className="searchbar">
        <IconSearch size={18} />
        <input className="input" placeholder="Search dishes, tags, ingredients" value={q} onChange={(e: { target: HTMLInputElement }) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        <Chip tone="meals" active={cat === 'all'} onClick={() => setCat('all')}>All</Chip>
        <Chip tone="meals" active={cat === 'fav'} onClick={() => setCat('fav')}>★ Favorites</Chip>
        {MEAL_CATEGORIES.map((c) => <Chip key={c} tone="meals" active={cat === c} onClick={() => setCat(c)}>{LABEL[c]}</Chip>)}
      </div>
      {dishes && dishes.length === 0 ? (
        <Empty icon={<IconBowl size={40} />} title="No dishes yet" text="Create your first recipe with ingredients, steps and nutrition." action={<Button variant="meals" icon={<IconPlus size={18} />} onClick={() => navigate('/meals/dish/new')}>New dish</Button>} />
      ) : (
        <div className="list mt">
          {filtered.map((d) => {
            const n = perServing(d);
            return (
              <Row key={d.id} onClick={() => navigate(`/meals/dish/${d.id}`)} right={<div style={{ textAlign: 'right' }}><div className="num">{Math.round(n.kcal)} kcal</div><div className="small muted num">{Math.round(n.protein)} g P</div></div>}>
                <DishThumb dish={d} />
                <div className="row-main">
                  <div className="row-title">{d.favorite ? '★ ' : ''}{d.name}</div>
                  <div className="row-sub">{LABEL[d.category]}{d.prepMin + d.cookMin > 0 ? ` · ${d.prepMin + d.cookMin} min` : ''}{d.tags.length ? ` · ${d.tags.slice(0, 2).join(', ')}` : ''}</div>
                </div>
              </Row>
            );
          })}
          {filtered.length === 0 && <div className="empty"><div className="empty-title">Nothing matches</div></div>}
        </div>
      )}
    </Screen>
  );
}
