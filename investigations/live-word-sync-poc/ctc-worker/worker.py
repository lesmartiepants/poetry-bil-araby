#!/usr/bin/env python3
"""Persistent, local Arabic CTC alignment worker for the word-sync POC.

This is deliberately an experiment-side service. It consumes PCM that has already
been scheduled for browser playback; it cannot control audio playback.  It only
emits *past* word anchors, which a client must still reject if they arrive too
late to safely affect future highlights.

The public HTTP contract is intentionally tiny and works with an Express proxy:

  GET  /status
  POST /start   {transcript, sampleRateHertz: 24000}
  POST /chunk   {sessionId, seq, startSample24k, audio, sourceStartIndex?, sourceEndIndex?}
  GET  /cues?session=<id>&after=<integer>
  POST /stop    {sessionId}
  POST /dispose {sessionId}

``audio`` is base64 little-endian signed 16-bit mono PCM.  A real caller must
provide a conservative source word range once it has one.  The worker does not
pretend it can discover a bounded target range from audio alone.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import threading
import time
import uuid
import zlib
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

import numpy as np

MODEL_ID = 'jonatasgrosman/wav2vec2-large-xlsr-53-arabic'
TARGET_SAMPLE_RATE = 16000
INPUT_SAMPLE_RATE = 24000
MIN_WINDOW_MS = 1500
REPROCESS_INTERVAL_MS = 500
COMMIT_LAG_MS = 750


def split_words(transcript: str) -> list[str]:
    return re.findall(r'\S+', transcript)


def resample_24k_to_16k(pcm: np.ndarray) -> np.ndarray:
    """Deterministic 3:2 linear resample; adequate for the feasibility worker.

    This is not a claim that linear interpolation is ideal production DSP. A
    production worker should switch to a band-limited streaming resampler and
    retain its sample-time map.
    """
    if not len(pcm):
        return np.empty(0, dtype=np.float32)
    output_length = round(len(pcm) * TARGET_SAMPLE_RATE / INPUT_SAMPLE_RATE)
    positions = np.arange(output_length, dtype=np.float64) * INPUT_SAMPLE_RATE / TARGET_SAMPLE_RATE
    return np.interp(positions, np.arange(len(pcm)), pcm).astype(np.float32)


class ArabicCtcEngine:
    """Loads one Transformers CTC model for the lifetime of the process."""

    def __init__(self, model_id: str = MODEL_ID):
        # Import after process startup so /status can report a clear load error.
        import torch
        from transformers import AutoModelForCTC, AutoProcessor

        self.torch = torch
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.model = AutoModelForCTC.from_pretrained(model_id)
        self.model.eval()
        self.vocabulary = self.processor.tokenizer.get_vocab()
        self.blank = self.vocabulary['<pad>']
        self.model_id = model_id

    def _encode(self, words: list[str]) -> tuple[list[int], list[tuple[int, str, int, int]]]:
        encoded_words: list[tuple[int, str, str]] = []
        for source_index, word in enumerate(words):
            encoded = ''.join(ch for ch in word if ch in self.vocabulary and ch != '|')
            if encoded:
                encoded_words.append((source_index, word, encoded))
        if not encoded_words:
            raise ValueError('The supplied source range has no model-supported Arabic letters.')
        target: list[int] = []
        positions: list[tuple[int, str, int, int]] = []
        for index, (source_index, word, encoded) in enumerate(encoded_words):
            begin = len(target)
            target.extend(self.vocabulary[ch] for ch in encoded)
            positions.append((source_index, word, begin, len(target)))
            if index != len(encoded_words) - 1:
                target.append(self.vocabulary['|'])
        return target, positions

    def _force_align(self, log_probs, target: list[int]):
        torch = self.torch
        target_tensor = torch.tensor(target, dtype=torch.long)
        states = torch.empty(target_tensor.numel() * 2 + 1, dtype=torch.long)
        states[0::2] = self.blank
        states[1::2] = target_tensor
        frames = log_probs.shape[0]
        if frames < states.numel():
            raise ValueError('Audio window is too short for its supplied source-word range.')
        previous = torch.full((states.numel(),), -float('inf'))
        previous[0] = log_probs[0, self.blank]
        if states.numel() > 1:
            previous[1] = log_probs[0, states[1]]
        trace = torch.zeros((frames, states.numel()), dtype=torch.int16)
        state_numbers = torch.arange(states.numel())
        can_skip = torch.zeros(states.numel(), dtype=torch.bool)
        can_skip[3::2] = states[3::2] != states[1:-2:2]
        for frame in range(1, frames):
            candidates = torch.stack((previous, torch.roll(previous, 1), torch.roll(previous, 2)))
            candidates[1, 0] = -float('inf')
            candidates[2, :2] = -float('inf')
            candidates[2, ~can_skip] = -float('inf')
            values, moves = candidates.max(dim=0)
            previous = values + log_probs[frame, states]
            trace[frame] = state_numbers - moves.to(torch.int16)
        state = states.numel() - 1 if previous[-1] >= previous[-2] else states.numel() - 2
        path = torch.empty(frames, dtype=torch.long)
        for frame in range(frames - 1, -1, -1):
            path[frame] = state
            state = int(trace[frame, state])
        return path

    def align(self, pcm_24k: np.ndarray, words: list[str]) -> list[dict[str, Any]]:
        target, positions = self._encode(words)
        waveform = resample_24k_to_16k(pcm_24k)
        inputs = self.processor(waveform, sampling_rate=TARGET_SAMPLE_RATE, return_tensors='pt').input_values
        with self.torch.inference_mode():
            log_probs = self.torch.log_softmax(self.model(inputs).logits[0], dim=-1).cpu()
        path = self._force_align(log_probs, target)
        seconds_per_frame = len(waveform) / TARGET_SAMPLE_RATE / len(path)
        aligned: list[dict[str, Any]] = []
        for source_index, word, target_begin, target_end in positions:
            state_begin, state_end = 1 + 2 * target_begin, 1 + 2 * (target_end - 1)
            frames = self.torch.where((path >= state_begin) & (path <= state_end))[0]
            if len(frames):
                start, end = int(frames[0]), int(frames[-1]) + 1
                aligned.append({
                    'word': word,
                    'sourceIndex': source_index,
                    'startSeconds': start * seconds_per_frame,
                    'endSeconds': end * seconds_per_frame,
                    # Path posterior calibration is intentionally not implemented.
                    'confidence': None,
                })
        return aligned


@dataclass
class Session:
    identifier: str
    words: list[str]
    sample_rate: int
    received: np.ndarray = field(default_factory=lambda: np.empty(0, dtype=np.float32))
    expected_seq: int = 0
    expected_sample: int = 0
    received_crc32: int = 0
    source_start: int | None = None
    source_end: int | None = None
    stopped: bool = False
    processing: bool = False
    last_processed_samples: int = 0
    cues: list[dict[str, Any]] = field(default_factory=list)
    emitted_source_indices: set[int] = field(default_factory=set)
    error: str | None = None
    created_at: float = field(default_factory=time.monotonic)
    lock: threading.Lock = field(default_factory=threading.Lock)


class WorkerState:
    def __init__(self, mock: bool = False):
        self.started = time.monotonic()
        self.sessions: dict[str, Session] = {}
        self.lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='arabic-ctc')
        self.metrics = {
            'chunksReceived': 0,
            'samplesReceived24k': 0,
            'alignmentJobs': 0,
            'alignmentFailures': 0,
            'cuesEmitted': 0,
            'lastAlignmentMs': None,
        }
        self.model_state = 'mock' if mock else 'loading'
        self.model_error: str | None = None
        self.engine: ArabicCtcEngine | None = None
        if mock:
            return
        try:
            self.engine = ArabicCtcEngine()
            self.model_state = 'ready'
        except Exception as error:  # status must expose setup failures instead of hiding them.
            self.model_state = 'error'
            self.model_error = str(error)

    def status(self) -> dict[str, Any]:
        with self.lock:
            session_count = len(self.sessions)
        return {
            'ok': self.model_state in ('ready', 'mock'),
            'modelState': self.model_state,
            'model': MODEL_ID,
            'modelError': self.model_error,
            'inputContract': {'sampleRateHertz': INPUT_SAMPLE_RATE, 'format': 'pcm_s16le_mono_base64'},
            'safety': {
                'commitLagMs': COMMIT_LAG_MS,
                'requiresSourceWordRange': True,
                'doesNotControlPlayback': True,
                'emitsPastAnchorsOnly': True,
            },
            'sessions': session_count,
            'uptimeMs': round((time.monotonic() - self.started) * 1000),
            'metrics': self.metrics,
        }

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        transcript = payload.get('transcript')
        if not isinstance(transcript, str) or not split_words(transcript):
            raise ValueError('start.transcript must contain at least one source word.')
        sample_rate = payload.get('sampleRateHertz', INPUT_SAMPLE_RATE)
        if sample_rate != INPUT_SAMPLE_RATE:
            raise ValueError(f'Only {INPUT_SAMPLE_RATE} Hz mono PCM is supported by this feasibility worker.')
        session = Session(identifier=uuid.uuid4().hex, words=split_words(transcript), sample_rate=sample_rate)
        with self.lock:
            self.sessions[session.identifier] = session
        return {'sessionId': session.identifier, 'sourceWords': len(session.words), 'modelState': self.model_state}

    def session(self, session_id: str) -> Session:
        with self.lock:
            found = self.sessions.get(session_id)
        if not found:
            raise ValueError('Unknown or disposed sessionId.')
        return found

    def chunk(self, payload: dict[str, Any]) -> dict[str, Any]:
        session = self.session(payload.get('sessionId', ''))
        seq, start = payload.get('seq'), payload.get('startSample24k')
        if not isinstance(seq, int) or not isinstance(start, int) or seq < 0 or start < 0:
            raise ValueError('chunk.seq and chunk.startSample24k must be non-negative integers.')
        encoded = payload.get('audio')
        if not isinstance(encoded, str):
            raise ValueError('chunk.audio must be base64 PCM.')
        try:
            raw = base64.b64decode(encoded, validate=True)
        except Exception as error:
            raise ValueError('chunk.audio is not valid base64.') from error
        if len(raw) % 2:
            raise ValueError('chunk.audio is not aligned 16-bit PCM.')
        declared_checksum = payload.get('checksum')
        actual_checksum = f'{zlib.crc32(raw):08x}'
        if declared_checksum is not None and (
            not isinstance(declared_checksum, str) or declared_checksum.lower() != actual_checksum
        ):
            raise ValueError('chunk.checksum does not match decoded PCM.')
        pcm = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0
        declared_sample_count = payload.get('sampleCount24k')
        if declared_sample_count is not None and (not isinstance(declared_sample_count, int) or declared_sample_count != len(pcm)):
            raise ValueError(f'chunk.sampleCount24k must equal decoded PCM samples ({len(pcm)}).')
        with session.lock:
            if session.stopped:
                raise ValueError('Session has been stopped.')
            if seq != session.expected_seq or start != session.expected_sample:
                raise ValueError(f'Non-contiguous chunk: expected seq {session.expected_seq}, startSample24k {session.expected_sample}.')
            source_start, source_end = payload.get('sourceStartIndex'), payload.get('sourceEndIndex')
            if source_start is not None or source_end is not None:
                if not isinstance(source_start, int) or not isinstance(source_end, int) or not (0 <= source_start < source_end <= len(session.words)):
                    raise ValueError('sourceStartIndex/sourceEndIndex must describe a valid non-empty source word range.')
                session.source_start, session.source_end = source_start, source_end
            session.received = np.concatenate((session.received, pcm))
            session.expected_seq += 1
            session.expected_sample += len(pcm)
            session.received_crc32 = zlib.crc32(raw, session.received_crc32)
            should_process = (
                session.source_start is not None
                and not session.processing
                and len(session.received) - session.last_processed_samples >= INPUT_SAMPLE_RATE * REPROCESS_INTERVAL_MS // 1000
                and len(session.received) >= INPUT_SAMPLE_RATE * MIN_WINDOW_MS // 1000
            )
            if should_process:
                session.processing = True
                self.executor.submit(self._align_session, session, False)
        self.metrics['chunksReceived'] += 1
        self.metrics['samplesReceived24k'] += len(pcm)
        return {
            'ok': True,
            'receivedThroughSample24k': session.expected_sample,
            'receivedSampleCount24k': session.expected_sample,
            'receivedCrc32': f'{session.received_crc32:08x}',
            'queued': should_process,
            'awaitingSourceRange': session.source_start is None,
        }

    def stop(self, payload: dict[str, Any]) -> dict[str, Any]:
        session = self.session(payload.get('sessionId', ''))
        with session.lock:
            session.stopped = True
            should_process = session.source_start is not None and not session.processing and len(session.received)
            if should_process:
                session.processing = True
                self.executor.submit(self._align_session, session, True)
        return {'ok': True, 'queuedFinalAlignment': bool(should_process)}

    def dispose(self, payload: dict[str, Any]) -> dict[str, Any]:
        session_id = payload.get('sessionId', '')
        with self.lock:
            removed = self.sessions.pop(session_id, None)
        return {'ok': removed is not None}

    def cues(self, session_id: str, after: int) -> dict[str, Any]:
        session = self.session(session_id)
        with session.lock:
            if after < -1:
                raise ValueError('after must be -1 or a non-negative cue index.')
            selected = session.cues[after + 1:]
            return {'next': len(session.cues) - 1, 'cues': selected, 'error': session.error}

    def _align_session(self, session: Session, final: bool) -> None:
        started = time.monotonic()
        try:
            with session.lock:
                # Take a consistent snapshot. Corrections are based on the known
                # source range supplied by the caller, never an inferred range.
                pcm = session.received.copy()
                source_start, source_end = session.source_start, session.source_end
                queued_at = time.monotonic()
            if source_start is None or source_end is None:
                return
            if self.model_state == 'mock':
                aligned: list[dict[str, Any]] = []
            elif not self.engine:
                raise RuntimeError(f'CTC model is not ready: {self.model_error or self.model_state}')
            else:
                aligned = self.engine.align(pcm, session.words[source_start:source_end])
            duration_seconds = len(pcm) / INPUT_SAMPLE_RATE
            safe_through = duration_seconds - COMMIT_LAG_MS / 1000
            emitted_at = round(time.time() * 1000)
            additions: list[dict[str, Any]] = []
            for item in aligned:
                absolute_source_index = source_start + item['sourceIndex']
                # The end must be safely in the audio past. A browser must still
                # compare emittedAt against its own Web Audio schedule.
                if item['endSeconds'] > safe_through or absolute_source_index in session.emitted_source_indices:
                    continue
                additions.append({
                    'word': item['word'],
                    'sourceIndex': absolute_source_index,
                    'start': round(item['startSeconds'], 4),
                    'end': round(item['endSeconds'], 4),
                    'confidence': item['confidence'],
                    'windowMs': round(duration_seconds * 1000),
                    'queueMs': round((time.monotonic() - queued_at) * 1000),
                    'emittedAt': emitted_at,
                    'final': final,
                })
            with session.lock:
                for cue in additions:
                    if cue['sourceIndex'] not in session.emitted_source_indices:
                        session.cues.append(cue)
                        session.emitted_source_indices.add(cue['sourceIndex'])
                session.last_processed_samples = len(pcm)
                session.error = None
        except Exception as error:
            self.metrics['alignmentFailures'] += 1
            with session.lock:
                session.error = str(error)
        finally:
            with session.lock:
                session.processing = False
            self.metrics['alignmentJobs'] += 1
            self.metrics['cuesEmitted'] += len(additions) if 'additions' in locals() else 0
            self.metrics['lastAlignmentMs'] = round((time.monotonic() - started) * 1000)


class Handler(BaseHTTPRequestHandler):
    state: WorkerState

    def log_message(self, _format: str, *_args: Any) -> None:
        # HTTP request logs would overwhelm timing logs; use /status metrics instead.
        return

    def _json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _payload(self) -> dict[str, Any]:
        size = int(self.headers.get('Content-Length', '0'))
        if size > 10 * 1024 * 1024:
            raise ValueError('Payload exceeds 10 MiB limit.')
        try:
            value = json.loads(self.rfile.read(size))
        except json.JSONDecodeError as error:
            raise ValueError('Expected JSON request body.') from error
        if not isinstance(value, dict):
            raise ValueError('Expected a JSON object.')
        return value

    def do_GET(self) -> None:
        try:
            parsed = urlparse(self.path)
            if parsed.path == '/status':
                self._json(HTTPStatus.OK, self.state.status())
                return
            if parsed.path == '/cues':
                query = parse_qs(parsed.query)
                session_id = query.get('session', [''])[0]
                after = int(query.get('after', ['-1'])[0])
                self._json(HTTPStatus.OK, self.state.cues(session_id, after))
                return
            self._json(HTTPStatus.NOT_FOUND, {'error': 'Unknown endpoint.'})
        except (ValueError, KeyError) as error:
            self._json(HTTPStatus.BAD_REQUEST, {'error': str(error)})

    def do_POST(self) -> None:
        try:
            payload = self._payload()
            if self.path == '/start':
                result = self.state.create(payload)
            elif self.path == '/chunk':
                result = self.state.chunk(payload)
            elif self.path == '/stop':
                result = self.state.stop(payload)
            elif self.path == '/dispose':
                result = self.state.dispose(payload)
            else:
                self._json(HTTPStatus.NOT_FOUND, {'error': 'Unknown endpoint.'})
                return
            self._json(HTTPStatus.OK, result)
        except (ValueError, KeyError) as error:
            self._json(HTTPStatus.BAD_REQUEST, {'error': str(error)})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', default=8791, type=int)
    parser.add_argument('--mock', action='store_true', help='Exercise only the HTTP protocol; do not load or claim to run CTC.')
    args = parser.parse_args()
    Handler.state = WorkerState(mock=args.mock)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(json.dumps({'listening': f'http://{args.host}:{args.port}', **Handler.state.status()}, ensure_ascii=False), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        Handler.state.executor.shutdown(wait=False, cancel_futures=True)


if __name__ == '__main__':
    main()
