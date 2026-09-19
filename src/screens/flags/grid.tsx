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

  return (
    <Screen className="screen-no-tabs flags">
      <TopBar large backTo="/flags" title={t('flags.allFlags')} eyebrow={t('flags.countFlags', { n: list.length })} />
      <div className="searchbar"><IconSearch size={18} /><input className="input" value={q} placeholder={t('flags.search')} onChange={(e: { target: HTMLInputElement }) => setQ(e.target.value)} /></div>
      <ContinentChips value={filter} onChange={setFilter} />
      {list.length === 0 && <Empty title={t('flags.noMatches')} />}
      <div className="flag-grid">
        {list.map((c) => (
          <button key={c.c} type="button" className="flag-tile" onClick={() => navigate(`/flags?c=${c.c}`)}>
            <Flag country={c} />
            <span className="flag-tile-name">{countryName(c, lang)}</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}
