import { useEffect, useRef, useState } from 'react';
import { get, put, saveBlob } from '../../lib/db.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { useT } from '../../lib/i18n.js';
import type { Exercise, ExerciseKind } from '../../lib/models.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, NumberInput, Screen, Segmented, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { DEMO_KEYS, Demo } from '../../ui/demos.js';
import { IconImage, IconTrash } from '../../ui/icons.js';

const MET_PRESET_DEFS: { labelKey: string; met: number }[] = [
  { labelKey: 'exercise.met.stretching', met: 2.3 }, { labelKey: 'exercise.met.light', met: 3 }, { labelKey: 'exercise.met.moderate', met: 4 },
  { labelKey: 'exercise.met.squats', met: 5 }, { labelKey: 'exercise.met.vigorous', met: 6 }, { labelKey: 'exercise.met.high', met: 8 }, { labelKey: 'exercise.met.veryHigh', met: 11 },
];

function blank(): Exercise {
  const now = Date.now();
  return { id: uid('ex'), name: '', muscles: [], equipment: [], kind: 'reps', met: 4, secPerRep: 3, defaultAmount: 12, demo: { type: 'none' }, cues: [], isCustom: true, createdAt: now, updatedAt: now };
}

export function ExerciseEditScreen({ id }: { id?: string }) {
  const t = useT();
  const [ex, setEx] = useState<Exercise | null>(id ? null : blank());
  const [muscles, setMuscles] = useState('');
  const [equipment, setEquipment] = useState('');
  const [cues, setCues] = useState('');
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const existing = useBlobUrl(ex?.demo.type === 'blob' ? ex.demo.blobId : undefined);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const MET_PRESETS = MET_PRESET_DEFS.map((p) => ({ ...p, label: t(p.labelKey) }));

  useEffect(() => {
    if (!id) return;
    get('exercises', id).then((e) => {
      if (!e) { navigate('/workouts/exercises', { replace: true }); return; }
      setEx(e); setMuscles(e.muscles.join(', ')); setEquipment(e.equipment.join(', ')); setCues(e.cues.join('\n'));
    });
  }, [id]);

  useEffect(() => {
    if (!pending) { setPreview(undefined); return; }
    const u = URL.createObjectURL(pending);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [pending]);

  if (!ex) return <Screen className="screen-no-tabs" />;
  const patch = (p: Partial<Exercise>) => setEx({ ...ex, ...p });
  const split = (s: string) => s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

  const save = async () => {
    if (!ex.name.trim()) { toast(t('exercise.giveItAName')); return; }
    let demo = ex.demo;
    if (pending) {
      if (pending.size > 8 * 1024 * 1024) { toast(t('exercise.gifTooBig')); return; }
      const blobId = await saveBlob(pending, pending.name);
      demo = { type: 'blob', blobId };
    }
    const final: Exercise = { ...ex, name: ex.name.trim(), muscles: split(muscles), equipment: split(equipment), cues: cues.split('\n').map((c) => c.trim()).filter(Boolean), demo, updatedAt: Date.now() };
    await put('exercises', final);
    toast(t('common.saved'));
    navigate(`/workouts/exercise/${final.id}`, { replace: true });
  };
  const cancel = async () => {
    if (!id && (ex.name || pending) && !(await confirmDialog({ title: t('exercise.discardTitle'), confirmLabel: t('common.discard'), danger: true }))) return;
    navigate(id ? `/workouts/exercise/${id}` : '/workouts/exercises', { replace: true });
  };

  const demoUrl = preview ?? existing;

  return (
    <Screen className="screen-no-tabs">
      <TopBar title={id ? t('exercise.editTitle') : t('exercise.newTitle')} onBack={cancel} right={<Button size="sm" onClick={save}>{t('common.save')}</Button>} />

      <Field label={t('exercise.name')}><TextInput value={ex.name} onChange={(v) => patch({ name: v })} placeholder={t('exercise.namePlaceholder')} autoFocus={!id} /></Field>
      <Field label={t('exercise.muscles')} hint={t('exercise.musclesHint')}><TextInput value={muscles} onChange={setMuscles} placeholder={t('exercise.musclesPlaceholder')} /></Field>
      <Field label={t('exercise.equipment')} hint={t('exercise.equipmentHint')}><TextInput value={equipment} onChange={setEquipment} placeholder={t('exercise.equipmentPlaceholder')} /></Field>

      <div className="section-label mt">{t('exercise.measuredBy')}</div>
      <Segmented value={ex.kind} onChange={(k: ExerciseKind) => patch({ kind: k, defaultAmount: k === 'time' ? 30 : 12 })} options={[{ value: 'reps', label: t('exercise.reps') }, { value: 'time', label: t('exercise.time') }]} />
      <div className="mt" />
      <Field label={ex.kind === 'time' ? t('exercise.defaultDuration') : t('exercise.defaultRepsField')} inline><NumberInput value={ex.defaultAmount} min={1} max={3600} suffix={ex.kind === 'time' ? t('unit.s') : t('unit.reps')} onChange={(v) => patch({ defaultAmount: v })} /></Field>
      {ex.kind === 'reps' && <Field label={t('exercise.secPerRep')} inline hint={t('exercise.secPerRepHint')}><NumberInput value={ex.secPerRep} min={0.5} max={30} suffix={t('unit.s')} onChange={(v) => patch({ secPerRep: v })} /></Field>}

      <div className="section-label mt">{t('exercise.intensity')}</div>
      <div className="small muted mb">{t('exercise.intensityHint')}</div>
      <Field label="MET" inline><NumberInput value={ex.met} min={1} max={20} onChange={(v) => patch({ met: v })} /></Field>
      <div className="hstack wrap mb">
        {MET_PRESETS.map((p) => <button key={p.met} className={`chip ${ex.met === p.met ? 'chip-active' : ''}`} onClick={() => patch({ met: p.met })}>{p.label} · {p.met}</button>)}
      </div>

      <div className="section-label mt">{t('exercise.demo')}</div>
      <div className="small muted mb">{t('exercise.demoHint')}</div>
      <div className="demo-box demo-box-lg mb" onClick={() => fileRef.current?.click()} role="button">
        {demoUrl ? <img src={demoUrl} alt="" /> : ex.demo.type === 'builtin' ? <Demo demoKey={ex.demo.key} /> : <span className="hstack muted"><IconImage />{t('exercise.tapToUpload')}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e: { target: HTMLInputElement }) => { const f = e.target.files?.[0]; if (f) { setPending(f); } }} />
      <div className="hstack mb">
        <Button variant="secondary" size="sm" icon={<IconImage size={16} />} onClick={() => fileRef.current?.click()}>{t('exercise.uploadGif')}</Button>
        {(pending || ex.demo.type !== 'none') && <Button variant="ghost" size="sm" icon={<IconTrash size={16} />} onClick={() => { setPending(null); patch({ demo: { type: 'none' } }); }}>{t('common.remove')}</Button>}
      </div>
      <div className="exercise-grid mb">
        {DEMO_KEYS.map((k) => (
          <button key={k} className="exercise-tile" style={ex.demo.type === 'builtin' && ex.demo.key === k && !pending ? { borderColor: 'var(--workout)' } : undefined} onClick={() => { setPending(null); patch({ demo: { type: 'builtin', key: k } }); }}>
            <div className="demo-box" style={{ width: '100%', aspectRatio: '1.6' }}><Demo demoKey={k} animated={false} /></div>
            <div className="exercise-sub">{k.replace(/-/g, ' ')}</div>
          </button>
        ))}
      </div>

      <Field label={t('exercise.formCues')} hint={t('exercise.formCuesHint')}><TextArea rows={3} value={cues} onChange={setCues} placeholder={'Chest up\nKnees over toes'} /></Field>

      <div className="stack mt">
        <Button size="lg" full onClick={save}>{id ? t('common.saveChanges') : t('exercise.createExercise')}</Button>
        <Button variant="ghost" full onClick={cancel}>{t('common.cancel')}</Button>
      </div>
    </Screen>
  );
}
