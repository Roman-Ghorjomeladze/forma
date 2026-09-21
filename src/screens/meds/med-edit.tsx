// Medication editor: identity, schedule (phases → dose slots), weekdays, stock, notes.
import { useEffect, useState } from 'react';
import { weekdayName } from '../../lib/dates.js';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { deleteMedication, generateSlots, MED_COLORS, newMedication, newPhase, newSlot, sortSlots, totalDays } from '../../lib/meds.js';
import { DOSE_HINTS, MED_FORMS, type DoseHint, type DoseSlot, type MedForm, type MedKind, type Medication, type Phase } from '../../lib/models.js';
import { back, navigate } from '../../lib/router.js';
import { useMedication, useMedications } from '../../lib/queries.js';
import { Button, Chip, Field, NumberInput, Screen, Segmented, Select, Sheet, TextArea, TextInput, Toggle, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconCopy, IconPlus, IconTrash } from '../../ui/icons.js';

export function MedEditScreen({ id }: { id?: string }) {
  const t = useT();
  const existing = useMedication(id);
  const all = useMedications();
  const [draft, setDraft] = useState<Medication | null>(id ? null : newMedication());
  const [fill, setFill] = useState<number | null>(null); // phase index the quick-fill sheet is open for
  useEffect(() => { if (id && existing) setDraft(existing); }, [id, existing]);

  if (id && existing === null) { navigate('/meds', { replace: true }); return <Screen className="screen-no-tabs" />; }
  if (!draft || !all) return <Screen className="screen-no-tabs" />;
  const set = (patch: Partial<Medication>) => setDraft({ ...draft, ...patch });
  const setPhase = (i: number, patch: Partial<Phase>) => set({ phases: draft.phases.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  const setSlot = (pi: number, si: number, patch: Partial<DoseSlot>) => setPhase(pi, { slots: draft.phases[pi].slots.map((s, k) => (k === si ? { ...s, ...patch } : s)) });
  const others = all.filter((m) => m.id !== draft.id && m.status !== 'done');
  const backTo = id ? `/meds/${id}` : '/meds';

  const save = async () => {
    const name = draft.name.trim();
    if (!name) { toast(t('pocket.nameRequired')); return; }
    if (draft.phases.length === 0 || draft.phases.some((p) => p.slots.length === 0)) { toast(t('meds.needSlot')); return; }
    if (draft.phases.some((p, i) => p.days <= 0 && i < draft.phases.length - 1)) { toast(t('meds.openEndedOnlyLast')); return; }
    const phases = draft.phases.map((p) => ({ ...p, label: p.label.trim(), slots: sortSlots(p.slots).map((s) => ({ ...s, amount: s.amount.trim(), note: s.note.trim(), afterMedId: s.afterMedId || undefined, gapMin: s.afterMedId ? s.gapMin ?? 30 : undefined })) }));
    await put('medications', { ...draft, name, strength: draft.strength.trim(), person: draft.person.trim(), notes: draft.notes.trim(), phases, updatedAt: Date.now() });
    if (id) back(backTo); else navigate(`/meds/${draft.id}`, { replace: true });
  };
  const del = async () => {
    const ok = await confirmDialog({ title: t('meds.deleteTitle', { name: draft.name }), message: t('meds.deleteText'), confirmLabel: t('common.delete'), danger: true });
    if (!ok) return;
    await deleteMedication(draft.id);
    navigate('/meds', { replace: true });
  };

  const addPhase = () => {
    const last = draft.phases[draft.phases.length - 1];
    const copy = last ? { ...newPhase(), days: last.days || 7, slots: last.slots.map((s) => ({ ...newSlot(s.time), amount: s.amount, hint: s.hint, note: s.note, afterMedId: s.afterMedId, gapMin: s.gapMin })) } : newPhase();
    set({ phases: [...draft.phases, copy] });
  };
  const removePhase = (i: number) => set({ phases: draft.phases.filter((_, k) => k !== i) });
  const addSlot = (pi: number) => {
    const slots = draft.phases[pi].slots;
    const last = sortSlots(slots)[slots.length - 1];
    const time = last ? nextTime(last.time) : '09:00';
    setPhase(pi, { slots: [...slots, newSlot(time, { amount: last?.amount ?? '1', hint: last?.hint ?? 'none' })] });
  };
  const removeSlot = (pi: number, si: number) => setPhase(pi, { slots: draft.phases[pi].slots.filter((_, k) => k !== si) });

  const total = totalDays(draft);
  const hintOptions = DOSE_HINTS.map((h) => ({ value: h, label: h === 'none' ? t('meds.hint.none') : t(`meds.hint.${h}`) }));
  const afterOptions = [{ value: '', label: t('meds.noChain') }, ...others.map((m) => ({ value: m.id, label: m.name }))];

  return (
    <Screen className="screen-no-tabs meds">
      <TopBar onBack={() => back(backTo)} title={id ? t('meds.editMed') : t('meds.newMed')} right={<Button size="sm" variant="meds" onClick={save}>{t('common.save')}</Button>} />

      <Segmented<MedKind> value={draft.kind} onChange={(v) => set({ kind: v })} options={[{ value: 'medicine', label: t('meds.kind.medicine') }, { value: 'supplement', label: t('meds.kind.supplement') }]} />
      <div className="mt">
        <Field label={t('meds.name')}><TextInput value={draft.name} onChange={(v) => set({ name: v })} placeholder={t('meds.namePlaceholder')} autoFocus={!id} /></Field>
        <div className="grid-2">
          <Field label={t('meds.strength')} hint={t('common.optional')}><TextInput value={draft.strength} onChange={(v) => set({ strength: v })} placeholder="500 mg" /></Field>
          <Field label={t('meds.formLabel')}><Select<MedForm> value={draft.form} onChange={(v) => set({ form: v })} options={MED_FORMS.map((f) => ({ value: f, label: t(`meds.form.${f}s`) }))} /></Field>
        </div>
        <Field label={t('pocket.colour')}>
          <div className="swatches">{MED_COLORS.map((c) => <button key={c} type="button" aria-label={c} className={`swatch ${c === draft.color ? 'active' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} />)}</div>
        </Field>
        <div className="grid-2">
          <Field label={t('meds.person')} hint={t('meds.personHint')}><TextInput value={draft.person} onChange={(v) => set({ person: v })} placeholder={t('meds.personPlaceholder')} /></Field>
          <Field label={t('meds.startsOn')}><input className="input input-date" type="date" value={draft.startDate} onChange={(e: { target: HTMLInputElement }) => set({ startDate: e.target.value || draft.startDate })} /></Field>
        </div>
      </div>

      <div className="section-label mt">{t('meds.schedule')}</div>
      <div className="small muted mb">{t('meds.scheduleHint')}</div>
      {draft.phases.map((p, pi) => (
        <div key={p.id} className="phase-card">
          <div className="phase-head">
            <span className="phase-index">{pi + 1}</span>
            <input className="input" style={{ height: 40, flex: 1 }} value={p.label} placeholder={t('meds.phaseLabelPlaceholder', { n: pi + 1 })} onChange={(e: { target: HTMLInputElement }) => setPhase(pi, { label: e.target.value })} />
            {draft.phases.length > 1 && <button type="button" className="iconbtn iconbtn-plain" aria-label={t('common.remove')} onClick={() => removePhase(pi)}><IconTrash size={18} /></button>}
          </div>
          <div className="hstack" style={{ gap: 10 }}>
            <span className="small bold">{t('meds.lasts')}</span>
            <NumberInput value={p.days} min={0} max={3650} onChange={(v) => setPhase(pi, { days: v })} suffix={t('meds.days')} />
            {pi === draft.phases.length - 1 && <Toggle checked={p.days === 0} label={t('meds.untilStopped')} onChange={(v) => setPhase(pi, { days: v ? 0 : 7 })} />}
            {pi === draft.phases.length - 1 && <span className="small muted">{t('meds.untilStopped')}</span>}
          </div>
          {sortSlots(p.slots).map((s) => {
            const si = p.slots.indexOf(s);
            return (
              <div key={s.id} className="slot-card">
                <div className="slot-top">
                  <input className="input time-input" type="time" value={s.time} onChange={(e: { target: HTMLInputElement }) => setSlot(pi, si, { time: e.target.value || s.time })} />
                  <input className="input amount-input" inputMode="decimal" value={s.amount} placeholder="1" aria-label={t('meds.amount')} onChange={(e: { target: HTMLInputElement }) => setSlot(pi, si, { amount: e.target.value })} />
                  <span className="small muted" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`meds.form.${draft.form}s`)}{draft.strength ? ` · ${draft.strength}` : ''}</span>
                </div>
                <div className="slot-more"><Select<DoseHint> value={s.hint} onChange={(v) => setSlot(pi, si, { hint: v })} options={hintOptions} /></div>
                {others.length > 0 && (
                  <div className="slot-more">
                    <Select value={s.afterMedId ?? ''} onChange={(v) => setSlot(pi, si, { afterMedId: v || undefined, gapMin: v ? s.gapMin ?? 30 : undefined })} options={afterOptions} />
                    {s.afterMedId && <><input className="input gap-input" inputMode="numeric" value={String(s.gapMin ?? 30)} onChange={(e: { target: HTMLInputElement }) => setSlot(pi, si, { gapMin: Math.max(0, Number(e.target.value) || 0) })} /><span className="small muted">{t('meds.minAfter')}</span></>}
                  </div>
                )}
                <div className="slot-note"><input className="input" value={s.note} placeholder={t('meds.slotNotePlaceholder')} onChange={(e: { target: HTMLInputElement }) => setSlot(pi, si, { note: e.target.value })} /></div>
                {p.slots.length > 1 && <div className="slot-actions"><button type="button" className="danger" onClick={() => removeSlot(pi, si)}>{t('meds.removeDose')}</button></div>}
              </div>
            );
          })}
          <div className="phase-actions">
            <Chip onClick={() => addSlot(pi)}><IconPlus size={15} /> {t('meds.addDose')}</Chip>
            <Chip onClick={() => setFill(pi)}>{t('meds.everyNHours')}</Chip>
            {pi === draft.phases.length - 1 && <Chip onClick={addPhase}><IconCopy size={15} /> {t('meds.addPhase')}</Chip>}
          </div>
        </div>
      ))}
      <div className="small muted mb">{total === null ? t('meds.courseOpen') : t('meds.courseTotal', { n: total })}</div>

      <div className="section-label mt">{t('meds.whichDays')}</div>
      <div className="hstack mb" style={{ gap: 10 }}>
        <Toggle checked={draft.weekdays.length > 0} onChange={(v) => set({ weekdays: v ? [1, 2, 3, 4, 5] : [] })} />
        <span className="small">{draft.weekdays.length ? t('meds.onlyTheseDays') : t('meds.everyDay')}</span>
      </div>
      {draft.weekdays.length > 0 && (
        <div className="weekday-row mb">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" className={`weekday-btn ${draft.weekdays.includes(d) ? 'on' : ''}`} onClick={() => set({ weekdays: draft.weekdays.includes(d) ? draft.weekdays.filter((x) => x !== d) : [...draft.weekdays, d] })}>{weekdayName(d)}</button>)}
        </div>
      )}

      <div className="section-label mt">{t('meds.stock')}</div>
      <div className="list mb">
        <div className="settings-row"><span className="l">{t('meds.trackStock')}<small>{t('meds.trackStockHint')}</small></span><Toggle checked={typeof draft.stock === 'number'} onChange={(v) => set({ stock: v ? 30 : undefined, stockWarnAt: v ? 5 : undefined })} /></div>
        {typeof draft.stock === 'number' && (
          <>
            <div className="settings-row"><span className="l">{t('meds.unitsLeft')}</span><NumberInput value={draft.stock} min={0} max={100000} onChange={(v) => set({ stock: v })} /></div>
            <div className="settings-row"><span className="l">{t('meds.warnAt')}</span><NumberInput value={draft.stockWarnAt ?? 5} min={0} max={100000} onChange={(v) => set({ stockWarnAt: v })} /></div>
          </>
        )}
      </div>

      <Field label={t('meds.notes')} hint={t('meds.notesHint')}><TextArea value={draft.notes} onChange={(v) => set({ notes: v })} rows={2} /></Field>

      <Button variant="meds" full size="lg" onClick={save} className="mt">{id ? t('common.saveChanges') : t('meds.saveMed')}</Button>
      {id && <Button variant="ghost" full className="mt c-danger" onClick={del}>{t('meds.deleteMed')}</Button>}

      <QuickFillSheet open={fill !== null} onClose={() => setFill(null)} amount={fill !== null ? draft.phases[fill]?.slots[0]?.amount ?? '1' : '1'} onApply={(slots) => { if (fill !== null) setPhase(fill, { slots }); setFill(null); }} />
    </Screen>
  );
}

function nextTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const next = Math.min(23 * 60 + 30, h * 60 + m + 6 * 60);
  return `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
}

function QuickFillSheet({ open, onClose, amount, onApply }: { open: boolean; onClose: () => void; amount: string; onApply: (slots: DoseSlot[]) => void }) {
  const t = useT();
  const [from, setFrom] = useState('08:00');
  const [to, setTo] = useState('22:00');
  const [every, setEvery] = useState(8);
  const [amt, setAmt] = useState(amount);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) setAmt(amount); }
  const preview = generateSlots(from, to, every * 60, amt);
  return (
    <Sheet open={open} onClose={onClose} title={t('meds.everyNHours')} footer={<Button variant="meds" disabled={preview.length === 0} onClick={() => onApply(preview)}>{t('meds.applyTimes', { n: preview.length })}</Button>}>
      <div className="grid-2">
        <Field label={t('meds.from')}><input className="input" type="time" value={from} onChange={(e: { target: HTMLInputElement }) => setFrom(e.target.value || from)} /></Field>
        <Field label={t('meds.to')}><input className="input" type="time" value={to} onChange={(e: { target: HTMLInputElement }) => setTo(e.target.value || to)} /></Field>
      </div>
      <Field label={t('meds.everyHours')} inline><NumberInput value={every} min={1} max={24} onChange={setEvery} suffix="h" /></Field>
      <Field label={t('meds.amount')} inline><TextInput value={amt} onChange={setAmt} className="input-short" /></Field>
      <div className="small muted">{preview.map((s) => s.time).join(' · ') || t('meds.noTimes')}</div>
    </Sheet>
  );
}
