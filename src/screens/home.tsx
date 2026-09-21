// The launcher: one card per app with a live one-liner, quick-add shortcuts and Settings.
import { useMemo, type ReactNode } from 'react';
import { localizedWorkoutName } from '../data/seed-i18n.js';
import { formatLong, todayKey } from '../lib/dates.js';
import { useProfile } from '../lib/hooks.js';
import { useLang, useT } from '../lib/i18n.js';
import { dayNutrition } from '../lib/nutrition.js';
import { fmtMoney, sum } from '../lib/pocket.js';
import { navigate } from '../lib/router.js';
import { useAllExpenses, useAllNotes, useAllPersons, useDishMap, useDoseLogs, useMealSlots, useMedications, useNoteGroups, useProjects, useQuizResults, useSchedule, useSessions, useTrees, useWorkouts } from '../lib/queries.js';
import { doseLine, dosesOn, nextDose, withStates } from '../lib/meds.js';
import { accuracy } from '../lib/flags.js';
import { Screen } from '../ui/components.js';
import { IconChevron, IconDumbbell, IconFlag, IconNotes, IconPill, IconPlay, IconPlus, IconSettings, IconTree, IconWallet } from '../ui/icons.js';
import { displayTitle, relativeTime } from '../lib/notes.js';

export function HomeScreen() {
  const t = useT();
  const lang = useLang();
  const [profile] = useProfile();
  const today = todayKey();
  const slots = useMealSlots([today]);
  const dishes = useDishMap();
  const workouts = useWorkouts();
  const schedule = useSchedule();
  const sessions = useSessions(50);
  const projects = useProjects();
  const expenses = useAllExpenses();
  const trees = useTrees();
  const persons = useAllPersons();
  const quiz = useQuizResults();
  const notes = useAllNotes();
  const noteGroups = useNoteGroups();
  const meds = useMedications();
  const doseLogs = useDoseLogs(today);

  const hour = new Date().getHours();
  const slot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const name = profile.name?.trim();
  const greeting = name ? t(`home.${slot}`, { name }) : t(`home.${slot}NoName`);

  const formaLine = useMemo(() => {
    if (!slots || !dishes || !workouts || !schedule || !sessions) return '';
    const kcal = Math.round(dayNutrition(slots, dishes, false).kcal);
    const doneToday = sessions.some((s) => new Date(s.startedAt).toDateString() === new Date().toDateString());
    if (doneToday) return t('home.formaLine.done', { kcal });
    const w = workouts.find((x) => x.id === schedule.find((s) => s.weekday === new Date().getDay())?.workoutId);
    return w ? t('home.formaLine.scheduled', { workout: localizedWorkoutName(w.id, w.name, lang), kcal }) : t('home.formaLine.rest', { kcal });
  }, [slots, dishes, workouts, schedule, sessions, t, lang]);

  const pocketLine = useMemo(() => {
    if (!projects || !expenses) return '';
    const p = projects.find((x) => x.status === 'active') ?? projects[0];
    if (!p) return t('home.pocketLine.empty');
    const spent = sum(expenses.filter((e) => e.projectId === p.id));
    return p.budget ? t('home.pocketLine.projectBudget', { project: p.name, spent: fmtMoney(spent), budget: fmtMoney(p.budget) }) : t('home.pocketLine.project', { project: p.name, spent: fmtMoney(spent) });
  }, [projects, expenses, t]);

  const treeLine = useMemo(() => {
    if (!trees || !persons) return '';
    if (trees.length === 0) return t('home.treeLine.empty');
    if (trees.length === 1) return t('home.treeLine.tree', { tree: trees[0].name, n: persons.filter((p) => p.treeId === trees[0].id).length });
    return t('home.treeLine.trees', { n: trees.length, people: persons.length });
  }, [trees, persons, t]);

  const flagsLine = useMemo(() => {
    if (!quiz) return '';
    if (quiz.length === 0) return t('home.flagsLine.empty');
    const best = quiz.reduce((b, r) => (r.score / r.total > b.score / b.total ? r : b), quiz[0]);
    return t('home.flagsLine.best', { score: best.score, total: best.total, n: quiz.length, acc: accuracy(quiz) });
  }, [quiz, t]);

  const notesLine = useMemo(() => {
    if (!notes || !noteGroups) return '';
    if (notes.length === 0) return t('home.notesLine.empty');
    const last = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    return t('home.notesLine.last', { n: notes.length, g: noteGroups.length, title: displayTitle(last), when: relativeTime(last.updatedAt) });
  }, [notes, noteGroups, t]);

  const medsLine = useMemo(() => {
    if (!meds || !doseLogs) return '';
    const active = meds.filter((m) => m.status === 'active');
    if (active.length === 0) return meds.length ? t('home.medsLine.allDone') : t('home.medsLine.empty');
    const todays = withStates(dosesOn(meds, today), doseLogs);
    const taken = todays.filter((d) => d.state === 'taken').length;
    const next = nextDose(meds, doseLogs);
    if (!next) return todays.length ? t('home.medsLine.doneToday', { taken, total: todays.length }) : t('home.medsLine.nothingToday', { n: active.length });
    const when = next.date === today ? next.slot.time : t('home.medsLine.tomorrow', { time: next.slot.time });
    return t('home.medsLine.next', { when, name: next.med.name, dose: doseLine(next.med, next.slot), taken, total: todays.length });
  }, [meds, doseLogs, today, t]);

  return (
    <Screen className="screen-no-tabs home">
      <header className="topbar topbar-large">
        <div className="topbar-titles">
          <div className="eyebrow">{formatLong(today)}</div>
          <h1 className="title-large">{greeting}</h1>
        </div>
        <button type="button" className="iconbtn" aria-label={t('settings.title')} onClick={() => navigate('/settings')}><IconSettings size={20} /></button>
      </header>

      <div className="stack" style={{ gap: 12 }}>
        <AppCard name={t('home.forma')} sub={t('home.formaSub')} line={formaLine} icon={<IconDumbbell size={28} strokeWidth={2.2} />} tone="forma" onClick={() => navigate('/forma')} />
        <AppCard name={t('home.pocket')} sub={t('home.pocketSub')} line={pocketLine} icon={<IconWallet size={28} strokeWidth={2.2} />} tone="pocket" onClick={() => navigate('/pocket')} />
        <AppCard name={t('home.tree')} sub={t('home.treeSub')} line={treeLine} icon={<IconTree size={28} strokeWidth={2.2} />} tone="tree" onClick={() => navigate('/tree')} />
        <AppCard name={t('home.flags')} sub={t('home.flagsSub')} line={flagsLine} icon={<IconFlag size={28} strokeWidth={2.2} />} tone="flags" onClick={() => navigate('/flags')} />
        <AppCard name={t('home.notes')} sub={t('home.notesSub')} line={notesLine} icon={<IconNotes size={28} strokeWidth={2.2} />} tone="notes" onClick={() => navigate('/notes')} />
        <AppCard name={t('home.meds')} sub={t('home.medsSub')} line={medsLine} icon={<IconPill size={28} strokeWidth={2.2} />} tone="meds" onClick={() => navigate('/meds')} />
      </div>

      <div className="mt-lg">
        <div className="section-label">{t('home.quickAdd')}</div>
        <div className="quick-row">
          <button type="button" className="quick" onClick={() => navigate('/pocket/expense/new')}><span className="c-pocket"><IconPlus size={18} /></span>{t('home.expense')}</button>
          <button type="button" className="quick" onClick={() => navigate(trees && trees.length === 1 ? `/tree/${trees[0].id}` : '/tree')}><span className="c-tree"><IconPlus size={18} /></span>{t('home.person')}</button>
          <button type="button" className="quick" onClick={() => navigate('/flags/quiz')}><span className="c-flags"><IconPlay size={16} /></span>{t('home.quiz')}</button>
          <button type="button" className="quick" onClick={() => navigate(noteGroups && noteGroups.length ? `/notes/note/new?group=${noteGroups[0].id}` : '/notes')}><span className="c-notes"><IconPlus size={18} /></span>{t('home.note')}</button>
        </div>
      </div>

      <div className="home-footer small muted">{t('home.footer')}</div>
    </Screen>
  );
}

function AppCard({ name, sub, line, icon, tone, onClick }: { name: string; sub: string; line: string; icon: ReactNode; tone: 'forma' | 'pocket' | 'tree' | 'flags' | 'notes' | 'meds'; onClick: () => void }) {
  return (
    <button type="button" className={`app-card app-${tone}`} onClick={onClick}>
      <span className="app-icon">{icon}</span>
      <span className="app-text">
        <span className="app-name title-large" style={{ fontSize: 22 }}>{name}</span>
        <span className="app-sub small muted bold">{sub}</span>
        {line && <span className="app-line small">{line}</span>}
      </span>
      <IconChevron size={20} className="muted" />
    </button>
  );
}
