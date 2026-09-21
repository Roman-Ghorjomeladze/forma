import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
function useTheme() {
    const [prefs] = usePrefs();
    useEffect(() => {
        const root = document.documentElement;
        const mq = matchMedia('(prefers-color-scheme: dark)');
        const apply = () => {
            if (prefs.theme === 'light' || prefs.theme === 'dark') {
                root.setAttribute('data-theme', prefs.theme);
                root.classList.remove('dark-system');
            }
            else {
                root.removeAttribute('data-theme');
                root.classList.toggle('dark-system', mq.matches);
            }
            try {
                localStorage.setItem('forma:theme', prefs.theme);
            }
            catch { /* ignore */ }
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
    const [waiting, setWaiting] = useState(null);
    useEffect(() => {
        if (!('serviceWorker' in navigator) || location.protocol === 'file:')
            return;
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            if (reg.waiting && navigator.serviceWorker.controller)
                setWaiting(reg.waiting);
            reg.addEventListener('updatefound', () => {
                const nw = reg.installing;
                nw?.addEventListener('statechange', () => {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller)
                        setWaiting(nw);
                });
            });
            // check for updates when the app comes back to the foreground
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible')
                reg.update().catch(() => { }); });
        }).catch((e) => console.warn('sw registration failed', e));
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (!refreshing) {
            refreshing = true;
            location.reload();
        } });
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
                if (navigator.storage?.persist)
                    navigator.storage.persist().catch(() => { });
            }
            catch (e) {
                console.error('startup failed', e);
            }
            finally {
                setReady(true);
            }
        })();
    }, []);
    if (!ready)
        return _jsx("div", { className: "screen" });
    const seg = route.segments;
    const top = seg[0] ?? '';
    let screen;
    let showTabs = false;
    if (top === '')
        screen = _jsx(HomeScreen, {});
    else if (top === 'forma') {
        // Forma keeps its own tab bar; its routes live under /forma/*
        const f = seg.slice(1);
        const sub = f[0] ?? '';
        showTabs = true;
        if (sub === '')
            screen = _jsx(TodayScreen, {});
        else if (sub === 'meals') {
            if (f[1] === 'dishes')
                screen = _jsx(DishListScreen, {});
            else if (f[1] === 'shopping')
                screen = _jsx(ShoppingScreen, {});
            else if (f[1] === 'dish' && f[2] === 'new') {
                screen = _jsx(DishEditScreen, {});
                showTabs = false;
            }
            else if (f[1] === 'dish' && f[3] === 'edit') {
                screen = _jsx(DishEditScreen, { id: f[2] });
                showTabs = false;
            }
            else if (f[1] === 'dish' && f[2]) {
                screen = _jsx(DishDetailScreen, { id: f[2] });
                showTabs = false;
            }
            else
                screen = _jsx(MealsScreen, {});
        }
        else if (sub === 'workouts') {
            if (f[1] === 'exercises')
                screen = _jsx(ExerciseListScreen, {});
            else if (f[1] === 'history')
                screen = _jsx(HistoryScreen, {});
            else if (f[1] === 'exercise' && f[2] === 'new') {
                screen = _jsx(ExerciseEditScreen, {});
                showTabs = false;
            }
            else if (f[1] === 'exercise' && f[3] === 'edit') {
                screen = _jsx(ExerciseEditScreen, { id: f[2] });
                showTabs = false;
            }
            else if (f[1] === 'exercise' && f[2]) {
                screen = _jsx(ExerciseDetailScreen, { id: f[2] });
                showTabs = false;
            }
            else if (f[1] === 'new') {
                screen = _jsx(WorkoutEditScreen, {});
                showTabs = false;
            }
            else if (f[1] && f[2] === 'edit') {
                screen = _jsx(WorkoutEditScreen, { id: f[1] });
                showTabs = false;
            }
            else if (f[1] && f[2] === 'play') {
                screen = _jsx(PlayerScreen, { id: f[1] });
                showTabs = false;
            }
            else if (f[1]) {
                screen = _jsx(WorkoutDetailScreen, { id: f[1] });
                showTabs = false;
            }
            else
                screen = _jsx(WorkoutsScreen, {});
        }
        else
            screen = _jsx(TodayScreen, {});
    }
    else if (top === 'pocket') {
        if (seg[1] === 'categories')
            screen = _jsx(PocketCategoriesScreen, {});
        else if (seg[1] === 'project' && seg[2] === 'new')
            screen = _jsx(PocketProjectEditScreen, {});
        else if (seg[1] === 'project' && seg[3] === 'edit')
            screen = _jsx(PocketProjectEditScreen, { id: seg[2] });
        else if (seg[1] === 'project' && seg[2])
            screen = _jsx(PocketProjectScreen, { id: seg[2] });
        else if (seg[1] === 'expense' && seg[2] === 'new')
            screen = _jsx(PocketExpenseEditScreen, {});
        else if (seg[1] === 'expense' && seg[3] === 'edit')
            screen = _jsx(PocketExpenseEditScreen, { id: seg[2] });
        else
            screen = _jsx(PocketProjectsScreen, {});
    }
    else if (top === 'tree') {
        if (seg[1] && seg[2] === 'person' && seg[3])
            screen = _jsx(PersonScreen, { treeId: seg[1], personId: seg[3] });
        else if (seg[1])
            screen = _jsx(TreeCanvasScreen, { treeId: seg[1] });
        else
            screen = _jsx(TreesScreen, {});
    }
    else if (top === 'flags') {
        if (seg[1] === 'all')
            screen = _jsx(FlagsGridScreen, {});
        else if (seg[1] === 'quiz' && seg[2] === 'play')
            screen = _jsx(FlagsQuizPlayScreen, {});
        else if (seg[1] === 'quiz')
            screen = _jsx(FlagsQuizSetupScreen, {});
        else
            screen = _jsx(FlagsSliderScreen, {});
    }
    else if (top === 'notes') {
        if (seg[1] === 'group' && seg[2])
            screen = _jsx(NoteGroupScreen, { id: seg[2] });
        else if (seg[1] === 'note' && seg[2] === 'new')
            screen = _jsx(NoteEditScreen, {});
        else if (seg[1] === 'note' && seg[3] === 'edit')
            screen = _jsx(NoteEditScreen, { id: seg[2] });
        else if (seg[1] === 'note' && seg[2])
            screen = _jsx(NoteViewScreen, { id: seg[2] });
        else
            screen = _jsx(NotesHomeScreen, {});
    }
    else if (top === 'settings')
        screen = _jsx(SettingsScreen, {});
    // Old bookmarks / home-screen icons from before the launcher existed
    else if (top === 'meals' || top === 'workouts') {
        navigate('/forma/' + seg.join('/'), { replace: true });
        screen = _jsx(HomeScreen, {});
    }
    else
        screen = _jsx(HomeScreen, {});
    return (_jsxs("div", { className: "app", children: [screen, showTabs && _jsx(TabBar, { active: seg[1] ?? '' }), sw.waiting && (_jsxs("div", { className: "update-banner", children: [_jsx("span", { children: t('app.updateReady') }), _jsx("button", { className: "btn", onClick: sw.update, children: t('app.update') })] })), _jsx(DialogHost, {})] }));
}
function TabBar({ active }) {
    const t = useT();
    const tabs = [
        { key: '', label: t('tab.today'), icon: _jsx(IconHome, {}), cls: '', to: '/forma' },
        { key: 'meals', label: t('tab.meals'), icon: _jsx(IconMeals, {}), cls: 'tab-meals', to: '/forma/meals' },
        { key: 'workouts', label: t('tab.workouts'), icon: _jsx(IconDumbbell, {}), cls: 'tab-workouts', to: '/forma/workouts' },
        { key: 'settings', label: t('tab.settings'), icon: _jsx(IconSettings, {}), cls: '', to: '/settings' },
    ];
    return (_jsx("nav", { className: "tabbar-wrap", children: _jsx("div", { className: "tabbar", children: tabs.map((t) => (_jsxs("button", { className: `tab ${t.cls} ${active === t.key ? 'active' : ''}`, onClick: () => navigate(t.to), "aria-current": active === t.key ? 'page' : undefined, children: [t.icon, _jsx("span", { children: t.label })] }, t.key))) }) }));
}
