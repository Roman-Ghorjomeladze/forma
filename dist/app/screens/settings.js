import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { restoreStarterContent } from '../data/seed.js';
import { exportBackup, importBackup, shareOrDownloadJson } from '../lib/backup.js';
import { suggestDailyKcal } from '../lib/calories.js';
import { deleteDatabase } from '../lib/db.js';
import { usePrefs, useProfile } from '../lib/hooks.js';
import { Button, Field, NumberInput, Screen, Segmented, Select, Toggle, TopBar } from '../ui/components.js';
import { confirmDialog, toast } from '../ui/dialogs.js';
import { IconDownload, IconUpload } from '../ui/icons.js';
const IS_STANDALONE = (() => { try {
    return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
catch {
    return false;
} })();
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
export function SettingsScreen() {
    const [profile, setProfile] = useProfile();
    const [prefs, setPrefs] = usePrefs();
    const fileRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const suggest = (goal) => {
        const kcal = suggestDailyKcal(profile.weightKg, profile.heightCm, profile.age, profile.sex, goal);
        const protein = Math.round(profile.weightKg * 1.8);
        const fat = Math.round((kcal * 0.27) / 9);
        const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
        setProfile({ targetKcal: kcal, targetProtein: protein, targetFat: fat, targetCarbs: carbs });
        toast(`Targets set for ${goal === 'lose' ? 'weight loss' : goal === 'gain' ? 'muscle gain' : 'maintenance'}`);
    };
    const doExport = async () => {
        setBusy(true);
        try {
            const data = await exportBackup();
            const name = `forma-backup-${new Date().toISOString().slice(0, 10)}.json`;
            const how = await shareOrDownloadJson(name, data);
            toast(how === 'shared' ? 'Backup ready' : 'Backup downloaded');
        }
        catch (e) {
            toast('Backup failed');
            console.error(e);
        }
        finally {
            setBusy(false);
        }
    };
    const doImport = async (file) => {
        setBusy(true);
        try {
            const parsed = JSON.parse(await file.text());
            const counts = Object.entries(parsed.tables ?? {}).map(([k, v]) => `${v.length} ${k}`).join(', ');
            const replace = await confirmDialog({ title: 'Restore backup?', message: `Contains ${counts}. Replace everything, or merge into what you have?`, confirmLabel: 'Replace all', cancelLabel: 'Merge', danger: true });
            await importBackup(parsed, replace ? 'replace' : 'merge');
            toast(replace ? 'Backup restored' : 'Backup merged');
        }
        catch (e) {
            toast('Could not read that file');
            console.error(e);
        }
        finally {
            setBusy(false);
            if (fileRef.current)
                fileRef.current.value = '';
        }
    };
    const reset = async () => {
        const ok = await confirmDialog({ title: 'Erase everything?', message: 'All dishes, workouts, plans and history on this phone will be deleted. Export a backup first if you want to keep them.', confirmLabel: 'Erase', danger: true });
        if (!ok)
            return;
        await deleteDatabase();
        try {
            localStorage.clear();
        }
        catch { /* ignore */ }
        location.reload();
    };
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, title: "Settings", eyebrow: "Forma" }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: "Profile" }), _jsxs("div", { className: "list", style: { padding: '4px 16px 0' }, children: [_jsx(Field, { label: "Weight", inline: true, hint: "Used for calories burned", children: _jsx(NumberInput, { value: profile.weightKg, min: 30, max: 300, suffix: "kg", onChange: (v) => setProfile({ weightKg: v }) }) }), _jsx(Field, { label: "Height", inline: true, children: _jsx(NumberInput, { value: profile.heightCm, min: 100, max: 250, suffix: "cm", onChange: (v) => setProfile({ heightCm: v }) }) }), _jsx(Field, { label: "Age", inline: true, children: _jsx(NumberInput, { value: profile.age, min: 10, max: 100, onChange: (v) => setProfile({ age: v }) }) }), _jsx(Field, { label: "Sex", inline: true, children: _jsx(Select, { value: profile.sex, onChange: (v) => setProfile({ sex: v }), options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] }) }), _jsx(Field, { label: "Week starts on", inline: true, children: _jsx(Select, { value: String(profile.weekStartsOn), onChange: (v) => setProfile({ weekStartsOn: Number(v) }), options: [{ value: '1', label: 'Monday' }, { value: '0', label: 'Sunday' }] }) })] })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: "Daily targets" }), _jsxs("div", { className: "list", style: { padding: '4px 16px 0' }, children: [_jsx(Field, { label: "Calories", inline: true, children: _jsx(NumberInput, { value: profile.targetKcal, min: 800, max: 6000, step: 10, suffix: "kcal", onChange: (v) => setProfile({ targetKcal: v }) }) }), _jsx(Field, { label: "Protein", inline: true, children: _jsx(NumberInput, { value: profile.targetProtein, min: 0, max: 500, suffix: "g", onChange: (v) => setProfile({ targetProtein: v }) }) }), _jsx(Field, { label: "Carbs", inline: true, children: _jsx(NumberInput, { value: profile.targetCarbs, min: 0, max: 800, suffix: "g", onChange: (v) => setProfile({ targetCarbs: v }) }) }), _jsx(Field, { label: "Fat", inline: true, children: _jsx(NumberInput, { value: profile.targetFat, min: 0, max: 300, suffix: "g", onChange: (v) => setProfile({ targetFat: v }) }) })] }), _jsx("div", { className: "small muted mt mb", children: "Suggest targets from your profile (Mifflin-St Jeor, light activity):" }), _jsxs("div", { className: "hstack wrap", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => suggest('lose'), children: "Lose weight" }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => suggest('maintain'), children: "Maintain" }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => suggest('gain'), children: "Gain muscle" })] })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: "Appearance" }), _jsx("div", { className: "theme-picker", children: ['system', 'light', 'dark'].map((t) => (_jsxs("button", { className: `theme-option ${prefs.theme === t ? 'active' : ''}`, onClick: () => setPrefs({ theme: t }), children: [_jsx("div", { className: "theme-swatch", style: { background: t === 'light' ? '#F7F5F1' : t === 'dark' ? '#0B0B0C' : 'linear-gradient(90deg, #F7F5F1 50%, #0B0B0C 50%)' } }), t === 'system' ? 'Automatic' : t === 'light' ? 'Light' : 'Dark'] }, t))) })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: "Workout player" }), _jsxs("div", { className: "list", children: [_jsxs("div", { className: "settings-row", children: [_jsxs("span", { className: "l", children: ["Sounds", _jsx("small", { children: "Beeps on countdown and step changes" })] }), _jsx(Toggle, { checked: prefs.sound, onChange: (v) => setPrefs({ sound: v }) })] }), _jsxs("div", { className: "settings-row", children: [_jsxs("span", { className: "l", children: ["Voice cues", _jsx("small", { children: "Announces exercises and counts down" })] }), _jsx(Toggle, { checked: prefs.voice, onChange: (v) => setPrefs({ voice: v }) })] }), _jsxs("div", { className: "settings-row", children: [_jsxs("span", { className: "l", children: ["Keep screen awake", _jsx("small", { children: "While a workout is running" })] }), _jsx(Toggle, { checked: prefs.keepAwake, onChange: (v) => setPrefs({ keepAwake: v }) })] }), _jsxs("div", { className: "settings-row", children: [_jsx("span", { className: "l", children: "Countdown cue" }), _jsx(Segmented, { value: String(prefs.countdownSeconds), onChange: (v) => setPrefs({ countdownSeconds: Number(v) }), options: [{ value: '3', label: '3 s' }, { value: '5', label: '5 s' }, { value: '10', label: '10 s' }] })] })] })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: "Backup" }), _jsx("div", { className: "small muted mb", children: "Everything lives on this phone. Export a backup now and then \u2014 you can restore it on any device." }), _jsxs("div", { className: "stack", children: [_jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconDownload, { size: 18 }), disabled: busy, onClick: doExport, children: "Export backup (JSON)" }), _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconUpload, { size: 18 }), disabled: busy, onClick: () => fileRef.current?.click(), children: "Restore from backup" }), _jsx("input", { ref: fileRef, type: "file", accept: "application/json,.json", hidden: true, onChange: (e) => { const f = e.target.files?.[0]; if (f)
                                    doImport(f); } }), _jsx(Button, { variant: "ghost", full: true, onClick: async () => { await restoreStarterContent(); toast('Starter content restored'); }, children: "Re-add starter exercises & dishes" }), _jsx(Button, { variant: "danger", full: true, onClick: reset, children: "Erase all data" })] })] }), !IS_STANDALONE && (_jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: "Install" }), _jsx("div", { className: "install-hint", children: IS_IOS ? (_jsxs(_Fragment, { children: [_jsxs("span", { children: [_jsx("b", { children: "Add Forma to your Home Screen" }), " to run it full-screen and offline:"] }), _jsxs("span", { children: ["1. Tap the ", _jsx("b", { children: "Share" }), " button in Safari."] }), _jsxs("span", { children: ["2. Choose ", _jsx("b", { children: "Add to Home Screen" }), ", then ", _jsx("b", { children: "Add" }), "."] }), _jsx("span", { className: "muted", children: "Open it from the Home Screen icon from then on \u2014 that copy keeps its own data." })] })) : (_jsxs("span", { children: ["Open this page on your iPhone in Safari and use ", _jsx("b", { children: "Share \u2192 Add to Home Screen" }), " to install it as an app."] })) })] })), _jsx("div", { className: "small muted", style: { textAlign: 'center', marginTop: 24 }, children: "Forma \u00B7 no accounts, no tracking, your data stays on your phone." })] }));
}
