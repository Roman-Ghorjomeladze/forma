import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// The launcher: one card per app with a live one-liner, quick-add shortcuts and Settings.
import { useMemo } from 'react';
import { localizedWorkoutName } from '../data/seed-i18n.js';
import { formatLong, todayKey } from '../lib/dates.js';
import { useProfile } from '../lib/hooks.js';
import { useLang, useT } from '../lib/i18n.js';
import { dayNutrition } from '../lib/nutrition.js';
import { fmtMoney, sum } from '../lib/pocket.js';
import { navigate } from '../lib/router.js';
import { useAllExpenses, useAllNotes, useAllPersons, useDishMap, useMealSlots, useNoteGroups, useProjects, useQuizResults, useSchedule, useSessions, useTrees, useWorkouts } from '../lib/queries.js';
import { accuracy } from '../lib/flags.js';
import { Screen } from '../ui/components.js';
import { IconChevron, IconDumbbell, IconFlag, IconNotes, IconPlay, IconPlus, IconSettings, IconTree, IconWallet } from '../ui/icons.js';
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
    const hour = new Date().getHours();
    const slot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const name = profile.name?.trim();
    const greeting = name ? t(`home.${slot}`, { name }) : t(`home.${slot}NoName`);
    const formaLine = useMemo(() => {
        if (!slots || !dishes || !workouts || !schedule || !sessions)
            return '';
        const kcal = Math.round(dayNutrition(slots, dishes, false).kcal);
        const doneToday = sessions.some((s) => new Date(s.startedAt).toDateString() === new Date().toDateString());
        if (doneToday)
            return t('home.formaLine.done', { kcal });
        const w = workouts.find((x) => x.id === schedule.find((s) => s.weekday === new Date().getDay())?.workoutId);
        return w ? t('home.formaLine.scheduled', { workout: localizedWorkoutName(w.id, w.name, lang), kcal }) : t('home.formaLine.rest', { kcal });
    }, [slots, dishes, workouts, schedule, sessions, t, lang]);
    const pocketLine = useMemo(() => {
        if (!projects || !expenses)
            return '';
        const p = projects.find((x) => x.status === 'active') ?? projects[0];
        if (!p)
            return t('home.pocketLine.empty');
        const spent = sum(expenses.filter((e) => e.projectId === p.id));
        return p.budget ? t('home.pocketLine.projectBudget', { project: p.name, spent: fmtMoney(spent), budget: fmtMoney(p.budget) }) : t('home.pocketLine.project', { project: p.name, spent: fmtMoney(spent) });
    }, [projects, expenses, t]);
    const treeLine = useMemo(() => {
        if (!trees || !persons)
            return '';
        if (trees.length === 0)
            return t('home.treeLine.empty');
        if (trees.length === 1)
            return t('home.treeLine.tree', { tree: trees[0].name, n: persons.filter((p) => p.treeId === trees[0].id).length });
        return t('home.treeLine.trees', { n: trees.length, people: persons.length });
    }, [trees, persons, t]);
    const flagsLine = useMemo(() => {
        if (!quiz)
            return '';
        if (quiz.length === 0)
            return t('home.flagsLine.empty');
        const best = quiz.reduce((b, r) => (r.score / r.total > b.score / b.total ? r : b), quiz[0]);
        return t('home.flagsLine.best', { score: best.score, total: best.total, n: quiz.length, acc: accuracy(quiz) });
    }, [quiz, t]);
    const notesLine = useMemo(() => {
        if (!notes || !noteGroups)
            return '';
        if (notes.length === 0)
            return t('home.notesLine.empty');
        const last = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        return t('home.notesLine.last', { n: notes.length, g: noteGroups.length, title: displayTitle(last), when: relativeTime(last.updatedAt) });
    }, [notes, noteGroups, t]);
    return (_jsxs(Screen, { className: "screen-no-tabs home", children: [_jsxs("header", { className: "topbar topbar-large", children: [_jsxs("div", { className: "topbar-titles", children: [_jsx("div", { className: "eyebrow", children: formatLong(today) }), _jsx("h1", { className: "title-large", children: greeting })] }), _jsx("button", { type: "button", className: "iconbtn", "aria-label": t('settings.title'), onClick: () => navigate('/settings'), children: _jsx(IconSettings, { size: 20 }) })] }), _jsxs("div", { className: "stack", style: { gap: 12 }, children: [_jsx(AppCard, { name: t('home.forma'), sub: t('home.formaSub'), line: formaLine, icon: _jsx(IconDumbbell, { size: 28, strokeWidth: 2.2 }), tone: "forma", onClick: () => navigate('/forma') }), _jsx(AppCard, { name: t('home.pocket'), sub: t('home.pocketSub'), line: pocketLine, icon: _jsx(IconWallet, { size: 28, strokeWidth: 2.2 }), tone: "pocket", onClick: () => navigate('/pocket') }), _jsx(AppCard, { name: t('home.tree'), sub: t('home.treeSub'), line: treeLine, icon: _jsx(IconTree, { size: 28, strokeWidth: 2.2 }), tone: "tree", onClick: () => navigate('/tree') }), _jsx(AppCard, { name: t('home.flags'), sub: t('home.flagsSub'), line: flagsLine, icon: _jsx(IconFlag, { size: 28, strokeWidth: 2.2 }), tone: "flags", onClick: () => navigate('/flags') }), _jsx(AppCard, { name: t('home.notes'), sub: t('home.notesSub'), line: notesLine, icon: _jsx(IconNotes, { size: 28, strokeWidth: 2.2 }), tone: "notes", onClick: () => navigate('/notes') })] }), _jsxs("div", { className: "mt-lg", children: [_jsx("div", { className: "section-label", children: t('home.quickAdd') }), _jsxs("div", { className: "quick-row", children: [_jsxs("button", { type: "button", className: "quick", onClick: () => navigate('/pocket/expense/new'), children: [_jsx("span", { className: "c-pocket", children: _jsx(IconPlus, { size: 18 }) }), t('home.expense')] }), _jsxs("button", { type: "button", className: "quick", onClick: () => navigate(trees && trees.length === 1 ? `/tree/${trees[0].id}` : '/tree'), children: [_jsx("span", { className: "c-tree", children: _jsx(IconPlus, { size: 18 }) }), t('home.person')] }), _jsxs("button", { type: "button", className: "quick", onClick: () => navigate('/flags/quiz'), children: [_jsx("span", { className: "c-flags", children: _jsx(IconPlay, { size: 16 }) }), t('home.quiz')] }), _jsxs("button", { type: "button", className: "quick", onClick: () => navigate(noteGroups && noteGroups.length ? `/notes/note/new?group=${noteGroups[0].id}` : '/notes'), children: [_jsx("span", { className: "c-notes", children: _jsx(IconPlus, { size: 18 }) }), t('home.note')] })] })] }), _jsx("div", { className: "home-footer small muted", children: t('home.footer') })] }));
}
function AppCard({ name, sub, line, icon, tone, onClick }) {
    return (_jsxs("button", { type: "button", className: `app-card app-${tone}`, onClick: onClick, children: [_jsx("span", { className: "app-icon", children: icon }), _jsxs("span", { className: "app-text", children: [_jsx("span", { className: "app-name title-large", style: { fontSize: 22 }, children: name }), _jsx("span", { className: "app-sub small muted bold", children: sub }), line && _jsx("span", { className: "app-line small", children: line })] }), _jsx(IconChevron, { size: 20, className: "muted" })] }));
}
