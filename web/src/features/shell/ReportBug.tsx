import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@core/hooks';
import { sourceOf } from '@core/sources';
import type { Poem, Prefs } from '@core/types';
import { useOverlay } from '@components/overlays';
import { apiFetch, devApiUrl, EVENT_LIMIT, getDevLog, logEvent } from '@components/devlog';
import { usePlayback } from '@components/playback';
import { Close } from '@ds/icons';
import { useDevPanel } from './devPanelState';

async function captureScreen() {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(document.body, {
    y: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: Math.min(1, 780 / window.innerWidth, 1000 / window.innerHeight),
    imageTimeout: 2000,
    useCORS: true,
    logging: false,
  });
  const jpeg = canvas.toDataURL('image/jpeg', 0.7);
  if (!jpeg.startsWith('data:image/jpeg;base64,') || jpeg.length > 250_000) {
    throw new Error('Could not attach the screenshot. Try again or uncheck Screenshot.');
  }
  return jpeg;
}

function Attachment({
  label,
  detail,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  detail: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="dev-report__attachment">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span>{label}</span>
        <small>{detail}</small>
      </span>
    </label>
  );
}

export function ReportBug({ route }: { route: string }) {
  const modal = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const setOpen = useDevPanel((s) => s.setOpen);
  const showToast = useOverlay((s) => s.showToast);
  const query = useQueryClient();
  const [context] = useState(() => {
    const id = route.match(/^\/p\/([^/]+)\/?$/)?.[1];
    const poem = id ? query.getQueryData<Poem>(qk.poem(id)) : undefined;
    const prefs = query.getQueryData<Prefs>(qk.prefs);
    const { poemId, line, voice, status } = usePlayback.getState();
    const active = poem && poem.id === poemId && status !== 'idle';
    return {
      poem,
      line: active ? line + 1 : undefined,
      voice: active ? voice : prefs?.voice,
      prefs,
      events: getDevLog().events,
      online: navigator.onLine,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
    };
  });
  const { poem, line, voice, prefs, events, online, screenSize } = context;
  const [description, setDescription] = useState('');
  const [attachEvents, setAttachEvents] = useState(true);
  const [attachPoem, setAttachPoem] = useState(Boolean(poem));
  const [attachDevice, setAttachDevice] = useState(true);
  const [attachScreenshot, setAttachScreenshot] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const errorCount = events.filter((event) => event.kind === 'error').length;
  const close = () => {
    if (!sending) setOpen('events');
  };

  useLayoutEffect(() => {
    const dialog = modal.current!;
    const viewport = window.visualViewport;
    const fitViewport = () => {
      // The keyboard can resize the visual viewport without resizing the layout viewport.
      const height = viewport?.scale === 1 ? viewport.height : window.innerHeight;
      const offset = viewport?.scale === 1 ? viewport.offsetTop : 0;
      dialog.style.setProperty('--dev-report-viewport', `${height}px`);
      dialog.style.setProperty(
        '--dev-report-offset',
        `${Math.max(0, window.innerHeight - height - offset)}px`
      );
    };
    dialog.showModal();
    heading.current?.focus({ preventScroll: true });
    fitViewport();
    viewport?.addEventListener('resize', fitViewport);
    viewport?.addEventListener('scroll', fitViewport);
    window.addEventListener('resize', fitViewport);
    return () => {
      viewport?.removeEventListener('resize', fitViewport);
      viewport?.removeEventListener('scroll', fitViewport);
      window.removeEventListener('resize', fitViewport);
      dialog.close();
    };
  }, []);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const screenshot = attachScreenshot
        ? await captureScreen().catch(() => {
            throw new Error('Could not attach the screenshot. Try again or uncheck Screenshot.');
          })
        : undefined;
      const res = await apiFetch(devApiUrl('/api/bug-reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          description: description.trim(),
          timestamp: new Date().toISOString(),
          logs: attachEvents ? events : undefined,
          poem:
            attachPoem && poem
              ? { id: poem.id, title: poem.titleEn, poet: poem.poetEn, line, voice }
              : undefined,
          appState: attachDevice
            ? {
                app: 'web/new',
                mode: sourceOf('poems'),
                theme: prefs?.page,
                font: prefs?.font,
                textSize: prefs?.textSize,
              }
            : undefined,
          userAgent: attachDevice ? navigator.userAgent : undefined,
          language: attachDevice ? navigator.language : undefined,
          screenSize: attachDevice ? screenSize : undefined,
          online: attachDevice ? online : undefined,
          url:
            location.origin +
            location.pathname +
            (location.hash.startsWith('#/') ? `#${route}` : ''),
          screenshot,
          shareScreenshotPublicly: screenshot ? true : undefined,
        }),
      });
      const result = res.ok ? await res.json().catch(() => null) : null;
      if (!result || !(result.success || result.ok)) throw new Error();
      if (result.reportSaved === false && !result.githubIssue) {
        setError('The report reached the server but couldn’t be saved. Try again.');
        return;
      }
      setOpen('none');
      if (screenshot && result.screenshotAttached !== true) {
        showToast({
          text: 'Bug reported. The screenshot couldn’t be attached to GitHub.',
          alert: true,
        });
      } else {
        showToast({ text: 'Bug reported. Thank you.' });
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message.startsWith('Could not attach')
          ? err.message
          : 'The report didn’t send. Try again.';
      logEvent({ kind: 'error', source: 'app', label: 'Bug report', text: message });
      setError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <dialog
      className="sheet dev-report"
      ref={modal}
      aria-label="Report a bug"
      data-html2canvas-ignore
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <form onSubmit={send}>
        <div className="sheet__handle" aria-hidden />
        <div className="sheet__head" ref={heading} tabIndex={-1}>
          <span className="t-eyebrow t-eyebrow--accent">REPORT A BUG</span>
          <button
            className="icon-btn"
            type="button"
            aria-label="Close report"
            disabled={sending}
            onClick={close}
          >
            <Close size={18} />
          </button>
        </div>
        <div className="dev-report__body">
          <label className="dev-report__description">
            <span className="t-eyebrow">What happened</span>
            <span className="dev-report__input">
              <span className="dev-report__measure" aria-hidden="true">
                {description}
                {'\u200b'}
              </span>
              <textarea
                name="description"
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={sending}
              />
            </span>
          </label>
          <fieldset disabled={sending}>
            <legend className="t-eyebrow">Attached</legend>
            <Attachment
              label={
                events.length === EVENT_LIMIT
                  ? `Last ${EVENT_LIMIT} events`
                  : `${events.length} recent ${events.length === 1 ? 'event' : 'events'}`
              }
              detail={`Front end and back end · ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`}
              checked={attachEvents}
              onChange={setAttachEvents}
            />
            <Attachment
              label="Current poem"
              detail={
                poem ? (
                  <>
                    #{poem.id} ·{' '}
                    <bdi lang="ar" className="ar">
                      {poem.titleAr}
                    </bdi>
                    {line ? ` · line ${line}` : ''}
                    {voice ? ` · ${voice}` : ''}
                  </>
                ) : (
                  'Open a poem to include it'
                )
              }
              checked={attachPoem}
              disabled={!poem}
              onChange={setAttachPoem}
            />
            <Attachment
              label="Device and settings"
              detail={[
                screenSize,
                prefs?.page,
                prefs && `Size ${prefs.textSize}`,
                prefs?.font,
                online ? 'online' : 'offline',
              ]
                .filter(Boolean)
                .join(' · ')}
              checked={attachDevice}
              onChange={setAttachDevice}
            />
            <Attachment
              label="Attach screenshot to GitHub"
              detail="The app screen will be visible on the public issue."
              checked={attachScreenshot}
              onChange={setAttachScreenshot}
            />
          </fieldset>
        </div>
        {error && (
          <p role="alert" className="dev-report__error">
            {error}
          </p>
        )}
        <button
          className="btn btn--primary btn--block"
          type="submit"
          disabled={!description.trim() || sending}
        >
          {sending ? 'Sending…' : 'Send report'}
        </button>
        <p className="dev-report__note">May open a GitHub issue and save a copy.</p>
      </form>
    </dialog>
  );
}
