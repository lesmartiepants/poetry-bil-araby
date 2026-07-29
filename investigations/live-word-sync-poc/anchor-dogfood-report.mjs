import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const reportPath = process.argv.find((argument) => argument.endsWith('.json'));
const jsonOnly = process.argv.includes('--json');

if (!reportPath) {
  throw new Error(
    'Usage: node investigations/live-word-sync-poc/anchor-dogfood-report.mjs <comparison-report.json> [--json]'
  );
}

function round(value, places = 1) {
  return Number.isFinite(value) ? Number(value.toFixed(places)) : null;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction))];
}

function summaryError(anchor) {
  const candidates = [
    anchor?.providerError,
    anchor?.workerError,
    anchor?.error,
    ...(anchor?.events || []).flatMap((event) => [event.providerError, event.workerError, event.error]),
  ];
  return [...new Set(candidates.filter((value) => typeof value === 'string' && value.trim()))];
}

function methodSummary(result, control) {
  const metrics = result.metrics || {};
  const analysis = result.analysis || {};
  const score = analysis.score || {};
  const anchor = metrics.anchor || null;
  const events = anchor?.events || [];
  const accepted = events.filter((event) => event.status === 'accepted');
  const rejected = events.filter((event) => String(event.status || '').startsWith('rejected'));
  const staleness = accepted.map((event) => event.stalenessMs).filter(Number.isFinite);
  const appliedCorrections = accepted
    .map((event) => event.appliedCorrectionMs)
    .filter(Number.isFinite);
  const discrepancies = accepted.map((event) => event.discrepancyMs).filter(Number.isFinite);
  const firstAudioMs = metrics.firstAudioMs;
  const firstAudioDeltaMs =
    Number.isFinite(firstAudioMs) && Number.isFinite(control?.metrics?.firstAudioMs)
      ? firstAudioMs - control.metrics.firstAudioMs
      : null;
  const exactWordCount = analysis.exactWordCount ?? 0;
  const matchedWordCount = analysis.matchedWordCount ?? 0;
  const exactRate =
    Number.isFinite(score.exactRate) ? score.exactRate : matchedWordCount ? exactWordCount / matchedWordCount : 0;
  const receivedCount = anchor?.receivedCount ?? events.length;
  const acceptedCount = anchor?.acceptedCount ?? accepted.length;
  const rejectedCount = anchor?.rejectedCount ?? rejected.length;
  const errors = summaryError(anchor);
  const isControl = result === control;

  // These map directly to the documented live-spike gates. A single report can
  // falsify them, but cannot establish the multi-capture/P95 gates as passed.
  const gates = isControl
    ? {
        acceptedAnchor: { status: 'NOT_APPLICABLE', evidence: 'This is the fallback control.' },
        anchorTimeliness750ms: { status: 'NOT_APPLICABLE', evidence: 'This is the fallback control.' },
        safeFutureHorizon: { status: 'NOT_APPLICABLE', evidence: 'This is the fallback control.' },
        firstAudioRegression: { status: 'NOT_APPLICABLE', evidence: 'This is the reference first-audio measurement.' },
        displayedOffsetImprovement: { status: 'NOT_APPLICABLE', evidence: 'This is the comparison baseline.' },
      }
    : {
    acceptedAnchor: {
      status: acceptedCount > 0 ? 'PASS' : 'FAIL',
      evidence: `${acceptedCount}/${receivedCount} received anchors accepted`,
    },
    anchorTimeliness750ms: {
      status: acceptedCount === 0 ? 'FAIL' : staleness.every((value) => value <= 750) ? 'PASS' : 'FAIL',
      evidence:
        acceptedCount === 0
          ? 'No committed anchor exists.'
          : `accepted anchor staleness: median ${round(percentile(staleness, 0.5))} ms, P90 ${round(percentile(staleness, 0.9))} ms`,
    },
    safeFutureHorizon: {
      status:
        acceptedCount === 0
          ? 'FAIL'
          : accepted.every((event) => Number.isFinite(event.futureHorizonMs) && event.futureHorizonMs >= 150)
            ? 'PASS'
            : 'FAIL',
      evidence:
        acceptedCount === 0
          ? 'No accepted anchor can demonstrate a safe future horizon.'
          : `${accepted.filter((event) => event.futureHorizonMs >= 150).length}/${acceptedCount} accepted anchors had >=150 ms horizon`,
    },
    firstAudioRegression: {
      status:
        firstAudioDeltaMs == null
          ? 'INSUFFICIENT_DATA'
          : firstAudioDeltaMs <= 50
            ? 'PRELIMINARY_PASS'
            : 'FAIL',
      evidence:
        firstAudioDeltaMs == null
          ? 'No paired fallback control in this report.'
          : `${round(firstAudioDeltaMs)} ms versus ${control.method}; the documented requirement is P95 across paired live batches, so one pair cannot pass the full gate.`,
    },
    displayedOffsetImprovement: {
      status: 'INSUFFICIENT_DATA',
      evidence:
        'Requires six paired batches, median displayed-offset measurement, and a P90 no-regression check; exact-word rate is reported below but is not a substitute.',
    },
  };

  return {
    method: result.method,
    status: result.status,
    firstAudioMs: round(firstAudioMs),
    firstAudioDeltaVsControlMs: round(firstAudioDeltaMs),
    exactSingleWordChirpAudit: {
      exactWordCount,
      matchedWordCount,
      rate: round(exactRate * 100),
      coveredWordCount: analysis.coveredWordCount ?? 0,
      sourceWordCount: analysis.sourceWordCount ?? null,
    },
    anchors: {
      source: anchor?.source || null,
      mode: anchor?.mode || null,
      receivedCount,
      acceptedCount,
      rejectedCount,
      rejectionReasons: Object.fromEntries(
        [...new Set(rejected.map((event) => event.status).filter(Boolean))].map((status) => [
          status,
          rejected.filter((event) => event.status === status).length,
        ])
      ),
      acceptedStalenessMs: {
        median: round(percentile(staleness, 0.5)),
        p90: round(percentile(staleness, 0.9)),
        max: round(staleness.length ? Math.max(...staleness) : null),
      },
      correctionMs: {
        count: appliedCorrections.length,
        median: round(percentile(appliedCorrections, 0.5)),
        p90Absolute: round(percentile(appliedCorrections.map(Math.abs), 0.9)),
        total: round(appliedCorrections.reduce((sum, value) => sum + value, 0)),
        discrepancyMedian: round(percentile(discrepancies, 0.5)),
      },
      providerOrWorkerErrors: errors,
      unsettledWritesAtClose: anchor?.unsettledWritesAtClose ?? null,
    },
    gates,
    verdict: isControl
      ? 'CONTROL'
      : result.status !== 'recorded' ||
          gates.acceptedAnchor.status === 'FAIL' ||
          gates.anchorTimeliness750ms.status === 'FAIL' ||
          gates.safeFutureHorizon.status === 'FAIL'
        ? 'FAIL'
        : 'INCONCLUSIVE',
  };
}

const report = JSON.parse(await readFile(resolve(reportPath), 'utf8'));
const recorded = (report.results || []).filter((result) => result.status === 'recorded');
const control =
  recorded.find((result) => result.method === 'transcript-moras-weighted-fallback') ||
  recorded.find((result) => !result.metrics?.anchor) ||
  null;
const methods = recorded.map((result) => methodSummary(result, control));
const output = {
  report: resolve(reportPath),
  batchId: report.batchId || null,
  phase: report.phase || null,
  control: control?.method || null,
  browserErrors: report.browserErrors || [],
  documentedGates:
    'CTC_FEASIBILITY.md: accepted committed anchors; <=750 ms anchor availability; >=150 ms safe future horizon; first-audio P95 regression <=50 ms; six paired batches must improve median displayed offset >=40 ms and 15% without P90 regression.',
  methods,
  overallVerdict: methods.some((method) => method.verdict === 'FAIL') ? 'FAIL' : 'INCONCLUSIVE',
  interpretation:
    'A single comparison report can falsify a live-anchor candidate but cannot satisfy the documented six-capture or P95 gates. In particular, zero accepted anchors is a FAIL, not evidence that visual correction improved or preserved timing.',
};

if (jsonOnly) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`Anchor dogfood report: ${output.report}`);
  console.log(`Batch: ${output.batchId || 'unknown'} | Control: ${output.control || 'none'} | Verdict: ${output.overallVerdict}`);
  console.log('');
  console.table(
    methods.map((method) => ({
      method: method.method,
      exactSingleWord: `${method.exactSingleWordChirpAudit.exactWordCount}/${method.exactSingleWordChirpAudit.matchedWordCount} (${method.exactSingleWordChirpAudit.rate}%)`,
      firstAudioMs: method.firstAudioMs,
      deltaVsControlMs: method.firstAudioDeltaVsControlMs,
      anchors: `${method.anchors.acceptedCount}/${method.anchors.receivedCount} accepted`,
      rejected: method.anchors.rejectedCount,
      stalenessP90Ms: method.anchors.acceptedStalenessMs.p90,
      correctionP90AbsMs: method.anchors.correctionMs.p90Absolute,
      verdict: method.verdict,
    }))
  );
  for (const method of methods) {
    console.log(`\n${method.method}: ${method.verdict}`);
    console.log(`  accepted-anchor gate: ${method.gates.acceptedAnchor.status} — ${method.gates.acceptedAnchor.evidence}`);
    console.log(`  timeliness gate: ${method.gates.anchorTimeliness750ms.status} — ${method.gates.anchorTimeliness750ms.evidence}`);
    console.log(`  future-horizon gate: ${method.gates.safeFutureHorizon.status} — ${method.gates.safeFutureHorizon.evidence}`);
    console.log(`  first-audio gate: ${method.gates.firstAudioRegression.status} — ${method.gates.firstAudioRegression.evidence}`);
    if (method.anchors.providerOrWorkerErrors.length) {
      console.log(`  provider/worker errors: ${method.anchors.providerOrWorkerErrors.join(' | ')}`);
    }
  }
  if (output.browserErrors.length) console.log(`\nBrowser errors: ${output.browserErrors.join(' | ')}`);
  console.log(`\n${output.interpretation}`);
}
