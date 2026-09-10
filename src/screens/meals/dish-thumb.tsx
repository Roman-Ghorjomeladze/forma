import { useBlobUrl } from '../../lib/hooks.js';
import type { Dish } from '../../lib/models.js';
import { IconBowl } from '../../ui/icons.js';

const CATEGORY_ICON: Record<string, string> = {
  breakfast: 'M3 10h18M5 10v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-6M19 12h1a2 2 0 0 1 0 4h-1',
  lunch: '',
  dinner: 'M2 12c4-6 12-6 16 0-4 6-12 6-16 0zM18 12l4-3v6zM7 12h.01',
  snack: 'M12 20a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM12 6V3M12 3c2 0 3 1 3 1',
};

export function DishThumb({ dish, small = false, large = false }: { dish: Dish; small?: boolean; large?: boolean }) {
  const url = useBlobUrl(dish.imageBlobId);
  const cls = `thumb thumb-meals ${large ? 'thumb-lg' : ''}`;
  if (url) return <div className={cls} style={small ? { width: 40, height: 40, borderRadius: 12 } : undefined}><img src={url} alt="" /></div>;
  const p = CATEGORY_ICON[dish.category];
  return (
    <div className={cls} style={small ? { width: 40, height: 40, borderRadius: 12 } : undefined}>
      {p ? (
        <svg width={small ? 20 : 24} height={small ? 20 : 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={p} /></svg>
      ) : <IconBowl size={small ? 20 : 24} />}
    </div>
  );
}
