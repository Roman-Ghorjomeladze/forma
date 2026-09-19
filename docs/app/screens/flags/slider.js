import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Flags home: continent chips + a swipeable card deck (CSS scroll-snap, so it feels native on iOS).
import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRIES } from '../../data/countries.js';
import { capitalName, continentName, countryName, filterCountries, shuffle } from '../../lib/flags.js';
import { useLang, useT } from '../../lib/i18n.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Button, IconButton, Screen, TopBar } from '../../ui/components.js';
import { IconApps, IconGlobe, IconPin, IconPlay, IconShuffle } from '../../ui/icons.js';
import { AppsButton } from '../pocket/pocket-ui.js';
import { ContinentChips, Flag, useContinentFilter } from './flags-ui.js';
export function FlagsSliderScreen() {
    const t = useT();
    const lang = useLang();
    const route = useRoute();
    const [filter, setFilter] = useContinentFilter();
    const [shuffled, setShuffled] = useState(false);
    const [seed, setSeed] = useState(0);
    const [index, setIndex] = useState(0);
    const deckRef = useRef(null);
    const wanted = route.query.get('c');
    const list = useMemo(() => {
        const base = filterCountries(filter, lang);
        return shuffled ? shuffle(base) : base;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, lang, shuffled, seed]);
    // Jump to a requested country (from the grid) or back to the start when the list changes.
    useEffect(() => {
        const el = deckRef.current;
        if (!el)
            return;
        let i = 0;
        if (wanted) {
            const k = list.findIndex((c) => c.c === wanted);
            if (k >= 0)
                i = k;
        }
        el.scrollTo({ left: i * el.clientWidth, behavior: 'auto' });
        setIndex(i);
    }, [list, wanted]);
    const onScroll = () => {
        const el = deckRef.current;
        if (!el)
            return;
        const i = Math.round(el.scrollLeft / el.clientWidth);
        if (i !== index)
            setIndex(Math.max(0, Math.min(list.length - 1, i)));
    };
    const go = (d) => {
        const el = deckRef.current;
        if (!el)
            return;
        const i = Math.max(0, Math.min(list.length - 1, index + d));
        el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    };
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'ArrowRight')
            go(1);
        else if (e.key === 'ArrowLeft')
            go(-1); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });
    const current = list[index];
    return (_jsxs(Screen, { className: "screen-no-tabs flags", padded: false, children: [_jsx("div", { className: "screen-padded", children: _jsx(TopBar, { large: true, left: _jsx(AppsButton, {}), title: _jsx("span", { className: "c-flags", children: t('flags.title') }), eyebrow: t('flags.subtitle', { n: COUNTRIES.length }), right: _jsx(IconButton, { label: t('flags.quiz'), tone: "flags", onClick: () => navigate('/flags/quiz'), children: _jsx(IconPlay, { size: 20 }) }) }) }), _jsx("div", { className: "screen-padded", children: _jsx(ContinentChips, { value: filter, onChange: (v) => { setFilter(v); if (wanted)
                        navigate('/flags', { replace: true }); } }) }), _jsxs("div", { className: "screen-padded deck-meta small muted bold", children: [_jsxs("span", { children: [filter === 'all' ? t('flags.all') : continentName(filter), " \u00B7 ", t('flags.countFlags', { n: list.length })] }), _jsx("span", { className: "num", children: t('flags.ofTotal', { i: index + 1, n: list.length }) })] }), _jsx("div", { className: "deck", ref: deckRef, onScroll: onScroll, children: list.map((c, i) => (_jsx("div", { className: "deck-card-wrap", children: _jsxs("div", { className: `deck-card ${i === index ? 'active' : ''}`, children: [_jsx(Flag, { country: c, className: "flag-hero" }), _jsx("div", { className: "deck-name title-large", children: countryName(c, lang) }), _jsxs("div", { className: "tags", style: { justifyContent: 'center' }, children: [_jsxs("span", { className: "tag tag-flags", children: [_jsx(IconGlobe, { size: 13 }), " ", continentName(c.r)] }), _jsxs("span", { className: "tag", children: [_jsx(IconPin, { size: 13 }), " ", capitalName(c, lang)] })] })] }) }, c.c + i))) }), _jsx("div", { className: "deck-dots", "aria-hidden": "true", children: list.slice(Math.max(0, Math.min(index - 3, list.length - 7)), Math.max(0, Math.min(index - 3, list.length - 7)) + 7).map((c, k, arr) => _jsx("span", { className: `deck-dot ${arr[k] === current ? 'active' : ''}` }, c.c)) }), _jsxs("div", { className: "screen-padded hstack", style: { marginTop: 14 }, children: [_jsx(Button, { variant: "secondary", className: "flex1", icon: _jsx(IconApps, { size: 18 }), onClick: () => navigate('/flags/all'), children: t('flags.allFlags') }), _jsx(IconButton, { label: shuffled ? t('flags.sorted') : t('flags.shuffle'), tone: shuffled ? 'flags' : 'default', onClick: () => { if (shuffled)
                            setSeed((s) => s + 1); setShuffled(true); if (wanted)
                            navigate('/flags', { replace: true }); }, children: _jsx(IconShuffle, { size: 18 }) }), shuffled && _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setShuffled(false), children: t('flags.sorted') })] }), _jsx("div", { className: "screen-padded", style: { marginTop: 14 }, children: _jsx(Button, { variant: "flags", full: true, size: "lg", icon: _jsx(IconPlay, { size: 18 }), onClick: () => navigate(`/flags/quiz?continent=${filter}`), children: t('flags.startQuiz') }) })] }));
}
