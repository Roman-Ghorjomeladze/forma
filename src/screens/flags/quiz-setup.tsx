import { useEffect, useState, type ReactNode } from 'react';
import { accuracy, bestScore, countryName, perfectRounds, weakSpots } from '../../lib/flags.js';
import { useLang, useT } from '../../lib/i18n.js';
import { QUIZ_LENGTH, QUIZ_MODES, type ContinentFilter, type QuizMode } from '../../lib/models.js';
import { navigate, useRoute } from '../../lib/router.js';
import { useQuizResults } from '../../lib/queries.js';
import { Button, Screen, Section, Stat, TopBar } from '../../ui/components.js';
import { IconApps, IconFlag, IconPin, IconPlay } from '../../ui/icons.js';
import { ContinentChips, Flag, useContinentFilter } from './flags-ui.js';

const MODE_ICON: Record<QuizMode, ReactNode> = { flag: <IconFlag size={22} />, country: <IconApps size={22} />, capital: <IconPin size={22} /> };

export function FlagsQuizSetupScreen() {
  const t = useT();
  const lang = useLang();
  const route = useRoute();
  const results = useQuizResults();
  const [filter, setFilter] = useContinentFilter('flags:quizContinent');
  const [mode, setMode] = useState<QuizMode>('flag');
  const fromQuery = route.query.get('continent') as ContinentFilter | null;
  useEffect(() => { if (fromQuery) setFilter(fromQuery); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuery]);

  const history = results ?? [];
  const weak = weakSpots(history, 8);

  return (
    <Screen className="screen-no-tabs flags">
      <TopBar large backTo="/flags" title={<span className="c-flags">{t('flags.quiz')}</span>} eyebrow={t('flags.quizSub', { n: QUIZ_LENGTH })} />
      <div className="section-label">{t('flags.mode')}</div>
      <div className="stack" style={{ gap: 8 }}>
        {QUIZ_MODES.map((m) => {
          const best = bestScore(history, m, filter);
          return (
            <button key={m} type="button" className={`mode-opt ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
              <span className="mode-icon">{MODE_ICON[m]}</span>
              <span className="row-main"><span className="row-title">{t(`flags.mode.${m}`)}</span><span className="row-sub">{t(`flags.mode.${m}Desc`)}</span></span>
              <span className="mode-best"><span className="small muted">{t('flags.best')}</span><span className="num bold">{best ? `${best.score}/${best.total}` : '—'}</span></span>
            </button>
          );
        })}
      </div>
      <div className="section-label mt-lg">{t('flags.continentLabel')}</div>
      <ContinentChips value={filter} onChange={setFilter} />
      <div className="stats stats-3 mt">
        <Stat value={history.length} label={t('flags.played')} />
        <Stat value={`${accuracy(history)}%`} label={t('flags.accuracy')} />
        <Stat value={perfectRounds(history)} label={t('flags.perfect')} />
      </div>
      {weak.length > 0 && (
        <Section title={t('flags.weakSpots')} className="mt-lg">
          <div className="small muted mb">{t('flags.weakSpotsHint')}</div>
          <div className="weak-row">
            {weak.map((c) => <button key={c.c} type="button" className="weak-flag" onClick={() => navigate(`/flags?c=${c.c}`)}><Flag country={c} /><span>{countryName(c, lang)}</span></button>)}
          </div>
        </Section>
      )}
      <div className="sticky-cta">
        <Button variant="flags" full size="lg" icon={<IconPlay size={18} />} onClick={() => navigate(`/flags/quiz/play?mode=${mode}&continent=${filter}`)}>{t('flags.start', { n: QUIZ_LENGTH })}</Button>
      </div>
      <div style={{ height: 80 }} />
    </Screen>
  );
}
