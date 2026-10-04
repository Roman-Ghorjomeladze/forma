// The mistakes bank: everything you got wrong, waiting to be fixed (cleared by a right answer on a later day).
import { type ReactNode } from 'react';
import { put } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { drillMistakes, mistakeCards } from '../../lib/lingua.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, Screen, TopBar } from '../../ui/components.js';
import { IconCheck, IconClose } from '../../ui/icons.js';
import { isCtx, SpeakButton, useLingua, type Gate } from './lingua-ui.js';

export function LinguaMistakesScreen({ cid }: { cid: string }) {
  const t = useT();
  const ctx = useLingua(cid);
  if (!isCtx(ctx)) return ctx as Gate;
  const { course, content, prog } = ctx;
  const words = mistakeCards(content, prog);
  const sentences = content.sentences.filter((s) => prog.get(`s:${s.id}`)?.miss);
  const spoken = content.sentences.filter((s) => prog.get(`sp:${s.id}`)?.miss);
  const drills = drillMistakes(content, prog);
  const clear = (key: string) => { const p = prog.get(key); if (p) put('langProgress', { ...p, miss: false }); };
  const total = words.length + sentences.length + spoken.length + drills.length;
  const tl = course.target.code.toUpperCase(); const sl = course.source.code.toUpperCase();

  return (
    <Screen className="screen-no-tabs lingua">
      <TopBar title={t('lang.mistakes')} eyebrow={course.title} backTo={`/lang/${cid}`} />
      {total === 0 && <Empty icon={<IconCheck size={40} />} title={t('lang.noMistakes')} text={t('lang.noMistakesText')} />}
      {total > 0 && <p className="small muted mb">{t('lang.mistakesIntro')}</p>}

      {words.length > 0 && (
        <Block title={t('lang.wordsN', { n: words.length })} action={<Button variant="lingua" size="sm" onClick={() => navigate(`/lang/${cid}/cards?mode=mistakes&dir=mix`)}>{t('lang.fix')}</Button>}>
          {words.slice(0, 40).map((c) => (
            <div key={c.word.id + c.dir} className="row">
              <span className="dir-pill">{c.dir === 'r' ? `${tl}→${sl}` : `${sl}→${tl}`}</span>
              <div className="row-main"><div className="row-title">{c.word.t}</div><div className="row-sub">{c.word.s}</div></div>
              <SpeakButton text={c.word.t} tag={course.target.tts} rate={course.rate} />
              <button type="button" className="iconbtn-sm" aria-label={t('lang.removeMistake')} onClick={() => clear(`w:${c.word.id}:${c.dir}`)}><IconClose size={16} /></button>
            </div>
          ))}
        </Block>
      )}
      {sentences.length > 0 && (
        <Block title={t('lang.sentencesN', { n: sentences.length })} action={<Button variant="lingua" size="sm" onClick={() => navigate(`/lang/${cid}/build?go=1&mistakes=1`)}>{t('lang.fix')}</Button>}>
          {sentences.slice(0, 30).map((s) => (
            <div key={s.id} className="row">
              <div className="row-main"><div className="phrase-t">{s.t}</div><div className="row-sub">{s.s}</div></div>
              <button type="button" className="iconbtn-sm" aria-label={t('lang.removeMistake')} onClick={() => clear(`s:${s.id}`)}><IconClose size={16} /></button>
            </div>
          ))}
        </Block>
      )}
      {spoken.length > 0 && (
        <Block title={t('lang.spokenN', { n: spoken.length })} action={<Button variant="lingua" size="sm" onClick={() => navigate(`/lang/${cid}/speak?go=1&mistakes=1`)}>{t('lang.fix')}</Button>}>
          {spoken.slice(0, 30).map((s) => (
            <div key={s.id} className="row">
              <div className="row-main"><div className="phrase-t">{s.t}</div><div className="row-sub">{s.s}</div></div>
              <button type="button" className="iconbtn-sm" aria-label={t('lang.removeMistake')} onClick={() => clear(`sp:${s.id}`)}><IconClose size={16} /></button>
            </div>
          ))}
        </Block>
      )}
      {drills.length > 0 && (
        <Block title={t('lang.drillsN', { n: drills.length })} action={<Button variant="lingua" size="sm" onClick={() => navigate(`/lang/${cid}/drill/mistakes`)}>{t('lang.fix')}</Button>}>
          {drills.slice(0, 30).map((d) => (
            <div key={d.unit.id + d.index} className="row">
              <div className="row-main"><div className="row-title">{d.drill.type === 'choice' ? d.drill.q.replace('___', '…') : d.drill.t}</div><div className="row-sub">{d.unit.title}</div></div>
              <button type="button" className="iconbtn-sm" aria-label={t('lang.removeMistake')} onClick={() => clear(`gd:${d.unit.id}#${d.index}`)}><IconClose size={16} /></button>
            </div>
          ))}
        </Block>
      )}
    </Screen>
  );
}

function Block({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  return (
    <section className="mb">
      <div className="section-head"><div className="section-label" style={{ margin: 0 }}>{title}</div>{action}</div>
      <div className="card card-flush">{children}</div>
    </section>
  );
}
