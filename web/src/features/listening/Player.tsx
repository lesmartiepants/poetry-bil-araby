// The player that takes the dock's place while listening (3.1–3.11).
import { useState, type HTMLAttributes } from 'react';
import { Mark, Pause, Play } from '@ds/icons';
import { Sheet, Toast } from '@ds/primitives';
import { usePlayback } from '@components/playback';
import { usePrefs, useSetPrefs } from '@core/hooks';
import { FEMALE_VOICES, MALE_VOICES } from '@core/voices';
import type { Poem, Voice } from '@core/types';
import { useEngine } from './engine';
import './listening.css';

export interface PlayerProps { poem: Poem; compact: boolean; onMark: () => void; onExpand: () => void; devLongPress?: HTMLAttributes<HTMLElement> }

export function Player({ poem, compact, onMark, onExpand, devLongPress }: PlayerProps) {
  useEngine(poem);
  const pb = usePlayback();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const playing = pb.status === 'playing' || pb.status === 'loading';
  const toggle = () => pb.send(pb.status === 'playing' ? { type: 'PAUSE' } : { type: 'RESUME' });
  const segs = poem.lines.length;

  if (compact) {
    return (
      <nav aria-label="Now playing" className="player player--pill" {...devLongPress}>
        <button className="player__mark" aria-label="More actions" onClick={onMark}><Mark size={28} colour="var(--c-accent)" /></button>
        <button className="player__line" onClick={onExpand} aria-label="Show the player">LINE {pb.line + 1} OF {segs} ⌃</button>
        <button className="player__pp" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>{playing ? <Pause /> : <Play />}</button>
      </nav>
    );
  }
  return (
    <>
      <nav aria-label="Now playing" className="player" {...devLongPress}>
        <button className="player__mark" aria-label="More actions" onClick={onMark}><Mark size={31} colour="var(--c-accent)" /></button>
        <div className="player__mid">
          <div className="row between player__labels">
            <span style={{ color: 'var(--c-accent)' }}>LINE {pb.line + 1} OF {segs}</span>
            <button className="player__voice" aria-haspopup="dialog" onClick={() => setVoiceOpen(true)}>{pb.voice.toUpperCase()} ▾</button>
          </div>
          <div className="player__segs" aria-hidden>
            {poem.lines.map((_, i) => <span key={i} className={i < pb.line ? 'seg-done' : i === pb.line ? 'seg-now' : ''} />)}
          </div>
        </div>
        <button className="player__pp" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>{playing ? <Pause /> : <Play />}</button>
      </nav>
      {voiceOpen && <VoiceSheet onClose={() => setVoiceOpen(false)} />}
      <PlaybackNotices />
    </>
  );
}

/** 3.3 Voice sheet: every voice, grouped Female and Male, under Gemini names. */
export function VoiceSheet({ onClose }: { onClose: () => void }) {
  const pb = usePlayback();
  const setPrefs = useSetPrefs();
  const pick = (v: Voice) => {
    try { localStorage.setItem('mock.prevVoice', pb.voice); } catch { /* ignore */ }
    pb.send({ type: 'SWITCH_VOICE', voice: v.name });
    setPrefs.mutate({ voice: v.name }); // the last voice picked becomes the default
  };
  const group = (title: string, ar: string, list: Voice[]) => (
    <>
      <div className="row between voice-group"><span>{title} · <span lang="ar" className="ar" style={{ fontSize: 13 }}>{ar}</span></span><span>{list.length}</span></div>
      <div role="radiogroup" aria-label={`${title[0]}${title.slice(1).toLowerCase()} voices`}>
        {list.map((v) => (
          <button key={v.name} role="radio" aria-checked={pb.voice === v.name} className="voice-row" onClick={() => pick(v)}>
            <span className={`radio${pb.voice === v.name ? ' radio--on' : ''}`} />
            <span className="voice-row__name">{v.name}</span><span className="voice-row__desc">{v.descriptor}</span>
            {pb.voice === v.name && <span className="voice-row__tag">{pb.status === 'playing' ? 'PLAYING' : 'SELECTED'}</span>}
            {pb.failedVoice === v.name && <span className="voice-row__tag voice-row__tag--bad">NOT AVAILABLE</span>}
          </button>
        ))}
      </div>
    </>
  );
  return (
    <Sheet label="Choose a voice" onClose={onClose}>
      <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">VOICE · {FEMALE_VOICES.length + MALE_VOICES.length}</span><span lang="ar" className="t-title-ar" style={{ fontSize: 20 }}>القارئ</span></div>
      <p className="t-note">Tap a voice to switch; the line restarts in it. The last one you pick stays your default.</p>
      {group('FEMALE', 'نساء', FEMALE_VOICES)}
      {group('MALE', 'رجال', MALE_VOICES)}
    </Sheet>
  );
}

function PlaybackNotices() {
  const pb = usePlayback();
  if (pb.failedVoice) return <Toast alert action="OK" onAction={() => pb.send({ type: 'RESUME' })}>{pb.failedVoice} isn’t available now. Still reciting in {pb.voice}.</Toast>;
  if (pb.status === 'stalled') return <Toast alert action="RESUME" onAction={() => pb.send({ type: 'RESUME' })}>The recitation stopped. Resume from line {pb.line + 1}.</Toast>;
  return null;
}

/** The default voice from prefs, for starting playback. */
export function useDefaultVoice() {
  return usePrefs().data?.voice ?? 'Zephyr';
}
