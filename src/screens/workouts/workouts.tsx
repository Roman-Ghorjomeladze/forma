import { useMemo, useRef, useState } from 'react';
import { bulkPut, remove } from '../../lib/db.js';
import { fmtDuration, weekdayName } from '../../lib/dates.js';
import { estimateWorkout } from '../../lib/calories.js';
import { localizedWorkoutName } from '../../data/seed-i18n.js';
import { useProfile } from '../../lib/hooks.js';
import { useLang, useT } from '../../lib/i18n.js';
import type { Workout } from '../../lib/models.js';
import { useExerciseMap, useSchedule, useSessions, useWorkouts } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { applyImport, parseShareFile, planImport, shareWorkouts, type ImportPlan } from '../../lib/workout-share.js';
import { Button, Card, Empty, IconButton, Row, Screen, Section, Segmented, Sheet, TopBar } from '../../ui/components.js';
import { toast } from '../../ui/dialogs.js';
import { IconCheck, IconChevron, IconDumbbell, IconHistory, IconPlus, IconShare, IconStar, IconUpload } from '../../ui/icons.js';

export function WorkoutsScreen() {
  const t = useT();
  const lang = useLang();
  const [profile] = useProfile();
  const workouts = useWorkouts();
  const exercises = useExerciseMap();
  const schedule = useSchedule();
  const sessions = useSessions(50);
  const [pickDay, setPickDay] = useState<number | null>(null);

  // multi-select for bulk export
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // import
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [importSel, setImportSel] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState<'update' | 'copy'>('update');

  const order = profile.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const byDay = useMemo(() => new Map((schedule ?? []).map((s) => [s.weekday, s.workoutId])), [schedule]);
  const todayWd = new Date().getDay();
  const weekKcal = useMemo(() => {
    const since = Date.now() - 7 * 86400e3;
    return Math.round((sessions ?? []).filter((s) => s.startedAt >= since).reduce((a, s) => a + s.kcal, 0));
  }, [sessions]);

  const setDay = async (weekday: number, workoutId: string | null) => {
    if (workoutId) await bulkPut('schedule', [{ weekday, workoutId }]);
    else await remove('schedule', weekday);
    setPickDay(null);
  };

  const stopSelecting = () => { setSelecting(false); setSelected(new Set()); };
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => setSelected(new Set((workouts ?? []).map((w) => w.id)));

  const shareSelected = async () => {
    const list = (workouts ?? []).filter((w) => selected.has(w.id));
    if (list.length === 0) return;
    setBusy(true);
    try {
      const title = list.length === 1 ? t('workouts.shareTitleOne', { name: localizedWorkoutName(list[0].id, list[0].name, lang) }) : t('workouts.shareTitleMany', { n: list.length });
      const how = await shareWorkouts(list, title);
      if (how === 'shared') { toast(t('workouts.shareReady')); stopSelecting(); }
      else if (how === 'downloaded') { toast(t('workouts.shareDownloaded')); stopSelecting(); }
    } catch (e) { toast(t('workouts.shareFailed')); console.error(e); } finally { setBusy(false); }
  };

  const openImport = async (file: File) => {
    setBusy(true);
    try {
      const parsed = parseShareFile(await file.text());
      const p = await planImport(parsed);
      setPlan(p);
      setImportSel(new Set(p.file.workouts.map((w) => w.id)));
      setImportMode('update');
    } catch (e) { toast(t('workouts.notShareFile')); console.error(e); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const toggleImport = (id: string) => setImportSel((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const confirmImport = async () => {
    if (!plan || importSel.size === 0) return;
    setBusy(true);
    try {
      const r = await applyImport(plan, importSel, importMode);
      toast(t('workouts.importDone', { n: r.added + r.updated }));
      setPlan(null);
    } catch (e) { toast(t('workouts.shareFailed')); console.error(e); } finally { setBusy(false); }
  };

  const estimateOf = (w: Workout) => (exercises ? estimateWorkout(w, exercises, profile.weightKg) : null);
  const hasWorkouts = (workouts?.length ?? 0) > 0;
  const importNeedsMode = plan ? plan.file.workouts.some((w) => plan.existing.has(w.id) && importSel.has(w.id)) : false;

  return (
    <Screen>
      <TopBar large title={t('workouts.title')} eyebrow={weekKcal > 0 ? t('workouts.kcalBurnedThisWeek', { n: weekKcal }) : t('workouts.countWorkouts', { n: workouts?.length ?? 0 })}
        right={<>
          <IconButton label={t('workouts.history')} onClick={() => navigate('/forma/workouts/history')}><IconHistory size={20} /></IconButton>
          <IconButton label={t('workouts.exerciseLibrary')} onClick={() => navigate('/forma/workouts/exercises')}><IconStar size={20} /></IconButton>
          <IconButton label={t('workouts.newWorkout')} tone="accent" onClick={() => navigate('/forma/workouts/new')}><IconPlus /></IconButton>
        </>} />

      <Section title={t('workouts.weeklySchedule')} right={<span>{t('workouts.tapDayToAssign')}</span>}>
        <div className="calendar-week">
          {order.map((wd) => {
            const w = workouts?.find((x) => x.id === byDay.get(wd));
            return (
              <button key={wd} className={w ? 'has' : ''} style={wd === todayWd ? { background: 'var(--surface-2)' } : undefined} onClick={() => setPickDay(wd)}>
                <span>{weekdayName(wd)}</span>
                {w ? <><span className="sched-swatch" style={{ background: w.color }} /><span className="w">{localizedWorkoutName(w.id, w.name, lang)}</span></> : <span className="w muted" style={{ fontWeight: 500 }}>—</span>}
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title={selecting ? t('workouts.nSelected', { n: selected.size }) : t('workouts.myWorkouts')}
        right={selecting ? (
          <>
            <button className="c-workout" onClick={selectAll}>{t('workouts.selectAll')}</button>
            <button className="muted" onClick={stopSelecting}>{t('common.cancel')}</button>
          </>
        ) : (
          <>
            <button className="c-workout" onClick={() => fileRef.current?.click()}>{t('workouts.import')}</button>
            {hasWorkouts && <button className="c-workout" onClick={() => setSelecting(true)}>{t('workouts.select')}</button>}
          </>
        )}
      >
        {workouts && workouts.length === 0 ? (
          <Empty icon={<IconDumbbell size={40} />} title={t('workouts.noWorkoutsYet')} text={t('workouts.noWorkoutsHint')} action={
            <div className="hstack wrap" style={{ justifyContent: 'center' }}>
              <Button icon={<IconPlus size={18} />} onClick={() => navigate('/forma/workouts/new')}>{t('workouts.newWorkout')}</Button>
              <Button variant="secondary" icon={<IconUpload size={18} />} onClick={() => fileRef.current?.click()}>{t('workouts.import')}</Button>
            </div>
          } />
        ) : (
          <div className="stack" style={selecting ? { marginBottom: 100 } : undefined}>
            {(workouts ?? []).map((w) => {
              const est = estimateOf(w);
              const on = selected.has(w.id);
              return (
                <Card key={w.id} onClick={() => (selecting ? toggle(w.id) : navigate(`/forma/workouts/${w.id}`))} className={selecting && on ? 'card-selected' : ''}>
                  <div className="workout-card">
                    {selecting ? <span className={`check ${on ? 'on' : ''}`} style={on ? { background: 'var(--workout)', borderColor: 'var(--workout)' } : undefined}>{on && <IconCheck size={14} strokeWidth={3} />}</span> : <span className="workout-color" style={{ background: w.color }} />}
                    <div className="row-main">
                      <div className="row-title">{localizedWorkoutName(w.id, w.name, lang)}</div>
                      <div className="row-sub">{est ? `${fmtDuration(est.seconds)} · ${est.exercises} ${t('unit.exercises')} · ~${Math.round(est.kcal)} ${t('unit.kcal')}` : ''}</div>
                    </div>
                    {!selecting && <Button size="sm" onClick={() => navigate(`/forma/workouts/${w.id}/play`)}>{t('today.start')}</Button>}
                    {!selecting && <IconChevron className="muted" />}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e: { target: HTMLInputElement }) => { const f = e.target.files?.[0]; if (f) openImport(f); }} />

      {selecting && (
        <div className="sticky-cta sticky-cta-above-tabs">
          <Button size="lg" full icon={<IconShare size={20} />} disabled={busy || selected.size === 0} onClick={shareSelected}>
            {selected.size === 0 ? t('workouts.selectHint') : t('workouts.shareCount', { n: selected.size })}
          </Button>
        </div>
      )}

      <Sheet open={pickDay !== null} onClose={() => setPickDay(null)} title={pickDay !== null ? `${weekdayName(pickDay, true)}` : ''}>
        <div className="list">
          {(workouts ?? []).map((w) => (
            <Row key={w.id} onClick={() => pickDay !== null && setDay(pickDay, w.id)} right={pickDay !== null && byDay.get(pickDay) === w.id ? <span className="c-workout">{t('workouts.assigned')}</span> : undefined}>
              <span className="sched-swatch" style={{ background: w.color, width: 12, height: 12 }} />
              <div className="row-main"><div className="row-title">{localizedWorkoutName(w.id, w.name, lang)}</div></div>
            </Row>
          ))}
          <Row onClick={() => pickDay !== null && setDay(pickDay, null)}><div className="row-main"><div className="row-title muted">{t('workouts.restDayNothing')}</div></div></Row>
        </div>
      </Sheet>

      <Sheet open={plan !== null} onClose={() => setPlan(null)} title={t('workouts.importTitle')}
        footer={<Button size="lg" disabled={busy || importSel.size === 0} icon={<IconUpload size={18} />} onClick={confirmImport}>{t('workouts.importButton', { n: importSel.size })}</Button>}>
        {plan && (
          <>
            <div className="small muted mb">{t('workouts.importPreviewHint')}</div>
            <div className="list mb">
              {plan.file.workouts.map((w) => {
                const on = importSel.has(w.id);
                const est = estimateOf(w);
                const exists = plan.existing.has(w.id);
                return (
                  <Row key={w.id} onClick={() => toggleImport(w.id)} right={<span className={`tag ${exists ? '' : 'tag-workout'}`}>{exists ? t('workouts.importExisting') : t('workouts.importNew')}</span>}>
                    <span className={`check ${on ? 'on' : ''}`} style={on ? { background: 'var(--workout)', borderColor: 'var(--workout)' } : undefined}>{on && <IconCheck size={14} strokeWidth={3} />}</span>
                    <span className="sched-swatch" style={{ background: w.color, width: 12, height: 12 }} />
                    <div className="row-main">
                      <div className="row-title">{w.name}</div>
                      <div className="row-sub">{est ? `${fmtDuration(est.seconds)} · ${est.exercises} ${t('unit.exercises')}` : ''}</div>
                    </div>
                  </Row>
                );
              })}
            </div>
            {importNeedsMode && (
              <div className="mb">
                <div className="section-label" style={{ marginBottom: 8 }}>{t('workouts.importExistingMode')}</div>
                <Segmented value={importMode} onChange={setImportMode} options={[{ value: 'update', label: t('workouts.importReplace') }, { value: 'copy', label: t('workouts.importKeepBoth') }]} />
              </div>
            )}
            {plan.missingExercises.length > 0 && <div className="small muted mb">{t('workouts.importExercisesNote', { n: plan.missingExercises.length })}</div>}
            {plan.unresolvable.size > 0 && <div className="small muted mb">{t('workouts.importUnresolvable', { n: plan.unresolvable.size })}</div>}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
