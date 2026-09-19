import { jsx as _jsx } from "react/jsx-runtime";
// Shared bits for the Flags app: continent chips, flag image, continent filter persisted in a setting.
import { useEffect, useState } from 'react';
import { getSetting, setSetting } from '../../lib/db.js';
import { CONTINENT_LIST, continentShort, flagUrl } from '../../lib/flags.js';
import { useT } from '../../lib/i18n.js';
export function Flag({ country, className = '', size }) {
    return _jsx("img", { className: `flag ${className}`, src: flagUrl(country.c), alt: "", draggable: false, loading: "lazy", style: size ? { width: size, height: size * 0.75 } : undefined });
}
export function ContinentChips({ value, onChange, tone = 'flags' }) {
    const t = useT();
    const all = ['all', ...CONTINENT_LIST];
    return (_jsx("div", { className: "chips continent-chips", children: all.map((c) => _jsx("button", { type: "button", className: `chip chip-${tone} ${value === c ? 'chip-active' : ''}`, onClick: () => onChange(c), children: c === 'all' ? t('flags.all') : continentShort(c) }, c)) }));
}
/** Continent filter shared by the slider and the quiz, remembered between visits. */
export function useContinentFilter(key = 'flags:continent') {
    const [value, setValue] = useState('all');
    useEffect(() => { getSetting(key, 'all').then(setValue); }, [key]);
    return [value, (v) => { setValue(v); setSetting(key, v).catch(() => { }); }];
}
