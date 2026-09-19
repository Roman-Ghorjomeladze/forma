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
  const deckRef = useRef<HTMLDivElement | null>(null);
  const wanted = route.query.get('c');

  const list = useMemo(() => {
    const base = filterCountries(filter, lang);
    return shuffled ? shuffle(base) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, lang, shuffled, seed]);

  // Jump to a requested country (from the grid) or back to the start when the list changes.
  useEffect(() => {
    const el = deckRef.current;
    if (!el) return;
    let i = 0;
    if (wanted) { const k = list.findIndex((c) => c.c === wanted); if (k >= 0) i = k; }
    el.scrollTo({ left: i * el.clientWidth, behavior: 'auto' });
    setIndex(i);
  }, [list, wanted]);

  const onScroll = () => {
    const el = deckRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(Math.max(0, Math.min(list.length - 1, i)));
  };
  const go = (d: number) => {
    const el = deckRef.current;
    if (!el) return;
    const i = Math.max(0, Math.min(list.length - 1, index + d));
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const current = list[index];
  return (
    <Screen className="screen-no-tabs flags" padded={false}>
      <div className="screen-padded">
        <TopBar large left={<AppsButton />} title={<span className="c-flags">{t('flags.title')}</span>} eyebrow={t('flags.subtitle', { n: COUNTRIES.length })} right={<IconButton label={t('flags.quiz')} tone="flags" onClick={() => navigate('/flags/quiz')}><IconPlay size={20} /></IconButton>} />
      </div>
      <div className="screen-padded"><ContinentChips value={filter} onChange={(v) => { setFilter(v); if (wanted) navigate('/flags', { replace: true }); }} /></div>

      <div className="screen-padded deck-meta small muted bold">
        <span>{filter === 'all' ? t('flags.all') : continentName(filter)} · {t('flags.countFlags', { n: list.length })}</span>
        <span className="num">{t('flags.ofTotal', { i: index + 1, n: list.length })}</span>
      </div>

      <div className="deck" ref={deckRef} onScroll={onScroll}>
        {list.map((c, i) => (
          <div key={c.c + i} className="deck-card-wrap">
            <div className={`deck-card ${i === index ? 'active' : ''}`}>
              <Flag country={c} className="flag-hero" />
              <div className="deck-name title-large">{countryName(c, lang)}</div>
              <div className="tags" style={{ justifyContent: 'center' }}>
                <span className="tag tag-flags"><IconGlobe size={13} /> {continentName(c.r)}</span>
                <span className="tag"><IconPin size={13} /> {capitalName(c, lang)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="deck-dots" aria-hidden="true">
        {list.slice(Math.max(0, Math.min(index - 3, list.length - 7)), Math.max(0, Math.min(index - 3, list.length - 7)) + 7).map((c, k, arr) => <span key={c.c} className={`deck-dot ${arr[k] === current ? 'active' : ''}`} />)}
      </div>

      <div className="screen-padded hstack" style={{ marginTop: 14 }}>
        <Button variant="secondary" className="flex1" icon={<IconApps size={18} />} onClick={() => navigate('/flags/all')}>{t('flags.allFlags')}</Button>
        <IconButton label={shuffled ? t('flags.sorted') : t('flags.shuffle')} tone={shuffled ? 'flags' : 'default'} onClick={() => { if (shuffled) setSeed((s) => s + 1); setShuffled(true); if (wanted) navigate('/flags', { replace: true }); }}><IconShuffle size={18} /></IconButton>
        {shuffled && <Button variant="ghost" size="sm" onClick={() => setShuffled(false)}>{t('flags.sorted')}</Button>}
      </div>
      <div className="screen-padded" style={{ marginTop: 14 }}>
        <Button variant="flags" full size="lg" icon={<IconPlay size={18} />} onClick={() => navigate(`/flags/quiz?continent=${filter}`)}>{t('flags.startQuiz')}</Button>
      </div>
    </Screen>
  );
}
