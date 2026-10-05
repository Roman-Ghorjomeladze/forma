// Shared Lingua UI: swipeable flip card, word-tile sentence builder, speak button, light rich text.
import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useT } from '../../lib/i18n.js';
import { say } from '../../lib/lingua-speech.js';
import { useCourse, useCourseContent, useProgress, type CourseContent, type ProgressMap } from '../../lib/lingua.js';
import type { LangCourse } from '../../lib/models.js';
import { Empty, Screen, TopBar } from '../../ui/components.js';
import { IconVolume } from '../../ui/icons.js';

// ---- data gate -----------------------------------------------------------------------------------
export interface Ctx { course: LangCourse; content: CourseContent; prog: ProgressMap }

/** Loads course + content + progress; renders a loading/error screen until everything is there. */
export type Gate = ReactElement;
export function useLingua(cid: string): Ctx | Gate {
  const t = useT();
  const course = useCourse(cid);
  const content = useCourseContent(course);
  const prog = useProgress(course?.id);
  if (course === null) return <Screen className="screen-no-tabs"><TopBar title="Lingua" backTo="/lang" /><Empty title={t('lang.notFound')} /></Screen>;
  if (content && 'error' in content) return <Screen className="screen-no-tabs"><TopBar title={course?.title ?? 'Lingua'} backTo="/lang" /><Empty title={t('lang.loadFailed')} text={content.error} /></Screen>;
  if (!course || !content || !prog) return <Screen className="screen-no-tabs"><div className="lang-loading"><span className="spinner" />{t('lang.loading')}</div></Screen>;
  return { course, content, prog };
}
export const isCtx = (x: unknown): x is Ctx => !!x && typeof x === 'object' && 'course' in (x as object) && 'prog' in (x as object);

// ---- speak button ---------------------------------------------------------------------------------
export function SpeakButton({ text, tag, rate = 1, size = 18, className = '', label }: { text: string; tag: string; rate?: number; size?: number; className?: string; label?: string }) {
  const t = useT();
  const [on, setOn] = useState(false);
  return (
    <button type="button" className={`speak-btn ${on ? 'on' : ''} ${className}`} aria-label={label ?? t('lang.listen')}
      onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); setOn(true); say(text, tag, rate, () => setOn(false)); window.setTimeout(() => setOn(false), 6000); }}>
      <IconVolume size={size} />
    </button>
  );
}

// ---- rich text (paragraphs, "- " bullets, **bold**) ------------------------------------------------
function inline(s: string): ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|~~[^~]+~~)/g);
  return parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith('~~') && p.endsWith('~~') ? <s key={i}>{p.slice(2, -2)}</s> : p));
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => { if (bullets.length) { blocks.push(<ul key={blocks.length}>{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>); bullets = []; } };
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l) { flush(); continue; }
    if (/^[-•]\s+/.test(l)) bullets.push(l.replace(/^[-•]\s+/, ''));
    else { flush(); blocks.push(<p key={blocks.length}>{inline(l)}</p>); }
  }
  flush();
  return <div className="rich">{blocks}</div>;
}

// ---- swipeable flashcard ------------------------------------------------------------------------------
export function SwipeCard({ front, back, showBoth, onAnswer, flipped, onFlip, hintLeft, hintRight, disabled }: {
  front: ReactNode; back: ReactNode; showBoth: boolean; flipped: boolean; onFlip: () => void;
  onAnswer: (ok: boolean) => void; hintLeft: string; hintRight: string; disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  // latest props for the native listeners below
  const live = useRef({ disabled, showBoth, onFlip, onAnswer });
  live.current = { disabled, showBoth, onFlip, onAnswer };

  // Native touch + mouse handling. iOS hands a horizontal drag to the page (it scrolls/rubber-bands
  // sideways and cancels pointer events), so we listen to touchmove ourselves with passive:false and
  // preventDefault as soon as the gesture is clearly horizontal.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let st: { x: number; y: number; axis: '' | 'x' | 'y'; onButton: boolean } | null = null;
    let cur = 0;
    const begin = (x: number, y: number, target: EventTarget | null) => {
      if (live.current.disabled) return;
      st = { x, y, axis: '', onButton: !!(target as HTMLElement | null)?.closest?.('button') };
      cur = 0;
    };
    const move = (x: number, y: number, ev?: Event) => {
      if (!st) return;
      const ddx = x - st.x; const ddy = y - st.y;
      if (!st.axis && (Math.abs(ddx) > 6 || Math.abs(ddy) > 6)) { st.axis = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y'; if (st.axis === 'x') setDragging(true); }
      if (st.axis === 'x') { if (ev?.cancelable) ev.preventDefault(); cur = ddx; setDx(ddx); }
    };
    const end = () => {
      if (!st) return;
      const s = st; st = null;
      setDragging(false);
      if (s.axis === 'x' && Math.abs(cur) > 80) {
        const ok = cur > 0;
        setLeaving(ok ? 1 : -1);
        window.setTimeout(() => { setLeaving(0); setDx(0); live.current.onAnswer(ok); }, 180);
        return;
      }
      setDx(0);
      if (!s.axis && !s.onButton && !live.current.showBoth) live.current.onFlip();
    };
    const ts = (e: TouchEvent) => { const t = e.touches[0]; begin(t.clientX, t.clientY, e.target); };
    const tm = (e: TouchEvent) => { const t = e.touches[0]; move(t.clientX, t.clientY, e); };
    const te = () => end();
    const tc = () => { st = null; setDragging(false); setDx(0); };
    let touched = 0;
    const md = (e: MouseEvent) => { if (Date.now() - touched < 800) return; begin(e.clientX, e.clientY, e.target); };
    const mm = (e: MouseEvent) => move(e.clientX, e.clientY);
    const mu = () => { if (Date.now() - touched < 800) return; end(); };
    const mark = () => { touched = Date.now(); };
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchstart', mark, { passive: true });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', te);
    el.addEventListener('touchcancel', tc);
    el.addEventListener('mousedown', md);
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => {
      el.removeEventListener('touchstart', ts); el.removeEventListener('touchstart', mark);
      el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te); el.removeEventListener('touchcancel', tc);
      el.removeEventListener('mousedown', md); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu);
    };
  }, []);

  const x = leaving ? leaving * 600 : dx;
  const tint = Math.max(-1, Math.min(1, dx / 120));
  return (
    <div className="swipe-wrap">
      <div className="swipe-hint left" style={{ opacity: tint < 0 ? -tint : 0 }}>{hintLeft}</div>
      <div className="swipe-hint right" style={{ opacity: tint > 0 ? tint : 0 }}>{hintRight}</div>
      <div ref={ref} className={`swipe-card ${dragging ? 'dragging' : ''}`}
        style={{ transform: `translateX(${x}px) rotate(${x / 22}deg)`, transition: dragging ? 'none' : 'transform 0.18s ease' }}>
        <div className={`flip ${flipped || showBoth ? 'is-flipped' : ''} ${showBoth ? 'both' : ''}`}
          style={{ boxShadow: tint ? `0 0 0 3px ${tint > 0 ? 'var(--meals)' : 'var(--danger)'}` : undefined }}>
          {showBoth ? (
            <div className="flip-face both-face">{front}<div className="both-sep" />{back}</div>
          ) : (
            <>
              <div className="flip-face front">{front}</div>
              <div className="flip-face back">{back}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- word tiles builder ----------------------------------------------------------------------------------
export interface Tile { id: number; text: string }

export function makeTiles(words: string[], distractors: string[] = []): Tile[] {
  const all = [...words, ...distractors];
  const shuffled = all.map((text, i) => ({ id: i, text })).sort(() => Math.random() - 0.5);
  // avoid presenting the tiles already in the right order
  if (distractors.length === 0 && shuffled.every((x, i) => x.id === i) && shuffled.length > 1) shuffled.reverse();
  return shuffled;
}

export function TileBuilder({ tiles, picked, onChange, locked, state }: { tiles: Tile[]; picked: number[]; onChange: (ids: number[]) => void; locked?: boolean; state?: 'right' | 'wrong' | 'close' }) {
  const byId = useMemo(() => new Map(tiles.map((x) => [x.id, x])), [tiles]);
  return (
    <div className="tiles">
      <div className={`tile-answer ${state ?? ''}`}>
        {picked.length === 0 && <span className="tile-placeholder" />}
        {picked.map((id) => (
          <button key={id} type="button" className="tile tile-in" disabled={locked} onClick={() => onChange(picked.filter((x) => x !== id))}>{byId.get(id)?.text}</button>
        ))}
      </div>
      <div className="tile-bank">
        {tiles.map((x) => {
          const used = picked.includes(x.id);
          return <button key={x.id} type="button" className={`tile ${used ? 'tile-used' : ''}`} disabled={locked || used} onClick={() => onChange([...picked, x.id])}>{x.text}</button>;
        })}
      </div>
    </div>
  );
}

export function LevelTag({ level }: { level: string }) {
  return <span className={`lvl lvl-${level}`}>{level}</span>;
}

export function Ring({ value, max, size = 64, stroke = 7, children, color = 'var(--lingua)' }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={stroke} />
        {pct > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
      </svg>
      <div className="ring-inner">{children}</div>
    </div>
  );
}

/** Seconds spent on a screen — logged when it unmounts. */
export function useStopwatch(): () => number {
  const startedAt = useRef(Date.now());
  useEffect(() => { startedAt.current = Date.now(); }, []);
  return () => Math.round((Date.now() - startedAt.current) / 1000);
}

export function posLabel(t: (k: string) => string, pos: string): string {
  if (!pos || pos === 'other') return '';
  const k = `lang.pos.${pos}`;
  const v = t(k);
  return v === k ? pos : v;
}
