// Developer panel (1.2–1.7): an edge tab on every screen in dev builds; one
// timeline of events and errors; report a bug. Hidden or shown by long-press.
import { useEffect, useState } from 'react';
import { Sheet, Toast } from '@ds/primitives';
import { Bug } from '@ds/icons';
import { SOURCES } from '@core/sources';
import { errorCount, logEvent, markErrorsSeen, subscribe, type DevEvent } from './devlog';
import { DEV_PANEL_ENABLED, useDevPanel } from './devPanelState';
import './shell.css';

export function DevPanel() {
  const { tabVisible, open, setOpen } = useDevPanel();
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => subscribe(setEvents), []);
  if (!DEV_PANEL_ENABLED) return null;
  const errors = errorCount();
  return (
    <>
      {tabVisible && (
        <button className={`edge-tab${errors > 0 ? ' edge-tab--error' : ''}`} aria-label={errors > 0 ? `Developer panel, ${errors} new errors` : 'Developer panel'}
          onClick={() => { setOpen('events'); markErrorsSeen(); }} data-testid="edge-tab">
          <Bug />{errors > 0 && <span className="edge-tab__count">{errors}</span>}
        </button>
      )}
      {open === 'events' && (
        <Sheet label="Developer panel" onClose={() => setOpen('none')}>
          <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">EVENTS AND ERRORS</span><button className="link-btn" onClick={() => setOpen('report')}>REPORT A BUG</button></div>
          <div className="dev-sources">{Object.entries(SOURCES).map(([d, s]) => <span key={d} className={`dev-src dev-src--${s}`}>{d}</span>)}</div>
          <ol className="dev-events" aria-label="Timeline">
            {events.length === 0 && <li className="t-note">Nothing yet.</li>}
            {events.map((e, i) => (
              <li key={i} className={`dev-ev dev-ev--${e.kind}`}>
                <span className="dev-ev__time">{new Date(e.at).toLocaleTimeString()}</span>
                <span className="dev-ev__src">{e.source === 'server' ? 'SERVER' : 'APP'}</span>
                <span className="dev-ev__text">{e.text}</span>
              </li>
            ))}
          </ol>
        </Sheet>
      )}
      {open === 'report' && <ReportBug events={events} onDone={(m) => { setOpen('none'); setSent(m); setTimeout(() => setSent(null), 3000); }} onClose={() => setOpen('none')} />}
      {sent && <Toast>{sent}</Toast>}
    </>
  );
}

function ReportBug({ events, onDone, onClose }: { events: DevEvent[]; onDone: (m: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const send = async () => {
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: text, logs: events.slice(0, 100), timestamp: new Date().toISOString(), userAgent: navigator.userAgent,
          url: location.href, screenSize: `${innerWidth}x${innerHeight}`, language: navigator.language, online: navigator.onLine, appState: { app: 'web/new' },
        }),
      });
      onDone(res.ok ? 'Bug reported. Thank you.' : 'The report didn’t send. It’s kept in the timeline.');
    } catch {
      logEvent({ kind: 'error', source: 'app', text: 'Bug report failed to send', detail: text });
      onDone('The report didn’t send. It’s kept in the timeline.');
    }
  };
  return (
    <Sheet label="Report a bug" onClose={onClose}>
      <span className="t-eyebrow t-eyebrow--accent">REPORT A BUG</span>
      <p className="t-small">The last {Math.min(events.length, 100)} events and this screen are attached.</p>
      <textarea className="dev-text" aria-label="What happened" placeholder="What happened?" value={text} onChange={(e) => setText(e.target.value)} rows={5} />
      <button className="btn btn--primary btn--block" disabled={!text.trim()} onClick={send}>Send report</button>
    </Sheet>
  );
}
