import { useMemo } from 'react';
import { getSetting, setSetting } from '../../lib/db.js';
import { formatRange, startOfWeek, todayKey, weekDays } from '../../lib/dates.js';
import { useLiveQuery, useProfile } from '../../lib/hooks.js';
import { useT } from '../../lib/i18n.js';
import { fmtAmount, shoppingList } from '../../lib/nutrition.js';
import { useDishMap, useMealSlots } from '../../lib/queries.js';
import { useRoute } from '../../lib/router.js';
import { Button, Empty, Screen, TopBar } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconCart, IconCheck, IconCopy } from '../../ui/icons.js';

export function ShoppingScreen() {
  const t = useT();
  const route = useRoute();
  const [profile] = useProfile();
  const weekStart = route.query.get('week') ?? startOfWeek(todayKey(), profile.weekStartsOn);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const slots = useMealSlots(days);
  const dishes = useDishMap();
  // Checked-off items live in the settings table (so they are part of the backup); older
  // installs kept them in localStorage — migrate that once.
  const key = 'shop:' + weekStart;
  const doneList = useLiveQuery(async () => {
    const stored = await getSetting<string[] | null>(key, null);
    if (stored) return stored;
    try {
      const raw = localStorage.getItem('forma:shop:' + weekStart);
      if (raw) { const list = JSON.parse(raw) as string[]; await setSetting(key, list); localStorage.removeItem('forma:shop:' + weekStart); return list; }
    } catch { /* ignore */ }
    return [];
  }, ['settings'], [key]);
  const done = useMemo(() => new Set(doneList ?? []), [doneList]);
  const setDone = (next: Set<string>) => { setSetting(key, [...next]); };

  const items = useMemo(() => (slots && dishes ? shoppingList(slots, dishes) : []), [slots, dishes]);

  const toggle = (key: string) => {
    const next = new Set(done);
    if (next.has(key)) next.delete(key); else next.add(key);
    setDone(next);
  };

  const copy = async () => {
    const text = items.filter((i) => !done.has(i.key)).map((i) => `• ${i.name} — ${fmtAmount(i.amount)} ${i.unit}`).join('\n');
    try {
      if (navigator.share) { await navigator.share({ title: t('shopping.listTitle', { range: formatRange(days[0], days[6]) }), text }); return; }
      await navigator.clipboard.writeText(text);
      toast(t('shopping.copiedToClipboard'));
    } catch { /* cancelled */ }
  };

  const remaining = items.filter((i) => !done.has(i.key)).length;

  return (
    <Screen>
      <TopBar large backTo="/forma/meals" title={t('shopping.title')} eyebrow={formatRange(days[0], days[6])} right={items.length > 0 ? <Button size="sm" variant="secondary" icon={<IconCopy size={16} />} onClick={copy}>{t('common.share')}</Button> : undefined} />
      {items.length === 0 ? (
        <Empty icon={<IconCart size={40} />} title={t('shopping.nothingToBuy')} text={t('shopping.nothingToBuyHint')} />
      ) : (
        <>
          <div className="spread mb"><span className="small muted">{t('shopping.itemsLeft', { done: remaining, total: items.length })}</span>{done.size > 0 && <button className="small c-meals bold" onClick={() => setDone(new Set())}>{t('common.uncheckAll')}</button>}</div>
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
