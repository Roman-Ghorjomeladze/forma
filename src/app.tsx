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

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([profileStore.loading, prefsStore.loading]);
        await seedIfEmpty();
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
  let showTabs = true;

  if (top === '') screen = <TodayScreen />;
  else if (top === 'meals') {
    if (seg[1] === 'dishes') screen = <DishListScreen />;
    else if (seg[1] === 'shopping') screen = <ShoppingScreen />;
    else if (seg[1] === 'dish' && seg[2] === 'new') { screen = <DishEditScreen />; showTabs = false; }
    else if (seg[1] === 'dish' && seg[3] === 'edit') { screen = <DishEditScreen id={seg[2]} />; showTabs = false; }
    else if (seg[1] === 'dish' && seg[2]) { screen = <DishDetailScreen id={seg[2]} />; showTabs = false; }
    else screen = <MealsScreen />;
  } else if (top === 'workouts') {
    if (seg[1] === 'exercises') screen = <ExerciseListScreen />;
    else if (seg[1] === 'history') screen = <HistoryScreen />;
    else if (seg[1] === 'exercise' && seg[2] === 'new') { screen = <ExerciseEditScreen />; showTabs = false; }
    else if (seg[1] === 'exercise' && seg[3] === 'edit') { screen = <ExerciseEditScreen id={seg[2]} />; showTabs = false; }
    else if (seg[1] === 'exercise' && seg[2]) { screen = <ExerciseDetailScreen id={seg[2]} />; showTabs = false; }
    else if (seg[1] === 'new') { screen = <WorkoutEditScreen />; showTabs = false; }
    else if (seg[1] && seg[2] === 'edit') { screen = <WorkoutEditScreen id={seg[1]} />; showTabs = false; }
    else if (seg[1] && seg[2] === 'play') { screen = <PlayerScreen id={seg[1]} />; showTabs = false; }
    else if (seg[1]) { screen = <WorkoutDetailScreen id={seg[1]} />; showTabs = false; }
    else screen = <WorkoutsScreen />;
  } else if (top === 'settings') screen = <SettingsScreen />;
  else screen = <TodayScreen />;

  const t = useT();
  return (
    <div className="app">
      {screen as any}
      {showTabs && <TabBar active={top} />}
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
    { key: '', label: t('tab.today'), icon: <IconHome />, cls: '' },
    { key: 'meals', label: t('tab.meals'), icon: <IconMeals />, cls: 'tab-meals' },
    { key: 'workouts', label: t('tab.workouts'), icon: <IconDumbbell />, cls: 'tab-workouts' },
    { key: 'settings', label: t('tab.settings'), icon: <IconSettings />, cls: '' },
  ];
  return (
    <nav className="tabbar-wrap">
      <div className="tabbar">
        {tabs.map((t) => (
          <button key={t.key} className={`tab ${t.cls} ${active === t.key ? 'active' : ''}`} onClick={() => navigate('/' + t.key)} aria-current={active === t.key ? 'page' : undefined}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
