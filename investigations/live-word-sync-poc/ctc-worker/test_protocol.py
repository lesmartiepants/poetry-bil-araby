#!/usr/bin/env python3
"""Black-box transport test for the persistent worker (does not test CTC accuracy)."""

from __future__ import annotations

import base64
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

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


def main() -> None:
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
        started = request('/start', {'transcript': 'مرحبا بالعالم', 'sampleRateHertz': 24000})
        session_id = started['sessionId']
        silence = base64.b64encode(b'\0\0' * 36000).decode('ascii')
        received = request('/chunk', {
            'sessionId': session_id, 'seq': 0, 'startSample24k': 0, 'audio': silence,
            'sampleCount24k': 36000,
            'sourceStartIndex': 0, 'sourceEndIndex': 2,
        })
        assert received['ok'] and received['queued'] and received['receivedSampleCount24k'] == 36000
        cues = request(f'/cues?session={session_id}&after=-1')
        assert cues['next'] == -1 and cues['cues'] == []
        assert request('/stop', {'sessionId': session_id})['ok']
        assert request('/dispose', {'sessionId': session_id})['ok']
        print('PASS protocol: status/start/chunk/cues/stop/dispose; mock mode emitted no alignment claims')
    finally:
        process.terminate()
        process.wait(timeout=5)


if __name__ == '__main__':
    main()
