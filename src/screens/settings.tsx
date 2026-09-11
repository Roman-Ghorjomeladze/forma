import { useRef, useState } from 'react';
import { restoreStarterContent } from '../data/seed.js';
import { exportBackup, importBackup, shareOrDownloadJson, type BackupFile } from '../lib/backup.js';
import { suggestDailyKcal } from '../lib/calories.js';
import { deleteDatabase } from '../lib/db.js';
import { usePrefs, useProfile } from '../lib/hooks.js';
import { useT } from '../lib/i18n.js';
import type { Lang, Theme } from '../lib/models.js';
import { Button, Field, NumberInput, Screen, Segmented, Select, Toggle, TopBar } from '../ui/components.js';
import { confirmDialog, toast } from '../ui/dialogs.js';
import { IconDownload, IconUpload } from '../ui/icons.js';

const IS_STANDALONE = (() => { try { return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true; } catch { return false; } })();
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

export function SettingsScreen() {
  const t = useT();
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
    } catch (e) { toast(t('settings.backupFailed')); console.error(e); } finally { setBusy(false); }
  };

  const doImport = async (file: File) => {
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      const counts = Object.entries(parsed.tables ?? {}).map(([k, v]) => `${(v as unknown[]).length} ${k}`).join(', ');
      const replace = await confirmDialog({ title: t('settings.restoreBackupTitle'), message: t('settings.restoreBackupMsg', { counts }), confirmLabel: t('settings.replaceAll'), cancelLabel: t('common.merge'), danger: true });
      await importBackup(parsed, replace ? 'replace' : 'merge');
      toast(replace ? t('settings.backupRestored') : t('settings.backupMerged'));
    } catch (e) { toast(t('settings.couldNotReadFile')); console.error(e); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const reset = async () => {
    const ok = await confirmDialog({ title: t('settings.eraseTitle'), message: t('settings.eraseMsg'), confirmLabel: t('common.erase'), danger: true });
    if (!ok) return;
    await deleteDatabase();
    try { localStorage.clear(); } catch { /* ignore */ }
    location.reload();
  };

  return (
    <Screen>
      <TopBar large title={t('settings.title')} eyebrow="Forma" />

      <div className="settings-group">
        <div className="section-label">{t('settings.profile')}</div>
        <div className="list" style={{ padding: '4px 16px 0' }}>
          <Field label={t('settings.weight')} inline hint={t('settings.weightHint')}><NumberInput value={profile.weightKg} min={30} max={300} suffix="kg" onChange={(v) => setProfile({ weightKg: v })} /></Field>
          <Field label={t('settings.height')} inline><NumberInput value={profile.heightCm} min={100} max={250} suffix="cm" onChange={(v) => setProfile({ heightCm: v })} /></Field>
          <Field label={t('settings.age')} inline><NumberInput value={profile.age} min={10} max={100} onChange={(v) => setProfile({ age: v })} /></Field>
          <Field label={t('settings.sex')} inline><Select value={profile.sex} onChange={(v) => setProfile({ sex: v })} options={[{ value: 'male', label: t('settings.male') }, { value: 'female', label: t('settings.female') }]} /></Field>
          <Field label={t('settings.weekStartsOn')} inline><Select value={String(profile.weekStartsOn) as '0' | '1'} onChange={(v) => setProfile({ weekStartsOn: Number(v) as 0 | 1 })} options={[{ value: '1', label: t('settings.monday') }, { value: '0', label: t('settings.sunday') }]} /></Field>
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">{t('settings.dailyTargets')}</div>
        <div className="list" style={{ padding: '4px 16px 0' }}>
          <Field label={t('settings.calories')} inline><NumberInput value={profile.targetKcal} min={800} max={6000} step={10} suffix="kcal" onChange={(v) => setProfile({ targetKcal: v })} /></Field>
          <Field label={t('settings.protein')} inline><NumberInput value={profile.targetProtein} min={0} max={500} suffix="g" onChange={(v) => setProfile({ targetProtein: v })} /></Field>
          <Field label={t('settings.carbs')} inline><NumberInput value={profile.targetCarbs} min={0} max={800} suffix="g" onChange={(v) => setProfile({ targetCarbs: v })} /></Field>
          <Field label={t('settings.fat')} inline><NumberInput value={profile.targetFat} min={0} max={300} suffix="g" onChange={(v) => setProfile({ targetFat: v })} /></Field>
        </div>
        <div className="small muted mt mb">{t('settings.suggestHint')}</div>
        <div className="hstack wrap">
          <Button size="sm" variant="secondary" onClick={() => suggest('lose')}>{t('settings.loseWeight')}</Button>
          <Button size="sm" variant="secondary" onClick={() => suggest('maintain')}>{t('settings.maintain')}</Button>
          <Button size="sm" variant="secondary" onClick={() => suggest('gain')}>{t('settings.gainMuscle')}</Button>
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">{t('settings.appearance')}</div>
        <div className="theme-picker">
          {(['system', 'light', 'dark'] as Theme[]).map((th) => (
            <button key={th} className={`theme-option ${prefs.theme === th ? 'active' : ''}`} onClick={() => setPrefs({ theme: th })}>
              <div className="theme-swatch" style={{ background: th === 'light' ? '#F7F5F1' : th === 'dark' ? '#0B0B0C' : 'linear-gradient(90deg, #F7F5F1 50%, #0B0B0C 50%)' }} />
              {th === 'system' ? t('settings.automatic') : th === 'light' ? t('settings.light') : t('settings.dark')}
            </button>
          ))}
        </div>
        <div className="mt">
          <Field label={t('settings.language')} inline>
            <Segmented value={prefs.language} onChange={(v: Lang) => setPrefs({ language: v })} options={[{ value: 'en', label: 'English' }, { value: 'ka', label: 'ქართული' }]} />
          </Field>
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">{t('settings.player')}</div>
        <div className="list">
          <div className="settings-row"><span className="l">{t('settings.sounds')}<small>{t('settings.soundsHint')}</small></span><Toggle checked={prefs.sound} onChange={(v) => setPrefs({ sound: v })} /></div>
          <div className="settings-row"><span className="l">{t('settings.voiceCues')}<small>{t('settings.voiceCuesHint')}</small></span><Toggle checked={prefs.voice} onChange={(v) => setPrefs({ voice: v })} /></div>
          <div className="settings-row"><span className="l">{t('settings.keepAwake')}<small>{t('settings.keepAwakeHint')}</small></span><Toggle checked={prefs.keepAwake} onChange={(v) => setPrefs({ keepAwake: v })} /></div>
          <div className="settings-row"><span className="l">{t('settings.countdownCue')}</span><Segmented value={String(prefs.countdownSeconds) as '3' | '5' | '10'} onChange={(v) => setPrefs({ countdownSeconds: Number(v) })} options={[{ value: '3', label: '3 s' }, { value: '5', label: '5 s' }, { value: '10', label: '10 s' }]} /></div>
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">{t('settings.backup')}</div>
        <div className="small muted mb">{t('settings.backupHint')}</div>
        <div className="stack">
          <Button variant="secondary" full icon={<IconDownload size={18} />} disabled={busy} onClick={doExport}>{t('settings.exportBackup')}</Button>
          <Button variant="secondary" full icon={<IconUpload size={18} />} disabled={busy} onClick={() => fileRef.current?.click()}>{t('settings.restoreFromBackup')}</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e: { target: HTMLInputElement }) => { const f = e.target.files?.[0]; if (f) doImport(f); }} />
          <Button variant="ghost" full onClick={async () => { await restoreStarterContent(); toast(t('settings.starterRestored')); }}>{t('settings.readdStarter')}</Button>
          <Button variant="danger" full onClick={reset}>{t('settings.eraseAllData')}</Button>
        </div>
      </div>

      {!IS_STANDALONE && (
        <div className="settings-group">
          <div className="section-label">{t('settings.install')}</div>
          <div className="install-hint">
            {IS_IOS ? (
              <>
                <span><b>{t('settings.installIosTitle')}</b> {t('settings.installIosBody')}</span>
                <span>{t('settings.installIosStep1', { share: t('settings.share') })}</span>
                <span>{t('settings.installIosStep2', { addHome: t('settings.addToHomeScreen'), add: t('settings.add') })}</span>
                <span className="muted">{t('settings.installIosNote')}</span>
              </>
            ) : (
              <span>{t('settings.installOther', { share: t('settings.shareArrowAddHome') })}</span>
            )}
          </div>
        </div>
      )}

      <div className="small muted" style={{ textAlign: 'center', marginTop: 24 }}>{t('common.appTagline')}</div>
    </Screen>
  );
}
