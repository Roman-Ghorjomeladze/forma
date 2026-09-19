import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconBack, IconChevronDown, IconClose, IconMinus, IconPlus } from './icons.js';
import { back } from '../lib/router.js';
import { useT } from '../lib/i18n.js';

// ---- layout ---------------------------------------------------------------------------------
export function Screen({ children, className = '', padded = true }: { children?: ReactNode; className?: string; padded?: boolean }) {
  return <div className={`screen ${padded ? 'screen-padded' : ''} ${className}`}>{children}</div>;
}

export function TopBar({ title, eyebrow, backTo, right, large = false, onBack, left, className = '' }: { title: ReactNode; eyebrow?: ReactNode; backTo?: string; right?: ReactNode; large?: boolean; onBack?: () => void; left?: ReactNode; className?: string }) {
  const t = useT();
  return (
    <header className={`topbar ${large ? 'topbar-large' : ''} ${className}`}>
      {left}
      {(backTo || onBack) && (
        <button className="iconbtn" aria-label={t('common.back')} onClick={() => (onBack ? onBack() : back(backTo!))}><IconBack /></button>
      )}
      <div className="topbar-titles">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className={large ? 'title-large' : 'title'}>{title}</h1>
      </div>
      {right && <div className="topbar-right">{right}</div>}
    </header>
  );
}

export function Section({ title, right, children, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`section ${className}`}>
      {(title || right) && (
        <div className="section-head">
          {title && <h2 className="section-title">{title}</h2>}
          {right && <div className="section-right">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className = '', onClick, dark = false, style }: { children: ReactNode; className?: string; onClick?: () => void; dark?: boolean; style?: Record<string, string | number> }) {
  const Tag = onClick ? 'button' : 'div';
  return <Tag className={`card ${dark ? 'card-dark' : ''} ${onClick ? 'card-tappable' : ''} ${className}`} onClick={onClick} style={style}>{children}</Tag>;
}

export function Row({ children, onClick, className = '', right }: { children: ReactNode; onClick?: () => void; className?: string; right?: ReactNode }) {
  const inner = <>{children}{right && <div className="row-right">{right}</div>}</>;
  if (onClick) return <button className={`row row-tappable ${className}`} onClick={onClick}>{inner}</button>;
  return <div className={`row ${className}`}>{inner}</div>;
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

// ---- controls ------------------------------------------------------------------------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'meals' | 'dark' | 'pocket' | 'tree';
export function Button({ children, onClick, variant = 'primary', size = 'md', full = false, disabled, type = 'button', className = '', icon }: {
  children?: ReactNode; onClick?: () => void; variant?: Variant; size?: 'sm' | 'md' | 'lg'; full?: boolean; disabled?: boolean; type?: 'button' | 'submit'; className?: string; icon?: ReactNode;
}) {
  return (
    <button type={type} className={`btn btn-${variant} btn-${size} ${full ? 'btn-full' : ''} ${className}`} onClick={onClick} disabled={disabled}>
      {icon}{children}
    </button>
  );
}

export function IconButton({ children, onClick, label, className = '', tone = 'default' }: { children: ReactNode; onClick?: () => void; label: string; className?: string; tone?: 'default' | 'accent' | 'meals' | 'danger' | 'pocket' | 'tree' }) {
  return <button type="button" className={`iconbtn iconbtn-${tone} ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

export function Chip({ children, active = false, onClick, tone = 'default' }: { children: ReactNode; active?: boolean; onClick?: () => void; tone?: 'default' | 'meals' | 'workout' | 'pocket' | 'tree' }) {
  return <button type="button" className={`chip chip-${tone} ${active ? 'chip-active' : ''}`} onClick={onClick}>{children}</button>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={`segmented-item ${o.value === value ? 'active' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="toggle-knob" />
    </button>
  );
}

export function Field({ label, children, hint, inline = false }: { label: ReactNode; children: ReactNode; hint?: ReactNode; inline?: boolean }) {
  return (
    <label className={`field ${inline ? 'field-inline' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, type = 'text', autoFocus, inputMode, className = '', onBlur }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean; inputMode?: string; className?: string; onBlur?: () => void }) {
  return <input className={`input ${className}`} type={type} value={value} placeholder={placeholder} autoFocus={autoFocus} inputMode={inputMode} onChange={(e: { target: HTMLInputElement }) => onChange(e.target.value)} onBlur={onBlur} />;
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea className="input textarea" rows={rows} value={value} placeholder={placeholder} onChange={(e: { target: HTMLTextAreaElement }) => onChange(e.target.value)} />;
}

export function NumberInput({ value, onChange, min = 0, max = 100000, step = 1, suffix, placeholder, className = '' }: { value: number | ''; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string; placeholder?: string; className?: string }) {
  const [text, setText] = useState(value === '' ? '' : String(value));
  useEffect(() => { setText(value === '' ? '' : String(value)); }, [value]);
  return (
    <span className={`numwrap ${className}`}>
      <input
        className="input input-num"
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(e: { target: HTMLInputElement }) => {
          const t = e.target.value.replace(',', '.');
          setText(t);
          const n = Number(t);
          if (t !== '' && !Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        onBlur={() => { if (text === '' || Number.isNaN(Number(text))) { setText(value === '' ? '' : String(value || 0)); } }}
      />
      {suffix && <span className="numsuffix">{suffix}</span>}
      <span className="sr-only">{step}</span>
    </span>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, format }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string }) {
  const holdRef = useRef<number | undefined>(undefined);
  const bump = (d: number) => onChange(Math.min(max, Math.max(min, Math.round((value + d) / step) * step)));
  const start = (d: number) => {
    bump(d);
    let n = 0;
    holdRef.current = window.setInterval(() => { n++; bump(d * (n > 10 ? 5 : 1)); }, n > 10 ? 80 : 140);
  };
  const stop = () => { window.clearInterval(holdRef.current); };
  const t = useT();
  return (
    <div className="stepper">
      <button type="button" className="stepper-btn" aria-label={t('common.decrease')} onPointerDown={() => start(-step)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}><IconMinus size={18} /></button>
      <span className="stepper-value">{format ? format(value) : value}</span>
      <button type="button" className="stepper-btn" aria-label={t('common.increase')} onPointerDown={() => start(step)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}><IconPlus size={18} /></button>
    </div>
  );
}

export function Select<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <span className="selectwrap">
      <select className="input select" value={value} onChange={(e: { target: HTMLSelectElement }) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <IconChevronDown size={16} className="select-caret" />
    </span>
  );
}

export function Progress({ value, max, color, height = 8 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return <div className="progress" style={{ height }}><div className="progress-bar" style={{ width: `${pct}%`, background: color }} /></div>;
}

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <div className="macro">
      <div className="macro-head"><span className="macro-label">{label}</span><span className="macro-vals">{Math.round(value)}<span className="muted">/{target} g</span></span></div>
      <Progress value={value} max={target} color={color} height={5} />
    </div>
  );
}

// ---- bottom sheet ---------------------------------------------------------------------------
export function Sheet({ open, onClose, title, children, footer, full = false }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; full?: boolean }) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${full ? 'sheet-full' : ''}`} role="dialog" aria-modal="true" onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && (
          <div className="sheet-head">
            <div className="sheet-title">{title}</div>
            <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}><IconClose /></button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Stat({ value, label, tone }: { value: ReactNode; label: ReactNode; tone?: 'workout' | 'meals' | 'protein' | 'carbs' | 'fat' | 'dark' }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function Kcal({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`kcal ${className}`}>{Math.round(value).toLocaleString()}<span className="kcal-unit"> kcal</span></span>;
}
