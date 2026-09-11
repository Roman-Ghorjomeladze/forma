import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { get, put } from '../../lib/db.js';
import { fmtDuration } from '../../lib/dates.js';
import { blockSeconds, estimateWorkout, kcalFor } from '../../lib/calories.js';
import { EXERCISE_GROUP_DEFS } from '../../data/exercise-groups.js';
import { localizedExerciseName } from '../../data/seed-i18n.js';
import { useProfile } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { useLang, useT } from '../../lib/i18n.js';
import type { Block, Exercise, Workout } from '../../lib/models.js';
import { useExerciseMap, useExercises } from '../../lib/queries.js';
import { navigate } from '../../lib/router.js';
import { Button, Chip, Field, IconButton, Row, Screen, Segmented, Sheet, Stepper, TextArea, TextInput, TopBar } from '../../ui/components.js';
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
  const t = useT();
  const lang = useLang();
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
    toast(t('common.addedName', { name: localizedExerciseName(ex.id, ex.name, lang) }));
  };
  const addRest = (parent: Path) => setBlocks(updateList(w.blocks, parent, (l) => [...l, { id: uid('b'), type: 'rest', seconds: 20 }]));
  const addGroup = () => setBlocks([...w.blocks, { id: uid('b'), type: 'group', name: t('workouts.circuitDefault'), rounds: 3, restBetweenRounds: 60, blocks: [] }]);

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
    if (!w.name.trim()) { toast(t('workouts.giveItAName')); return; }
    await put('workouts', { ...w, name: w.name.trim(), updatedAt: Date.now() });
    toast(t('common.saved'));
    navigate(`/workouts/${w.id}`, { replace: true });
  };
  const cancel = async () => {
    if (dirty && !(await confirmDialog({ title: t('workouts.discardChangesTitle'), confirmLabel: t('common.discard'), danger: true }))) return;
    navigate(id ? `/workouts/${id}` : '/workouts', { replace: true });
  };

  const renderBlock = (b: Block, path: Path) => {
    if (b.type === 'group') {
      const secs = blockSeconds(b, exMap);
      return (
        <div key={b.id} className="group">
          <button className="group-head" style={{ width: '100%' }} onClick={() => setEditing(path)}>
            <span className="hstack" style={{ gap: 8 }}><IconRepeat size={18} strokeWidth={2.4} />{b.name || t('workouts.circuitDefault')} · {b.rounds} {b.rounds === 1 ? t('unit.round') : t('unit.rounds')}</span>
            <span>{b.restBetweenRounds > 0 ? `${b.restBetweenRounds} ${t('unit.s')} ${t('workouts.rest').toLowerCase()} · ` : ''}{fmtDuration(secs)}</span>
          </button>
          <div className="group-body">
            {b.blocks.map((c, i) => renderBlock(c, [...path, i]))}
            <div className="addbar" style={{ margin: '4px 0 8px' }}>
              <button className="addslot" onClick={() => setAddingTo(path)}><IconPlus size={16} />{t('workouts.exercise')}</button>
              <button className="addslot" onClick={() => addRest(path)}><IconPlus size={16} />{t('workouts.rest')}</button>
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
            <div className="block-title" style={b.type === 'rest' ? { color: 'var(--muted)', fontSize: 14 } : undefined}>{b.type === 'rest' ? `${t('workouts.rest')} ${b.seconds} ${t('unit.s')}` : ex ? localizedExerciseName(ex.id, ex.name, lang) : t('workouts.missingExercise')}</div>
            {b.type === 'exercise' && <div className="block-sub">{b.reps != null ? `${b.reps} ${t('unit.reps')} · ~${secs} ${t('unit.s')}` : `${b.seconds} ${t('unit.s')}`} · ~{Math.round(kcalFor(ex?.met ?? 4, profile.weightKg, secs))} {t('unit.kcal')}</div>}
          </div>
        </button>
        <div className="block-actions">
          <IconButton label={t('workouts.moveUp')} onClick={() => moveAt(path, -1)}><IconChevronDown size={18} className="rot180" /></IconButton>
          <IconButton label={t('workouts.moveDown')} onClick={() => moveAt(path, 1)}><IconChevronDown size={18} /></IconButton>
        </div>
      </div>
    );
  };

  const editingBlock = editing ? getAt(w.blocks, editing) : undefined;

  return (
    <Screen className="screen-no-tabs">
      <TopBar title={id ? t('workouts.editWorkoutTitle') : t('workouts.newWorkoutTitle')} onBack={cancel} right={<Button size="sm" onClick={save}>{t('common.save')}</Button>} />

      <Field label={t('workouts.name')}><TextInput value={w.name} onChange={(v) => patch({ name: v })} placeholder={t('workouts.namePlaceholder')} autoFocus={!id} /></Field>
      <Field label={t('workouts.description')}><TextArea rows={2} value={w.description} onChange={(v) => patch({ description: v })} placeholder={t('common.optional')} /></Field>
      <Field label={t('workouts.color')}>
        <div className="hstack">
          {COLORS.map((c) => <button key={c} aria-label={c} onClick={() => patch({ color: c })} style={{ width: 32, height: 32, borderRadius: 999, background: c, outline: w.color === c ? '3px solid var(--text)' : 'none', outlineOffset: 2 }} />)}
        </div>
      </Field>

      {est && (
        <div className="builder-stats">
          <div className="builder-stat" style={{ background: 'var(--inverse-bg)', color: 'var(--inverse-text)' }}><span className="v">{fmtDuration(est.seconds)}</span><span className="l" style={{ color: 'var(--inverse-muted)' }}>{t('workouts.totalTime')}</span></div>
          <div className="builder-stat" style={{ background: 'var(--workout-soft)', color: 'var(--workout-strong)' }}><span className="v">~{Math.round(est.kcal)}</span><span className="l">{t('workouts.kcalAtWeight', { kg: profile.weightKg })}</span></div>
          <div className="builder-stat" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}><span className="v">{est.steps}</span><span className="l muted">{t('workouts.steps')}</span></div>
        </div>
      )}

      {w.blocks.map((b, i) => renderBlock(b, [i]))}
      {w.blocks.length === 0 && <div className="empty" style={{ padding: '20px 0' }}><div className="empty-text">{t('workouts.addExercisesHint')}</div></div>}

      <div className="addbar">
        <button className="addslot" onClick={() => setAddingTo([])}><IconPlus size={16} />{t('workouts.exercise')}</button>
        <button className="addslot" onClick={() => addRest([])}><IconPlus size={16} />{t('workouts.rest')}</button>
        <button className="addslot" onClick={addGroup}><IconPlus size={16} />{t('workouts.rounds')}</button>
      </div>

      <div className="stack">
        <Button size="lg" full onClick={save}>{id ? t('common.saveChanges') : t('workouts.createWorkout')}</Button>
        <Button variant="ghost" full onClick={cancel}>{t('common.cancel')}</Button>
      </div>

      <ExercisePicker open={addingTo !== null} onClose={() => setAddingTo(null)} exercises={allExercises ?? []} onPick={addExercise} />

      <Sheet open={!!editingBlock} onClose={() => setEditing(null)} title={editingBlock?.type === 'group' ? t('workouts.rounds') : editingBlock?.type === 'rest' ? t('workouts.rest') : (() => { const eb = exMap.get((editingBlock as { exerciseId?: string })?.exerciseId ?? ''); return eb ? localizedExerciseName(eb.id, eb.name, lang) : undefined; })()}
        footer={editing ? (
          <>
            <Button variant="secondary" icon={<IconCopy size={18} />} onClick={() => { duplicateAt(editing); setEditing(null); }}>{t('common.duplicate')}</Button>
            <Button variant="danger" icon={<IconTrash size={18} />} onClick={() => { removeAt(editing); setEditing(null); }}>{t('common.remove')}</Button>
          </>
        ) : undefined}>
        {editing && editingBlock && <BlockEditor block={editingBlock} exercise={editingBlock.type === 'exercise' ? exMap.get(editingBlock.exerciseId) : undefined} onChange={(nb) => replaceAt(editing, nb)} />}
      </Sheet>
      <style>{'.rot180 { transform: rotate(180deg); }'}</style>
    </Screen>
  );
}

function BlockEditor({ block, exercise, onChange }: { block: Block; exercise?: Exercise; onChange: (b: Block) => void }) {
  const t = useT();
  if (block.type === 'rest') {
    return (
      <div className="stack">
        <div className="spread"><span className="bold">{t('workouts.duration')}</span><Stepper value={block.seconds} min={5} max={600} step={5} format={(v) => `${v} ${t('unit.s')}`} onChange={(v) => onChange({ ...block, seconds: v })} /></div>
        <div className="hstack wrap">{[10, 15, 20, 30, 45, 60, 90].map((s) => <button key={s} className={`chip ${block.seconds === s ? 'chip-active' : ''}`} onClick={() => onChange({ ...block, seconds: s })}>{s} {t('unit.s')}</button>)}</div>
      </div>
    );
  }
  if (block.type === 'group') {
    return (
      <div className="stack">
        <Field label={t('workouts.name')}><TextInput value={block.name ?? ''} onChange={(v) => onChange({ ...block, name: v })} placeholder={t('workouts.circuitDefault')} /></Field>
        <div className="spread"><span className="bold">{t('workouts.rounds')}</span><Stepper value={block.rounds} min={1} max={20} onChange={(v) => onChange({ ...block, rounds: v })} /></div>
        <div className="spread"><span className="bold">{t('workouts.restBetweenRounds')}</span><Stepper value={block.restBetweenRounds} min={0} max={600} step={5} format={(v) => `${v} ${t('unit.s')}`} onChange={(v) => onChange({ ...block, restBetweenRounds: v })} /></div>
      </div>
    );
  }
  const mode: 'time' | 'reps' = block.reps != null ? 'reps' : 'time';
  return (
    <div className="stack">
      {exercise && <div style={{ alignSelf: 'center' }}><ExerciseVisual exercise={exercise} size="box" /></div>}
      <Segmented value={mode} onChange={(m) => onChange(m === 'reps' ? { id: block.id, type: 'exercise', exerciseId: block.exerciseId, reps: exercise?.kind === 'reps' ? exercise.defaultAmount : 10 } : { id: block.id, type: 'exercise', exerciseId: block.exerciseId, seconds: exercise?.kind === 'time' ? exercise.defaultAmount : 30 })} options={[{ value: 'time', label: t('workouts.forTime') }, { value: 'reps', label: t('workouts.forReps') }]} />
      {mode === 'time' ? (
        <>
          <div className="spread"><span className="bold">{t('workouts.duration')}</span><Stepper value={block.seconds ?? 30} min={5} max={3600} step={5} format={(v) => `${v} ${t('unit.s')}`} onChange={(v) => onChange({ ...block, seconds: v })} /></div>
          <div className="hstack wrap">{[20, 30, 40, 45, 60, 90, 120].map((s) => <button key={s} className={`chip ${block.seconds === s ? 'chip-active' : ''}`} onClick={() => onChange({ ...block, seconds: s })}>{s} {t('unit.s')}</button>)}</div>
        </>
      ) : (
        <>
          <div className="spread"><span className="bold">{t('workouts.reps')}</span><Stepper value={block.reps ?? 10} min={1} max={500} onChange={(v) => onChange({ ...block, reps: v })} /></div>
          <div className="small muted">{t('workouts.timedAtPerRep', { n: exercise?.secPerRep ?? 3 })}</div>
        </>
      )}
    </div>
  );
}

// Group defs for the picker's category badges, plus a 'custom' badge for the user's own exercises
// (not part of the shared muscle-group list since it's not a muscle group at all).
const PICKER_GROUP_DEFS = [...EXERCISE_GROUP_DEFS.filter((g) => g.key !== 'all'), { key: 'custom', labelKey: 'exercise.group.custom', match: [] as string[] }];

export function ExercisePicker({ open, onClose, exercises, onPick }: { open: boolean; onClose: () => void; exercises: Exercise[]; onPick: (e: Exercise) => void }) {
  const t = useT();
  const lang = useLang();
  const [q, setQ] = useState('');
  // Multiple badges can be active at once (e.g. Cardio + Legs) - an exercise matching ANY
  // selected category shows, per the user's "select cardio and leg, see only those two" ask.
  const [groups, setGroups] = useState<Set<string>>(() => new Set());
  const dq = useDeferredValue(q);
  const toggleGroup = (key: string) => setGroups((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const ql = dq.trim().toLowerCase();
  const list = exercises
    .filter((e) => {
      if (groups.size === 0) return true;
      for (const key of groups) {
        if (key === 'custom' ? e.isCustom : PICKER_GROUP_DEFS.find((g) => g.key === key)?.match.some((m) => e.muscles.includes(m))) return true;
      }
      return false;
    })
    .filter((e) => !ql || localizedExerciseName(e.id, e.name, lang).toLowerCase().includes(ql) || e.muscles.some((m) => m.includes(ql)));
  return (
    <Sheet open={open} onClose={onClose} title={t('workouts.addExerciseSheetTitle')} full footer={<Button variant="secondary" onClick={onClose}>{t('common.done')}</Button>}>
      <div className="searchbar">
        <IconSearch size={18} />
        <input className="input" placeholder={t('workouts.searchExercises')} value={q} onChange={(e: { target: HTMLInputElement }) => setQ(e.target.value)} />
      </div>
      <div className="chips" style={{ margin: '0 0 10px', padding: 0 }}>
        <Chip tone="workout" active={groups.size === 0} onClick={() => setGroups(new Set())}>{t('exercise.group.all')}</Chip>
        {PICKER_GROUP_DEFS.map((g) => <Chip key={g.key} tone="workout" active={groups.has(g.key)} onClick={() => toggleGroup(g.key)}>{t(g.labelKey)}</Chip>)}
      </div>
      <div className="list">
        {list.map((e) => (
          <Row key={e.id} onClick={() => onPick(e)} right={<IconPlus className="c-workout" />}>
            <ExerciseVisual exercise={e} animated={false} />
            <div className="row-main">
              <div className="row-title">{localizedExerciseName(e.id, e.name, lang)}</div>
              <div className="row-sub">{e.kind === 'time' ? `${e.defaultAmount} ${t('unit.s')}` : `${e.defaultAmount} ${t('unit.reps')}`} · {e.muscles.join(', ')}</div>
            </div>
          </Row>
        ))}
        {list.length === 0 && <div className="empty"><div className="empty-text">{t('workouts.noExercisesMatch')}</div></div>}
      </div>
      <Button variant="secondary" full className="mt" icon={<IconPlus size={18} />} onClick={() => { onClose(); navigate('/workouts/exercise/new'); }}>{t('workouts.createCustomExercise')}</Button>
    </Sheet>
  );
}
