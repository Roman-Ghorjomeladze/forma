// Course settings + your own content (words, sentences, grammar notes) + pack import/export.
import { useRef, useState } from 'react';
import { bulkPut, put, remove } from '../../lib/db.js';
import { shareOrDownloadJson } from '../../lib/backup.js';
import { useT } from '../../lib/i18n.js';
import { useLiveQuery } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { courseItems, deleteCourse, exportPack, LEVELS, packToItems, resetProgress, type LGrammarUnit, type LSentence, type LWord, type PackFile } from '../../lib/lingua.js';
import type { LLevel, LangCourse, LangItem } from '../../lib/models.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, NumberInput, Screen, Segmented, Select, Sheet, Stepper, TextArea, TextInput, Toggle, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconDownload, IconEdit, IconPlus, IconTrash, IconUpload } from '../../ui/icons.js';
import { isCtx, LevelTag, useLingua, type Gate } from './lingua-ui.js';

const POS = ['noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'num', 'phrase', 'other'];

export function LinguaManageScreen({ cid }: { cid: string }) {
  const t = useT();
  const ctx = useLingua(cid);
  const items = useLiveQuery(() => courseItems(cid), ['langItems'], [cid]);
  const [tab, setTab] = useState<'word' | 'sentence' | 'grammar'>('word');
  const [edit, setEdit] = useState<{ kind: 'word' | 'sentence' | 'grammar'; item?: LangItem } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!isCtx(ctx)) return ctx as Gate;
  const { course, content } = ctx;
  const upd = (patch: Partial<LangCourse>) => put('langCourses', { ...course, ...patch });
  const mine = (items ?? []).filter((i) => i.kind === tab).sort((a, b) => b.createdAt - a.createdAt);

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as PackFile;
      const add = packToItems(course.id, data, content);
      await bulkPut('langItems', add);
      toast(t('lang.imported', { n: add.length }));
    } catch (e) {
      toast(t('lang.importFailed'));
      console.warn(e);
    }
  };
  const doExport = async () => {
    const pack = exportPack(course, items ?? []);
    await shareOrDownloadJson(`${course.title.replace(/\s+/g, '-').toLowerCase()}.lingua.json`, pack);
  };
  const del = async () => {
    if (!(await confirmDialog({ title: t('lang.deleteCourse', { title: course.title }), message: t('lang.deleteCourseText'), danger: true, confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') }))) return;
    await deleteCourse(course);
    navigate('/lang', { replace: true });
  };
  const reset = async () => {
    if (!(await confirmDialog({ title: t('lang.resetProgress'), message: t('lang.resetProgressText'), danger: true, confirmLabel: t('lang.reset'), cancelLabel: t('common.cancel') }))) return;
    await resetProgress(course.id);
    toast(t('lang.progressReset'));
  };

  return (
    <Screen className="screen-no-tabs lingua">
      <TopBar title={t('lang.manage')} eyebrow={course.title} backTo={`/lang/${cid}`} />

      <div className="section-label">{t('lang.course')}</div>
      <div className="card stack">
        <Field label={t('lang.courseTitle')}><TextInput value={course.title} onChange={(v) => upd({ title: v })} /></Field>
        {!course.pack && (
          <div className="grid-2">
            <Field label={t('lang.iLearn')}><TextInput value={course.target.name} onChange={(v) => upd({ target: { ...course.target, name: v } })} /></Field>
            <Field label={t('lang.voiceCode')} hint={t('lang.voiceCodeHint')}><TextInput value={course.target.tts} onChange={(v) => upd({ target: { ...course.target, tts: v, code: v.split('-')[0] } })} placeholder="de-DE" /></Field>
            <Field label={t('lang.iKnow')}><TextInput value={course.source.name} onChange={(v) => upd({ source: { ...course.source, name: v } })} /></Field>
            <Field label={t('lang.voiceCode')}><TextInput value={course.source.tts} onChange={(v) => upd({ source: { ...course.source, tts: v, code: v.split('-')[0] } })} placeholder="en-US" /></Field>
          </div>
        )}
        <div className="grid-2">
          <Field label={t('lang.goalPassive')}><NumberInput value={course.goals.passive} min={100} max={50000} step={100} onChange={(v) => upd({ goals: { ...course.goals, passive: v } })} /></Field>
          <Field label={t('lang.goalActive')}><NumberInput value={course.goals.active} min={100} max={50000} step={100} onChange={(v) => upd({ goals: { ...course.goals, active: v } })} /></Field>
        </div>
      </div>

      <div className="section-label mt-lg">{t('lang.learning')}</div>
      <div className="card stack">
        <div className="hstack"><div className="flex1"><div className="bold">{t('lang.dailyNew')}</div><div className="small muted">{t('lang.dailyNewHint')}</div></div><Stepper value={course.dailyNew} min={0} max={60} step={5} onChange={(v) => upd({ dailyNew: v })} /></div>
        <div className="hstack"><div className="flex1"><div className="bold">{t('lang.sessionSize')}</div></div><Stepper value={course.sessionSize} min={10} max={60} step={5} onChange={(v) => upd({ sessionSize: v })} /></div>
        <div className="hstack"><div className="flex1"><div className="bold">{t('lang.autoSpeak')}</div><div className="small muted">{t('lang.autoSpeakHint')}</div></div><Toggle checked={course.autoSpeak} onChange={(v) => upd({ autoSpeak: v })} /></div>
        <div><div className="bold mb">{t('lang.speechRate')}</div>
          <Segmented value={String(course.rate)} onChange={(v) => upd({ rate: Number(v) })} options={[{ value: '0.7', label: t('lang.rateSlow') }, { value: '0.85', label: '0.85×' }, { value: '0.9', label: '0.9×' }, { value: '1', label: t('lang.rateNormal') }]} />
        </div>
      </div>

      <div className="section-head mt-lg">
        <div className="section-label" style={{ margin: 0 }}>{t('lang.myContent')}</div>
        <button type="button" className="link-btn c-lingua" onClick={() => setEdit({ kind: tab })}><IconPlus size={16} /> {t('common.add')}</button>
      </div>
      <p className="small muted mb">{t('lang.myContentHint')}</p>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'word', label: t('lang.wordsN', { n: (items ?? []).filter((i) => i.kind === 'word').length }) },
        { value: 'sentence', label: t('lang.sentencesN', { n: (items ?? []).filter((i) => i.kind === 'sentence').length }) },
        { value: 'grammar', label: t('lang.grammarN', { n: (items ?? []).filter((i) => i.kind === 'grammar').length }) },
      ]} />
      <div className="card card-flush mt">
        {mine.length === 0 && <div className="row muted small">{t('lang.nothingAdded')}</div>}
        {mine.slice(0, 200).map((i) => {
          const d = i.data as { t?: string; s?: string; title?: string; summary?: string; l?: LLevel; level?: LLevel };
          return (
            <div key={i.id} className="row">
              <LevelTag level={(d.l ?? d.level ?? 'A1') as string} />
              <div className="row-main"><div className="row-title">{d.t ?? d.title}</div><div className="row-sub">{d.s ?? d.summary}</div></div>
              <button type="button" className="iconbtn-sm" aria-label={t('common.edit')} onClick={() => setEdit({ kind: i.kind, item: i })}><IconEdit size={16} /></button>
              <button type="button" className="iconbtn-sm" aria-label={t('common.delete')} onClick={() => remove('langItems', i.id)}><IconTrash size={16} /></button>
            </div>
          );
        })}
      </div>
      <div className="grid-2 mt">
        <Button variant="secondary" icon={<IconUpload size={18} />} onClick={() => fileRef.current?.click()}>{t('lang.importPack')}</Button>
        <Button variant="secondary" icon={<IconDownload size={18} />} onClick={doExport} disabled={!items?.length}>{t('lang.exportPack')}</Button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e: { target: HTMLInputElement }) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
      <details className="pack-help small muted mt"><summary>{t('lang.packFormat')}</summary><pre>{PACK_EXAMPLE}</pre></details>

      {content.credits && <p className="small muted mt-lg">{content.credits}</p>}

      <div className="section-label mt-lg">{t('lang.dangerZone')}</div>
      <div className="stack">
        <Button variant="danger" full onClick={reset}>{t('lang.resetProgress')}</Button>
        <Button variant="danger" full onClick={del}>{t('lang.deleteCourseBtn')}</Button>
      </div>

      {edit?.kind === 'word' && <WordForm courseId={cid} open item={edit.item} onClose={() => setEdit(null)} />}
      {edit?.kind === 'sentence' && <SentenceForm courseId={cid} item={edit.item} onClose={() => setEdit(null)} />}
      {edit?.kind === 'grammar' && <GrammarForm courseId={cid} item={edit.item} onClose={() => setEdit(null)} />}
    </Screen>
  );
}

const PACK_EXAMPLE = `{
  "lingua": 1,
  "words": [
    { "t": "das Haus", "s": "house", "pos": "noun", "l": "A1",
      "info": "pl. Häuser", "ex": "Das Haus ist alt.", "exs": "The house is old." }
  ],
  "sentences": [
    { "t": "Wie spät ist es?", "s": "What time is it?", "l": "A1", "dy": true }
  ],
  "grammar": [
    { "title": "Articles", "level": "A1", "summary": "der, die, das",
      "sections": [{ "h": "Gender", "body": "Every noun has a gender…",
        "examples": [["der Tisch", "the table"]] }],
      "drills": [{ "type": "order", "t": "Das ist der Tisch.", "s": "This is the table." }] }
  ]
}`;

const LEVEL_OPTS = LEVELS.map((l) => ({ value: l, label: l }));

function useItemData<T>(item: LangItem | undefined, word: LWord | undefined, blank: T): [T, (p: Partial<T>) => void] {
  const [d, setD] = useState<T>(() => ({ ...blank, ...((item?.data as T) ?? (word as unknown as T) ?? {}) }));
  return [d, (p) => setD((x) => ({ ...x, ...p }))];
}

export function WordForm({ courseId, open, onClose, item, word }: { courseId: string; open: boolean; onClose: () => void; item?: LangItem; word?: LWord }) {
  const t = useT();
  const [d, set] = useItemData<Partial<LWord>>(item, word, { t: '', s: '', pos: 'noun', l: 'A1', info: '', ex: '', exs: '' });
  const id = item?.id ?? (word?.user ? word.id : undefined);
  const save = async () => {
    const data = { t: d.t!.trim(), s: d.s!.trim(), pos: d.pos, l: d.l, info: d.info?.trim() || undefined, ex: d.ex?.trim() || undefined, exs: d.exs?.trim() || undefined };
    await put('langItems', { id: id ?? uid('lw'), courseId, kind: 'word', data, createdAt: item?.createdAt ?? Date.now() });
    toast(t('common.saved'));
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={id ? t('lang.editWord') : t('lang.addWord')} footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button variant="lingua" onClick={save} disabled={!d.t?.trim() || !d.s?.trim()}>{t('common.save')}</Button></>}>
      <div className="stack">
        <Field label={t('lang.fWord')}><TextInput value={d.t ?? ''} onChange={(v) => set({ t: v })} autoFocus /></Field>
        <Field label={t('lang.fMeaning')}><TextInput value={d.s ?? ''} onChange={(v) => set({ s: v })} /></Field>
        <div className="grid-2">
          <Field label={t('lang.level')}><Select value={(d.l ?? 'A1') as LLevel} options={LEVEL_OPTS} onChange={(v) => set({ l: v })} /></Field>
          <Field label={t('lang.fPos')}><Select value={d.pos ?? 'noun'} options={POS.map((p) => ({ value: p, label: t(`lang.pos.${p}`) }))} onChange={(v) => set({ pos: v })} /></Field>
        </div>
        <Field label={t('lang.fInfo')} hint={t('common.optional')}><TextInput value={d.info ?? ''} onChange={(v) => set({ info: v })} /></Field>
        <Field label={t('lang.fExample')} hint={t('common.optional')}><TextInput value={d.ex ?? ''} onChange={(v) => set({ ex: v })} /></Field>
        <Field label={t('lang.fExampleTr')} hint={t('common.optional')}><TextInput value={d.exs ?? ''} onChange={(v) => set({ exs: v })} /></Field>
      </div>
    </Sheet>
  );
}

function SentenceForm({ courseId, onClose, item }: { courseId: string; onClose: () => void; item?: LangItem }) {
  const t = useT();
  const [d, set] = useItemData<Partial<LSentence>>(item, undefined, { t: '', s: '', l: 'A1', dy: true, d: [] });
  const [dist, setDist] = useState((d.d ?? []).join(', '));
  const save = async () => {
    const data = { t: d.t!.trim(), s: d.s!.trim(), l: d.l, dy: !!d.dy, d: dist.split(',').map((x) => x.trim()).filter(Boolean) };
    await put('langItems', { id: item?.id ?? uid('ls'), courseId, kind: 'sentence', data, createdAt: item?.createdAt ?? Date.now() });
    toast(t('common.saved'));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={item ? t('lang.editSentence') : t('lang.addSentence')} footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button variant="lingua" onClick={save} disabled={!d.t?.trim() || !d.s?.trim()}>{t('common.save')}</Button></>}>
      <div className="stack">
        <Field label={t('lang.fSentence')}><TextArea rows={2} value={d.t ?? ''} onChange={(v) => set({ t: v })} /></Field>
        <Field label={t('lang.fTranslation')}><TextArea rows={2} value={d.s ?? ''} onChange={(v) => set({ s: v })} /></Field>
        <Field label={t('lang.level')}><Select value={(d.l ?? 'A1') as LLevel} options={LEVEL_OPTS} onChange={(v) => set({ l: v })} /></Field>
        <Field label={t('lang.fDistractors')} hint={t('lang.fDistractorsHint')}><TextInput value={dist} onChange={setDist} /></Field>
        <div className="hstack"><div className="flex1 bold">{t('lang.fDaily')}</div><Toggle checked={!!d.dy} onChange={(v) => set({ dy: v })} /></div>
      </div>
    </Sheet>
  );
}

function GrammarForm({ courseId, onClose, item }: { courseId: string; onClose: () => void; item?: LangItem }) {
  const t = useT();
  const init = (item?.data as LGrammarUnit | undefined);
  const [title, setTitle] = useState(init?.title ?? '');
  const [level, setLevel] = useState<LLevel>(init?.level ?? 'A1');
  const [summary, setSummary] = useState(init?.summary ?? '');
  const [body, setBody] = useState(init?.sections?.[0]?.body ?? '');
  const [examples, setExamples] = useState((init?.sections?.[0]?.examples ?? []).map(([a, b]) => `${a} | ${b}`).join('\n'));
  const [drills, setDrills] = useState((init?.drills ?? []).filter((x) => x.type === 'order').map((x) => (x.type === 'order' ? `${x.t} | ${x.s}` : '')).join('\n'));
  const pairs = (s: string) => s.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p.length >= 2 && p[0] && p[1]) as [string, string][];
  const save = async () => {
    const keepChoice = (init?.drills ?? []).filter((x) => x.type === 'choice');
    const data: Omit<LGrammarUnit, 'id'> = {
      title: title.trim(), level, summary: summary.trim(),
      sections: [{ h: title.trim(), body, examples: pairs(examples) }, ...(init?.sections?.slice(1) ?? [])],
      tips: init?.tips ?? [],
      drills: [...keepChoice, ...pairs(drills).map(([a, b]) => ({ type: 'order' as const, t: a, s: b }))],
    };
    await put('langItems', { id: item?.id ?? uid('lg'), courseId, kind: 'grammar', data, createdAt: item?.createdAt ?? Date.now() });
    toast(t('common.saved'));
    onClose();
  };
  return (
    <Sheet full open onClose={onClose} title={item ? t('lang.editGrammar') : t('lang.addGrammar')} footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button variant="lingua" onClick={save} disabled={!title.trim()}>{t('common.save')}</Button></>}>
      <div className="stack">
        <div className="grid-2">
          <Field label={t('lang.fTitle')}><TextInput value={title} onChange={setTitle} /></Field>
          <Field label={t('lang.level')}><Select value={level} options={LEVEL_OPTS} onChange={setLevel} /></Field>
        </div>
        <Field label={t('lang.fSummary')}><TextInput value={summary} onChange={setSummary} /></Field>
        <Field label={t('lang.fExplanation')} hint={t('lang.fExplanationHint')}><TextArea rows={7} value={body} onChange={setBody} /></Field>
        <Field label={t('lang.fExamples')} hint={t('lang.pairsHint')}><TextArea rows={4} value={examples} onChange={setExamples} /></Field>
        <Field label={t('lang.fDrills')} hint={t('lang.drillsHint')}><TextArea rows={4} value={drills} onChange={setDrills} /></Field>
      </div>
    </Sheet>
  );
}


