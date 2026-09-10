import { useEffect, useRef, useState } from 'react';
import { get, put, saveBlob } from '../../lib/db.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import type { Exercise, ExerciseKind } from '../../lib/models.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, NumberInput, Screen, Segmented, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { DEMO_KEYS, Demo } from '../../ui/demos.js';
import { IconImage, IconTrash } from '../../ui/icons.js';

const MET_PRESETS: { label: string; met: number }[] = [
  { label: 'Stretching', met: 2.3 }, { label: 'Light (core, mobility)', met: 3 }, { label: 'Moderate (push-ups, rows)', met: 4 },
  { label: 'Squats / lunges', met: 5 }, { label: 'Vigorous (deadlift, step-ups)', met: 6 }, { label: 'High intensity (burpees, HIIT)', met: 8 }, { label: 'Very high (jump rope, sprints)', met: 11 },
];

function blank(): Exercise {
  const now = Date.now();
  return { id: uid('ex'), name: '', muscles: [], equipment: [], kind: 'reps', met: 4, secPerRep: 3, defaultAmount: 12, demo: { type: 'none' }, cues: [], isCustom: true, createdAt: now, updatedAt: now };
}

export function ExerciseEditScreen({ id }: { id?: string }) {
  const [ex, setEx] = useState<Exercise | null>(id ? null : blank());
  const [muscles, setMuscles] = useState('');
  const [equipment, setEquipment] = useState('');
  const [cues, setCues] = useState('');
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const existing = useBlobUrl(ex?.demo.type === 'blob' ? ex.demo.blobId : undefined);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
    if (!ex.name.trim()) { toast('Give the exercise a name'); return; }
    let demo = ex.demo;
    if (pending) {
      if (pending.size > 8 * 1024 * 1024) { toast('Please use a GIF/image under 8 MB'); return; }
      const blobId = await saveBlob(pending, pending.name);
      demo = { type: 'blob', blobId };
    }
    const final: Exercise = { ...ex, name: ex.name.trim(), muscles: split(muscles), equipment: split(equipment), cues: cues.split('\n').map((c) => c.trim()).filter(Boolean), demo, updatedAt: Date.now() };
    await put('exercises', final);
    toast('Saved');
    navigate(`/workouts/exercise/${final.id}`, { replace: true });
  };
  const cancel = async () => {
    if (!id && (ex.name || pending) && !(await confirmDialog({ title: 'Discard this exercise?', confirmLabel: 'Discard', danger: true }))) return;
    navigate(id ? `/workouts/exercise/${id}` : '/workouts/exercises', { replace: true });
  };

  const demoUrl = preview ?? existing;

  return (
    <Screen className="screen-no-tabs">
      <TopBar title={id ? 'Edit exercise' : 'New exercise'} onBack={cancel} right={<Button size="sm" onClick={save}>Save</Button>} />

      <Field label="Name"><TextInput value={ex.name} onChange={(v) => patch({ name: v })} placeholder="e.g. Goblet squat" autoFocus={!id} /></Field>
      <Field label="Muscles" hint="Comma separated: quads, glutes"><TextInput value={muscles} onChange={setMuscles} placeholder="quads, glutes, core" /></Field>
      <Field label="Equipment" hint="Leave empty for bodyweight"><TextInput value={equipment} onChange={setEquipment} placeholder="dumbbell" /></Field>

      <div className="section-label mt">Measured by</div>
      <Segmented value={ex.kind} onChange={(k: ExerciseKind) => patch({ kind: k, defaultAmount: k === 'time' ? 30 : 12 })} options={[{ value: 'reps', label: 'Reps' }, { value: 'time', label: 'Time' }]} />
      <div className="mt" />
      <Field label={ex.kind === 'time' ? 'Default duration' : 'Default reps'} inline><NumberInput value={ex.defaultAmount} min={1} max={3600} suffix={ex.kind === 'time' ? 's' : 'reps'} onChange={(v) => patch({ defaultAmount: v })} /></Field>
      {ex.kind === 'reps' && <Field label="Seconds per rep" inline hint="Used to estimate time and calories for rep-based sets."><NumberInput value={ex.secPerRep} min={0.5} max={30} suffix="s" onChange={(v) => patch({ secPerRep: v })} /></Field>}

      <div className="section-label mt">Intensity (MET)</div>
      <div className="small muted mb">kcal per minute ≈ MET × body weight (kg) ÷ 60.</div>
      <Field label="MET" inline><NumberInput value={ex.met} min={1} max={20} onChange={(v) => patch({ met: v })} /></Field>
      <div className="hstack wrap mb">
        {MET_PRESETS.map((p) => <button key={p.met} className={`chip ${ex.met === p.met ? 'chip-active' : ''}`} onClick={() => patch({ met: p.met })}>{p.label} · {p.met}</button>)}
      </div>

      <div className="section-label mt">Demo</div>
      <div className="small muted mb">Upload your own GIF or image, or pick a built-in animation.</div>
      <div className="demo-box demo-box-lg mb" onClick={() => fileRef.current?.click()} role="button">
        {demoUrl ? <img src={demoUrl} alt="" /> : ex.demo.type === 'builtin' ? <Demo demoKey={ex.demo.key} /> : <span className="hstack muted"><IconImage />Tap to upload a GIF / image</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e: { target: HTMLInputElement }) => { const f = e.target.files?.[0]; if (f) { setPending(f); } }} />
      <div className="hstack mb">
        <Button variant="secondary" size="sm" icon={<IconImage size={16} />} onClick={() => fileRef.current?.click()}>Upload GIF / image</Button>
        {(pending || ex.demo.type !== 'none') && <Button variant="ghost" size="sm" icon={<IconTrash size={16} />} onClick={() => { setPending(null); patch({ demo: { type: 'none' } }); }}>Remove</Button>}
      </div>
      <div className="exercise-grid mb">
        {DEMO_KEYS.map((k) => (
          <button key={k} className="exercise-tile" style={ex.demo.type === 'builtin' && ex.demo.key === k && !pending ? { borderColor: 'var(--workout)' } : undefined} onClick={() => { setPending(null); patch({ demo: { type: 'builtin', key: k } }); }}>
            <div className="demo-box" style={{ width: '100%', aspectRatio: '1.6' }}><Demo demoKey={k} animated={false} /></div>
            <div className="exercise-sub">{k.replace(/-/g, ' ')}</div>
          </button>
        ))}
      </div>

      <Field label="Form cues" hint="One per line — the first one is shown during the workout."><TextArea rows={3} value={cues} onChange={setCues} placeholder={'Chest up\nKnees over toes'} /></Field>

      <div className="stack mt">
        <Button size="lg" full onClick={save}>{id ? 'Save changes' : 'Create exercise'}</Button>
        <Button variant="ghost" full onClick={cancel}>Cancel</Button>
      </div>
    </Screen>
  );
}
