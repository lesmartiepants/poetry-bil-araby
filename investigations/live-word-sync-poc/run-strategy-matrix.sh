#!/bin/zsh

# Resumable first-pass strategy × survivor-voice screen. Each capture receives a
# fresh Gemini Live delivery, and completed audited pairs are never repeated.
set -u

SCRIPT_DIR=${0:A:h}
POC_ROOT=${SCRIPT_DIR}
REPO_ROOT=${POC_ROOT:h:h}
MAIN_ROOT=${REPO_ROOT:h:h:h}
TIMING_ROOT=${MAIN_ROOT}/.claude/worktrees/tts-highlight-timing
ARTIFACTS=${POC_ROOT}/artifacts/comparisons
POEM_PORT=${MATRIX_POEM_PORT:-3021}
LIVE_PORT=${MATRIX_LIVE_PORT:-3023}
HARNESS_PORT=${MATRIX_HARNESS_PORT:-5196}

methods=(
  weighted
  verse
  vad-slew
  branch-transcript-even
  branch-transcript-letters
  branch-transcript-moras
  transcript-mora-blend-25
  transcript-mora-blend-75
  transcript-mora-final
  transcript-moras-weighted-fallback
  transcript-mora-blend-50-weighted-fallback
  nucleus-clock
  agreement-window
)
voices=(
  Zephyr Leda Aoede Callirrhoe Autonoe Despina Laomedeia Achernar Pulcherrima
  Vindemiatrix Sulafat Orus Puck Charon Enceladus Iapetus Algieba Algenib
  Rasalgethi Alnilam Zubenelgenubi
)

if [[ -n "${MATRIX_METHODS:-}" ]]; then
  methods=(${(s:,:)MATRIX_METHODS})
fi
if [[ -n "${MATRIX_VOICES:-}" ]]; then
  voices=(${(s:,:)MATRIX_VOICES})
fi

pair_exists() {
  node --input-type=module - "$1" "$2" "$ARTIFACTS" <<'EOF'
import { readdir, readFile } from 'node:fs/promises';
const [method, voice, artifacts] = process.argv.slice(2);
const reports = await Promise.all(
  (await readdir(artifacts))
    .filter((name) => name.endsWith('-comparison.json'))
    .map(async (name) => JSON.parse(await readFile(`${artifacts}/${name}`, 'utf8')))
);
const found = reports.some((report) =>
  String(report.phase || '').startsWith('strategy-matrix-screen-') &&
  report.tts?.voiceName === voice &&
  report.results?.some(
    (result) =>
      result.method === method && Number.isFinite(result.analysis?.score?.qualityScore)
  )
);
process.exit(found ? 0 : 1);
EOF
}

for method in $methods; do
  for voice in $voices; do
    if pair_exists "$method" "$voice"; then
      echo "SKIP audited: ${method} · ${voice}"
      continue
    fi

    echo "RUN: ${method} · ${voice}"
    (
      cd "$MAIN_ROOT"
      PORT="$POEM_PORT" node server.js
    ) >/tmp/strategy-matrix-poem-api.log 2>&1 &
    poem_api=$!
    (
      cd "$TIMING_ROOT"
      PORT="$LIVE_PORT" node server.js
    ) >/tmp/strategy-matrix-live-api.log 2>&1 &
    live_api=$!
    POC_PORT="$HARNESS_PORT" POC_API_ORIGIN="http://127.0.0.1:${LIVE_PORT}" \
      POC_POEM_API_ORIGIN="http://127.0.0.1:${POEM_PORT}" \
      node "$POC_ROOT/serve-poc.mjs" >/tmp/strategy-matrix-poc.log 2>&1 &
    poc_server=$!
    cleanup() {
      kill "$poc_server" "$live_api" "$poem_api" 2>/dev/null || true
    }
    sleep 2
    if ! (
      cd "$REPO_ROOT"
      GOOGLE_CLOUD_PROJECT=gen-lang-client-0733300014 \
        POC_URL="http://127.0.0.1:${HARNESS_PORT}" \
        POC_VOICES="$voice" \
        POC_REPEATS=1 \
        POC_METHOD="$method" \
        POC_CAMPAIGN="strategy-matrix-screen-${method}" \
        POC_CAPTURE_RETRIES=2 \
        npm run poc:voices
    ); then
      echo "FAILED after retries: ${method} · ${voice}"
    fi
    cleanup
    unset -f cleanup
    sleep 1
  done
done

echo 'Strategy matrix complete.'
