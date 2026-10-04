import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Grammar: units by level, a unit's explanation (sections, tables, examples, tips) and its drills.
import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { completeUnit, drillKey, drillMistakes, gradeCard, LEVELS, logActivity, saveCards, sameBag, sameSequence, shuffle, tilesOf, unitDone } from '../../lib/lingua.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, Progress, Screen, TopBar } from '../../ui/components.js';
import { IconBook, IconCheck, IconChevron, IconRepeat } from '../../ui/icons.js';
import { isCtx, LevelTag, makeTiles, RichText, SpeakButton, TileBuilder, useLingua, useStopwatch } from './lingua-ui.js';
export function LinguaGrammarListScreen({ cid }) {
    const t = useT();
    const ctx = useLingua(cid);
    if (!isCtx(ctx))
        return ctx;
    const { course, content, prog } = ctx;
    const miss = drillMistakes(content, prog).length;
    return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.grammar'), eyebrow: course.title, backTo: `/lang/${cid}` }), content.grammar.length === 0 && _jsx(Empty, { icon: _jsx(IconBook, { size: 40 }), title: t('lang.noGrammar'), text: t('lang.noGrammarText') }), miss > 0 && _jsx(Button, { variant: "secondary", full: true, className: "mb", onClick: () => navigate(`/lang/${cid}/drill/mistakes`), children: t('lang.fixDrills', { n: miss }) }), LEVELS.map((lv) => {
                const units = content.grammar.filter((u) => u.level === lv);
                if (!units.length)
                    return null;
                const done = units.filter((u) => unitDone(prog, u.id)).length;
                return (_jsxs("section", { className: "mb", children: [_jsx("div", { className: "section-head", children: _jsxs("div", { className: "section-label hstack", style: { margin: 0, gap: 8 }, children: [_jsx(LevelTag, { level: lv }), t('lang.unitsDone', { done, total: units.length })] }) }), _jsx("div", { className: "card card-flush", children: units.map((u, i) => {
                                const p = prog.get(`g:${u.id}`);
                                return (_jsxs("button", { type: "button", className: "row row-tappable", onClick: () => navigate(`/lang/${cid}/grammar/${u.id}`), children: [_jsx("span", { className: `unit-num ${p?.state === 'known' ? 'done' : ''}`, children: p?.state === 'known' ? _jsx(IconCheck, { size: 14 }) : i + 1 }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: u.title }), _jsxs("div", { className: "row-sub", children: [p?.score != null ? t('lang.bestScore', { n: p.score }) + ' · ' : '', u.summary] })] }), _jsx(IconChevron, { className: "muted", size: 18 })] }, u.id));
                            }) })] }, lv));
            })] }));
}
export function LinguaUnitScreen({ cid, uid }) {
    const t = useT();
    const ctx = useLingua(cid);
    if (!isCtx(ctx))
        return ctx;
    const { course, content, prog } = ctx;
    const u = content.unitById.get(uid);
    if (!u)
        return _jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { title: t('lang.grammar'), backTo: `/lang/${cid}/grammar` }), _jsx(Empty, { title: t('lang.notFound') })] });
    const idx = content.grammar.indexOf(u);
    const nextU = content.grammar[idx + 1];
    const p = prog.get(`g:${u.id}`);
    return (_jsxs(Screen, { className: "screen-no-tabs lingua unit-screen", children: [_jsx(TopBar, { title: u.title, eyebrow: _jsxs("span", { className: "hstack", style: { gap: 6 }, children: [_jsx(LevelTag, { level: u.level }), t('lang.grammar')] }), backTo: `/lang/${cid}/grammar` }), _jsx("p", { className: "unit-summary", children: u.summary }), u.sections.map((s, i) => (_jsxs("section", { className: "unit-section", children: [_jsx("h2", { children: s.h }), _jsx(RichText, { text: s.body }), s.table && (_jsx("div", { className: "gtable-wrap", children: _jsxs("table", { className: "gtable", children: [_jsx("thead", { children: _jsx("tr", { children: s.table.head.map((h, k) => _jsx("th", { children: h }, k)) }) }), _jsx("tbody", { children: s.table.rows.map((r, k) => _jsx("tr", { children: r.map((c, j) => (j === 0 ? _jsx("th", { children: c }, j) : _jsx("td", { children: c }, j))) }, k)) })] }) })), s.examples && s.examples.length > 0 && (_jsx("div", { className: "examples", children: s.examples.map(([a, b], k) => (_jsxs("div", { className: "example", children: [_jsxs("div", { className: "flex1", children: [_jsx("div", { className: "ex-t", children: a }), _jsx("div", { className: "ex-s", children: b })] }), _jsx(SpeakButton, { text: a, tag: course.target.tts, rate: course.rate })] }, k))) }))] }, i))), u.tips && u.tips.length > 0 && (_jsxs("div", { className: "card tips-card", children: [_jsx("div", { className: "section-label", children: t('lang.tips') }), _jsx("ul", { children: u.tips.map((x, i) => _jsx("li", { children: _jsx(RichText, { text: x }) }, i)) })] })), _jsxs("div", { className: "unit-cta", children: [u.drills.length > 0 && _jsx(Button, { variant: "lingua", full: true, size: "lg", onClick: () => navigate(`/lang/${cid}/drill/${u.id}`), children: p?.state === 'known' ? t('lang.practiseAgain') : t('lang.practiseUnit', { n: u.drills.length }) }), p?.score != null && _jsx("div", { className: "small muted center mt", children: t('lang.bestScore', { n: p.score }) }), nextU && _jsx(Button, { variant: "ghost", full: true, className: "mt", onClick: () => navigate(`/lang/${cid}/grammar/${nextU.id}`, { replace: true }), children: t('lang.nextUnit', { title: nextU.title }) })] })] }));
}
function prepare(refs) {
    return refs.map((r) => {
        if (r.drill.type === 'order')
            return { ...r, tiles: makeTiles(tilesOf(r.drill.t), r.drill.d ?? []) };
        const d = r.drill;
        return { ...r, options: shuffle(d.options.map((text, i) => ({ text, ok: i === d.answer }))) };
    });
}
export function LinguaDrillScreen({ cid, uid }) {
    const ctx = useLingua(cid);
    if (!isCtx(ctx))
        return ctx;
    return _jsx(DrillSession, { ctx: ctx, uid: uid });
}
function DrillSession({ ctx, uid }) {
    const t = useT();
    const { course, content } = ctx;
    const unit = uid === 'mistakes' ? undefined : content.unitById.get(uid);
    const [qs, setQs] = useState(() => prepare(unit ? unit.drills.map((drill, index) => ({ unit, index, drill })) : shuffle(drillMistakes(content, ctx.prog)).slice(0, 15)));
    const [i, setI] = useState(0);
    const [choice, setChoice] = useState(null);
    const [picked, setPicked] = useState([]);
    const [result, setResult] = useState(null);
    const [score, setScore] = useState(0);
    const local = useRef(new Map(ctx.prog));
    const elapsed = useStopwatch();
    const finished = useRef(false);
    const [saved, setSaved] = useState(null);
    const q = qs[i];
    const done = i >= qs.length;
    const back = unit ? `/lang/${course.id}/grammar/${unit.id}` : `/lang/${course.id}/grammar`;
    useEffect(() => {
        if (!done || finished.current || !qs.length)
            return;
        finished.current = true;
        const pct = Math.round((score / qs.length) * 100);
        setSaved(pct);
        logActivity(course.id, { answers: qs.length, correct: score, drills: qs.length, seconds: elapsed() });
        if (unit)
            completeUnit(course.id, unit.id, pct, ctx.prog.get(`g:${unit.id}`));
    }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
    const record = (ok) => {
        const key = drillKey(q.unit.id, q.index);
        const prev = local.current.get(key);
        // drills only enter the schedule when you get them wrong (or are fixing them)
        if (!ok || prev) {
            const row = gradeCard(prev, course.id, key, ok);
            local.current.set(key, row);
            saveCards([row]);
        }
        if (ok)
            setScore((s) => s + 1);
    };
    const pickChoice = (k) => {
        if (result || !q.options)
            return;
        setChoice(k);
        const ok = q.options[k].ok;
        setResult(ok ? 'right' : 'wrong');
        record(ok);
        const d = q.drill;
        if (d.type === 'choice') {
            const full = d.q.replace('___', d.options[d.answer]);
            say(full, course.target.tts, course.rate);
        }
    };
    const checkOrder = () => {
        if (q.drill.type !== 'order' || !q.tiles)
            return;
        const ans = picked.map((id) => q.tiles.find((x) => x.id === id).text);
        const correct = tilesOf(q.drill.t);
        if (sameSequence(ans, correct)) {
            setResult('right');
            record(true);
            say(q.drill.t, course.target.tts, course.rate);
        }
        else if (sameBag(ans, correct))
            setResult('close');
        else {
            setResult('wrong');
            record(false);
            say(q.drill.t, course.target.tts, course.rate);
        }
    };
    const next = () => { setChoice(null); setPicked([]); setResult(null); setI((x) => x + 1); };
    if (!qs.length)
        return _jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.grammar'), backTo: back }), _jsx(Empty, { title: t('lang.noMistakes') })] });
    if (done) {
        const pct = saved ?? Math.round((score / qs.length) * 100);
        return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: unit ? unit.title : t('lang.fixDrillsTitle'), backTo: back }), _jsxs("div", { className: "card lang-result", children: [_jsxs("div", { className: "result-big", children: [pct, "%"] }), _jsx("div", { className: "muted", children: t('lang.resultLine', { answers: qs.length, correct: score }) }), unit && _jsx("div", { className: `bold mt ${pct >= 80 ? 'c-meals' : ''}`, children: pct >= 80 ? t('lang.unitPassed') : t('lang.unitNotYet') })] }), _jsxs("div", { className: "stack mt-lg", children: [_jsx(Button, { variant: "lingua", full: true, icon: _jsx(IconRepeat, { size: 18 }), onClick: () => { setQs(prepare(unit ? unit.drills.map((drill, index) => ({ unit, index, drill })) : shuffle(drillMistakes(content, local.current)).slice(0, 15))); setI(0); setScore(0); finished.current = false; setSaved(null); }, children: t('lang.again') }), unit && (() => { const n = content.grammar[content.grammar.indexOf(unit) + 1]; return n ? _jsx(Button, { variant: "secondary", full: true, onClick: () => navigate(`/lang/${course.id}/grammar/${n.id}`, { replace: true }), children: t('lang.nextUnit', { title: n.title }) }) : null; })(), _jsx(Button, { variant: "ghost", full: true, onClick: () => navigate(`/lang/${course.id}`, { replace: true }), children: t('common.done') })] })] }));
    }
    const d = q.drill;
    return (_jsxs(Screen, { className: "screen-no-tabs lingua drill-screen", children: [_jsx(TopBar, { title: `${i + 1} / ${qs.length}`, eyebrow: unit ? unit.title : q.unit.title, onBack: () => navigate(back, { replace: true }) }), _jsx(Progress, { value: i, max: qs.length, color: "var(--lingua)", height: 6 }), d.type === 'choice' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "drill-q", children: [_jsx("div", { className: "drill-sentence", children: d.q.split('___').map((part, k, arr) => _jsxs("span", { children: [part, k < arr.length - 1 && _jsx("span", { className: `gap ${result ?? ''}`, children: choice != null && q.options ? q.options[choice].text : '…' })] }, k)) }), d.hint && _jsxs("div", { className: "small muted", children: ["(", d.hint, ")"] }), result && d.tr && _jsx("div", { className: "small muted mt", children: d.tr })] }), _jsx("div", { className: "quiz-options", children: q.options.map((o, k) => {
                            const state = !result ? '' : o.ok ? 'right' : k === choice ? 'wrong' : 'dim';
                            return _jsx("button", { type: "button", className: `quiz-opt ${state}`, onClick: () => pickChoice(k), children: o.text }, k);
                        }) }), result && d.explain && _jsx("div", { className: `build-feedback ${result}`, children: _jsx("div", { className: "small", children: d.explain }) })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "build-prompt", children: [_jsx("div", { className: "build-source", children: d.s }), _jsx("div", { className: "small muted", children: t('lang.buildIn', { lang: course.title }) })] }), _jsx(TileBuilder, { tiles: q.tiles, picked: picked, onChange: setPicked, locked: !!result, state: result ?? undefined }), result && (_jsxs("div", { className: `build-feedback ${result}`, children: [_jsx("div", { className: "bold", children: result === 'right' ? t('lang.correct') : result === 'close' ? t('lang.otherOrder') : t('lang.notQuite') }), _jsxs("div", { className: "hstack", style: { gap: 8 }, children: [_jsx("div", { className: "flex1 feedback-sentence", children: d.t }), _jsx(SpeakButton, { text: d.t, tag: course.target.tts, rate: course.rate })] })] }))] })), _jsxs("div", { className: "build-actions", children: [d.type === 'order' && !result && _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setPicked([]), disabled: !picked.length, children: t('common.clear') }), _jsx(Button, { variant: "lingua", className: "flex1", onClick: checkOrder, disabled: !picked.length, children: t('lang.check') })] }), result === 'close' && _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", className: "flex1", onClick: () => { setResult('wrong'); record(false); }, children: t('lang.iWasWrong') }), _jsx(Button, { variant: "lingua", className: "flex1", onClick: () => { setResult('right'); record(true); }, children: t('lang.mineIsFine') })] }), (result === 'right' || result === 'wrong') && _jsx(Button, { variant: "lingua", full: true, size: "lg", onClick: next, children: t('lang.continue') })] })] }));
}
