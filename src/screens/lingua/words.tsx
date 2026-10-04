// Word library: search, filter by level and status, open a word for its forms, example and actions.
import { useMemo, useState } from 'react';
import { bulkRemove, remove } from '../../lib/db.js';
import { useT } from '../../lib/i18n.js';
import { todayKey } from '../../lib/dates.js';
import { isMature, LEVELS, markKnownCard, norm, pid, saveCards, wKey, type LWord } from '../../lib/lingua.js';
import type { LangProgress } from '../../lib/models.js';
import { Button, Chip, Screen, Sheet, TextInput, TopBar } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconPlus, IconSearch } from '../../ui/icons.js';
import { isCtx, LevelTag, posLabel, SpeakButton, useLingua, type Ctx, type Gate } from './lingua-ui.js';
import { WordForm } from './manage.js';

type Status = 'all' | 'new' | 'learning' | 'passive' | 'active' | 'mine';

export function wordStatus(r?: LangProgress, p?: LangProgress): Exclude<Status, 'all' | 'mine'> {
  if (isMature(p)) return 'active';
  if (isMature(r)) return 'passive';
  if (r || p) return 'learning';
  return 'new';
}

export function LinguaWordsScreen({ cid }: { cid: string }) {
  const t = useT();
  const ctx = useLingua(cid);
  const [q, setQ] = useState('');
  const [level, setLevel] = useState<string>('all');
  const [status, setStatus] = useState<Status>('all');
  const [limit, setLimit] = useState(80);
  const [open, setOpen] = useState<LWord | null>(null);
  const [adding, setAdding] = useState(false);
  const list = useMemo(() => {
    if (!isCtx(ctx)) return [];
    const nq = norm(q);
    return ctx.content.words.filter((w) => {
      if (level !== 'all' && w.l !== level) return false;
      if (status === 'mine' && !w.user) return false;
      if (status !== 'all' && status !== 'mine' && wordStatus(ctx.prog.get(wKey(w.id, 'r')), ctx.prog.get(wKey(w.id, 'p'))) !== status) return false;
      return !nq || norm(w.t).includes(nq) || w.s.toLowerCase().includes(nq);
    });
  }, [ctx, q, level, status]);
  if (!isCtx(ctx)) return ctx as Gate;
  const { course, content } = ctx;
  const levels = LEVELS.filter((l) => content.words.some((w) => w.l === l));

  return (
    <Screen className="screen-no-tabs lingua">
      <TopBar title={t('lang.words')} eyebrow={course.title} backTo={`/lang/${cid}`} right={<button type="button" className="iconbtn iconbtn-lingua" aria-label={t('lang.addWord')} onClick={() => setAdding(true)}><IconPlus /></button>} />
      <div className="search-field"><IconSearch size={18} className="muted" /><TextInput value={q} onChange={(v) => { setQ(v); setLimit(80); }} placeholder={t('lang.searchWords')} /></div>
      <div className="chips mt">
        <Chip tone="lingua" active={level === 'all'} onClick={() => setLevel('all')}>{t('lang.all')}</Chip>
        {levels.map((l) => <Chip key={l} tone="lingua" active={level === l} onClick={() => setLevel(l)}>{l}</Chip>)}
      </div>
      <div className="chips">
        {(['all', 'new', 'learning', 'passive', 'active', 'mine'] as Status[]).map((s) => <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{t(`lang.status.${s}`)}</Chip>)}
      </div>
      <div className="small muted mb">{t('lang.nWords', { n: list.length.toLocaleString() })}</div>
      <div className="card card-flush">
        {list.slice(0, limit).map((w) => {
          const st = wordStatus(ctx.prog.get(wKey(w.id, 'r')), ctx.prog.get(wKey(w.id, 'p')));
          return (
            <button key={w.id} type="button" className="row row-tappable" onClick={() => setOpen(w)}>
              <span className={`st-dot st-${st}`} />
              <div className="row-main"><div className="row-title">{w.t}</div><div className="row-sub">{w.s}</div></div>
              <LevelTag level={w.l} />
            </button>
          );
        })}
      </div>
      {list.length > limit && <Button variant="secondary" full className="mt" onClick={() => setLimit((l) => l + 200)}>{t('lang.showMore')}</Button>}
      <WordSheet ctx={ctx} word={open} onClose={() => setOpen(null)} />
      <WordForm courseId={course.id} open={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

export function WordSheet({ ctx, word, onClose }: { ctx: Ctx; word: LWord | null; onClose: () => void }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const { course, prog } = ctx;
  if (!word) return null;
  const r = prog.get(wKey(word.id, 'r')); const p = prog.get(wKey(word.id, 'p'));
  const st = wordStatus(r, p);
  const suspended = r?.state === 'suspended' || p?.state === 'suspended';
  const known = (dir: 'r' | 'p') => {
    const rows = [markKnownCard(r, course.id, wKey(word.id, 'r'))];
    if (dir === 'p') rows.push(markKnownCard(p, course.id, wKey(word.id, 'p')));
    saveCards(rows);
  };
  const reset = () => bulkRemove('langProgress', [pid(course.id, wKey(word.id, 'r')), pid(course.id, wKey(word.id, 'p'))]);
  const suspend = () => {
    const today = todayKey();
    const mk = (prev: LangProgress | undefined, key: string): LangProgress => ({ ...(prev ?? { id: pid(course.id, key), courseId: course.id, key, ivl: 0, ease: 2.5, reps: 0, lapses: 0, due: today, last: Date.now() }), state: suspended ? 'review' : 'suspended', miss: false });
    saveCards([mk(r, wKey(word.id, 'r')), mk(p, wKey(word.id, 'p'))]);
  };
  const del = async () => {
    if (!(await confirmDialog({ title: t('lang.deleteWord', { w: word.t }), danger: true, confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') }))) return;
    await reset(); await remove('langItems', word.id); onClose();
  };
  return (
    <>
      <Sheet open={!!word && !editing} onClose={onClose} title={<span className="hstack" style={{ gap: 8 }}><LevelTag level={word.l} />{posLabel(t, word.pos)}</span>}>
        <div className="word-sheet">
          <div className="hstack"><div className="face-word flex1" style={{ textAlign: 'left' }}>{word.t}</div><SpeakButton text={word.t} tag={course.target.tts} rate={course.rate} size={24} /></div>
          <div className="face-meaning" style={{ textAlign: 'left' }}>{word.s}</div>
          {word.info && <div className="face-info">{word.info}</div>}
          {word.ex && <div className="face-ex"><div className="hstack" style={{ gap: 6 }}><span className="flex1">{word.ex}</span><SpeakButton text={word.ex} tag={course.target.tts} rate={course.rate} size={16} /></div>{word.exs && <div className="muted">{word.exs}</div>}</div>}
          <div className="word-status">
            <span className={`st-dot st-${st}`} /> {t(`lang.status.${st}`)}
            {r && <span className="muted small"> · {t('lang.nextReview', { date: r.due })}</span>}
            {suspended && <span className="muted small"> · {t('lang.suspended')}</span>}
          </div>
          <div className="grid-2 mt">
            <Button variant="secondary" size="sm" onClick={() => known('r')}>{t('lang.iUnderstandIt')}</Button>
            <Button variant="secondary" size="sm" onClick={() => known('p')}>{t('lang.iCanSayIt')}</Button>
            <Button variant="secondary" size="sm" onClick={reset}>{t('lang.resetWord')}</Button>
            <Button variant="secondary" size="sm" onClick={suspend}>{suspended ? t('lang.unsuspend') : t('lang.suspend')}</Button>
          </div>
          {word.user && (
            <div className="grid-2 mt">
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>{t('common.edit')}</Button>
              <Button variant="danger" size="sm" onClick={del}>{t('common.delete')}</Button>
            </div>
          )}
        </div>
      </Sheet>
      {editing && <WordForm courseId={course.id} word={word} open onClose={() => { setEditing(false); onClose(); }} />}
    </>
  );
}
