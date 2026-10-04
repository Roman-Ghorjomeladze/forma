// Lingua launcher: the list of language courses, plus creating a new course.
import { useMemo, useState } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { newCourse, restorableBuiltins, restoreBuiltin, useCourses, loadCourseContent, loadProgress, vocabStats, type VocabStats } from '../../lib/lingua.js';
import type { LangCourse, LangSide } from '../../lib/models.js';
import { navigate } from '../../lib/router.js';
import { useLiveQuery } from '../../lib/hooks.js';
import { Button, Empty, Field, Screen, Select, Sheet, TextInput, TopBar } from '../../ui/components.js';
import { IconChevron, IconPlus, IconLanguages } from '../../ui/icons.js';
import { Ring } from './lingua-ui.js';

export const LANGUAGES: LangSide[] = [
  { code: 'en', name: 'English', tts: 'en-US' }, { code: 'ru', name: 'Русский', tts: 'ru-RU' }, { code: 'ka', name: 'ქართული', tts: 'ka-GE' },
  { code: 'de', name: 'Deutsch', tts: 'de-DE' }, { code: 'fr', name: 'Français', tts: 'fr-FR' }, { code: 'es', name: 'Español', tts: 'es-ES' },
  { code: 'it', name: 'Italiano', tts: 'it-IT' }, { code: 'pt', name: 'Português', tts: 'pt-PT' }, { code: 'tr', name: 'Türkçe', tts: 'tr-TR' },
  { code: 'uk', name: 'Українська', tts: 'uk-UA' }, { code: 'pl', name: 'Polski', tts: 'pl-PL' }, { code: 'nl', name: 'Nederlands', tts: 'nl-NL' },
  { code: 'el', name: 'Ελληνικά', tts: 'el-GR' }, { code: 'hy', name: 'Հայերեն', tts: 'hy-AM' }, { code: 'az', name: 'Azərbaycan', tts: 'az-AZ' },
  { code: 'he', name: 'עברית', tts: 'he-IL' }, { code: 'ar', name: 'العربية', tts: 'ar-SA' }, { code: 'zh', name: '中文', tts: 'zh-CN' },
  { code: 'ja', name: '日本語', tts: 'ja-JP' }, { code: 'ko', name: '한국어', tts: 'ko-KR' }, { code: 'sv', name: 'Svenska', tts: 'sv-SE' },
];

/** Quick per-course stats for the list and the launcher card (loads each course once per change). */
export function useCourseSummaries(courses: LangCourse[] | undefined): Map<string, VocabStats> | undefined {
  const key = courses?.map((c) => c.id).join(',') ?? '';
  return useLiveQuery(async () => {
    const m = new Map<string, VocabStats>();
    for (const c of courses ?? []) {
      try {
        const [content, prog] = await Promise.all([loadCourseContent(c), loadProgress(c.id)]);
        m.set(c.id, vocabStats(content, prog));
      } catch { /* pack not reachable offline yet */ }
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

  return (
    <Screen className="screen-no-tabs">
      <TopBar large eyebrow={t('lang.eyebrow')} title="Lingua" backTo="/" right={<button type="button" className="iconbtn iconbtn-lingua" aria-label={t('lang.addCourse')} onClick={() => setAdding(true)}><IconPlus /></button>} />
      {courses && courses.length === 0 && <Empty icon={<IconLanguages size={40} />} title={t('lang.noCourses')} text={t('lang.noCoursesText')} action={<Button variant="lingua" onClick={() => setAdding(true)}>{t('lang.addCourse')}</Button>} />}
      <div className="stack">
        {courses?.map((c) => {
          const s = stats?.get(c.id);
          return (
            <button key={c.id} type="button" className="card card-tappable course-card" onClick={() => navigate(`/lang/${c.id}`)}>
              <Ring value={s?.passive ?? 0} max={c.goals.passive} size={58} stroke={6}><span className="ring-flag">{(c.target.code || '?').toUpperCase()}</span></Ring>
              <div className="course-card-main">
                <div className="course-card-title">{c.title}</div>
                <div className="small muted">{t('lang.fromLang', { lang: c.source.name })}</div>
                {s && <div className="small course-card-line">{t('lang.courseLine', { passive: s.passive.toLocaleString(), active: s.active.toLocaleString(), due: s.due })}</div>}
              </div>
              <IconChevron className="muted" />
            </button>
          );
        })}
      </div>
      {restorable.length > 0 && (
        <div className="mt-lg">
          <div className="section-label">{t('lang.builtinRemoved')}</div>
          <div className="hstack" style={{ flexWrap: 'wrap' }}>
            {restorable.map((b) => <Button key={b.id} variant="secondary" size="sm" onClick={() => restoreBuiltin(b.id)}>{t('lang.restoreCourse', { title: b.title })}</Button>)}
          </div>
        </div>
      )}
      <p className="small muted mt-lg">{t('lang.homeFooter')}</p>
      <NewCourseSheet open={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function NewCourseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [target, setTarget] = useState('de');
  const [source, setSource] = useState('en');
  const [custom, setCustom] = useState({ name: '', code: '', tts: '' });
  const [title, setTitle] = useState('');
  const options = [...LANGUAGES.map((l) => ({ value: l.code, label: l.name })), { value: 'other', label: t('lang.otherLanguage') }];
  const side = (code: string): LangSide => (code === 'other' ? { name: custom.name.trim() || '?', code: custom.code.trim() || 'xx', tts: custom.tts.trim() || custom.code.trim() || 'en-US' } : LANGUAGES.find((l) => l.code === code)!);
  const create = async () => {
    const tgt = side(target);
    const c = newCourse({ title: title.trim() || tgt.name, target: tgt, source: side(source) });
    await put('langCourses', c);
    onClose();
    navigate(`/lang/${c.id}/manage`);
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('lang.addCourse')} footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button variant="lingua" onClick={create} disabled={target === source || (target === 'other' && !custom.name.trim())}>{t('lang.create')}</Button></>}>
      <div className="stack">
        <p className="small muted">{t('lang.addCourseText')}</p>
        <Field label={t('lang.iLearn')}><Select value={target} options={options} onChange={setTarget} /></Field>
        {target === 'other' && (
          <div className="grid-2">
            <Field label={t('lang.langName')}><TextInput value={custom.name} onChange={(v) => setCustom({ ...custom, name: v })} placeholder="Suomi" /></Field>
            <Field label={t('lang.voiceCode')} hint={t('lang.voiceCodeHint')}><TextInput value={custom.tts} onChange={(v) => setCustom({ ...custom, tts: v, code: v.split('-')[0] })} placeholder="fi-FI" /></Field>
          </div>
        )}
        <Field label={t('lang.iKnow')}><Select value={source} options={options.filter((o) => o.value !== 'other')} onChange={setSource} /></Field>
        <Field label={t('lang.courseTitle')} hint={t('common.optional')}><TextInput value={title} onChange={setTitle} placeholder={side(target).name} /></Field>
      </div>
    </Sheet>
  );
}
