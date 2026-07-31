import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname);
const parseJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const round = (value, places = 1) =>
  Number.isFinite(value) ? Number(value.toFixed(places)) : null;
const mean = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const percentile = (values, fraction) => {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction))];
};

function parseArgs(argumentsList) {
  const options = { tag: null };
  for (let index = 0; index < argumentsList.length; index += 1) {
    if (argumentsList[index] === '--tag') options.tag = argumentsList[++index];
    else throw new Error(`Unknown option: ${argumentsList[index]}`);
  }
  if (options.tag && !/^[a-z0-9][a-z0-9-]{0,64}$/i.test(options.tag)) {
    throw new Error('--tag must contain only letters, numbers, and hyphens.');
  }
  return options;
}

function renderChart(rows) {
  const width = 1120;
  const height = 590;
  const margin = { left: 80, right: 35 };
  const plotWidth = width - margin.left - margin.right;
  const overview = { top: 45, height: 180 };
  const detail = { top: 305, height: 170 };
  const x = (index) => margin.left + (plotWidth * index) / Math.max(1, rows.length - 1);
  const overviewY = (coverage) => overview.top + overview.height * (1 - coverage);
  const detailMax = Math.max(
    0.15,
    Math.ceil(Math.max(...rows.map((row) => row.meanCausalCoverage)) * 20) / 20
  );
  const detailY = (coverage) => detail.top + detail.height * (1 - coverage / detailMax);
  const overviewPoints = rows
    .map((row, index) => `${x(index)},${overviewY(row.meanCausalCoverage)}`)
    .join(' ');
  const detailPoints = rows
    .map((row, index) => `${x(index)},${detailY(row.meanCausalCoverage)}`)
    .join(' ');
  const escaped = (value) =>
    String(value).replace(
      /[&<>]/g,
      (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]
    );
  const labels = rows
    .map(
      (row, index) =>
        `<text x="${x(index)}" y="${detail.top + detail.height + 28}" text-anchor="middle" font-size="12" fill="#334155">${(row.prebufferMs / 1000).toFixed(row.prebufferMs % 1000 ? 1 : 0)}s</text><text x="${x(index)}" y="${detail.top + detail.height + 46}" text-anchor="middle" font-size="10" fill="#64748b">${row.safetyMs}ms safety</text>`
    )
    .join('');
  const dots = (coordinate) =>
    rows
      .map((row, index) => {
        const color = row.status === 'retain' ? '#16a34a' : '#f97316';
        return `<circle cx="${x(index)}" cy="${coordinate(row.meanCausalCoverage)}" r="6" fill="${color}"><title>${escaped(row.id)}: ${round(row.meanCausalCoverage * 100)}% causal coverage; ${row.prebufferMs} ms pre-roll; ${row.status}</title></circle>`;
      })
      .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Autoresearch candidate causal CTC coverage">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${margin.left}" y="24" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#0f172a">Frozen replay: causal CTC coverage by policy</text>
  <text x="${margin.left}" y="${overview.top - 9}" font-size="13" font-weight="600" fill="#334155">Overview — target is 80%</text>
  ${[0, 0.2, 0.4, 0.6, 0.8, 1].map((value) => `<line x1="${margin.left}" y1="${overviewY(value)}" x2="${width - margin.right}" y2="${overviewY(value)}" stroke="#e2e8f0"/><text x="${margin.left - 12}" y="${overviewY(value) + 4}" text-anchor="end" font-size="12" fill="#64748b">${Math.round(value * 100)}%</text>`).join('')}
  <line x1="${margin.left}" y1="${overviewY(0.8)}" x2="${width - margin.right}" y2="${overviewY(0.8)}" stroke="#16a34a" stroke-width="2" stroke-dasharray="6 5"/>
  <text x="${width - margin.right}" y="${overviewY(0.8) - 8}" text-anchor="end" font-size="12" fill="#15803d">80% retain gate</text>
  <polyline points="${overviewPoints}" fill="none" stroke="#475569" stroke-width="2"/>
  ${dots(overviewY)}
  <text x="${margin.left}" y="${detail.top - 12}" font-size="13" font-weight="600" fill="#334155">Detail — observed 0–${Math.round(detailMax * 100)}% range</text>
  ${[0, 0.25, 0.5, 0.75, 1]
    .map((fraction) => {
      const value = detailMax * fraction;
      return `<line x1="${margin.left}" y1="${detailY(value)}" x2="${width - margin.right}" y2="${detailY(value)}" stroke="#e2e8f0"/><text x="${margin.left - 12}" y="${detailY(value) + 4}" text-anchor="end" font-size="12" fill="#64748b">${round(value * 100)}%</text>`;
    })
    .join('')}
  <polyline points="${detailPoints}" fill="none" stroke="#475569" stroke-width="2"/>
  ${dots(detailY)}
  ${labels}
  <text x="${margin.left}" y="${height - 18}" font-family="system-ui, sans-serif" font-size="12" fill="#64748b">Orange = discard; green = retain. All points are re-evaluations of the same captured evidence, not new Live generations.</text>
</svg>`;
}

const options = parseArgs(process.argv.slice(2));
const corpus = await parseJson(resolve(root, 'autoresearch-corpus.json'));
const candidateFile = await parseJson(resolve(root, 'autoresearch-candidate.json'));
if (corpus.schemaVersion !== 1 || candidateFile.schemaVersion !== 1) {
  throw new Error('Unsupported autoresearch schema version.');
}
const tag = options.tag || new Date().toISOString().replace(/[-:.]/g, '');
const outputDir = resolve(root, 'artifacts', 'autoresearch', tag);
await mkdir(resolve(root, 'artifacts', 'autoresearch'), { recursive: true });
try {
  await mkdir(outputDir);
} catch (error) {
  if (error?.code === 'EEXIST') {
    throw new Error(
      `Autoresearch tag ${tag} already exists; use a new --tag to preserve prior evidence.`
    );
  }
  throw error;
}
const evaluator = resolve(root, 'precision-replay-eval.mjs');

const corpusReports = await Promise.all(
  corpus.reports.map(async (entry) => {
    const report = await parseJson(resolve(root, entry.path));
    if (report.referencePoemId !== corpus.referencePoemId) {
      throw new Error(`${entry.path} is not the frozen reference poem ${corpus.referencePoemId}.`);
    }
    const result = (report.results || []).find(
      (candidate) =>
        candidate.status === 'recorded' &&
        candidate.method === entry.method &&
        candidate.analysis?.examples?.length
    );
    if (!result) throw new Error(`${entry.path} has no analyzed ${entry.method} capture.`);
    return { ...entry, report, result };
  })
);

const rows = [];
for (const candidate of candidateFile.candidates) {
  if (
    !candidate.id ||
    !Number.isFinite(candidate.prebufferMs) ||
    !Number.isFinite(candidate.safetyMs)
  ) {
    throw new Error('Every candidate requires id, prebufferMs, and safetyMs.');
  }
  console.log(
    `[autoresearch] evaluating ${candidate.id} (${candidate.prebufferMs} ms prebuffer, ${candidate.safetyMs} ms safety)`
  );
  const captures = [];
  for (const source of corpusReports) {
    const { stdout } = await execFileAsync(process.execPath, [
      evaluator,
      resolve(root, source.path),
      '--method',
      source.method,
      '--prebuffer-ms',
      String(candidate.prebufferMs),
      '--safety-ms',
      String(candidate.safetyMs),
      '--json',
    ]);
    const evaluation = JSON.parse(stdout);
    captures.push({
      label: source.label,
      report: source.path,
      causalCoverage: evaluation.causalCtcEvidence.causalPrecisionCoverageAtConfiguredPrebuffer,
      comparableAnchorCoverage: evaluation.causalCtcEvidence.comparableAnchorCoverage,
      cueP90ErrorMs: evaluation.causalCtcEvidence.cueStartErrorMs.p90Absolute,
      baselineStrictOnsetRate: evaluation.baselineRendered.strictOnsetWithinToleranceRate,
      baselineExactRate: evaluation.baselineRendered.exactSingleWordAtSpokenStartRate,
    });
  }
  const causal = captures.map((capture) => capture.causalCoverage);
  const cueErrors = captures.map((capture) => capture.cueP90ErrorMs).filter(Number.isFinite);
  const gates = candidateFile.acceptance;
  const gateResults = {
    meanCoverage: mean(causal) >= gates.targetCausalCoverage,
    minimumCoverage: Math.min(...causal) >= gates.minimumPerCaptureCoverage,
    cuePrecision:
      cueErrors.length === captures.length && Math.max(...cueErrors) <= gates.maxCueP90ErrorMs,
    latency: candidate.prebufferMs <= gates.maxPrebufferMs,
  };
  const status = Object.values(gateResults).every(Boolean) ? 'retain' : 'discard';
  const row = {
    id: candidate.id,
    prebufferMs: candidate.prebufferMs,
    safetyMs: candidate.safetyMs,
    status,
    gateResults,
    meanCausalCoverage: mean(causal),
    minimumCausalCoverage: Math.min(...causal),
    p90CausalCoverage: percentile(causal, 0.9),
    worstCueP90ErrorMs: cueErrors.length === captures.length ? Math.max(...cueErrors) : null,
    meanBaselineStrictOnsetRate: mean(captures.map((capture) => capture.baselineStrictOnsetRate)),
    meanBaselineExactRate: mean(captures.map((capture) => capture.baselineExactRate)),
    captures,
  };
  rows.push(row);
  console.log(
    `[autoresearch] ${candidate.id}: ${round(row.meanCausalCoverage * 100)}% mean causal coverage → ${status}`
  );
}

const ranked = [...rows].sort((left, right) => {
  if (left.status !== right.status) return left.status === 'retain' ? -1 : 1;
  if (right.meanCausalCoverage !== left.meanCausalCoverage)
    return right.meanCausalCoverage - left.meanCausalCoverage;
  return left.prebufferMs - right.prebufferMs;
});
const result = {
  schemaVersion: 1,
  tag,
  generatedAt: new Date().toISOString(),
  contract: 'autoresearch-program.md',
  corpus: {
    path: 'autoresearch-corpus.json',
    captureCount: corpusReports.length,
    referencePoemId: corpus.referencePoemId,
  },
  candidateSurface: 'autoresearch-candidate.json',
  acceptance: candidateFile.acceptance,
  candidates: rows,
  ranked,
  verdict:
    ranked[0]?.status === 'retain'
      ? `Retain ${ranked[0].id} for fresh Live validation; it cleared every fixed-corpus gate.`
      : 'No policy is retained. The frozen evidence does not support causal CTC precision within the 2 s pre-roll gate.',
  limitations: [
    'This re-evaluates captured CTC cues; it is deterministic but not a new audio/CTC execution.',
    'It may select a policy threshold, not prove that the underlying CTC architecture can reach unobserved coverage.',
    'Chirp timestamps are audit-only and are never supplied to candidate scheduling.',
  ],
};
const tsv = [
  'candidate\tprebuffer_ms\tsafety_ms\tmean_causal_coverage\tminimum_causal_coverage\tworst_cue_p90_error_ms\tstatus',
  ...rows.map((row) =>
    [
      row.id,
      row.prebufferMs,
      row.safetyMs,
      round(row.meanCausalCoverage, 4),
      round(row.minimumCausalCoverage, 4),
      row.worstCueP90ErrorMs,
      row.status,
    ].join('\t')
  ),
].join('\n');
const summary = `# Autoresearch replay — ${tag}\n\n${result.verdict}\n\nThis is a deterministic policy sweep over ${corpusReports.length} retained CTC capture${corpusReports.length === 1 ? '' : 's'}. It generated no Gemini audio and did not use Chirp to schedule highlights. ${corpusReports.length < 2 ? 'A single capture is a regression check, not sufficient evidence to generalize a CTC policy.' : ''}\n\n| Candidate | Pre-roll | Safety | Mean causal coverage | Lowest capture | Worst cue P90 | Decision |\n| --- | ---: | ---: | ---: | ---: | ---: | --- |\n${ranked.map((row) => `| ${row.id} | ${row.prebufferMs} ms | ${row.safetyMs} ms | ${round(row.meanCausalCoverage * 100)}% | ${round(row.minimumCausalCoverage * 100)}% | ${row.worstCueP90ErrorMs ?? 'n/a'} ms | ${row.status} |`).join('\n')}\n\nAcceptance requires mean ≥${candidateFile.acceptance.targetCausalCoverage * 100}%, every capture ≥${candidateFile.acceptance.minimumPerCaptureCoverage * 100}%, cue P90 ≤${candidateFile.acceptance.maxCueP90ErrorMs} ms, and pre-roll ≤${candidateFile.acceptance.maxPrebufferMs} ms.\n\nSee [progress.svg](progress.svg) and [results.json](results.json).\n`;
await Promise.all([
  writeFile(resolve(outputDir, 'results.json'), `${JSON.stringify(result, null, 2)}\n`),
  writeFile(resolve(outputDir, 'results.tsv'), `${tsv}\n`),
  writeFile(resolve(outputDir, 'summary.md'), summary),
  writeFile(resolve(outputDir, 'progress.svg'), renderChart(rows)),
]);
console.log(
  JSON.stringify(
    {
      outputDir,
      verdict: result.verdict,
      ranked: ranked.map((row) => ({
        id: row.id,
        coverage: round(row.meanCausalCoverage * 100),
        status: row.status,
      })),
    },
    null,
    2
  )
);
