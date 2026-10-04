import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Lingua launcher: the list of language courses, plus creating a new course.
import { useMemo, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { newCourse, restorableBuiltins, restoreBuiltin, useCourses, loadCourseContent, loadProgress, vocabStats } from '../../lib/lingua.js';
import { navigate } from '../../lib/router.js';
import { useLiveQuery } from '../../lib/hooks.js';
import { Button, Empty, Field, Screen, Select, Sheet, TextInput, TopBar } from '../../ui/components.js';
import { IconChevron, IconPlus, IconLanguages } from '../../ui/icons.js';
import { Ring } from './lingua-ui.js';
export const LANGUAGES = [
    { code: 'en', name: 'English', tts: 'en-US' }, { code: 'ru', name: 'Русский', tts: 'ru-RU' }, { code: 'ka', name: 'ქართული', tts: 'ka-GE' },
    { code: 'de', name: 'Deutsch', tts: 'de-DE' }, { code: 'fr', name: 'Français', tts: 'fr-FR' }, { code: 'es', name: 'Español', tts: 'es-ES' },
    { code: 'it', name: 'Italiano', tts: 'it-IT' }, { code: 'pt', name: 'Português', tts: 'pt-PT' }, { code: 'tr', name: 'Türkçe', tts: 'tr-TR' },
    { code: 'uk', name: 'Українська', tts: 'uk-UA' }, { code: 'pl', name: 'Polski', tts: 'pl-PL' }, { code: 'nl', name: 'Nederlands', tts: 'nl-NL' },
    { code: 'el', name: 'Ελληνικά', tts: 'el-GR' }, { code: 'hy', name: 'Հայերեն', tts: 'hy-AM' }, { code: 'az', name: 'Azərbaycan', tts: 'az-AZ' },
    { code: 'he', name: 'עברית', tts: 'he-IL' }, { code: 'ar', name: 'العربية', tts: 'ar-SA' }, { code: 'zh', name: '中文', tts: 'zh-CN' },
    { code: 'ja', name: '日本語', tts: 'ja-JP' }, { code: 'ko', name: '한국어', tts: 'ko-KR' }, { code: 'sv', name: 'Svenska', tts: 'sv-SE' },
];
/** Quick per-course stats for the list and the launcher card (loads each course once per change). */
export function useCourseSummaries(courses) {
    const key = courses?.map((c) => c.id).join(',') ?? '';
    return useLiveQuery(async () => {
        const m = new Map();
        for (const c of courses ?? []) {
            try {
                const [content, prog] = await Promise.all([loadCourseContent(c), loadProgress(c.id)]);
                m.set(c.id, vocabStats(content, prog));
            }
            catch { /* pack not reachable offline yet */ }
        }
        return m;
    }, ['langProgress', 'langItems', 'langCourses'], [key]);
}
export function LinguaHomeScreen() {
    const t = useT();
    const courses = useCourses();
    const stats = useCourseSummaries(courses);
    const [adding, setAdding] = useState(false);
    const restorable = useMemo(() => (courses ? restorableBuiltins(courses) : []), [courses]);
    return (_jsxs(Screen, { className: "screen-no-tabs", children: [_jsx(TopBar, { large: true, eyebrow: t('lang.eyebrow'), title: "Lingua", backTo: "/", right: _jsx("button", { type: "button", className: "iconbtn iconbtn-lingua", "aria-label": t('lang.addCourse'), onClick: () => setAdding(true), children: _jsx(IconPlus, {}) }) }), courses && courses.length === 0 && _jsx(Empty, { icon: _jsx(IconLanguages, { size: 40 }), title: t('lang.noCourses'), text: t('lang.noCoursesText'), action: _jsx(Button, { variant: "lingua", onClick: () => setAdding(true), children: t('lang.addCourse') }) }), _jsx("div", { className: "stack", children: courses?.map((c) => {
                    const s = stats?.get(c.id);
                    return (_jsxs("button", { type: "button", className: "card card-tappable course-card", onClick: () => navigate(`/lang/${c.id}`), children: [_jsx(Ring, { value: s?.passive ?? 0, max: c.goals.passive, size: 58, stroke: 6, children: _jsx("span", { className: "ring-flag", children: (c.target.code || '?').toUpperCase() }) }), _jsxs("div", { className: "course-card-main", children: [_jsx("div", { className: "course-card-title", children: c.title }), _jsx("div", { className: "small muted", children: t('lang.fromLang', { lang: c.source.name }) }), s && _jsx("div", { className: "small course-card-line", children: t('lang.courseLine', { passive: s.passive.toLocaleString(), active: s.active.toLocaleString(), due: s.due }) })] }), _jsx(IconChevron, { className: "muted" })] }, c.id));
                }) }), restorable.length > 0 && (_jsxs("div", { className: "mt-lg", children: [_jsx("div", { className: "section-label", children: t('lang.builtinRemoved') }), _jsx("div", { className: "hstack", style: { flexWrap: 'wrap' }, children: restorable.map((b) => _jsx(Button, { variant: "secondary", size: "sm", onClick: () => restoreBuiltin(b.id), children: t('lang.restoreCourse', { title: b.title }) }, b.id)) })] })), _jsx("p", { className: "small muted mt-lg", children: t('lang.homeFooter') }), _jsx(NewCourseSheet, { open: adding, onClose: () => setAdding(false) })] }));
}
function NewCourseSheet({ open, onClose }) {
    const t = useT();
    const [target, setTarget] = useState('de');
    const [source, setSource] = useState('en');
    const [custom, setCustom] = useState({ name: '', code: '', tts: '' });
    const [title, setTitle] = useState('');
    const options = [...LANGUAGES.map((l) => ({ value: l.code, label: l.name })), { value: 'other', label: t('lang.otherLanguage') }];
    const side = (code) => (code === 'other' ? { name: custom.name.trim() || '?', code: custom.code.trim() || 'xx', tts: custom.tts.trim() || custom.code.trim() || 'en-US' } : LANGUAGES.find((l) => l.code === code));
    const create = async () => {
        const tgt = side(target);
        const c = newCourse({ title: title.trim() || tgt.name, target: tgt, source: side(source) });
        await put('langCourses', c);
        onClose();
        navigate(`/lang/${c.id}/manage`);
    };
    return (_jsx(Sheet, { open: open, onClose: onClose, title: t('lang.addCourse'), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: t('common.cancel') }), _jsx(Button, { variant: "lingua", onClick: create, disabled: target === source || (target === 'other' && !custom.name.trim()), children: t('lang.create') })] }), children: _jsxs("div", { className: "stack", children: [_jsx("p", { className: "small muted", children: t('lang.addCourseText') }), _jsx(Field, { label: t('lang.iLearn'), children: _jsx(Select, { value: target, options: options, onChange: setTarget }) }), target === 'other' && (_jsxs("div", { className: "grid-2", children: [_jsx(Field, { label: t('lang.langName'), children: _jsx(TextInput, { value: custom.name, onChange: (v) => setCustom({ ...custom, name: v }), placeholder: "Suomi" }) }), _jsx(Field, { label: t('lang.voiceCode'), hint: t('lang.voiceCodeHint'), children: _jsx(TextInput, { value: custom.tts, onChange: (v) => setCustom({ ...custom, tts: v, code: v.split('-')[0] }), placeholder: "fi-FI" }) })] })), _jsx(Field, { label: t('lang.iKnow'), children: _jsx(Select, { value: source, options: options.filter((o) => o.value !== 'other'), onChange: setSource }) }), _jsx(Field, { label: t('lang.courseTitle'), hint: t('common.optional'), children: _jsx(TextInput, { value: title, onChange: setTitle, placeholder: side(target).name }) })] }) }));
}
