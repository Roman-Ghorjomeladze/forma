// Shared bits for the Flags app: continent chips, flag image, continent filter persisted in a setting.
import { useEffect, useState } from 'react';
import type { Country } from '../../data/countries.js';
import { getSetting, setSetting } from '../../lib/db.js';
import { CONTINENT_LIST, continentShort, flagUrl } from '../../lib/flags.js';
import { useT } from '../../lib/i18n.js';
import type { ContinentFilter } from '../../lib/models.js';

export function Flag({ country, className = '', size }: { country: Country; className?: string; size?: number }) {
  return <img className={`flag ${className}`} src={flagUrl(country.c)} alt="" draggable={false} loading="lazy" style={size ? { width: size, height: size * 0.75 } : undefined} />;
}

export function ContinentChips({ value, onChange, tone = 'flags' }: { value: ContinentFilter; onChange: (v: ContinentFilter) => void; tone?: 'flags' }) {
  const t = useT();
  const all: ContinentFilter[] = ['all', ...CONTINENT_LIST];
  return (
    <div className="chips continent-chips">
      {all.map((c) => <button key={c} type="button" className={`chip chip-${tone} ${value === c ? 'chip-active' : ''}`} onClick={() => onChange(c)}>{c === 'all' ? t('flags.all') : continentShort(c)}</button>)}
    </div>
  );
}

/** Continent filter shared by the slider and the quiz, remembered between visits. */
export function useContinentFilter(key = 'flags:continent'): [ContinentFilter, (v: ContinentFilter) => void] {
  const [value, setValue] = useState<ContinentFilter>('all');
  useEffect(() => { getSetting<ContinentFilter>(key, 'all').then(setValue); }, [key]);
  return [value, (v) => { setValue(v); setSetting(key, v).catch(() => {}); }];
}
