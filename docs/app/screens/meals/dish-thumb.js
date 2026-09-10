import { jsx as _jsx } from "react/jsx-runtime";
import { useBlobUrl } from '../../lib/hooks.js';
import { IconBowl } from '../../ui/icons.js';
const CATEGORY_ICON = {
    breakfast: 'M3 10h18M5 10v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-6M19 12h1a2 2 0 0 1 0 4h-1',
    lunch: '',
    dinner: 'M2 12c4-6 12-6 16 0-4 6-12 6-16 0zM18 12l4-3v6zM7 12h.01',
    snack: 'M12 20a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM12 6V3M12 3c2 0 3 1 3 1',
};
export function DishThumb({ dish, small = false, large = false }) {
    const url = useBlobUrl(dish.imageBlobId);
    const cls = `thumb thumb-meals ${large ? 'thumb-lg' : ''}`;
    if (url)
        return _jsx("div", { className: cls, style: small ? { width: 40, height: 40, borderRadius: 12 } : undefined, children: _jsx("img", { src: url, alt: "" }) });
    const p = CATEGORY_ICON[dish.category];
    return (_jsx("div", { className: cls, style: small ? { width: 40, height: 40, borderRadius: 12 } : undefined, children: p ? (_jsx("svg", { width: small ? 20 : 24, height: small ? 20 : 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: _jsx("path", { d: p }) })) : _jsx(IconBowl, { size: small ? 20 : 24 }) }));
}
