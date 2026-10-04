import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { drillMistakes, mistakeCards } from '../../lib/lingua.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, Screen, TopBar } from '../../ui/components.js';
import { IconCheck, IconClose } from '../../ui/icons.js';
import { isCtx, SpeakButton, useLingua } from './lingua-ui.js';
export function LinguaMistakesScreen({ cid }) {
    const t = useT();
    const ctx = useLingua(cid);
    if (!isCtx(ctx))
        return ctx;
    const { course, content, prog } = ctx;
    const words = mistakeCards(content, prog);
    const sentences = content.sentences.filter((s) => prog.get(`s:${s.id}`)?.miss);
    const spoken = content.sentences.filter((s) => prog.get(`sp:${s.id}`)?.miss);
    const drills = drillMistakes(content, prog);
    const clear = (key) => { const p = prog.get(key); if (p)
        put('langProgress', { ...p, miss: false }); };
    const total = words.length + sentences.length + spoken.length + drills.length;
    const tl = course.target.code.toUpperCase();
    const sl = course.source.code.toUpperCase();
    return (_jsxs(Screen, { className: "screen-no-tabs lingua", children: [_jsx(TopBar, { title: t('lang.mistakes'), eyebrow: course.title, backTo: `/lang/${cid}` }), total === 0 && _jsx(Empty, { icon: _jsx(IconCheck, { size: 40 }), title: t('lang.noMistakes'), text: t('lang.noMistakesText') }), total > 0 && _jsx("p", { className: "small muted mb", children: t('lang.mistakesIntro') }), words.length > 0 && (_jsx(Block, { title: t('lang.wordsN', { n: words.length }), action: _jsx(Button, { variant: "lingua", size: "sm", onClick: () => navigate(`/lang/${cid}/cards?mode=mistakes&dir=mix`), children: t('lang.fix') }), children: words.slice(0, 40).map((c) => (_jsxs("div", { className: "row", children: [_jsx("span", { className: "dir-pill", children: c.dir === 'r' ? `${tl}→${sl}` : `${sl}→${tl}` }), _jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: c.word.t }), _jsx("div", { className: "row-sub", children: c.word.s })] }), _jsx(SpeakButton, { text: c.word.t, tag: course.target.tts, rate: course.rate }), _jsx("button", { type: "button", className: "iconbtn-sm", "aria-label": t('lang.removeMistake'), onClick: () => clear(`w:${c.word.id}:${c.dir}`), children: _jsx(IconClose, { size: 16 }) })] }, c.word.id + c.dir))) })), sentences.length > 0 && (_jsx(Block, { title: t('lang.sentencesN', { n: sentences.length }), action: _jsx(Button, { variant: "lingua", size: "sm", onClick: () => navigate(`/lang/${cid}/build?go=1&mistakes=1`), children: t('lang.fix') }), children: sentences.slice(0, 30).map((s) => (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "phrase-t", children: s.t }), _jsx("div", { className: "row-sub", children: s.s })] }), _jsx("button", { type: "button", className: "iconbtn-sm", "aria-label": t('lang.removeMistake'), onClick: () => clear(`s:${s.id}`), children: _jsx(IconClose, { size: 16 }) })] }, s.id))) })), spoken.length > 0 && (_jsx(Block, { title: t('lang.spokenN', { n: spoken.length }), action: _jsx(Button, { variant: "lingua", size: "sm", onClick: () => navigate(`/lang/${cid}/speak?go=1&mistakes=1`), children: t('lang.fix') }), children: spoken.slice(0, 30).map((s) => (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "phrase-t", children: s.t }), _jsx("div", { className: "row-sub", children: s.s })] }), _jsx("button", { type: "button", className: "iconbtn-sm", "aria-label": t('lang.removeMistake'), onClick: () => clear(`sp:${s.id}`), children: _jsx(IconClose, { size: 16 }) })] }, s.id))) })), drills.length > 0 && (_jsx(Block, { title: t('lang.drillsN', { n: drills.length }), action: _jsx(Button, { variant: "lingua", size: "sm", onClick: () => navigate(`/lang/${cid}/drill/mistakes`), children: t('lang.fix') }), children: drills.slice(0, 30).map((d) => (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "row-main", children: [_jsx("div", { className: "row-title", children: d.drill.type === 'choice' ? d.drill.q.replace('___', '…') : d.drill.t }), _jsx("div", { className: "row-sub", children: d.unit.title })] }), _jsx("button", { type: "button", className: "iconbtn-sm", "aria-label": t('lang.removeMistake'), onClick: () => clear(`gd:${d.unit.id}#${d.index}`), children: _jsx(IconClose, { size: 16 }) })] }, d.unit.id + d.index))) }))] }));
}
function Block({ title, action, children }) {
    return (_jsxs("section", { className: "mb", children: [_jsxs("div", { className: "section-head", children: [_jsx("div", { className: "section-label", style: { margin: 0 }, children: title }), action] }), _jsx("div", { className: "card card-flush", children: children })] }));
}
