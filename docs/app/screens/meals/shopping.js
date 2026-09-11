import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { formatRange, startOfWeek, todayKey, weekDays } from '../../lib/dates.js';
import { useProfile } from '../../lib/hooks.js';
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
    const [done, setDone] = useState(new Set());
    useEffect(() => {
        try {
            const raw = localStorage.getItem('forma:shop:' + weekStart);
            if (raw)
                setDone(new Set(JSON.parse(raw)));
        }
        catch { /* ignore */ }
    }, [weekStart]);
    const items = useMemo(() => (slots && dishes ? shoppingList(slots, dishes) : []), [slots, dishes]);
    const toggle = (key) => {
        const next = new Set(done);
        if (next.has(key))
            next.delete(key);
        else
            next.add(key);
        setDone(next);
        try {
            localStorage.setItem('forma:shop:' + weekStart, JSON.stringify([...next]));
        }
        catch { /* ignore */ }
    };
    const copy = async () => {
        const text = items.filter((i) => !done.has(i.key)).map((i) => `• ${i.name} — ${fmtAmount(i.amount)} ${i.unit}`).join('\n');
        try {
            if (navigator.share) {
                await navigator.share({ title: t('shopping.listTitle', { range: formatRange(days[0], days[6]) }), text });
                return;
            }
            await navigator.clipboard.writeText(text);
            toast(t('shopping.copiedToClipboard'));
        }
        catch { /* cancelled */ }
    };
    const remaining = items.filter((i) => !done.has(i.key)).length;
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, backTo: "/meals", title: t('shopping.title'), eyebrow: formatRange(days[0], days[6]), right: items.length > 0 ? _jsx(Button, { size: "sm", variant: "secondary", icon: _jsx(IconCopy, { size: 16 }), onClick: copy, children: t('common.share') }) : undefined }), items.length === 0 ? (_jsx(Empty, { icon: _jsx(IconCart, { size: 40 }), title: t('shopping.nothingToBuy'), text: t('shopping.nothingToBuyHint') })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "spread mb", children: [_jsx("span", { className: "small muted", children: t('shopping.itemsLeft', { done: remaining, total: items.length }) }), done.size > 0 && _jsx("button", { className: "small c-meals bold", onClick: () => { setDone(new Set()); localStorage.removeItem('forma:shop:' + weekStart); }, children: t('common.uncheckAll') })] }), _jsx("div", { className: "list", children: items.map((i) => (_jsxs("button", { className: `shop-item ${done.has(i.key) ? 'done' : ''}`, onClick: () => toggle(i.key), children: [_jsx("span", { className: `check ${done.has(i.key) ? 'on' : ''}`, children: done.has(i.key) && _jsx(IconCheck, { size: 14, strokeWidth: 3 }) }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: i.name }), _jsx("div", { className: "row-sub", children: i.dishes.join(', ') })] }), _jsxs("div", { className: "row-right num", children: [fmtAmount(i.amount), " ", i.unit] })] }, i.key))) })] }))] }));
}
