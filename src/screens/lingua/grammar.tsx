// Grammar: units by level, a unit's explanation (sections, tables, examples, tips) and its drills.
import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { completeUnit, drillKey, drillMistakes, gradeCard, LEVELS, logActivity, saveCards, sameBag, sameSequence, shuffle, tilesOf, unitDone, type DrillRef, type LGrammarUnit, type ProgressMap } from '../../lib/lingua.js';
import { navigate } from '../../lib/router.js';
import { Button, Empty, Progress, Screen, TopBar } from '../../ui/components.js';
import { IconBook, IconCheck, IconChevron, IconRepeat } from '../../ui/icons.js';
import { isCtx, LevelTag, makeTiles, RichText, SpeakButton, TileBuilder, useLingua, useStopwatch, type Ctx, type Tile, type Gate } from './lingua-ui.js';

export function LinguaGrammarListScreen({ cid }: { cid: string }) {
  const t = useT();
  const ctx = useLingua(cid);
  if (!isCtx(ctx)) return ctx as Gate;
  const { course, content, prog } = ctx;
  const miss = drillMistakes(content, prog).length;
  return (
    <Screen className="screen-no-tabs lingua">
      <TopBar title={t('lang.grammar')} eyebrow={course.title} backTo={`/lang/${cid}`} />
      {content.grammar.length === 0 && <Empty icon={<IconBook size={40} />} title={t('lang.noGrammar')} text={t('lang.noGrammarText')} />}
      {miss > 0 && <Button variant="secondary" full className="mb" onClick={() => navigate(`/lang/${cid}/drill/mistakes`)}>{t('lang.fixDrills', { n: miss })}</Button>}
      {LEVELS.map((lv) => {
        const units = content.grammar.filter((u) => u.level === lv);
        if (!units.length) return null;
        const done = units.filter((u) => unitDone(prog, u.id)).length;
        return (
          <section key={lv} className="mb">
            <div className="section-head"><div className="section-label hstack" style={{ margin: 0, gap: 8 }}><LevelTag level={lv} />{t('lang.unitsDone', { done, total: units.length })}</div></div>
            <div className="card card-flush">
              {units.map((u, i) => {
                const p = prog.get(`g:${u.id}`);
                return (
                  <button key={u.id} type="button" className="row row-tappable" onClick={() => navigate(`/lang/${cid}/grammar/${u.id}`)}>
                    <span className={`unit-num ${p?.state === 'known' ? 'done' : ''}`}>{p?.state === 'known' ? <IconCheck size={14} /> : i + 1}</span>
                    <div className="row-main"><div className="row-title">{u.title}</div><div className="row-sub">{p?.score != null ? t('lang.bestScore', { n: p.score }) + ' · ' : ''}{u.summary}</div></div>
                    <IconChevron className="muted" size={18} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </Screen>
  );
}

export function LinguaUnitScreen({ cid, uid }: { cid: string; uid: string }) {
  const t = useT();
  const ctx = useLingua(cid);
  if (!isCtx(ctx)) return ctx as Gate;
  const { course, content, prog } = ctx;
  const u = content.unitById.get(uid);
  if (!u) return <Screen className="screen-no-tabs"><TopBar title={t('lang.grammar')} backTo={`/lang/${cid}/grammar`} /><Empty title={t('lang.notFound')} /></Screen>;
  const idx = content.grammar.indexOf(u);
  const nextU = content.grammar[idx + 1];
  const p = prog.get(`g:${u.id}`);
  return (
    <Screen className="screen-no-tabs lingua unit-screen">
      <TopBar title={u.title} eyebrow={<span className="hstack" style={{ gap: 6 }}><LevelTag level={u.level} />{t('lang.grammar')}</span>} backTo={`/lang/${cid}/grammar`} />
      <p className="unit-summary">{u.summary}</p>
      {u.sections.map((s, i) => (
        <section key={i} className="unit-section">
          <h2>{s.h}</h2>
          <RichText text={s.body} />
          {s.table && (
            <div className="gtable-wrap">
              <table className="gtable">
                <thead><tr>{s.table.head.map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
                <tbody>{s.table.rows.map((r, k) => <tr key={k}>{r.map((c, j) => (j === 0 ? <th key={j}>{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
              </table>
            </div>
          )}
          {s.examples && s.examples.length > 0 && (
            <div className="examples">
              {s.examples.map(([a, b], k) => (
                <div key={k} className="example">
                  <div className="flex1"><div className="ex-t">{a}</div><div className="ex-s">{b}</div></div>
                  <SpeakButton text={a} tag={course.target.tts} rate={course.rate} />
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
      {u.tips && u.tips.length > 0 && (
        <div className="card tips-card">
          <div className="section-label">{t('lang.tips')}</div>
          <ul>{u.tips.map((x, i) => <li key={i}><RichText text={x} /></li>)}</ul>
        </div>
      )}
      <div className="unit-cta">
        {u.drills.length > 0 && <Button variant="lingua" full size="lg" onClick={() => navigate(`/lang/${cid}/drill/${u.id}`)}>{p?.state === 'known' ? t('lang.practiseAgain') : t('lang.practiseUnit', { n: u.drills.length })}</Button>}
        {p?.score != null && <div className="small muted center mt">{t('lang.bestScore', { n: p.score })}</div>}
        {nextU && <Button variant="ghost" full className="mt" onClick={() => navigate(`/lang/${cid}/grammar/${nextU.id}`, { replace: true })}>{t('lang.nextUnit', { title: nextU.title })}</Button>}
      </div>
    </Screen>
  );
}

// ---- drills ----------------------------------------------------------------------------------------
interface DQ extends DrillRef { tiles?: Tile[]; options?: { text: string; ok: boolean }[] }

function prepare(refs: DrillRef[]): DQ[] {
  return refs.map((r) => {
    if (r.drill.type === 'order') return { ...r, tiles: makeTiles(tilesOf(r.drill.t), r.drill.d ?? []) };
    const d = r.drill;
    return { ...r, options: shuffle(d.options.map((text, i) => ({ text, ok: i === d.answer }))) };
  });
}

export function LinguaDrillScreen({ cid, uid }: { cid: string; uid: string }) {
  const ctx = useLingua(cid);
  if (!isCtx(ctx)) return ctx as Gate;
  return <DrillSession ctx={ctx} uid={uid} />;
}

function DrillSession({ ctx, uid }: { ctx: Ctx; uid: string }) {
  const t = useT();
  const { course, content } = ctx;
  const unit: LGrammarUnit | undefined = uid === 'mistakes' ? undefined : content.unitById.get(uid);
  const [qs, setQs] = useState<DQ[]>(() => prepare(unit ? unit.drills.map((drill, index) => ({ unit, index, drill })) : shuffle(drillMistakes(content, ctx.prog)).slice(0, 15)));
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<null | 'right' | 'wrong' | 'close'>(null);
  const [score, setScore] = useState(0);
  const local = useRef<ProgressMap>(new Map(ctx.prog));
  const elapsed = useStopwatch();
  const finished = useRef(false);
  const [saved, setSaved] = useState<number | null>(null);
  const q = qs[i];
  const done = i >= qs.length;
  const back = unit ? `/lang/${course.id}/grammar/${unit.id}` : `/lang/${course.id}/grammar`;

  useEffect(() => {
    if (!done || finished.current || !qs.length) return;
    finished.current = true;
    const pct = Math.round((score / qs.length) * 100);
    setSaved(pct);
    logActivity(course.id, { answers: qs.length, correct: score, drills: qs.length, seconds: elapsed() });
    if (unit) completeUnit(course.id, unit.id, pct, ctx.prog.get(`g:${unit.id}`));
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = (ok: boolean) => {
    const key = drillKey(q.unit.id, q.index);
    const prev = local.current.get(key);
    // drills only enter the schedule when you get them wrong (or are fixing them)
    if (!ok || prev) {
      const row = gradeCard(prev, course.id, key, ok);
      local.current.set(key, row);
      saveCards([row]);
    }
    if (ok) setScore((s) => s + 1);
  };

  const pickChoice = (k: number) => {
    if (result || !q.options) return;
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
    if (q.drill.type !== 'order' || !q.tiles) return;
    const ans = picked.map((id) => q.tiles!.find((x) => x.id === id)!.text);
    const correct = tilesOf(q.drill.t);
    if (sameSequence(ans, correct)) { setResult('right'); record(true); say(q.drill.t, course.target.tts, course.rate); }
    else if (sameBag(ans, correct)) setResult('close');
    else { setResult('wrong'); record(false); say(q.drill.t, course.target.tts, course.rate); }
  };
  const next = () => { setChoice(null); setPicked([]); setResult(null); setI((x) => x + 1); };

  if (!qs.length) return <Screen className="screen-no-tabs lingua"><TopBar title={t('lang.grammar')} backTo={back} /><Empty title={t('lang.noMistakes')} /></Screen>;

  if (done) {
    const pct = saved ?? Math.round((score / qs.length) * 100);
    return (
      <Screen className="screen-no-tabs lingua">
        <TopBar title={unit ? unit.title : t('lang.fixDrillsTitle')} backTo={back} />
        <div className="card lang-result">
          <div className="result-big">{pct}%</div>
          <div className="muted">{t('lang.resultLine', { answers: qs.length, correct: score })}</div>
          {unit && <div className={`bold mt ${pct >= 80 ? 'c-meals' : ''}`}>{pct >= 80 ? t('lang.unitPassed') : t('lang.unitNotYet')}</div>}
        </div>
        <div className="stack mt-lg">
          <Button variant="lingua" full icon={<IconRepeat size={18} />} onClick={() => { setQs(prepare(unit ? unit.drills.map((drill, index) => ({ unit, index, drill })) : shuffle(drillMistakes(content, local.current)).slice(0, 15))); setI(0); setScore(0); finished.current = false; setSaved(null); }}>{t('lang.again')}</Button>
          {unit && (() => { const n = content.grammar[content.grammar.indexOf(unit) + 1]; return n ? <Button variant="secondary" full onClick={() => navigate(`/lang/${course.id}/grammar/${n.id}`, { replace: true })}>{t('lang.nextUnit', { title: n.title })}</Button> : null; })()}
          <Button variant="ghost" full onClick={() => navigate(`/lang/${course.id}`, { replace: true })}>{t('common.done')}</Button>
        </div>
      </Screen>
    );
  }

  const d = q.drill;
  return (
    <Screen className="screen-no-tabs lingua drill-screen">
      <TopBar title={`${i + 1} / ${qs.length}`} eyebrow={unit ? unit.title : q.unit.title} onBack={() => navigate(back, { replace: true })} />
      <Progress value={i} max={qs.length} color="var(--lingua)" height={6} />
      {d.type === 'choice' ? (
        <>
          <div className="drill-q">
            <div className="drill-sentence">{d.q.split('___').map((part, k, arr) => <span key={k}>{part}{k < arr.length - 1 && <span className={`gap ${result ?? ''}`}>{choice != null && q.options ? q.options[choice].text : '…'}</span>}</span>)}</div>
            {d.hint && <div className="small muted">({d.hint})</div>}
            {result && d.tr && <div className="small muted mt">{d.tr}</div>}
          </div>
          <div className="quiz-options">
            {q.options!.map((o, k) => {
              const state = !result ? '' : o.ok ? 'right' : k === choice ? 'wrong' : 'dim';
              return <button key={k} type="button" className={`quiz-opt ${state}`} onClick={() => pickChoice(k)}>{o.text}</button>;
            })}
          </div>
          {result && d.explain && <div className={`build-feedback ${result}`}><div className="small">{d.explain}</div></div>}
        </>
      ) : (
        <>
          <div className="build-prompt"><div className="build-source">{d.s}</div><div className="small muted">{t('lang.buildIn', { lang: course.title })}</div></div>
          <TileBuilder tiles={q.tiles!} picked={picked} onChange={setPicked} locked={!!result} state={result ?? undefined} />
          {result && (
            <div className={`build-feedback ${result}`}>
              <div className="bold">{result === 'right' ? t('lang.correct') : result === 'close' ? t('lang.otherOrder') : t('lang.notQuite')}</div>
              <div className="hstack" style={{ gap: 8 }}><div className="flex1 feedback-sentence">{d.t}</div><SpeakButton text={d.t} tag={course.target.tts} rate={course.rate} /></div>
            </div>
          )}
        </>
      )}
      <div className="build-actions">
        {d.type === 'order' && !result && <>
          <Button variant="secondary" onClick={() => setPicked([])} disabled={!picked.length}>{t('common.clear')}</Button>
          <Button variant="lingua" className="flex1" onClick={checkOrder} disabled={!picked.length}>{t('lang.check')}</Button>
        </>}
        {result === 'close' && <>
          <Button variant="secondary" className="flex1" onClick={() => { setResult('wrong'); record(false); }}>{t('lang.iWasWrong')}</Button>
          <Button variant="lingua" className="flex1" onClick={() => { setResult('right'); record(true); }}>{t('lang.mineIsFine')}</Button>
        </>}
        {(result === 'right' || result === 'wrong') && <Button variant="lingua" full size="lg" onClick={next}>{t('lang.continue')}</Button>}
      </div>
    </Screen>
  );
}
