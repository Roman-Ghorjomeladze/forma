import { useEffect, useState } from 'react';
import { navigate, useRoute } from './lib/router.js';
import { prefsStore, profileStore, usePrefs } from './lib/hooks.js';
import { seedIfEmpty } from './data/seed.js';
import { setVoiceEnabled } from './lib/audio.js';
import { useT } from './lib/i18n.js';
import { DialogHost } from './ui/dialogs.js';
import { IconDumbbell, IconHome, IconMeals, IconSettings } from './ui/icons.js';
import { TodayScreen } from './screens/today.js';
import { MealsScreen } from './screens/meals/meals.js';
import { DishListScreen } from './screens/meals/dish-list.js';
import { DishDetailScreen } from './screens/meals/dish-detail.js';
import { DishEditScreen } from './screens/meals/dish-edit.js';
import { ShoppingScreen } from './screens/meals/shopping.js';
import { WorkoutsScreen } from './screens/workouts/workouts.js';
import { WorkoutDetailScreen } from './screens/workouts/workout-detail.js';
import { WorkoutEditScreen } from './screens/workouts/workout-edit.js';
import { PlayerScreen } from './screens/workouts/player.js';
import { ExerciseListScreen } from './screens/workouts/exercise-list.js';
import { ExerciseDetailScreen } from './screens/workouts/exercise-detail.js';
import { ExerciseEditScreen } from './screens/workouts/exercise-edit.js';
import { HistoryScreen } from './screens/workouts/history.js';
import { SettingsScreen } from './screens/settings.js';
import { HomeScreen } from './screens/home.js';
import { PocketProjectsScreen } from './screens/pocket/projects.js';
import { PocketProjectScreen } from './screens/pocket/project-detail.js';
import { PocketProjectEditScreen } from './screens/pocket/project-edit.js';
import { PocketExpenseEditScreen } from './screens/pocket/expense-edit.js';
import { PocketCategoriesScreen } from './screens/pocket/categories.js';
import { TreesScreen } from './screens/tree/trees.js';
import { TreeCanvasScreen } from './screens/tree/canvas.js';
import { PersonScreen } from './screens/tree/person.js';
import { seedCategoriesIfEmpty } from './lib/pocket.js';
import { FlagsSliderScreen } from './screens/flags/slider.js';
import { FlagsGridScreen } from './screens/flags/grid.js';
import { FlagsQuizSetupScreen } from './screens/flags/quiz-setup.js';
import { FlagsQuizPlayScreen } from './screens/flags/quiz-play.js';
import { NotesHomeScreen } from './screens/notes/notes.js';
import { NoteGroupScreen } from './screens/notes/group.js';
import { NoteViewScreen } from './screens/notes/note-view.js';
import { NoteEditScreen } from './screens/notes/note-edit.js';
import { seedNoteGroupsIfEmpty } from './lib/notes.js';
import { MedsHomeScreen } from './screens/meds/meds.js';
import { MedEditScreen } from './screens/meds/med-edit.js';
import { MedDetailScreen } from './screens/meds/med-detail.js';

function useTheme() {
  const [prefs] = usePrefs();
  useEffect(() => {
    const root = document.documentElement;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      if (prefs.theme === 'light' || prefs.theme === 'dark') {
        root.setAttribute('data-theme', prefs.theme);
        root.classList.remove('dark-system');
      } else {
        root.removeAttribute('data-theme');
        root.classList.toggle('dark-system', mq.matches);
      }
      try { localStorage.setItem('forma:theme', prefs.theme); } catch { /* ignore */ }
      const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && mq.matches);
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0B0B0C' : '#F7F5F1'));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [prefs.theme]);
  useEffect(() => { setVoiceEnabled(prefs.voice); }, [prefs.voice]);
  useEffect(() => { document.documentElement.lang = prefs.language; }, [prefs.language]);
}

function useServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) setWaiting(nw);
        });
      });
      // check for updates when the app comes back to the foreground
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch((e) => console.warn('sw registration failed', e));
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!refreshing) { refreshing = true; location.reload(); } });
  }, []);
  return { waiting, update: () => waiting?.postMessage('SKIP_WAITING') };
}

export function App() {
  const route = useRoute();
  const [ready, setReady] = useState(false);
  useTheme();
  const sw = useServiceWorker();
  const t = useT();

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([profileStore.loading, prefsStore.loading]);
        await seedIfEmpty();
        await seedCategoriesIfEmpty();
        await seedNoteGroupsIfEmpty();
        if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
      } catch (e) {
        console.error('startup failed', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return <div className="screen" />;

  const seg = route.segments;
  const top = seg[0] ?? '';
  let screen: unknown;
  let showTabs = false;

  if (top === '') screen = <HomeScreen />;
  else if (top === 'forma') {
    // Forma keeps its own tab bar; its routes live under /forma/*
    const f = seg.slice(1);
    const sub = f[0] ?? '';
    showTabs = true;
    if (sub === '') screen = <TodayScreen />;
    else if (sub === 'meals') {
      if (f[1] === 'dishes') screen = <DishListScreen />;
      else if (f[1] === 'shopping') screen = <ShoppingScreen />;
      else if (f[1] === 'dish' && f[2] === 'new') { screen = <DishEditScreen />; showTabs = false; }
      else if (f[1] === 'dish' && f[3] === 'edit') { screen = <DishEditScreen id={f[2]} />; showTabs = false; }
      else if (f[1] === 'dish' && f[2]) { screen = <DishDetailScreen id={f[2]} />; showTabs = false; }
      else screen = <MealsScreen />;
    } else if (sub === 'workouts') {
      if (f[1] === 'exercises') screen = <ExerciseListScreen />;
      else if (f[1] === 'history') screen = <HistoryScreen />;
      else if (f[1] === 'exercise' && f[2] === 'new') { screen = <ExerciseEditScreen />; showTabs = false; }
      else if (f[1] === 'exercise' && f[3] === 'edit') { screen = <ExerciseEditScreen id={f[2]} />; showTabs = false; }
      else if (f[1] === 'exercise' && f[2]) { screen = <ExerciseDetailScreen id={f[2]} />; showTabs = false; }
      else if (f[1] === 'new') { screen = <WorkoutEditScreen />; showTabs = false; }
      else if (f[1] && f[2] === 'edit') { screen = <WorkoutEditScreen id={f[1]} />; showTabs = false; }
      else if (f[1] && f[2] === 'play') { screen = <PlayerScreen id={f[1]} />; showTabs = false; }
      else if (f[1]) { screen = <WorkoutDetailScreen id={f[1]} />; showTabs = false; }
      else screen = <WorkoutsScreen />;
    } else screen = <TodayScreen />;
  } else if (top === 'pocket') {
    if (seg[1] === 'categories') screen = <PocketCategoriesScreen />;
    else if (seg[1] === 'project' && seg[2] === 'new') screen = <PocketProjectEditScreen />;
    else if (seg[1] === 'project' && seg[3] === 'edit') screen = <PocketProjectEditScreen id={seg[2]} />;
    else if (seg[1] === 'project' && seg[2]) screen = <PocketProjectScreen id={seg[2]} />;
    else if (seg[1] === 'expense' && seg[2] === 'new') screen = <PocketExpenseEditScreen />;
    else if (seg[1] === 'expense' && seg[3] === 'edit') screen = <PocketExpenseEditScreen id={seg[2]} />;
    else screen = <PocketProjectsScreen />;
  } else if (top === 'tree') {
    if (seg[1] && seg[2] === 'person' && seg[3]) screen = <PersonScreen treeId={seg[1]} personId={seg[3]} />;
    else if (seg[1]) screen = <TreeCanvasScreen treeId={seg[1]} />;
    else screen = <TreesScreen />;
  } else if (top === 'flags') {
    if (seg[1] === 'all') screen = <FlagsGridScreen />;
    else if (seg[1] === 'quiz' && seg[2] === 'play') screen = <FlagsQuizPlayScreen />;
    else if (seg[1] === 'quiz') screen = <FlagsQuizSetupScreen />;
    else screen = <FlagsSliderScreen />;
  } else if (top === 'notes') {
    if (seg[1] === 'group' && seg[2]) screen = <NoteGroupScreen id={seg[2]} />;
    else if (seg[1] === 'note' && seg[2] === 'new') screen = <NoteEditScreen />;
    else if (seg[1] === 'note' && seg[3] === 'edit') screen = <NoteEditScreen id={seg[2]} />;
    else if (seg[1] === 'note' && seg[2]) screen = <NoteViewScreen id={seg[2]} />;
    else screen = <NotesHomeScreen />;
  } else if (top === 'meds') {
    if (seg[1] === 'new') screen = <MedEditScreen />;
    else if (seg[1] && seg[2] === 'edit') screen = <MedEditScreen id={seg[1]} />;
    else if (seg[1]) screen = <MedDetailScreen id={seg[1]} />;
    else screen = <MedsHomeScreen />;
  } else if (top === 'settings') screen = <SettingsScreen />;
  // Old bookmarks / home-screen icons from before the launcher existed
  else if (top === 'meals' || top === 'workouts') { navigate('/forma/' + seg.join('/'), { replace: true }); screen = <HomeScreen />; }
  else screen = <HomeScreen />;

  return (
    <div className="app">
      {screen as any}
      {showTabs && <TabBar active={seg[1] ?? ''} />}
      {sw.waiting && (
        <div className="update-banner">
          <span>{t('app.updateReady')}</span>
          <button className="btn" onClick={sw.update}>{t('app.update')}</button>
        </div>
      )}
      <DialogHost />
    </div>
  );
}

function TabBar({ active }: { active: string }) {
  const t = useT();
  const tabs = [
    { key: '', label: t('tab.today'), icon: <IconHome />, cls: '', to: '/forma' },
    { key: 'meals', label: t('tab.meals'), icon: <IconMeals />, cls: 'tab-meals', to: '/forma/meals' },
    { key: 'workouts', label: t('tab.workouts'), icon: <IconDumbbell />, cls: 'tab-workouts', to: '/forma/workouts' },
    { key: 'settings', label: t('tab.settings'), icon: <IconSettings />, cls: '', to: '/settings' },
  ];
  return (
    <nav className="tabbar-wrap">
      <div className="tabbar">
        {tabs.map((t) => (
          <button key={t.key} className={`tab ${t.cls} ${active === t.key ? 'active' : ''}`} onClick={() => navigate(t.to)} aria-current={active === t.key ? 'page' : undefined}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
