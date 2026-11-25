import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'wouter';
import { Bug, Close } from '@ds/icons';
import { Segmented, Switch } from '@ds/primitives';
import { apiFetch, devApiUrl, getDevLog, subscribeDevLog, type DevEvent } from '@components/devlog';
import { useDevPanel } from './devPanelState';
import { ReportBug } from './ReportBug';
import './shell.css';

const SOURCES = [
  { value: 'all', label: 'ALL' },
  { value: 'app', label: 'FRONT END' },
  { value: 'server', label: 'BACK END' },
] as const;
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 2,
  hourCycle: 'h23',
});
const getUnseenErrors = () => getDevLog().unseenErrors;
const sourceLabel = { app: 'FE', server: 'BE' };
const eventLabel: Record<DevEvent['kind'], string> = {
  request: 'Sent',
  reply: 'Reply',
  error: 'Error',
  warning: 'Warning',
  user: 'User',
  success: 'Success',
  event: 'Info',
};

function groupRequests(events: DevEvent[]) {
  const sent = new Map<number, DevEvent[]>();
  const rows: DevEvent[][] = [];
  for (const event of events) {
    const requestId = event.requestId;
    const group = requestId === undefined ? undefined : sent.get(requestId);
    if (group && requestId !== undefined) {
      group.push(event);
      sent.delete(requestId);
    } else {
      const row = [event];
      rows.push(row);
      if (event.kind === 'request' && requestId !== undefined) sent.set(requestId, row);
    }
  }
  return rows;
}

function EventRow({ event, showPath }: { event: DevEvent; showPath: boolean }) {
  return (
    <li className={`dev-ev dev-ev--${event.kind}`}>
      <time className="dev-ev__time" dateTime={new Date(event.at).toISOString()}>
        {`+${(event.elapsedMs / 1000).toFixed(1)}s`}
      </time>
      <div className="dev-ev__body">
        <div className="dev-ev__meta">
          <span>
            <strong>{eventLabel[event.kind]}</strong>
            {event.label && ` · ${event.label}`}
          </span>
          <abbr
            className={`dev-ev__src dev-ev__src--${event.source}`}
            title={event.source === 'app' ? 'Front end' : 'Back end'}
          >
            {sourceLabel[event.source]}
          </abbr>
        </div>
        {event.text && <span className="dev-ev__text">{event.text}</span>}
        {event.detail && <small className="dev-ev__detail">{event.detail}</small>}
        {showPath && event.apiPath && <code className="dev-ev__path">{event.apiPath}</code>}
      </div>
    </li>
  );
}

export function DevPanel() {
  const { tabVisible, open, setOpen } = useDevPanel();
  const unseenErrors = useSyncExternalStore(subscribeDevLog, getUnseenErrors);
  const [route] = useLocation();
  const startX = useRef<number>();
  const [scope, setScope] = useState<(typeof SOURCES)[number]['value']>('all');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const showEvents = () => setOpen('events');

  return (
    <>
      {tabVisible && (
        <button
          type="button"
          className={`edge-tab${unseenErrors ? ' edge-tab--error' : ''}`}
          aria-label={
            unseenErrors
              ? `Developer panel, ${unseenErrors} new ${unseenErrors === 1 ? 'error' : 'errors'}`
              : 'Developer panel'
          }
          aria-haspopup="dialog"
          data-testid="edge-tab"
          data-html2canvas-ignore
          onClick={showEvents}
          onPointerDown={(e) => {
            if (e.isPrimary && e.button === 0) {
              startX.current = e.clientX;
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }}
          onPointerCancel={() => {
            startX.current = undefined;
          }}
          onPointerUp={(e) => {
            const x = startX.current;
            startX.current = undefined;
            if (x !== undefined && x - e.clientX >= 24) showEvents();
          }}
        >
          <span className="edge-tab__body">
            {unseenErrors > 0 && (
              <span className="edge-tab__count">{unseenErrors > 99 ? '99+' : unseenErrors}</span>
            )}
            <span className="edge-tab__label">DEV</span>
          </span>
        </button>
      )}
      {open !== 'none' && (
        <Timeline
          reportOpen={open === 'report'}
          scope={scope}
          setScope={setScope}
          errorsOnly={errorsOnly}
          setErrorsOnly={setErrorsOnly}
        />
      )}
      {open === 'report' && <ReportBug route={route} />}
    </>
  );
}

function Timeline({
  reportOpen,
  scope,
  setScope,
  errorsOnly,
  setErrorsOnly,
}: {
  reportOpen: boolean;
  scope: (typeof SOURCES)[number]['value'];
  setScope: (scope: (typeof SOURCES)[number]['value']) => void;
  errorsOnly: boolean;
  setErrorsOnly: (value: boolean) => void;
}) {
  const setOpen = useDevPanel((s) => s.setOpen);
  const { events, startedAt } = useSyncExternalStore(subscribeDevLog, getDevLog);
  const modal = useRef<HTMLDialogElement>(null);
  const header = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const follow = useRef(true);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const errors = events.filter((e) => e.kind === 'error').length;
  const shown = events.filter(
    (e) => (scope === 'all' || scope === e.source) && (!errorsOnly || e.kind === 'error')
  );

  const rows = groupRequests(shown);

  useLayoutEffect(() => {
    const dialog = modal.current!;
    dialog.showModal();
    header.current?.focus({ preventScroll: true });
    return () => dialog.close();
  }, []);
  useLayoutEffect(() => {
    if (follow.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [events, scope, errorsOnly]);
  useEffect(() => {
    if (copyStatus === 'idle') return;
    const timer = window.setTimeout(() => setCopyStatus('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const copy = async () => {
    const text = events
      .map((event) => {
        const header = `${timeFormat.format(event.at)} [${sourceLabel[event.source]}] [${eventLabel[event.kind]}]`;
        const label = event.label ? `[${event.label}] ` : '';
        return `${header} ${label}${[event.apiPath, event.text, event.detail].filter(Boolean).join(' · ')}`;
      })
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
    } catch {
      const field = document.createElement('textarea');
      field.value = text;
      field.style.cssText = 'position:absolute;opacity:0';
      modal.current?.appendChild(field);
      try {
        field.select();
        setCopyStatus(document.execCommand('copy') ? 'copied' : 'failed');
      } catch {
        setCopyStatus('failed');
      } finally {
        field.remove();
      }
    }
  };

  return (
    <dialog
      ref={modal}
      className={`dev-panel${reportOpen ? ' dev-panel--report-open' : ''}`}
      aria-label="Developer panel"
      data-html2canvas-ignore
      onCancel={(e) => {
        e.preventDefault();
        setOpen('none');
      }}
    >
      <header className="dev-panel__header" ref={header} tabIndex={-1}>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close developer panel"
          onClick={() => setOpen('none')}
        >
          <Close size={20} />
        </button>
        <span className="dev-panel__badge">DEV BUILD</span>
      </header>
      <div className="dev-panel__intro">
        <h1 className="t-title">Developer</h1>
        <BuildStatus />
      </div>
      <div className="dev-panel__filters">
        <Segmented
          label="Event source"
          options={SOURCES}
          value={scope}
          onChange={(value) => {
            follow.current = true;
            setScope(value);
          }}
          pill
        />
        <div className="dev-panel__summary">
          <span>
            {events.length} {events.length === 1 ? 'EVENT' : 'EVENTS'} ·{' '}
            <span>
              {errors} {errors === 1 ? 'ERROR' : 'ERRORS'}
            </span>
          </span>
          <div className="dev-panel__error-filter">
            <Switch
              label="Errors only"
              on={errorsOnly}
              onChange={(on) => {
                follow.current = true;
                setErrorsOnly(on);
              }}
            />
            <span aria-hidden="true">ERRORS ONLY</span>
          </div>
        </div>
      </div>
      {startedAt !== null && (
        <p className="dev-panel__start">
          Log started at{' '}
          <time dateTime={new Date(startedAt).toISOString()}>{timeFormat.format(startedAt)}</time>
        </p>
      )}
      <ol
        className="dev-events"
        aria-label="Timeline"
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
        }}
      >
        {shown.length === 0 && (
          <li className="dev-events__empty">
            {events.length ? 'No matching events.' : 'No events yet.'}
          </li>
        )}
        {rows.map(([first, reply]) =>
          reply ? (
            <li className="dev-exchange" key={first.id}>
              <code className="dev-exchange__path">{first.apiPath}</code>
              <ol>
                <EventRow event={first} showPath={false} />
                <EventRow event={reply} showPath={false} />
              </ol>
            </li>
          ) : (
            <EventRow key={first.id} event={first} showPath />
          )
        )}
      </ol>
      <nav className="dev-actions" aria-label="Developer actions">
        <button type="button" className="btn" disabled={!events.length} onClick={copy}>
          {copyStatus === 'copied'
            ? 'COPIED'
            : copyStatus === 'failed'
              ? 'COPY FAILED'
              : 'COPY LOG'}
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setOpen('report')}>
          <Bug /> REPORT A BUG
        </button>
        <span className="dev-sr-only" role="status">
          {copyStatus === 'copied'
            ? 'Log copied to clipboard'
            : copyStatus === 'failed'
              ? 'Could not copy the log'
              : ''}
        </span>
      </nav>
    </dialog>
  );
}

declare const __DEV_BUILD_DATE__: string;

function BuildStatus() {
  const [status, setStatus] = useState('API checking…');
  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      const api = await apiFetch(devApiUrl('/api/health'), { signal: controller.signal })
        .then((res) =>
          res.ok ? (res.json() as Promise<{ status?: string; commit?: string }>) : null
        )
        .catch(() => null);
      if (controller.signal.aborted) return;
      const commit = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || api?.commit;
      setStatus(
        [
          commit && commit !== 'unknown' ? commit.slice(0, 7) : null,
          api?.status === 'ok' ? 'API ok' : 'API unavailable',
        ]
          .filter(Boolean)
          .join(' · ')
      );
    }
    void check();
    return () => controller.abort();
  }, []);
  return (
    <p className="dev-panel__build">
      build {__DEV_BUILD_DATE__} · {status}
    </p>
  );
}
