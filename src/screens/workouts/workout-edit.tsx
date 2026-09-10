import { useEffect, useMemo, useState } from 'react';
import { get, put } from '../../lib/db.js';
import { fmtDuration } from '../../lib/dates.js';
import { blockSeconds, estimateWorkout, kcalFor } from '../../lib/calories.js';
import { useProfile } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import type { Block, Exercise, Workout } from '../../lib/models.js';
import { useExerciseMap, useExercises } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, IconButton, Row, Screen, Segmented, Sheet, Stepper, TextArea, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconChevronDown, IconCopy, IconHourglass, IconPlus, IconRepeat, IconSearch, IconTrash } from '../../ui/icons.js';
import { ExerciseVisual } from './exercise-visual.js';

const COLORS = ['#F0532D', '#4C8BF5', '#2FAF6E', '#E9B52A', '#B76DE0', '#17160F'];

type Path = number[]; // index path into nested blocks

function blank(): Workout {
  const now = Date.now();
  return { id: uid('wo'), name: '', description: '', blocks: [], color: COLORS[0], createdAt: now, updatedAt: now };
}

function getAt(blocks: Block[], path: Path): Block | undefined {
  let list = blocks;
  let b: Block | undefined;
  for (const i of path) { b = list[i]; if (!b) return undefined; list = b.type === 'group' ? b.blocks : []; }
  return b;
}

function updateList(blocks: Block[], parent: Path, fn: (list: Block[]) => Block[]): Block[] {
  if (parent.length === 0) return fn(blocks);
  const [i, ...rest] = parent;
  return blocks.map((b, k) => (k === i && b.type === 'group' ? { ...b, blocks: updateList(b.blocks, rest, fn) } : b));
}

export function WorkoutEditScreen({ id }: { id?: string }) {
  const [profile] = useProfile();
  const exMap = useExerciseMap();
  const allExercises = useExercises();
  const [w, setW] = useState<Workout | null>(id ? null : blank());
  const [addingTo, setAddingTo] = useState<Path | null>(null);
  const [editing, setEditing] = useState<Path | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!id) return;
    get('workouts', id).then((x) => { if (x) setW(x); else navigate('/workouts', { replace: true }); });
  }, [id]);

  const est = useMemo(() => (w && exMap ? estimateWorkout(w, exMap, profile.weightKg) : null), [w, exMap, profile.weightKg]);

  if (!w || !exMap) return <Screen className="screen-no-tabs" />;

  const patch = (p: Partial<Workout>) => { setW({ ...w, ...p }); setDirty(true); };
  const setBlocks = (blocks: Block[]) => patch({ blocks });

  const addExercise = (ex: Exercise) => {
    if (addingTo === null) return;
    const block: Block = ex.kind === 'time' ? { id: uid('b'), type: 'exercise', exerciseId: ex.id, seconds: ex.defaultAmount } : { id: uid('b'), type: 'exercise', exerciseId: ex.id, reps: ex.defaultAmount };
    setBlocks(updateList(w.blocks, addingTo, (l) => [...l, block]));
    toast(`Added ${ex.name}`);
  };
  const addRest = (parent: Path) => setBlocks(updateList(w.blocks, parent, (l) => [...l, { id: uid('b'), type: 'rest', seconds: 20 }]));
  const addGroup = () => setBlocks([...w.blocks, { id: uid('b'), type: 'group', name: 'Circuit', rounds: 3, restBetweenRounds: 60, blocks: [] }]);

  const removeAt = (path: Path) => setBlocks(updateList(w.blocks, path.slice(0, -1), (l) => l.filter((_, i) => i !== path[path.length - 1])));
  const moveAt = (path: Path, dir: -1 | 1) => setBlocks(updateList(w.blocks, path.slice(0, -1), (l) => {
    const i = path[path.length - 1], j = i + dir;
    if (j < 0 || j >= l.length) return l;
    const copy = [...l]; [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  }));
  const duplicateAt = (path: Path) => setBlocks(updateList(w.blocks, path.slice(0, -1), (l) => {
    const i = path[path.length - 1];
    const b = l[i];
    const copy: Block = b.type === 'group' ? { ...b, id: uid('b'), blocks: b.blocks.map((x) => ({ ...x, id: uid('b') })) } : { ...b, id: uid('b') };
    return [...l.slice(0, i + 1), copy, ...l.slice(i + 1)];
  }));
  const replaceAt = (path: Path, nb: Block) => setBlocks(updateList(w.blocks, path.slice(0, -1), (l) => l.map((b, i) => (i === path[path.length - 1] ? nb : b))));

  const save = async () => {
    if (!w.name.trim()) { toast('Give the workout a name'); return; }
    await put('workouts', { ...w, name: w.name.trim(), updatedAt: Date.now() });
    toast('Saved');
    navigate(`/workouts/${w.id}`, { replace: true });
  };
  const cancel = async () => {
    if (dirty && !(await confirmDialog({ title: 'Discard changes?', confirmLabel: 'Discard', danger: true }))) return;
    navigate(id ? `/workouts/${id}` : '/workouts', { replace: true });
  };

  const renderBlock = (b: Block, path: Path) => {
    if (b.type === 'group') {
      const secs = blockSeconds(b, exMap);
      return (
        <div key={b.id} className="group">
          <button className="group-head" style={{ width: '100%' }} onClick={() => setEditing(path)}>
            <span className="hstack" style={{ gap: 8 }}><IconRepeat size={18} strokeWidth={2.4} />{b.name || 'Rounds'} · {b.rounds} {b.rounds === 1 ? 'round' : 'rounds'}</span>
            <span>{b.restBetweenRounds > 0 ? `${b.restBetweenRounds} s rest · ` : ''}{fmtDuration(secs)}</span>
          </button>
          <div className="group-body">
            {b.blocks.map((c, i) => renderBlock(c, [...path, i]))}
            <div className="addbar" style={{ margin: '4px 0 8px' }}>
              <button className="addslot" onClick={() => setAddingTo(path)}><IconPlus size={16} />Exercise</button>
              <button className="addslot" onClick={() => addRest(path)}><IconPlus size={16} />Rest</button>
            </div>
          </div>
        </div>
      );
    }
    const ex = b.type === 'exercise' ? exMap.get(b.exerciseId) : undefined;
    const secs = blockSeconds(b, exMap);
    return (
      <div key={b.id} className={`block ${b.type === 'rest' ? 'block-rest' : ''}`}>
        <button className="hstack" style={{ flex: 1, minWidth: 0, gap: 12 }} onClick={() => setEditing(path)}>
          {b.type === 'rest' ? <div className="demo-thumb" style={{ background: 'transparent' }}><IconHourglass size={20} className="muted" /></div> : <ExerciseVisual exercise={ex} animated={false} />}
          <div className="block-main">
            <div className="block-title" style={b.type === 'rest' ? { color: 'var(--muted)', fontSize: 14 } : undefined}>{b.type === 'rest' ? `Rest ${b.seconds} s` : ex?.name ?? 'Missing exercise'}</div>
            {b.type === 'exercise' && <div className="block-sub">{b.reps != null ? `${b.reps} reps · ~${secs} s` : `${b.seconds} s`} · ~{Math.round(kcalFor(ex?.met ?? 4, profile.weightKg, secs))} kcal</div>}
          </div>
        </button>
        <div className="block-actions">
          <IconButton label="Move up" onClick={() => moveAt(path, -1)}><IconChevronDown size={18} className="rot180" /></IconButton>
          <IconButton label="Move down" onClick={() => moveAt(path, 1)}><IconChevronDown size={18} /></IconButton>
        </div>
      </div>
    );
  };

  const editingBlock = editing ? getAt(w.blocks, editing) : undefined;

  return (
    <Screen className="screen-no-tabs">
      <TopBar title={id ? 'Edit workout' : 'New workout'} onBack={cancel} right={<Button size="sm" onClick={save}>Save</Button>} />

      <Field label="Name"><TextInput value={w.name} onChange={(v) => patch({ name: v })} placeholder="e.g. Full body circuit" autoFocus={!id} /></Field>
      <Field label="Description"><TextArea rows={2} value={w.description} onChange={(v) => patch({ description: v })} placeholder="Optional" /></Field>
      <Field label="Color">
        <div className="hstack">
          {COLORS.map((c) => <button key={c} aria-label={c} onClick={() => patch({ color: c })} style={{ width: 32, height: 32, borderRadius: 999, background: c, outline: w.color === c ? '3px solid var(--text)' : 'none', outlineOffset: 2 }} />)}
        </div>
      </Field>

      {est && (
        <div className="builder-stats">
          <div className="builder-stat" style={{ background: 'var(--inverse-bg)', color: 'var(--inverse-text)' }}><span className="v">{fmtDuration(est.seconds)}</span><span className="l" style={{ color: 'var(--inverse-muted)' }}>total time</span></div>
          <div className="builder-stat" style={{ background: 'var(--workout-soft)', color: 'var(--workout-strong)' }}><span className="v">~{Math.round(est.kcal)}</span><span className="l">kcal at {profile.weightKg} kg</span></div>
          <div className="builder-stat" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}><span className="v">{est.steps}</span><span className="l muted">steps</span></div>
        </div>
      )}

      {w.blocks.map((b, i) => renderBlock(b, [i]))}
      {w.blocks.length === 0 && <div className="empty" style={{ padding: '20px 0' }}><div className="empty-text">Add exercises, rests, or a group of rounds (a circuit).</div></div>}

      <div className="addbar">
        <button className="addslot" onClick={() => setAddingTo([])}><IconPlus size={16} />Exercise</button>
        <button className="addslot" onClick={() => addRest([])}><IconPlus size={16} />Rest</button>
        <button className="addslot" onClick={addGroup}><IconPlus size={16} />Rounds</button>
      </div>

      <div className="stack">
        <Button size="lg" full onClick={save}>{id ? 'Save changes' : 'Create workout'}</Button>
        <Button variant="ghost" full onClick={cancel}>Cancel</Button>
      </div>

      <ExercisePicker open={addingTo !== null} onClose={() => setAddingTo(null)} exercises={allExercises ?? []} onPick={addExercise} />

      <Sheet open={!!editingBlock} onClose={() => setEditing(null)} title={editingBlock?.type === 'group' ? 'Rounds' : editingBlock?.type === 'rest' ? 'Rest' : exMap.get((editingBlock as { exerciseId?: string })?.exerciseId ?? '')?.name}
        footer={editing ? (
          <>
            <Button variant="secondary" icon={<IconCopy size={18} />} onClick={() => { duplicateAt(editing); setEditing(null); }}>Duplicate</Button>
            <Button variant="danger" icon={<IconTrash size={18} />} onClick={() => { removeAt(editing); setEditing(null); }}>Remove</Button>
          </>
        ) : undefined}>
        {editing && editingBlock && <BlockEditor block={editingBlock} exercise={editingBlock.type === 'exercise' ? exMap.get(editingBlock.exerciseId) : undefined} onChange={(nb) => replaceAt(editing, nb)} />}
      </Sheet>
      <style>{'.rot180 { transform: rotate(180deg); }'}</style>
    </Screen>
  );
}

function BlockEditor({ block, exercise, onChange }: { block: Block; exercise?: Exercise; onChange: (b: Block) => void }) {
  if (block.type === 'rest') {
    return (
      <div className="stack">
        <div className="spread"><span className="bold">Duration</span><Stepper value={block.seconds} min={5} max={600} step={5} format={(v) => `${v} s`} onChange={(v) => onChange({ ...block, seconds: v })} /></div>
        <div className="hstack wrap">{[10, 15, 20, 30, 45, 60, 90].map((s) => <button key={s} className={`chip ${block.seconds === s ? 'chip-active' : ''}`} onClick={() => onChange({ ...block, seconds: s })}>{s} s</button>)}</div>
      </div>
    );
  }
  if (block.type === 'group') {
    return (
      <div className="stack">
        <Field label="Name"><TextInput value={block.name ?? ''} onChange={(v) => onChange({ ...block, name: v })} placeholder="Circuit" /></Field>
        <div className="spread"><span className="bold">Rounds</span><Stepper value={block.rounds} min={1} max={20} onChange={(v) => onChange({ ...block, rounds: v })} /></div>
        <div className="spread"><span className="bold">Rest between rounds</span><Stepper value={block.restBetweenRounds} min={0} max={600} step={5} format={(v) => `${v} s`} onChange={(v) => onChange({ ...block, restBetweenRounds: v })} /></div>
      </div>
    );
  }
  const mode: 'time' | 'reps' = block.reps != null ? 'reps' : 'time';
  return (
    <div className="stack">
      {exercise && <div style={{ alignSelf: 'center' }}><ExerciseVisual exercise={exercise} size="box" /></div>}
      <Segmented value={mode} onChange={(m) => onChange(m === 'reps' ? { id: block.id, type: 'exercise', exerciseId: block.exerciseId, reps: exercise?.kind === 'reps' ? exercise.defaultAmount : 10 } : { id: block.id, type: 'exercise', exerciseId: block.exerciseId, seconds: exercise?.kind === 'time' ? exercise.defaultAmount : 30 })} options={[{ value: 'time', label: 'For time' }, { value: 'reps', label: 'For reps' }]} />
      {mode === 'time' ? (
        <>
          <div className="spread"><span className="bold">Duration</span><Stepper value={block.seconds ?? 30} min={5} max={3600} step={5} format={(v) => `${v} s`} onChange={(v) => onChange({ ...block, seconds: v })} /></div>
          <div className="hstack wrap">{[20, 30, 40, 45, 60, 90, 120].map((s) => <button key={s} className={`chip ${block.seconds === s ? 'chip-active' : ''}`} onClick={() => onChange({ ...block, seconds: s })}>{s} s</button>)}</div>
        </>
      ) : (
        <>
          <div className="spread"><span className="bold">Reps</span><Stepper value={block.reps ?? 10} min={1} max={500} onChange={(v) => onChange({ ...block, reps: v })} /></div>
          <div className="small muted">Timed at ~{exercise?.secPerRep ?? 3} s per rep (edit the exercise to change).</div>
        </>
      )}
    </div>
  );
}

export function ExercisePicker({ open, onClose, exercises, onPick }: { open: boolean; onClose: () => void; exercises: Exercise[]; onPick: (e: Exercise) => void }) {
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const list = exercises.filter((e) => !ql || e.name.toLowerCase().includes(ql) || e.muscles.some((m) => m.includes(ql)));
  return (
    <Sheet open={open} onClose={onClose} title="Add exercise" full footer={<Button variant="secondary" onClick={onClose}>Done</Button>}>
      <div className="searchbar">
        <IconSearch size={18} />
        <input className="input" placeholder="Search exercises" value={q} onChange={(e: { target: HTMLInputElement }) => setQ(e.target.value)} />
      </div>
      <div className="list">
        {list.map((e) => (
          <Row key={e.id} onClick={() => onPick(e)} right={<IconPlus className="c-workout" />}>
            <ExerciseVisual exercise={e} animated={false} />
            <div className="row-main">
              <div className="row-title">{e.name}</div>
              <div className="row-sub">{e.kind === 'time' ? `${e.defaultAmount} s` : `${e.defaultAmount} reps`} · {e.muscles.join(', ')}</div>
            </div>
          </Row>
        ))}
        {list.length === 0 && <div className="empty"><div className="empty-text">No exercises match.</div></div>}
      </div>
      <Button variant="secondary" full className="mt" icon={<IconPlus size={18} />} onClick={() => { onClose(); navigate('/workouts/exercise/new'); }}>Create a custom exercise</Button>
    </Sheet>
  );
}
