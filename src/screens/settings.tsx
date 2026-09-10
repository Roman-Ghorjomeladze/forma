import { useRef, useState } from 'react';
import { restoreStarterContent } from '../data/seed.js';
import { exportBackup, importBackup, shareOrDownloadJson, type BackupFile } from '../lib/backup.js';
import { suggestDailyKcal } from '../lib/calories.js';
import { deleteDatabase } from '../lib/db.js';
import { usePrefs, useProfile } from '../lib/hooks.js';
import type { Theme } from '../lib/models.js';
import { Button, Field, NumberInput, Screen, Segmented, Select, Toggle, TopBar } from '../ui/components.js';
import { confirmDialog, toast } from '../ui/dialogs.js';
import { IconDownload, IconUpload } from '../ui/icons.js';

const IS_STANDALONE = (() => { try { return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true; } catch { return false; } })();
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

export function SettingsScreen() {
  const [profile, setProfile] = useProfile();
  const [prefs, setPrefs] = usePrefs();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const suggest = (goal: 'lose' | 'maintain' | 'gain') => {
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
    } catch (e) { toast('Backup failed'); console.error(e); } finally { setBusy(false); }
  };

  const doImport = async (file: File) => {
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      const counts = Object.entries(parsed.tables ?? {}).map(([k, v]) => `${(v as unknown[]).length} ${k}`).join(', ');
      const replace = await confirmDialog({ title: 'Restore backup?', message: `Contains ${counts}. Replace everything, or merge into what you have?`, confirmLabel: 'Replace all', cancelLabel: 'Merge', danger: true });
      await importBackup(parsed, replace ? 'replace' : 'merge');
      toast(replace ? 'Backup restored' : 'Backup merged');
    } catch (e) { toast('Could not read that file'); console.error(e); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const reset = async () => {
    const ok = await confirmDialog({ title: 'Erase everything?', message: 'All dishes, workouts, plans and history on this phone will be deleted. Export a backup first if you want to keep them.', confirmLabel: 'Erase', danger: true });
    if (!ok) return;
    await deleteDatabase();
    try { localStorage.clear(); } catch { /* ignore */ }
    location.reload();
  };

  return (
    <Screen>
      <TopBar large title="Settings" eyebrow="Forma" />

      <div className="settings-group">
        <div className="section-label">Profile</div>
        <div className="list" style={{ padding: '4px 16px 0' }}>
          <Field label="Weight" inline hint="Used for calories burned"><NumberInput value={profile.weightKg} min={30} max={300} suffix="kg" onChange={(v) => setProfile({ weightKg: v })} /></Field>
          <Field label="Height" inline><NumberInput value={profile.heightCm} min={100} max={250} suffix="cm" onChange={(v) => setProfile({ heightCm: v })} /></Field>
          <Field label="Age" inline><NumberInput value={profile.age} min={10} max={100} onChange={(v) => setProfile({ age: v })} /></Field>
          <Field label="Sex" inline><Select value={profile.sex} onChange={(v) => setProfile({ sex: v })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} /></Field>
          <Field label="Week starts on" inline><Select value={String(profile.weekStartsOn) as '0' | '1'} onChange={(v) => setProfile({ weekStartsOn: Number(v) as 0 | 1 })} options={[{ value: '1', label: 'Monday' }, { value: '0', label: 'Sunday' }]} /></Field>
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">Daily targets</div>
        <div className="list" style={{ padding: '4px 16px 0' }}>
          <Field label="Calories" inline><NumberInput value={profile.targetKcal} min={800} max={6000} step={10} suffix="kcal" onChange={(v) => setProfile({ targetKcal: v })} /></Field>
          <Field label="Protein" inline><NumberInput value={profile.targetProtein} min={0} max={500} suffix="g" onChange={(v) => setProfile({ targetProtein: v })} /></Field>
          <Field label="Carbs" inline><NumberInput value={profile.targetCarbs} min={0} max={800} suffix="g" onChange={(v) => setProfile({ targetCarbs: v })} /></Field>
          <Field label="Fat" inline><NumberInput value={profile.targetFat} min={0} max={300} suffix="g" onChange={(v) => setProfile({ targetFat: v })} /></Field>
        </div>
        <div className="small muted mt mb">Suggest targets from your profile (Mifflin-St Jeor, light activity):</div>
        <div className="hstack wrap">
          <Button size="sm" variant="secondary" onClick={() => suggest('lose')}>Lose weight</Button>
          <Button size="sm" variant="secondary" onClick={() => suggest('maintain')}>Maintain</Button>
          <Button size="sm" variant="secondary" onClick={() => suggest('gain')}>Gain muscle</Button>
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">Appearance</div>
        <div className="theme-picker">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} className={`theme-option ${prefs.theme === t ? 'active' : ''}`} onClick={() => setPrefs({ theme: t })}>
              <div className="theme-swatch" style={{ background: t === 'light' ? '#F7F5F1' : t === 'dark' ? '#0B0B0C' : 'linear-gradient(90deg, #F7F5F1 50%, #0B0B0C 50%)' }} />
              {t === 'system' ? 'Automatic' : t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">Workout player</div>
        <div className="list">
          <div className="settings-row"><span className="l">Sounds<small>Beeps on countdown and step changes</small></span><Toggle checked={prefs.sound} onChange={(v) => setPrefs({ sound: v })} /></div>
          <div className="settings-row"><span className="l">Voice cues<small>Announces exercises and counts down</small></span><Toggle checked={prefs.voice} onChange={(v) => setPrefs({ voice: v })} /></div>
          <div className="settings-row"><span className="l">Keep screen awake<small>While a workout is running</small></span><Toggle checked={prefs.keepAwake} onChange={(v) => setPrefs({ keepAwake: v })} /></div>
          <div className="settings-row"><span className="l">Countdown cue</span><Segmented value={String(prefs.countdownSeconds) as '3' | '5' | '10'} onChange={(v) => setPrefs({ countdownSeconds: Number(v) })} options={[{ value: '3', label: '3 s' }, { value: '5', label: '5 s' }, { value: '10', label: '10 s' }]} /></div>
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">Backup</div>
        <div className="small muted mb">Everything lives on this phone. Export a backup now and then — you can restore it on any device.</div>
        <div className="stack">
          <Button variant="secondary" full icon={<IconDownload size={18} />} disabled={busy} onClick={doExport}>Export backup (JSON)</Button>
          <Button variant="secondary" full icon={<IconUpload size={18} />} disabled={busy} onClick={() => fileRef.current?.click()}>Restore from backup</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e: { target: HTMLInputElement }) => { const f = e.target.files?.[0]; if (f) doImport(f); }} />
          <Button variant="ghost" full onClick={async () => { await restoreStarterContent(); toast('Starter content restored'); }}>Re-add starter exercises &amp; dishes</Button>
          <Button variant="danger" full onClick={reset}>Erase all data</Button>
        </div>
      </div>

      {!IS_STANDALONE && (
        <div className="settings-group">
          <div className="section-label">Install</div>
          <div className="install-hint">
            {IS_IOS ? (
              <>
                <span><b>Add Forma to your Home Screen</b> to run it full-screen and offline:</span>
                <span>1. Tap the <b>Share</b> button in Safari.</span>
                <span>2. Choose <b>Add to Home Screen</b>, then <b>Add</b>.</span>
                <span className="muted">Open it from the Home Screen icon from then on — that copy keeps its own data.</span>
              </>
            ) : (
              <span>Open this page on your iPhone in Safari and use <b>Share → Add to Home Screen</b> to install it as an app.</span>
            )}
          </div>
        </div>
      )}

      <div className="small muted" style={{ textAlign: 'center', marginTop: 24 }}>Forma · no accounts, no tracking, your data stays on your phone.</div>
    </Screen>
  );
}
