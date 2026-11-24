// Design-system primitives. They know nothing about poetry.
import { useEffect, useRef, type ReactNode } from 'react';
import { Back, Mark } from './icons';

export function Header({ onBack, right, label = 'Back' }: { onBack?: () => void; right?: ReactNode; label?: string }) {
  return (
    <header className="hdr">
      {onBack ? <button className="icon-btn" aria-label={label} onClick={onBack}><Back /></button> : <span className="hdr__spacer" />}
      {right ?? <span className="hdr__spacer" />}
    </header>
  );
}

/** `bare` drops the side padding, for titles inside an already padded column. */
export function TitleRow({ en, ar, bare }: { en: string; ar?: string; bare?: boolean }) {
  return (
    <div className="title-row" style={bare ? { padding: 0 } : undefined}>
      <h1 className="t-title">{en}</h1>
      {ar && <span lang="ar" className="t-title-ar">{ar}</span>}
    </div>
  );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="row between" style={{ alignItems: 'baseline' }}>
      <p className="t-eyebrow t-eyebrow--accent">{children}</p>
      {action}
    </div>
  );
}

export function Sheet({ label, onClose, children, height }: { label: string; onClose: () => void; children: ReactNode; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} data-testid="scrim" />
      <section role="dialog" aria-label={label} className="sheet" ref={ref} tabIndex={-1} style={height ? { minHeight: height } : undefined}>
        <div className="sheet__handle" aria-hidden />
        {children}
      </section>
    </>
  );
}

export function Toast({ children, action, onAction, undo, alert, mark }: {
  children: ReactNode; action?: string; onAction?: () => void; undo?: () => void; alert?: boolean; mark?: boolean;
}) {
  return (
    <div className="toast" role={alert ? 'alert' : 'status'}>
      {alert && <span className="toast__icon" aria-hidden>!</span>}
      {mark && <Mark size={22} colour="#4A1620" />}
      <span style={{ flex: 1 }}>{children}</span>
      {undo && <button className="toast__action" onClick={undo}>UNDO</button>}
      {action && <button className={`toast__action${undo ? ' toast__action--outline' : ''}`} onClick={onAction}>{action}</button>}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => onChange(!on)} />;
}

/** Settings choices are separate boxes; `pill` is the two-way switch between views (Hub / Poems). */
export function Segmented<T extends string | number>({ label, value, options, onChange, tall, pill }: {
  label: string; value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; tall?: boolean; pill?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`seg${tall ? ' seg--tall' : ''}${pill ? ' seg--pill' : ''}`}>
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} className="seg__opt" onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function MarginNote({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <button className="margin-note" aria-label={`${message} Try again`} aria-live="polite" onClick={onRetry}>
      <span aria-hidden>{message} <span className="margin-note__action">Try again</span></span>
    </button>
  );
}

export function FullAreaError({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <div className="full-error" role="alert">
      <h2 className="t-title" style={{ fontSize: 26 }}>{title}</h2>
      <p className="t-body">{body}</p>
      {action && <button className="btn" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function Skeleton({ lines = 3, width = ['90%', '70%', '80%'] }: { lines?: number; width?: string[] }) {
  return (
    <div className="stack gap-12" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => <span key={i} className="skel" style={{ width: width[i % width.length] }} />)}
    </div>
  );
}

export function GroupCard({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

export function Coming({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="coming">
      <h2 className="t-title" style={{ fontSize: 26 }}>{title}</h2>
      <p className="t-body">{body}</p>
      {action}
    </div>
  );
}
