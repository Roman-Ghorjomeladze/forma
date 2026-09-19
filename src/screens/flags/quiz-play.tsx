// One quiz round: questions one by one, then the results with a review list.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Country } from '../../data/countries.js';
import { put } from '../../lib/db.js';
import { bestScore, buildQuiz, capitalName, continentName, countryName, newResult, resultTitleKey, type Question } from '../../lib/flags.js';
import { useLang, useT } from '../../lib/i18n.js';
import type { ContinentFilter, QuizMode } from '../../lib/models.js';
import { navigate, useRoute } from '../../lib/router.js';
import { useQuizResults } from '../../lib/queries.js';
import { Button, IconButton, Progress, Screen } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconCheck, IconChevron, IconClose, IconGlobe, IconPin, IconShuffle, IconStar } from '../../ui/icons.js';
import { Flag } from './flags-ui.js';

interface Answered { q: Question; picked: Country; correct: boolean }

export function FlagsQuizPlayScreen() {
  const t = useT();
  const lang = useLang();
  const route = useRoute();
  const mode = (route.query.get('mode') as QuizMode) || 'flag';
  const continent = (route.query.get('continent') as ContinentFilter) || 'all';
  const results = useQuizResults();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<Country | null>(null);
  const [saved, setSaved] = useState<{ newBest: boolean; previousBest: number | null } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!results || started.current) return;
    started.current = true;
    setQuestions(buildQuiz(mode, continent, results));
  }, [results, mode, continent]);

  const q = questions?.[i];
  const score = answers.filter((a) => a.correct).length;
  const done = questions !== null && i >= questions.length;

  useEffect(() => {
    if (!done || saved || !questions || !results) return;
    const prev = bestScore(results, mode, continent);
    const missed = answers.filter((a) => !a.correct).map((a) => a.q.answer.c);
    put('quizResults', newResult(mode, continent, score, questions.length, missed)).catch(() => {});
    setSaved({ newBest: !prev || score / questions.length > prev.score / prev.total, previousBest: prev ? prev.score : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const pick = (c: Country) => {
    if (!q || picked) return;
    setPicked(c);
    setAnswers((a) => [...a, { q, picked: c, correct: c.c === q.answer.c }]);
  };
  const next = () => { setPicked(null); setI((k) => k + 1); };
  const quit = async () => {
    if (done || answers.length === 0) { navigate('/flags/quiz', { replace: true }); return; }
    const ok = await confirmDialog({ title: t('flags.quit'), message: t('flags.quitText'), confirmLabel: t('common.done'), danger: true });
    if (ok) navigate('/flags/quiz', { replace: true });
  };
  const again = () => { started.current = false; setQuestions(null); setI(0); setAnswers([]); setPicked(null); setSaved(null); setTimeout(() => { started.current = true; setQuestions(buildQuiz(mode, continent, results ?? [])); }, 0); };

  const label = useMemo(() => `${t(`flags.mode.${mode}`)} · ${continent === 'all' ? t('flags.all') : continentName(continent)}`, [t, mode, continent]);

  if (!questions) return <Screen className="screen-no-tabs" />;

  if (done) {
    const total = questions.length;
    return (
      <Screen className="screen-no-tabs flags quiz-results">
        <div className="result-hero">
          <div className="result-ring"><span className="disp num">{score}<small>/{total}</small></span></div>
          <div className="title-large" style={{ fontSize: 28 }}>{t(resultTitleKey(score, total))}</div>
          <div className="small muted" style={{ textAlign: 'center' }}>{label}</div>
          <div className="tags" style={{ justifyContent: 'center' }}>
            {saved?.newBest && <span className="tag tag-pocket"><IconStar size={13} /> {t('flags.newBest')}</span>}
            {saved && !saved.newBest && saved.previousBest !== null && <span className="tag">{t('flags.bestIs', { score: saved.previousBest, total })}</span>}
          </div>
        </div>
        <div className="section-label">{t('flags.review')}</div>
        <div className="list">
          {answers.map((a, k) => (
            <button key={k} type="button" className="row row-tappable" onClick={() => navigate(`/flags?c=${a.q.answer.c}`)}>
              <Flag country={a.q.answer} size={48} />
              <span className="row-main">
                <span className="row-title">{countryName(a.q.answer, lang)}</span>
                <span className="row-sub">{mode === 'capital' ? capitalName(a.q.answer, lang) : continentName(a.q.answer.r)}{!a.correct && mode !== 'country' ? ` · ${mode === 'capital' ? capitalName(a.picked, lang) : countryName(a.picked, lang)} ✕` : ''}</span>
              </span>
              {a.correct ? <IconCheck size={20} className="c-meals" /> : <IconClose size={20} className="c-danger" />}
            </button>
          ))}
        </div>
        <div className="small muted mt" style={{ textAlign: 'center' }}>{t('flags.reviewHint')}</div>
        <div className="stack mt-lg">
          <Button variant="flags" full size="lg" icon={<IconShuffle size={18} />} onClick={again}>{t('flags.playAgain')}</Button>
          <Button variant="secondary" full onClick={() => navigate('/flags/quiz', { replace: true })}>{t('flags.changeMode')}</Button>
          <Button variant="ghost" full onClick={() => navigate('/flags', { replace: true })}>{t('flags.backToFlags')}</Button>
        </div>
      </Screen>
    );
  }

  if (!q) return null;
  const state = (c: Country) => (!picked ? '' : c.c === q.answer.c ? 'right' : c.c === picked.c ? 'wrong' : 'dim');

  return (
    <Screen className="screen-no-tabs flags quiz">
      <div className="quiz-head">
        <IconButton label={t('common.close')} onClick={quit}><IconClose size={18} /></IconButton>
        <div className="quiz-progress">
          <div className="spread small bold muted"><span>{label}</span><span className="num">{t('flags.ofTotal', { i: i + 1, n: questions.length })}</span></div>
          <Progress value={i + (picked ? 1 : 0)} max={questions.length} color="var(--flags)" height={6} />
        </div>
        <span className="tag tag-meals"><IconCheck size={13} /> {score}</span>
      </div>

      {mode === 'flag' || mode === 'capital' ? (
        <div className="quiz-prompt">
          <Flag country={q.answer} className="flag-hero" />
          {mode === 'capital' && <div className="title-large" style={{ fontSize: 26, textAlign: 'center' }}>{countryName(q.answer, lang)}</div>}
          <div className="small muted bold">{mode === 'flag' ? t('flags.q.flag') : t('flags.q.capital')}</div>
        </div>
      ) : (
        <div className="quiz-prompt">
          <div className="small muted bold">{t('flags.q.country')}</div>
          <div className="title-large" style={{ fontSize: 34, textAlign: 'center' }}>{countryName(q.answer, lang)}</div>
          <span className="tag tag-flags"><IconGlobe size={13} /> {continentName(q.answer.r)}</span>
        </div>
      )}

      {mode === 'country' ? (
        <div className="flag-options">
          {q.options.map((c) => <button key={c.c} type="button" className={`flag-opt ${state(c)}`} onClick={() => pick(c)} disabled={!!picked}><Flag country={c} /></button>)}
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {q.options.map((c) => (
            <button key={c.c} type="button" className={`quiz-opt ${state(c)}`} onClick={() => pick(c)} disabled={!!picked}>
              <span>{mode === 'capital' ? capitalName(c, lang) : countryName(c, lang)}</span>
              {state(c) === 'right' && <IconCheck size={18} className="c-meals" />}
              {state(c) === 'wrong' && <IconClose size={18} className="c-danger" />}
            </button>
          ))}
        </div>
      )}

      <div className="quiz-foot">
        {picked ? (
          <>
            {mode === 'flag' && <span className="tag"><IconPin size={13} /> {capitalName(q.answer, lang)}</span>}
            {mode === 'country' && <span className={`tag ${picked.c === q.answer.c ? 'tag-meals' : ''}`}>{picked.c === q.answer.c ? t('flags.correctAnswer', { name: countryName(q.answer, lang) }) : `${countryName(picked, lang)} ✕`}</span>}
            {mode === 'capital' && picked.c !== q.answer.c && <span className="tag">{t('flags.correctAnswer', { name: capitalName(q.answer, lang) })}</span>}
            <span style={{ flex: 1 }} />
            <Button variant="dark" onClick={next}>{i + 1 >= questions.length ? t('flags.finish') : t('flags.next')} <IconChevron size={18} /></Button>
          </>
        ) : (
          <span className="small muted bold" style={{ width: '100%', textAlign: 'center' }}>{mode === 'country' ? t('flags.tapFlag') : ''}</span>
        )}
      </div>
    </Screen>
  );
}


