#!/usr/bin/env python3
"""Black-box transport test for the persistent worker (does not test CTC accuracy)."""

from __future__ import annotations

import base64
import json
import subprocess
import sys
import time
import urllib.request
import urllib.error
import zlib
from pathlib import Path

from worker import INPUT_SAMPLE_RATE, WorkerState

ROOT = Path(__file__).parent
PORT = 18791


def request(path: str, payload=None):
    data = None if payload is None else json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f'http://127.0.0.1:{PORT}{path}', data=data,
        headers={'Content-Type': 'application/json'} if data else {},
        method='POST' if data else 'GET',
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        return json.loads(response.read())


def expect_bad_request(path: str, payload) -> None:
    try:
        request(path, payload)
    except urllib.error.HTTPError as error:
        assert error.code == 400
        return
    raise AssertionError(f'Expected HTTP 400 from {path}')


class FixtureEngine:
    """Deterministic alignment fixture: tests cue transport, not Arabic CTC."""

    def __init__(self):
        self.window_lengths: list[int] = []

    def align(self, pcm, words):
        assert len(words) == 2
        self.window_lengths.append(len(pcm))
        return [
            {'word': words[0], 'sourceIndex': 0, 'startSeconds': 0.10, 'endSeconds': 0.25, 'confidence': None},
            {'word': words[1], 'sourceIndex': 1, 'startSeconds': 0.35, 'endSeconds': 0.55, 'confidence': None},
        ]


def wait_for(predicate, message: str) -> None:
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.02)
    raise RuntimeError(message)


def test_absolute_stable_cues() -> None:
    state = WorkerState(mock=True)
    state.model_state = 'ready'
    state.engine = FixtureEngine()
    try:
        started = state.create({
            'transcript': 'مرحبا بالعالم',
            'sampleRateHertz': INPUT_SAMPLE_RATE,
            'pcmBaseSample24k': 48000,
            'sourceStartIndex': 0,
            'sourceEndIndex': 2,
        })
        session_id = started['sessionId']
        first = b'\0\0' * 36000
        state.chunk({
            'sessionId': session_id, 'seq': 0, 'startSample24k': 48000,
            'sampleCount24k': 36000, 'checksum': f'{zlib.crc32(first):08x}',
            'audio': base64.b64encode(first).decode('ascii'),
        })
        wait_for(lambda: state.metrics['alignmentJobs'] == 1, 'First fixture alignment did not run.')
        # The first pass is intentionally withheld until a second growing
        # window agrees. This second chunk adds the reprocessing interval.
        second = b'\0\0' * 12000
        state.chunk({
            'sessionId': session_id, 'seq': 1, 'startSample24k': 84000,
            'sampleCount24k': 12000, 'checksum': f'{zlib.crc32(second):08x}',
            'audio': base64.b64encode(second).decode('ascii'),
        })
        wait_for(lambda: state.metrics['alignmentJobs'] == 2, 'Second fixture alignment did not run.')
        cues = state.cues(session_id, -1)['cues']
        assert len(cues) == 2
        assert cues[0]['startSample24k'] == 50400
        assert cues[0]['endSample24k'] == 54000
        assert cues[1]['startSample24k'] == 56400
        assert cues[1]['endSample24k'] == 61200
        assert all(cue['stable'] and cue['stabilityPasses'] >= 2 for cue in cues)
    finally:
        state.executor.shutdown(wait=True, cancel_futures=True)


def test_bounded_phrase_window() -> None:
    state = WorkerState(mock=True)
    state.model_state = 'ready'
    fixture = FixtureEngine()
    state.engine = fixture
    try:
        started = state.create({
            'transcript': 'مرحبا بالعالم',
            'sampleRateHertz': INPUT_SAMPLE_RATE,
            'pcmBaseSample24k': 48000,
            'sourceStartIndex': 0,
            'sourceEndIndex': 2,
            'alignmentStartSample24k': 48000,
            # 1.5 seconds: this is intentionally not all PCM received.
            'alignmentEndSample24k': 84000,
        })
        session_id = started['sessionId']
        first = b'\0\0' * 24000
        first_ack = state.chunk({
            'sessionId': session_id, 'seq': 0, 'startSample24k': 48000,
            'sampleCount24k': 24000, 'checksum': f'{zlib.crc32(first):08x}',
            'audio': base64.b64encode(first).decode('ascii'),
        })
        assert not first_ack['queued'], 'A phrase end beyond received PCM must not queue.'
        second = b'\0\0' * 24000
        second_ack = state.chunk({
            'sessionId': session_id, 'seq': 1, 'startSample24k': 72000,
            'sampleCount24k': 24000, 'checksum': f'{zlib.crc32(second):08x}',
            'audio': base64.b64encode(second).decode('ascii'),
        })
        assert second_ack['queued']
        wait_for(lambda: state.metrics['alignmentJobs'] == 1, 'Bounded fixture alignment did not run.')
        assert fixture.window_lengths == [36000], 'CTC must receive exactly [alignmentStart, alignmentEnd).'
        # A final pass makes the complete pre-playback phrase available even
        # without another PCM chunk to create a second stability observation.
        assert state.stop({'sessionId': session_id})['queuedFinalAlignment']
        wait_for(lambda: state.metrics['alignmentJobs'] == 2, 'Final bounded fixture alignment did not run.')
        cues = state.cues(session_id, -1)['cues']
        assert len(cues) == 2
        assert all(cue['alignmentEndSample24k'] == 84000 for cue in cues)
        assert all(48000 <= cue['startSample24k'] < cue['endSample24k'] <= 84000 for cue in cues)
    finally:
        state.executor.shutdown(wait=True, cancel_futures=True)


def main() -> None:
    test_absolute_stable_cues()
    test_bounded_phrase_window()
    process = subprocess.Popen(
        [sys.executable, str(ROOT / 'worker.py'), '--mock', '--port', str(PORT)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    try:
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            try:
                status = request('/status')
                break
            except OSError:
                time.sleep(0.05)
        else:
            raise RuntimeError('Worker did not start.')
        assert status['modelState'] == 'mock'
        started = request('/start', {
            'transcript': 'مرحبا بالعالم يا صديقي',
            'sampleRateHertz': 24000,
            'pcmBaseSample24k': 48000,
            'sourceStartIndex': 0,
            'sourceEndIndex': 2,
            'alignmentStartSample24k': 48000,
        })
        session_id = started['sessionId']
        assert started['pcmBaseSample24k'] == 48000
        assert started['range']['alignmentStartSample24k'] == 48000
        raw_silence = b'\0\0' * 36000
        silence = base64.b64encode(raw_silence).decode('ascii')
        received = request('/chunk', {
            'sessionId': session_id, 'seq': 0, 'startSample24k': 48000, 'audio': silence,
            'sampleCount24k': 36000,
            'checksum': f'{zlib.crc32(raw_silence):08x}',
        })
        assert received['ok'] and received['queued'] and received['receivedSampleCount24k'] == 36000
        assert received['receivedThroughSample24k'] == 84000
        assert received['receivedCrc32'] == f'{zlib.crc32(raw_silence):08x}'
        rotated = request('/range', {
            'sessionId': session_id,
            'sourceStartIndex': 2,
            'sourceEndIndex': 4,
            'alignmentStartSample24k': 72000,
        })
        assert rotated['ok'] and rotated['range']['revision'] == 2
        assert rotated['range']['alignmentStartSample24k'] == 72000
        expect_bad_request('/chunk', {
            'sessionId': session_id, 'seq': 2, 'startSample24k': 84000, 'audio': silence,
            'sampleCount24k': 36000, 'checksum': '00000000',
        })
        expect_bad_request('/range', {
            'sessionId': session_id, 'sourceStartIndex': 0, 'sourceEndIndex': 1,
            'alignmentStartSample24k': 47999,
        })
        cues = request(f'/cues?session={session_id}&after=-1')
        assert cues['next'] == -1 and cues['cues'] == []
        assert request('/stop', {'sessionId': session_id})['ok']
        assert request('/dispose', {'sessionId': session_id})['ok']
        print('PASS protocol: absolute/stable fixture cues, base/range rotation, ordered PCM+CRC checks, cues/stop/dispose; mock mode emitted no CTC claims')
    finally:
        process.terminate()
        process.wait(timeout=5)


if __name__ == '__main__':
    main()
