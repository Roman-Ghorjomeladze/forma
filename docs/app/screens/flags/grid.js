import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { countryName, filterCountries, searchCountries } from '../../lib/flags.js';
import { useLang, useT } from '../../lib/i18n.js';
import { navigate } from '../../lib/router.js';
import { Empty, Screen, TopBar } from '../../ui/components.js';
import { IconSearch } from '../../ui/icons.js';
import { ContinentChips, Flag, useContinentFilter } from './flags-ui.js';
export function FlagsGridScreen() {
    const t = useT();
    const lang = useLang();
    const [filter, setFilter] = useContinentFilter();
    const [q, setQ] = useState('');
    const list = useMemo(() => searchCountries(filterCountries(filter, lang), q, lang), [filter, lang, q]);
    return (_jsxs(Screen, { className: "screen-no-tabs flags", children: [_jsx(TopBar, { large: true, backTo: "/flags", title: t('flags.allFlags'), eyebrow: t('flags.countFlags', { n: list.length }) }), _jsxs("div", { className: "searchbar", children: [_jsx(IconSearch, { size: 18 }), _jsx("input", { className: "input", value: q, placeholder: t('flags.search'), onChange: (e) => setQ(e.target.value) })] }), _jsx(ContinentChips, { value: filter, onChange: setFilter }), list.length === 0 && _jsx(Empty, { title: t('flags.noMatches') }), _jsx("div", { className: "flag-grid", children: list.map((c) => (_jsxs("button", { type: "button", className: "flag-tile", onClick: () => navigate(`/flags?c=${c.c}`), children: [_jsx(Flag, { country: c }), _jsx("span", { className: "flag-tile-name", children: countryName(c, lang) })] }, c.c))) })] }));
}
