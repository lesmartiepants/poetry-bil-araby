import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Deterministic *counterfactual* evaluator for the precision-recitation idea.
// It deliberately does not transcribe audio or call CTC. It reuses the Chirp
// timestamps and rendered cursor transitions already persisted in one capture.
// That makes the baseline-versus-oracle comparison immune to a different Gemini
// delivery, while keeping the important distinction clear: an oracle replay is
// an upper bound, not a demonstrated live CTC result.

function parseArgs(argumentsList) {
  const options = { toleranceMs: 80, safetyMs: 150, prebufferMs: 1500, json: false };
  const positional = [];
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--json') options.json = true;
    else if (argument === '--method') options.method = argumentsList[++index];
    else if (argument === '--tolerance-ms') options.toleranceMs = Number(argumentsList[++index]);
    else if (argument === '--safety-ms') options.safetyMs = Number(argumentsList[++index]);
    else if (argument === '--prebuffer-ms') options.prebufferMs = Number(argumentsList[++index]);
    else positional.push(argument);
  }
  const reportPath = positional.find((argument) => argument.endsWith('.json'));
  if (
    !reportPath ||
    !Number.isFinite(options.toleranceMs) ||
    !Number.isFinite(options.safetyMs) ||
    !Number.isFinite(options.prebufferMs)
  ) {
    throw new Error(
      'Usage: node investigations/live-word-sync-poc/precision-replay-eval.mjs <analyzed-comparison.json> [--method transcript-mora-blend-50] [--tolerance-ms 80] [--safety-ms 150] [--prebuffer-ms 1500] [--json]'
    );
  }
  return { reportPath, ...options };
}

function round(value, places = 1) {
  return Number.isFinite(value) ? Number(value.toFixed(places)) : null;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction))];
}

function eventsFor(metrics) {
  const transitions = metrics.highlightTransitions || [];
  if (transitions.length) {
    return {
      kind: 'rendered-transition',
      events: transitions.map((event) => ({
        time: event.contentTime,
        activeIndex: event.activeIndex,
        activeEnd: event.activeEnd,
      })),
    };
  }
  // Old artifacts only have a 50 ms sampled snapshot. It remains useful for
  // historical orientation, but must never be described as transition-exact.
  return { kind: 'sampled-50ms-fallback', events: metrics.highlightTimeline || [] };
}

function snapshotAt(events, time) {
  let current = null;
  for (const event of events) {
    if (event.time > time) break;
    current = event;
  }
  return current;
}

function auditedWords(examples) {
  const bySourceIndex = new Map();
  for (const example of examples || []) {
    if (!Number.isInteger(example.sourceIndex) || !Number.isFinite(example.spokenAt)) continue;
    // Chirp can repeat a word. Keep the first monotonic occurrence for a
    // deterministic source-word timing surface.
    if (!bySourceIndex.has(example.sourceIndex)) bySourceIndex.set(example.sourceIndex, example);
  }
  return [...bySourceIndex.values()].sort((left, right) => left.spokenAt - right.spokenAt);
}

function nearestSingleWordTransition(events, sourceIndex, spokenAt) {
  const candidates = events.filter(
    (event) => event.activeIndex === sourceIndex && event.activeEnd - event.activeIndex === 1
  );
  if (!candidates.length) return null;
  return candidates.reduce((closest, candidate) =>
    Math.abs(candidate.time - spokenAt) < Math.abs(closest.time - spokenAt) ? candidate : closest
  );
}

function renderedMetric(words, events, toleranceMs) {
  const rows = words.map((word) => {
    const snapshot = snapshotAt(events, word.spokenAt);
    const exactAtSpokenStart = Boolean(
      snapshot &&
      snapshot.activeIndex === word.sourceIndex &&
      snapshot.activeEnd - snapshot.activeIndex === 1
    );
    const transition = nearestSingleWordTransition(events, word.sourceIndex, word.spokenAt);
    const onsetErrorMs = transition ? (transition.time - word.spokenAt) * 1000 : null;
    return { ...word, exactAtSpokenStart, onsetErrorMs };
  });
  const onsetErrors = rows.map((row) => row.onsetErrorMs).filter(Number.isFinite);
  const withinTolerance = rows.filter(
    (row) =>
      row.exactAtSpokenStart &&
      Number.isFinite(row.onsetErrorMs) &&
      Math.abs(row.onsetErrorMs) <= toleranceMs
  );
  return {
    auditedWordCount: rows.length,
    exactSingleWordAtSpokenStartCount: rows.filter((row) => row.exactAtSpokenStart).length,
    exactSingleWordAtSpokenStartRate: rows.length
      ? rows.filter((row) => row.exactAtSpokenStart).length / rows.length
      : 0,
    strictOnsetWithinToleranceCount: withinTolerance.length,
    strictOnsetWithinToleranceRate: rows.length ? withinTolerance.length / rows.length : 0,
    onsetErrorMs: {
      measuredWordCount: onsetErrors.length,
      medianAbsolute: round(percentile(onsetErrors.map(Math.abs), 0.5)),
      p90Absolute: round(percentile(onsetErrors.map(Math.abs), 0.9)),
    },
    rows,
  };
}

function ctcEvidence(words, result, options) {
  const precision = result.metrics?.precision || null;
  const anchors = precision
    ? (precision.cues || [])
        .filter((cue) => cue.stable === true && Number.isInteger(cue.sourceIndex))
        .map((cue) => ({
          ...cue,
          observedStart: cue.start,
          receivedAtContentTime: null,
          receivedAtPrebufferMs:
            Number.isFinite(cue.receivedAtWallMs) && Number.isFinite(precision.firstPcmAtWallMs)
              ? cue.receivedAtWallMs - precision.firstPcmAtWallMs
              : null,
        }))
    : (result.metrics?.anchor?.events || []).filter(
        (event) => event.status === 'accepted' && Number.isInteger(event.sourceIndex)
      );
  const byIndex = new Map(words.map((word) => [word.sourceIndex, word]));
  const comparable = anchors
    .map((anchor) => ({ anchor, word: byIndex.get(anchor.sourceIndex) }))
    .filter(({ word }) => word);
  const timing = comparable
    .filter(
      ({ anchor }) =>
        Number.isFinite(anchor.observedStart) &&
        (Number.isFinite(anchor.receivedAtContentTime) ||
          Number.isFinite(anchor.receivedAtPrebufferMs))
    )
    .map(({ anchor, word }) => {
      const cueStartErrorMs = (anchor.observedStart - word.spokenAt) * 1000;
      // The current worker records receipt in content-time coordinates. A
      // precision player can only use this cue before the word plays, so this
      // is the necessary audio lead plus an explicit engineering safety margin.
      const requiredPrebufferMs = Number.isFinite(anchor.receivedAtPrebufferMs)
        ? anchor.receivedAtPrebufferMs + options.safetyMs
        : Math.max(0, (anchor.receivedAtContentTime - word.spokenAt) * 1000) + options.safetyMs;
      return { sourceIndex: word.sourceIndex, cueStartErrorMs, requiredPrebufferMs };
    });
  const accurateAndReady = timing.filter(
    (row) =>
      Math.abs(row.cueStartErrorMs) <= options.toleranceMs &&
      row.requiredPrebufferMs <= options.prebufferMs
  );
  return {
    acceptedAnchorCount: anchors.length,
    comparableAnchorCount: comparable.length,
    comparableAnchorCoverage: words.length ? comparable.length / words.length : 0,
    cueStartWithinToleranceCount: timing.filter(
      (row) => Math.abs(row.cueStartErrorMs) <= options.toleranceMs
    ).length,
    cueStartWithinToleranceRateAmongComparable: timing.length
      ? timing.filter((row) => Math.abs(row.cueStartErrorMs) <= options.toleranceMs).length /
        timing.length
      : null,
    causalPrecisionCoverageAtConfiguredPrebuffer: words.length
      ? accurateAndReady.length / words.length
      : 0,
    requiredPrebufferMs: {
      safetyMs: options.safetyMs,
      median: round(
        percentile(
          timing.map((row) => row.requiredPrebufferMs),
          0.5
        )
      ),
      p90: round(
        percentile(
          timing.map((row) => row.requiredPrebufferMs),
          0.9
        )
      ),
      max: round(timing.length ? Math.max(...timing.map((row) => row.requiredPrebufferMs)) : null),
    },
    cueStartErrorMs: {
      medianAbsolute: round(
        percentile(
          timing.map((row) => Math.abs(row.cueStartErrorMs)),
          0.5
        )
      ),
      p90Absolute: round(
        percentile(
          timing.map((row) => Math.abs(row.cueStartErrorMs)),
          0.9
        )
      ),
    },
    rows: timing,
  };
}

const options = parseArgs(process.argv.slice(2));
const report = JSON.parse(await readFile(resolve(options.reportPath), 'utf8'));
const recorded = (report.results || []).filter(
  (result) => result.status === 'recorded' && result.analysis?.examples
);
const result = options.method
  ? recorded.find((candidate) => candidate.method === options.method)
  : recorded.find(
      (candidate) => candidate.method === 'transcript-mora-blend-50-weighted-fallback'
    ) ||
    recorded.find((candidate) => candidate.method === 'transcript-mora-blend-50') ||
    recorded[0];

if (!result)
  throw new Error('No recorded, analyzed result was found in this report. Run poc:analyze first.');
const trace = eventsFor(result.metrics || {});
if (!trace.events.length)
  throw new Error(`Result ${result.method} has no highlight transition or timeline trace.`);
const words = auditedWords(result.analysis.examples);
if (!words.length)
  throw new Error(`Result ${result.method} has no conservatively mapped Chirp words.`);

const rendered = renderedMetric(words, trace.events, options.toleranceMs);
const ctc = ctcEvidence(words, result, options);
const sourceWordCount = result.analysis.sourceWordCount || null;
const oracle = {
  // This uses the same recorded word-start timestamps as its transition list:
  // it is the mathematical ceiling if every trusted cue is available before
  // audio starts, not a claim about the existing CTC worker.
  auditedWordCount: words.length,
  exactSingleWordAtSpokenStartCount: words.length,
  exactSingleWordAtSpokenStartRate: 1,
  strictOnsetWithinToleranceCount: words.length,
  strictOnsetWithinToleranceRate: 1,
  sourceCoverage: sourceWordCount ? words.length / sourceWordCount : null,
};
const target80 = ctc.causalPrecisionCoverageAtConfiguredPrebuffer >= 0.8;
const target100 = ctc.causalPrecisionCoverageAtConfiguredPrebuffer === 1;
const output = {
  schema: 'precision-replay-eval-v2',
  report: resolve(options.reportPath),
  batchId: report.batchId || null,
  method: result.method,
  recording: result.recording || null,
  trace: trace.kind,
  target: {
    toleranceMs: options.toleranceMs,
    prebufferMs: options.prebufferMs,
    safetyMs: options.safetyMs,
  },
  baselineRendered: { ...rendered, rows: undefined },
  precisionOracleReplay: oracle,
  causalCtcEvidence: { ...ctc, rows: undefined },
  gates: {
    reaches80PercentCausalPrecision: {
      status: target80 ? 'PRELIMINARY_PASS' : 'NOT_DEMONSTRATED',
      evidence: `${round(ctc.causalPrecisionCoverageAtConfiguredPrebuffer * 100)}% of ${words.length} audit-comparable words had an accepted CTC cue both within ±${options.toleranceMs} ms and available with <=${options.prebufferMs} ms prebuffer.`,
    },
    reaches100PercentCausalPrecision: {
      status: target100 ? 'PRELIMINARY_PASS' : 'NOT_DEMONSTRATED',
      evidence: target100
        ? 'Every audit-comparable word met this one-capture cue condition; repeat across recordings before any 100% claim.'
        : '100% requires a trusted, before-playback cue for every audit-comparable word; the oracle row is only the mathematical upper bound.',
    },
  },
  limitations: [
    'The oracle replay is a same-recording upper bound constructed from post-run Chirp word starts. It does not prove CTC can produce those cues causally.',
    'A 100% oracle rate is only over conservatively Chirp-mapped words, not necessarily every source word and not human-annotated ground truth.',
    trace.kind === 'rendered-transition'
      ? 'Baseline exactness is evaluated at actual cursor state transitions.'
      : 'This historical capture lacks transition events; baseline timing is quantized by its 50 ms sampled timeline.',
    'Causal CTC coverage counts only accepted anchors in this same result. Missing anchors cannot be assumed correct.',
  ],
};

if (options.json) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`Precision replay evaluation: ${output.report}`);
  console.log(`Method / recording: ${output.method} / ${output.recording || 'unknown'}`);
  console.log(
    `Trace: ${trace.kind}; target: one word at speech onset and within ±${options.toleranceMs} ms.`
  );
  console.table([
    {
      schedule: 'Recorded rendered baseline',
      exactSingleWord: `${rendered.exactSingleWordAtSpokenStartCount}/${words.length} (${round(rendered.exactSingleWordAtSpokenStartRate * 100)}%)`,
      strictOnset: `${rendered.strictOnsetWithinToleranceCount}/${words.length} (${round(rendered.strictOnsetWithinToleranceRate * 100)}%)`,
      p90OnsetErrorMs: rendered.onsetErrorMs.p90Absolute,
    },
    {
      schedule: 'Precision oracle replay (not live evidence)',
      exactSingleWord: `${oracle.exactSingleWordAtSpokenStartCount}/${words.length} (100%)`,
      strictOnset: `${oracle.strictOnsetWithinToleranceCount}/${words.length} (100%)`,
      p90OnsetErrorMs: 0,
    },
  ]);
  console.log(
    `CTC causal evidence: ${ctc.causalPrecisionCoverageAtConfiguredPrebuffer ? round(ctc.causalPrecisionCoverageAtConfiguredPrebuffer * 100) : 0}% coverage at ${options.prebufferMs} ms prebuffer; ` +
      `${ctc.comparableAnchorCount}/${words.length} comparable accepted anchors; required prebuffer P90 ${ctc.requiredPrebufferMs.p90 ?? 'n/a'} ms.`
  );
  console.log(
    `80% gate: ${output.gates.reaches80PercentCausalPrecision.status} — ${output.gates.reaches80PercentCausalPrecision.evidence}`
  );
  console.log(
    `100% gate: ${output.gates.reaches100PercentCausalPrecision.status} — ${output.gates.reaches100PercentCausalPrecision.evidence}`
  );
  for (const limitation of output.limitations) console.log(`Note: ${limitation}`);
}
