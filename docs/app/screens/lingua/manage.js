import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Course settings + your own content (words, sentences, grammar notes) + pack import/export.
import { useRef, useState } from 'react';
import { bulkPut, put, remove } from '../../lib/db.js';
import { shareOrDownloadJson } from '../../lib/backup.js';
import { useT } from '../../lib/i18n.js';
import { useLiveQuery } from '../../lib/hooks.js';
import { uid } from '../../lib/ids.js';
import { courseItems, deleteCourse, exportPack, LEVELS, packToItems, resetProgress } from '../../lib/lingua.js';
import { navigate } from '../../lib/router.js';
import { Button, Field, NumberInput, Screen, Segmented, Select, Sheet, Stepper, TextArea, TextInput, Toggle, TopBar } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/dialogs.js';
import { IconDownload, IconEdit, IconPlus, IconTrash, IconUpload } from '../../ui/icons.js';
import { isCtx, LevelTag, useLingua } from './lingua-ui.js';
const POS = ['noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'num', 'phrase', 'other'];
export function LinguaManageScreen({ cid }) {
    const t = useT();
    const ctx = useLingua(cid);
    const items = useLiveQuery(() => courseItems(cid), ['langItems'], [cid]);
    const [tab, setTab] = useState('word');
    const [edit, setEdit] = useState(null);
    const fileRef = useRef(null);
    if (!isCtx(ctx))
        return ctx;
    const { course, content } = ctx;
    const upd = (patch) => put('langCourses', { ...course, ...patch });
    const mine = (items ?? []).filter((i) => i.kind === tab).sort((a, b) => b.createdAt - a.createdAt);
    const doImport = async (file) => {
        try {
            const data = JSON.parse(await file.text());
            const add = packToItems(course.id, data, content);
            await bulkPut('langItems', add);
            toast(t('lang.imported', { n: add.length }));
        }
        catch (e) {
            toast(t('lang.importFailed'));
            console.warn(e);
        }
    };
    const doExport = async () => {
        const pack = exportPack(course, items ?? []);
        await shareOrDownloadJson(`${course.title.replace(/\s+/g, '-').toLowerCase()}.lingua.json`, pack);
    };
    const del = async () => {
        if (!(await confirmDialog({ title: t('lang.deleteCourse', { title: course.title }), message: t('lang.deleteCourseText'), danger: true, confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') })))
            return;
        await deleteCourse(course);
        navigate('/lang', { replace: true });
    };
    const reset = async () => {
        if (!(await confirmDialog({ title: t('lang.resetProgress'), message: t('lang.resetProgressText'), danger: true, confirmLabel: t('lang.reset'), cancelLabel: t('common.cancel') })))
            return;
        await resetProgress(course.id);
        toast(t('lang.progressReset'));
    };
    return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.manage'), eyebrow: course.title, backTo: `/lang/${cid}` }), _jsx("div", { className: "section-label", children: t('lang.course') }), _jsxs("div", { className: "card stack", children: [_jsx(Field, { label: t('lang.courseTitle'), children: _jsx(TextInput, { value: course.title, onChange: (v) => upd({ title: v }) }) }), !course.pack && (_jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('lang.iLearn'), children: _jsx(TextInput, { value: course.target.name, onChange: (v) => upd({ target: { ...course.target, name: v } }) }) }), _jsx(Field, { label: t('lang.voiceCode'), hint: t('lang.voiceCodeHint'), children: _jsx(TextInput, { value: course.target.tts, onChange: (v) => upd({ target: { ...course.target, tts: v, code: v.split('-')[0] } }), placeholder: "de-DE" }) }), _jsx(Field, { label: t('lang.iKnow'), children: _jsx(TextInput, { value: course.source.name, onChange: (v) => upd({ source: { ...course.source, name: v } }) }) }), _jsx(Field, { label: t('lang.voiceCode'), children: _jsx(TextInput, { value: course.source.tts, onChange: (v) => upd({ source: { ...course.source, tts: v, code: v.split('-')[0] } }), placeholder: "en-US" }) })] })), _jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('lang.goalPassive'), children: _jsx(NumberInput, { value: course.goals.passive, min: 100, max: 50000, step: 100, onChange: (v) => upd({ goals: { ...course.goals, passive: v } }) }) }), _jsx(Field, { label: t('lang.goalActive'), children: _jsx(NumberInput, { value: course.goals.active, min: 100, max: 50000, step: 100, onChange: (v) => upd({ goals: { ...course.goals, active: v } }) }) })] })] }), _jsx("div", { className: "section-label mt-lg", children: t('lang.learning') }), _jsxs("div", { className: "card stack", children: [_jsxs("div", { className: "hstack", children: [_jsxs("div", { className: "flex1", children: [_jsx("div", { className: "bold", children: t('lang.dailyNew') }), _jsx("div", { className: "small muted", children: t('lang.dailyNewHint') })] }), _jsx(Stepper, { value: course.dailyNew, min: 0, max: 60, step: 5, onChange: (v) => upd({ dailyNew: v }) })] }), _jsxs("div", { className: "hstack", children: [_jsx("div", { className: "flex1", children: _jsx("div", { className: "bold", children: t('lang.sessionSize') }) }), _jsx(Stepper, { value: course.sessionSize, min: 10, max: 60, step: 5, onChange: (v) => upd({ sessionSize: v }) })] }), _jsxs("div", { className: "hstack", children: [_jsxs("div", { className: "flex1", children: [_jsx("div", { className: "bold", children: t('lang.autoSpeak') }), _jsx("div", { className: "small muted", children: t('lang.autoSpeakHint') })] }), _jsx(Toggle, { checked: course.autoSpeak, onChange: (v) => upd({ autoSpeak: v }) })] }), _jsxs("div", { children: [_jsx("div", { className: "bold mb", children: t('lang.speechRate') }), _jsx(Segmented, { value: String(course.rate), onChange: (v) => upd({ rate: Number(v) }), options: [{ value: '0.7', label: t('lang.rateSlow') }, { value: '0.85', label: '0.85×' }, { value: '0.9', label: '0.9×' }, { value: '1', label: t('lang.rateNormal') }] })] })] }), _jsxs("div", { className: "section-head mt-lg", children: [_jsx("div", { className: "section-label", style: { margin: 0 }, children: t('lang.myContent') }), _jsxs("button", { type: "button", className: "link-btn c-lingua", onClick: () => setEdit({ kind: tab }), children: [_jsx(IconPlus, { size: 16 }), " ", t('common.add')] })] }), _jsx("p", { className: "small muted mb", children: t('lang.myContentHint') }), _jsx(Segmented, { value: tab, onChange: setTab, options: [
                    { value: 'word', label: t('lang.wordsN', { n: (items ?? []).filter((i) => i.kind === 'word').length }) },
                    { value: 'sentence', label: t('lang.sentencesN', { n: (items ?? []).filter((i) => i.kind === 'sentence').length }) },
                    { value: 'grammar', label: t('lang.grammarN', { n: (items ?? []).filter((i) => i.kind === 'grammar').length }) },
                ] }), _jsxs("div", { className: "card card-flush mt", children: [mine.length === 0 && _jsx("div", { className: "row muted small", children: t('lang.nothingAdded') }), mine.slice(0, 200).map((i) => {
                        const d = i.data;
                        return (_jsxs("div", { className: "row", children: [_jsx(LevelTag, { level: (d.l ?? d.level ?? 'A1') }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: d.t ?? d.title }), _jsx("div", { className: "row-sub", children: d.s ?? d.summary })] }), _jsx("button", { type: "button", className: "iconbtn-sm", "aria-label": t('common.edit'), onClick: () => setEdit({ kind: i.kind, item: i }), children: _jsx(IconEdit, { size: 16 }) }), _jsx("button", { type: "button", className: "iconbtn-sm", "aria-label": t('common.delete'), onClick: () => remove('langItems', i.id), children: _jsx(IconTrash, { size: 16 }) })] }, i.id));
                    })] }), _jsxs("div", { className: "grid-2 mt", children: [_jsx(Button, { variant: "secondary", icon: _jsx(IconUpload, { size: 18 }), onClick: () => fileRef.current?.click(), children: t('lang.importPack') }), _jsx(Button, { variant: "secondary", icon: _jsx(IconDownload, { size: 18 }), onClick: doExport, disabled: !items?.length, children: t('lang.exportPack') })] }), _jsx("input", { ref: fileRef, type: "file", accept: ".json,application/json", hidden: true, onChange: (e) => { const f = e.target.files?.[0]; if (f)
                    doImport(f); e.target.value = ''; } }), _jsxs("details", { className: "pack-help small muted mt", children: [_jsx("summary", { children: t('lang.packFormat') }), _jsx("pre", { children: PACK_EXAMPLE })] }), content.credits && _jsx("p", { className: "small muted mt-lg", children: content.credits }), _jsx("div", { className: "section-label mt-lg", children: t('lang.dangerZone') }), _jsxs("div", { className: "stack", children: [_jsx(Button, { variant: "danger", full: true, onClick: reset, children: t('lang.resetProgress') }), _jsx(Button, { variant: "danger", full: true, onClick: del, children: t('lang.deleteCourseBtn') })] }), edit?.kind === 'word' && _jsx(WordForm, { courseId: cid, open: true, item: edit.item, onClose: () => setEdit(null) }), edit?.kind === 'sentence' && _jsx(SentenceForm, { courseId: cid, item: edit.item, onClose: () => setEdit(null) }), edit?.kind === 'grammar' && _jsx(GrammarForm, { courseId: cid, item: edit.item, onClose: () => setEdit(null) })] }));
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
function useItemData(item, word, blank) {
    const [d, setD] = useState(() => ({ ...blank, ...(item?.data ?? word ?? {}) }));
    return [d, (p) => setD((x) => ({ ...x, ...p }))];
}
export function WordForm({ courseId, open, onClose, item, word }) {
    const t = useT();
    const [d, set] = useItemData(item, word, { t: '', s: '', pos: 'noun', l: 'A1', info: '', ex: '', exs: '' });
    const id = item?.id ?? (word?.user ? word.id : undefined);
    const save = async () => {
        const data = { t: d.t.trim(), s: d.s.trim(), pos: d.pos, l: d.l, info: d.info?.trim() || undefined, ex: d.ex?.trim() || undefined, exs: d.exs?.trim() || undefined };
        await put('langItems', { id: id ?? uid('lw'), courseId, kind: 'word', data, createdAt: item?.createdAt ?? Date.now() });
        toast(t('common.saved'));
        onClose();
    };
    return (_jsx(Sheet, { open: open, onClose: onClose, title: id ? t('lang.editWord') : t('lang.addWord'), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: t('common.cancel') }), _jsx(Button, { variant: "lingua", onClick: save, disabled: !d.t?.trim() || !d.s?.trim(), children: t('common.save') })] }), children: _jsxs("div", { className: "stack", children: [_jsx(Field, { label: t('lang.fWord'), children: _jsx(TextInput, { value: d.t ?? '', onChange: (v) => set({ t: v }), autoFocus: true }) }), _jsx(Field, { label: t('lang.fMeaning'), children: _jsx(TextInput, { value: d.s ?? '', onChange: (v) => set({ s: v }) }) }), _jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('lang.level'), children: _jsx(Select, { value: (d.l ?? 'A1'), options: LEVEL_OPTS, onChange: (v) => set({ l: v }) }) }), _jsx(Field, { label: t('lang.fPos'), children: _jsx(Select, { value: d.pos ?? 'noun', options: POS.map((p) => ({ value: p, label: t(`lang.pos.${p}`) })), onChange: (v) => set({ pos: v }) }) })] }), _jsx(Field, { label: t('lang.fInfo'), hint: t('common.optional'), children: _jsx(TextInput, { value: d.info ?? '', onChange: (v) => set({ info: v }) }) }), _jsx(Field, { label: t('lang.fExample'), hint: t('common.optional'), children: _jsx(TextInput, { value: d.ex ?? '', onChange: (v) => set({ ex: v }) }) }), _jsx(Field, { label: t('lang.fExampleTr'), hint: t('common.optional'), children: _jsx(TextInput, { value: d.exs ?? '', onChange: (v) => set({ exs: v }) }) })] }) }));
}
function SentenceForm({ courseId, onClose, item }) {
    const t = useT();
    const [d, set] = useItemData(item, undefined, { t: '', s: '', l: 'A1', dy: true, d: [] });
    const [dist, setDist] = useState((d.d ?? []).join(', '));
    const save = async () => {
        const data = { t: d.t.trim(), s: d.s.trim(), l: d.l, dy: !!d.dy, d: dist.split(',').map((x) => x.trim()).filter(Boolean) };
        await put('langItems', { id: item?.id ?? uid('ls'), courseId, kind: 'sentence', data, createdAt: item?.createdAt ?? Date.now() });
        toast(t('common.saved'));
        onClose();
    };
    return (_jsx(Sheet, { open: true, onClose: onClose, title: item ? t('lang.editSentence') : t('lang.addSentence'), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: t('common.cancel') }), _jsx(Button, { variant: "lingua", onClick: save, disabled: !d.t?.trim() || !d.s?.trim(), children: t('common.save') })] }), children: _jsxs("div", { className: "stack", children: [_jsx(Field, { label: t('lang.fSentence'), children: _jsx(TextArea, { rows: 2, value: d.t ?? '', onChange: (v) => set({ t: v }) }) }), _jsx(Field, { label: t('lang.fTranslation'), children: _jsx(TextArea, { rows: 2, value: d.s ?? '', onChange: (v) => set({ s: v }) }) }), _jsx(Field, { label: t('lang.level'), children: _jsx(Select, { value: (d.l ?? 'A1'), options: LEVEL_OPTS, onChange: (v) => set({ l: v }) }) }), _jsx(Field, { label: t('lang.fDistractors'), hint: t('lang.fDistractorsHint'), children: _jsx(TextInput, { value: dist, onChange: setDist }) }), _jsxs("div", { className: "hstack", children: [_jsx("div", { className: "flex1 bold", children: t('lang.fDaily') }), _jsx(Toggle, { checked: !!d.dy, onChange: (v) => set({ dy: v }) })] })] }) }));
}
function GrammarForm({ courseId, onClose, item }) {
    const t = useT();
    const init = item?.data;
    const [title, setTitle] = useState(init?.title ?? '');
    const [level, setLevel] = useState(init?.level ?? 'A1');
    const [summary, setSummary] = useState(init?.summary ?? '');
    const [body, setBody] = useState(init?.sections?.[0]?.body ?? '');
    const [examples, setExamples] = useState((init?.sections?.[0]?.examples ?? []).map(([a, b]) => `${a} | ${b}`).join('\n'));
    const [drills, setDrills] = useState((init?.drills ?? []).filter((x) => x.type === 'order').map((x) => (x.type === 'order' ? `${x.t} | ${x.s}` : '')).join('\n'));
    const pairs = (s) => s.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p.length >= 2 && p[0] && p[1]);
    const save = async () => {
        const keepChoice = (init?.drills ?? []).filter((x) => x.type === 'choice');
        const data = {
            title: title.trim(), level, summary: summary.trim(),
            sections: [{ h: title.trim(), body, examples: pairs(examples) }, ...(init?.sections?.slice(1) ?? [])],
            tips: init?.tips ?? [],
            drills: [...keepChoice, ...pairs(drills).map(([a, b]) => ({ type: 'order', t: a, s: b }))],
        };
        await put('langItems', { id: item?.id ?? uid('lg'), courseId, kind: 'grammar', data, createdAt: item?.createdAt ?? Date.now() });
        toast(t('common.saved'));
        onClose();
    };
    return (_jsx(Sheet, { full: true, open: true, onClose: onClose, title: item ? t('lang.editGrammar') : t('lang.addGrammar'), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: t('common.cancel') }), _jsx(Button, { variant: "lingua", onClick: save, disabled: !title.trim(), children: t('common.save') })] }), children: _jsxs("div", { className: "stack", children: [_jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('lang.fTitle'), children: _jsx(TextInput, { value: title, onChange: setTitle }) }), _jsx(Field, { label: t('lang.level'), children: _jsx(Select, { value: level, options: LEVEL_OPTS, onChange: setLevel }) })] }), _jsx(Field, { label: t('lang.fSummary'), children: _jsx(TextInput, { value: summary, onChange: setSummary }) }), _jsx(Field, { label: t('lang.fExplanation'), hint: t('lang.fExplanationHint'), children: _jsx(TextArea, { rows: 7, value: body, onChange: setBody }) }), _jsx(Field, { label: t('lang.fExamples'), hint: t('lang.pairsHint'), children: _jsx(TextArea, { rows: 4, value: examples, onChange: setExamples }) }), _jsx(Field, { label: t('lang.fDrills'), hint: t('lang.drillsHint'), children: _jsx(TextArea, { rows: 4, value: drills, onChange: setDrills }) })] }) }));
}
