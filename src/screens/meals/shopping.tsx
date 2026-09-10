import { useEffect, useMemo, useState } from 'react';
import { formatRange, startOfWeek, todayKey, weekDays } from '../../lib/dates.js';
import { useProfile } from '../../lib/hooks.js';
import { fmtAmount, shoppingList } from '../../lib/nutrition.js';
import { useDishMap, useMealSlots } from '../../lib/queries.js';
import { useRoute } from '../../lib/router.js';
import { Button, Empty, Screen, TopBar } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconCart, IconCheck, IconCopy } from '../../ui/icons.js';

export function ShoppingScreen() {
  const route = useRoute();
  const [profile] = useProfile();
  const weekStart = route.query.get('week') ?? startOfWeek(todayKey(), profile.weekStartsOn);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const slots = useMealSlots(days);
  const dishes = useDishMap();
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try { const raw = localStorage.getItem('forma:shop:' + weekStart); if (raw) setDone(new Set(JSON.parse(raw))); } catch { /* ignore */ }
  }, [weekStart]);

  const items = useMemo(() => (slots && dishes ? shoppingList(slots, dishes) : []), [slots, dishes]);

  const toggle = (key: string) => {
    const next = new Set(done);
    if (next.has(key)) next.delete(key); else next.add(key);
    setDone(next);
    try { localStorage.setItem('forma:shop:' + weekStart, JSON.stringify([...next])); } catch { /* ignore */ }
  };

  const copy = async () => {
    const text = items.filter((i) => !done.has(i.key)).map((i) => `• ${i.name} — ${fmtAmount(i.amount)} ${i.unit}`).join('\n');
    try {
      if (navigator.share) { await navigator.share({ title: `Shopping list · ${formatRange(days[0], days[6])}`, text }); return; }
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard');
    } catch { /* cancelled */ }
  };

  const remaining = items.filter((i) => !done.has(i.key)).length;

  return (
    <Screen>
      <TopBar large backTo="/meals" title="Shopping list" eyebrow={formatRange(days[0], days[6])} right={items.length > 0 ? <Button size="sm" variant="secondary" icon={<IconCopy size={16} />} onClick={copy}>Share</Button> : undefined} />
      {items.length === 0 ? (
        <Empty icon={<IconCart size={40} />} title="Nothing to buy" text="Plan some dishes for this week and the ingredients will show up here, added up across days." />
      ) : (
        <>
          <div className="spread mb"><span className="small muted">{remaining} of {items.length} items left</span>{done.size > 0 && <button className="small c-meals bold" onClick={() => { setDone(new Set()); localStorage.removeItem('forma:shop:' + weekStart); }}>Uncheck all</button>}</div>
          <div className="list">
            {items.map((i) => (
              <button key={i.key} className={`shop-item ${done.has(i.key) ? 'done' : ''}`} onClick={() => toggle(i.key)}>
                <span className={`check ${done.has(i.key) ? 'on' : ''}`}>{done.has(i.key) && <IconCheck size={14} strokeWidth={3} />}</span>
                <div className="row-main">
                  <div className="row-title">{i.name}</div>
                  <div className="row-sub">{i.dishes.join(', ')}</div>
                </div>
                <div className="row-right num">{fmtAmount(i.amount)} {i.unit}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}
