import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { restoreStarterContent } from '../data/seed.js';
import { exportBackup, importBackup, shareOrDownloadJson } from '../lib/backup.js';
import { suggestDailyKcal } from '../lib/calories.js';
import { deleteBlob, deleteDatabase, put, remove, saveBlob } from '../lib/db.js';
import { usePrefs, useProfile } from '../lib/hooks.js';
import { uid } from '../lib/ids.js';
import { useT } from '../lib/i18n.js';
import { canPromptInstall, isInstalled, promptInstall, subscribeInstall } from '../lib/install-prompt.js';
import { useMusicTracks } from '../lib/queries.js';
import { Button, Field, NumberInput, Row, Screen, Segmented, Select, TextInput, Toggle, TopBar } from '../ui/components.js';
import { confirmDialog, toast } from '../ui/dialogs.js';
import { IconDownload, IconMusic, IconTrash, IconUpload } from '../ui/icons.js';
const MAX_TRACK_BYTES = 25 * 1024 * 1024; // 25MB - generous for a full song at typical mp3 bitrates
const IS_STANDALONE = (() => { try {
    return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
catch {
    return false;
} })();
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const IS_ANDROID = /Android/.test(navigator.userAgent);
export function SettingsScreen() {
    const t = useT();
    const [profile, setProfile] = useProfile();
    const [prefs, setPrefs] = usePrefs();
    const fileRef = useRef(null);
    const musicFileRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [musicBusy, setMusicBusy] = useState(false);
    const musicTracks = useMusicTracks();
    const [canInstall, setCanInstall] = useState(canPromptInstall());
    const [installed, setInstalled] = useState(isInstalled());
    useEffect(() => subscribeInstall(() => { setCanInstall(canPromptInstall()); setInstalled(isInstalled()); }), []);
    const addMusicTracks = async (files) => {
        setMusicBusy(true);
        try {
            let skipped = 0;
            for (const file of Array.from(files)) {
                if (file.size > MAX_TRACK_BYTES) {
                    skipped++;
                    continue;
                }
                const blobId = await saveBlob(file, file.name);
                await put('musicTracks', { id: uid('mtr'), name: file.name.replace(/\.[^.]+$/, ''), blobId, addedAt: Date.now() });
            }
            if (skipped > 0)
                toast(t('settings.musicTrackTooBig', { n: skipped }));
        }
        finally {
            setMusicBusy(false);
        }
    };
    const removeMusicTrack = async (track) => {
        const ok = await confirmDialog({ title: t('settings.removeTrackTitle', { name: track.name }), confirmLabel: t('common.remove'), danger: true });
        if (!ok)
            return;
        await deleteBlob(track.blobId);
        await remove('musicTracks', track.id);
    };
    const doInstall = async () => {
        const outcome = await promptInstall();
        if (outcome === 'accepted')
            toast(t('settings.appInstalled'));
    };
    const suggest = (goal) => {
        const kcal = suggestDailyKcal(profile.weightKg, profile.heightCm, profile.age, profile.sex, goal);
        const protein = Math.round(profile.weightKg * 1.8);
        const fat = Math.round((kcal * 0.27) / 9);
        const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
        setProfile({ targetKcal: kcal, targetProtein: protein, targetFat: fat, targetCarbs: carbs });
        const goalText = goal === 'lose' ? t('settings.goal.lose') : goal === 'gain' ? t('settings.goal.gain') : t('settings.goal.maintain');
        toast(t('settings.targetsSetFor', { goal: goalText }));
    };
    const doExport = async () => {
        setBusy(true);
        try {
            const data = await exportBackup();
            const name = `forma-backup-${new Date().toISOString().slice(0, 10)}.json`;
            const how = await shareOrDownloadJson(name, data);
            toast(how === 'shared' ? t('settings.backupReady') : t('settings.backupDownloaded'));
        }
        catch (e) {
            toast(t('settings.backupFailed'));
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
            const replace = await confirmDialog({ title: t('settings.restoreBackupTitle'), message: t('settings.restoreBackupMsg', { counts }), confirmLabel: t('settings.replaceAll'), cancelLabel: t('common.merge'), danger: true });
            await importBackup(parsed, replace ? 'replace' : 'merge');
            toast(replace ? t('settings.backupRestored') : t('settings.backupMerged'));
        }
        catch (e) {
            toast(t('settings.couldNotReadFile'));
            console.error(e);
        }
        finally {
            setBusy(false);
            if (fileRef.current)
                fileRef.current.value = '';
        }
    };
    const reset = async () => {
        const ok = await confirmDialog({ title: t('settings.eraseTitle'), message: t('settings.eraseMsg'), confirmLabel: t('common.erase'), danger: true });
        if (!ok)
            return;
        await deleteDatabase();
        try {
            localStorage.clear();
        }
        catch { /* ignore */ }
        location.reload();
    };
    return (_jsxs(Screen, { children: [_jsx(TopBar, { large: true, backTo: "/", title: t('settings.title'), eyebrow: t('settings.home') }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: t('settings.home') }), _jsx("div", { className: "list", children: _jsxs("div", { className: "settings-row", children: [_jsxs("div", { className: "l", children: [t('home.yourName'), _jsx("small", { children: t('home.yourNameHint') })] }), _jsx(TextInput, { value: profile.name ?? '', onChange: (v) => setProfile({ name: v }), placeholder: "Roma", className: "input-short" })] }) })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: t('settings.profile') }), _jsxs("div", { className: "list", style: { padding: '4px 16px 0' }, children: [_jsx(Field, { label: t('settings.weight'), inline: true, hint: t('settings.weightHint'), children: _jsx(NumberInput, { value: profile.weightKg, min: 30, max: 300, suffix: "kg", onChange: (v) => setProfile({ weightKg: v }) }) }), _jsx(Field, { label: t('settings.height'), inline: true, children: _jsx(NumberInput, { value: profile.heightCm, min: 100, max: 250, suffix: "cm", onChange: (v) => setProfile({ heightCm: v }) }) }), _jsx(Field, { label: t('settings.age'), inline: true, children: _jsx(NumberInput, { value: profile.age, min: 10, max: 100, onChange: (v) => setProfile({ age: v }) }) }), _jsx(Field, { label: t('settings.sex'), inline: true, children: _jsx(Select, { value: profile.sex, onChange: (v) => setProfile({ sex: v }), options: [{ value: 'male', label: t('settings.male') }, { value: 'female', label: t('settings.female') }] }) }), _jsx(Field, { label: t('settings.weekStartsOn'), inline: true, children: _jsx(Select, { value: String(profile.weekStartsOn), onChange: (v) => setProfile({ weekStartsOn: Number(v) }), options: [{ value: '1', label: t('settings.monday') }, { value: '0', label: t('settings.sunday') }] }) })] })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: t('settings.dailyTargets') }), _jsxs("div", { className: "list", style: { padding: '4px 16px 0' }, children: [_jsx(Field, { label: t('settings.calories'), inline: true, children: _jsx(NumberInput, { value: profile.targetKcal, min: 800, max: 6000, step: 10, suffix: "kcal", onChange: (v) => setProfile({ targetKcal: v }) }) }), _jsx(Field, { label: t('settings.protein'), inline: true, children: _jsx(NumberInput, { value: profile.targetProtein, min: 0, max: 500, suffix: "g", onChange: (v) => setProfile({ targetProtein: v }) }) }), _jsx(Field, { label: t('settings.carbs'), inline: true, children: _jsx(NumberInput, { value: profile.targetCarbs, min: 0, max: 800, suffix: "g", onChange: (v) => setProfile({ targetCarbs: v }) }) }), _jsx(Field, { label: t('settings.fat'), inline: true, children: _jsx(NumberInput, { value: profile.targetFat, min: 0, max: 300, suffix: "g", onChange: (v) => setProfile({ targetFat: v }) }) })] }), _jsx("div", { className: "small muted mt mb", children: t('settings.suggestHint') }), _jsxs("div", { className: "hstack wrap", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => suggest('lose'), children: t('settings.loseWeight') }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => suggest('maintain'), children: t('settings.maintain') }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => suggest('gain'), children: t('settings.gainMuscle') })] })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: t('settings.appearance') }), _jsx("div", { className: "theme-picker", children: ['system', 'light', 'dark'].map((th) => (_jsxs("button", { className: `theme-option ${prefs.theme === th ? 'active' : ''}`, onClick: () => setPrefs({ theme: th }), children: [_jsx("div", { className: "theme-swatch", style: { background: th === 'light' ? '#F7F5F1' : th === 'dark' ? '#0B0B0C' : 'linear-gradient(90deg, #F7F5F1 50%, #0B0B0C 50%)' } }), th === 'system' ? t('settings.automatic') : th === 'light' ? t('settings.light') : t('settings.dark')] }, th))) })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: t('settings.language') }), _jsx(Segmented, { value: prefs.language, onChange: (v) => setPrefs({ language: v }), options: [{ value: 'en', label: 'English' }, { value: 'ka', label: 'ქართული' }] })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: t('settings.player') }), _jsxs("div", { className: "list", children: [_jsxs("div", { className: "settings-row", children: [_jsxs("span", { className: "l", children: [t('settings.sounds'), _jsx("small", { children: t('settings.soundsHint') })] }), _jsx(Toggle, { checked: prefs.sound, onChange: (v) => setPrefs({ sound: v }) })] }), _jsxs("div", { className: "settings-row", children: [_jsxs("span", { className: "l", children: [t('settings.voiceCues'), _jsx("small", { children: t('settings.voiceCuesHint') })] }), _jsx(Toggle, { checked: prefs.voice, onChange: (v) => setPrefs({ voice: v }) })] }), _jsxs("div", { className: "settings-row", children: [_jsxs("span", { className: "l", children: [t('settings.music'), _jsx("small", { children: t('settings.musicHint') })] }), _jsx(Toggle, { checked: prefs.music, onChange: (v) => setPrefs({ music: v }) })] }), _jsxs("div", { className: "settings-row", children: [_jsxs("span", { className: "l", children: [t('settings.keepAwake'), _jsx("small", { children: t('settings.keepAwakeHint') })] }), _jsx(Toggle, { checked: prefs.keepAwake, onChange: (v) => setPrefs({ keepAwake: v }) })] }), _jsxs("div", { className: "settings-row", children: [_jsx("span", { className: "l", children: t('settings.countdownCue') }), _jsx(Segmented, { value: String(prefs.countdownSeconds), onChange: (v) => setPrefs({ countdownSeconds: Number(v) }), options: [{ value: '3', label: '3 s' }, { value: '5', label: '5 s' }, { value: '10', label: '10 s' }] })] })] })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: t('settings.yourMusic') }), _jsx("div", { className: "small muted mb", children: t('settings.yourMusicHint') }), musicTracks && musicTracks.length > 0 && (_jsx("div", { className: "list mb", children: musicTracks.map((tr) => (_jsxs(Row, { right: _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(IconTrash, { size: 16 }), onClick: () => removeMusicTrack(tr) }), children: [_jsx("div", { className: "thumb", children: _jsx(IconMusic, { size: 18 }) }), _jsx("div", { className: "row-main", children: _jsx("div", { className: "row-title", children: tr.name }) })] }, tr.id))) })), _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconUpload, { size: 18 }), disabled: musicBusy, onClick: () => musicFileRef.current?.click(), children: musicBusy ? t('common.uploading') : t('settings.addMusicTrack') }), _jsx("input", { ref: musicFileRef, type: "file", accept: "audio/*,.mp3", multiple: true, hidden: true, onChange: (e) => { const files = e.target.files; if (files && files.length)
                            addMusicTracks(files); e.target.value = ''; } })] }), _jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: t('settings.backup') }), _jsx("div", { className: "small muted mb", children: t('settings.backupHint') }), _jsx("div", { className: "small muted mb", children: t('settings.backupIncludes') }), _jsxs("div", { className: "stack", children: [_jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconDownload, { size: 18 }), disabled: busy, onClick: doExport, children: t('settings.exportBackup') }), _jsx(Button, { variant: "secondary", full: true, icon: _jsx(IconUpload, { size: 18 }), disabled: busy, onClick: () => fileRef.current?.click(), children: t('settings.restoreFromBackup') }), _jsx("input", { ref: fileRef, type: "file", accept: "application/json,.json", hidden: true, onChange: (e) => { const f = e.target.files?.[0]; if (f)
                                    doImport(f); } }), _jsx(Button, { variant: "ghost", full: true, onClick: async () => { await restoreStarterContent(); toast(t('settings.starterRestored')); }, children: t('settings.readdStarter') }), _jsx(Button, { variant: "danger", full: true, onClick: reset, children: t('settings.eraseAllData') })] })] }), !IS_STANDALONE && !installed && (_jsxs("div", { className: "settings-group", children: [_jsx("div", { className: "section-label", children: t('settings.install') }), _jsx("div", { className: "install-hint", children: canInstall ? (_jsxs(_Fragment, { children: [_jsx("span", { children: t('settings.installPromptBody') }), _jsx(Button, { icon: _jsx(IconDownload, { size: 18 }), onClick: doInstall, children: t('settings.installAppButton') })] })) : IS_IOS ? (_jsxs(_Fragment, { children: [_jsxs("span", { children: [_jsx("b", { children: t('settings.installIosTitle') }), " ", t('settings.installIosBody')] }), _jsx("span", { children: t('settings.installIosStep1', { share: t('settings.share') }) }), _jsx("span", { children: t('settings.installIosStep2', { addHome: t('settings.addToHomeScreen'), add: t('settings.add') }) }), _jsx("span", { className: "muted", children: t('settings.installIosNote') })] })) : IS_ANDROID ? (_jsxs(_Fragment, { children: [_jsxs("span", { children: [_jsx("b", { children: t('settings.installAndroidTitle') }), " ", t('settings.installAndroidBody')] }), _jsx("span", { children: t('settings.installAndroidStep1') }), _jsx("span", { children: t('settings.installAndroidStep2') }), _jsx("span", { className: "muted", children: t('settings.installAndroidNote') })] })) : (_jsx("span", { children: t('settings.installDesktop') })) })] })), _jsx("div", { className: "small muted", style: { textAlign: 'center', marginTop: 24 }, children: t('common.appTagline') })] }));
}
