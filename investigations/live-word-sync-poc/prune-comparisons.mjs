import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname);
const artifacts = resolve(root, 'artifacts', 'comparisons');
const topOverallCount = 12;
const minimumMatchedWords = 24;

function parseArgs(argumentsList) {
  const options = { apply: false };
  for (const argument of argumentsList) {
    if (argument === '--apply') options.apply = true;
    else
      throw new Error(`Usage: node prune-comparisons.mjs [--apply] (unknown option: ${argument})`);
  }
  return options;
}

function familyFor(method) {
  if (method.includes('ctc')) return 'CTC alignment';
  if (method.includes('google')) return 'external STT anchor';
  if (method.includes('certainty')) return 'perceptual overlay';
  if (method.includes('nucleus')) return 'acoustic nuclei';
  if (method.includes('vad')) return 'VAD re-anchor';
  if (method.includes('agreement')) return 'agreement clock';
  if (method === 'verse' || method.includes('verse')) return 'verse-local clock';
  if (method.includes('transcript') || method.includes('mora') || method.includes('branch')) {
    return 'transcript + prosody';
  }
  if (method.includes('weighted') || method.includes('uniform') || method === 'main-char-650') {
    return 'fixed clock';
  }
  return 'other';
}

function comparePerformance(left, right) {
  const leftScore = left.result.analysis.score;
  const rightScore = right.result.analysis.score;
  return (
    rightScore.exactRate - leftScore.exactRate ||
    rightScore.qualityScore - leftScore.qualityScore ||
    right.result.analysis.matchedWordCount - left.result.analysis.matchedWordCount ||
    left.result.metrics.firstAudioMs - right.result.metrics.firstAudioMs
  );
}

function isMeaningfulAudit(candidate) {
  return candidate.result.analysis.matchedWordCount >= minimumMatchedWords;
}

function resultArtifacts(result) {
  const names = new Set([result.recording, result.sourceRecording].filter(Boolean));
  for (const name of [...names]) {
    const stem = name.replace(/\.[^.]+$/, '');
    names.add(`${stem}.png`);
    names.add(`${stem}.pcm`);
  }
  return names;
}

const options = parseArgs(process.argv.slice(2));
const entries = await readdir(artifacts, { withFileTypes: true });
const reportNames = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('-comparison.json'))
  .map((entry) => entry.name)
  .sort();
const reports = [];
const candidates = [];

for (const name of reportNames) {
  try {
    const report = JSON.parse(await readFile(resolve(artifacts, name), 'utf8'));
    reports.push({ name, report });
    for (const result of report.results || []) {
      if (
        result.status !== 'recorded' ||
        !result.analysis?.score ||
        !Number.isFinite(result.analysis.score.exactRate)
      ) {
        continue;
      }
      candidates.push({
        reportName: name,
        report,
        result,
        family: familyFor(result.method),
        key: `${name}::${result.runId || result.method}`,
      });
    }
  } catch (error) {
    throw new Error(`Cannot safely parse ${name}: ${error.message}`);
  }
}

if (!candidates.length) throw new Error('No analyzed recorded runs found; refusing to prune.');

const selected = new Map();
function retain(candidate, reason) {
  const existing = selected.get(candidate.key);
  selected.set(candidate.key, { candidate, reasons: [...(existing?.reasons || []), reason] });
}

const meaningfulCandidates = candidates.filter(isMeaningfulAudit);
if (!meaningfulCandidates.length) {
  throw new Error(
    `No analyzed run has at least ${minimumMatchedWords} matched words; refusing to prune.`
  );
}

for (const candidate of [...meaningfulCandidates]
  .sort(comparePerformance)
  .slice(0, topOverallCount)) {
  retain(candidate, `top-${topOverallCount}-overall`);
}

for (const family of [...new Set(candidates.map((candidate) => candidate.family))].sort()) {
  const familyCandidates = candidates.filter((candidate) => candidate.family === family);
  const best = (
    familyCandidates.filter(isMeaningfulAudit).length
      ? familyCandidates.filter(isMeaningfulAudit)
      : familyCandidates
  ).sort(comparePerformance)[0];
  retain(best, `best-${family}`);
}

const productionControl = candidates
  .filter(
    (candidate) =>
      candidate.result.method === 'branch-transcript-moras' && isMeaningfulAudit(candidate)
  )
  .sort(comparePerformance)[0];
if (productionControl) retain(productionControl, 'production-control');

const keptByReport = new Map();
for (const { candidate, reasons } of selected.values()) {
  const retained = keptByReport.get(candidate.reportName) || new Map();
  retained.set(candidate.result.runId || candidate.result.method, {
    result: candidate.result,
    reasons,
  });
  keptByReport.set(candidate.reportName, retained);
}

const retainedArtifacts = new Set(['.gitignore', 'README.md', 'run-log.jsonl']);
const autoresearchCorpusPath = resolve(root, 'autoresearch-corpus.json');
const autoresearchCorpus = await readFile(autoresearchCorpusPath, 'utf8')
  .then(JSON.parse)
  .catch((error) => {
    if (error?.code === 'ENOENT') return null;
    throw new Error(`Cannot safely parse ${autoresearchCorpusPath}: ${error.message}`);
  });
for (const entry of autoresearchCorpus?.reports || []) {
  const reportName = entry.path?.split('/').at(-1);
  if (reportName?.endsWith('-comparison.json')) retainedArtifacts.add(reportName);
}
const retainedRunIds = new Set();
for (const [reportName, retained] of keptByReport) {
  retainedArtifacts.add(reportName);
  for (const { result } of retained.values()) {
    if (result.runId) retainedRunIds.add(result.runId);
    for (const name of resultArtifacts(result)) retainedArtifacts.add(name);
  }
}

const allFiles = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
const filesToDelete = allFiles.filter(
  (name) => !retainedArtifacts.has(name) && !name.startsWith('retention-')
);
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  policy: {
    topOverallCount,
    minimumMatchedWords,
    tieBreak:
      'exact-word rate, then quality score, matched-word count, then lower first-audio latency',
    guarantees: ['best analyzed run in every strategy family', 'best production control'],
  },
  before: { reports: reports.length, analyzedRuns: candidates.length, files: allFiles.length },
  after: {
    reports: keptByReport.size,
    retainedRuns: selected.size,
    deletedFiles: filesToDelete.length,
  },
  retained: [...selected.values()]
    .map(({ candidate, reasons }) => ({
      report: candidate.reportName,
      runId: candidate.result.runId || null,
      method: candidate.result.method,
      family: candidate.family,
      reasons,
      exactRate: candidate.result.analysis.score.exactRate,
      qualityScore: candidate.result.analysis.score.qualityScore,
      matchedWordCount: candidate.result.analysis.matchedWordCount,
      coveredWordCount: candidate.result.analysis.coveredWordCount,
    }))
    .sort((left, right) => right.exactRate - left.exactRate),
};

console.table(
  manifest.retained.map((run) => ({
    family: run.family,
    method: run.method,
    exact: `${Math.round(run.exactRate * 1000) / 10}%`,
    words: `${run.coveredWordCount}/${run.matchedWordCount}`,
    reason: run.reasons.join(', '),
  }))
);
console.log(
  `${options.apply ? 'Applying' : 'Dry run:'} retain ${manifest.after.retainedRuns} runs in ${manifest.after.reports} reports; delete ${manifest.after.deletedFiles} files.`
);

if (!options.apply) process.exit(0);

for (const [reportName, retained] of keptByReport) {
  const original = reports.find((report) => report.name === reportName).report;
  const retainedKeys = new Set(retained.keys());
  const pruned = {
    ...original,
    results: (original.results || []).filter((result) =>
      retainedKeys.has(result.runId || result.method)
    ),
    retention: {
      retainedAt: manifest.generatedAt,
      policy: 'top overall plus best per strategy family and production control',
    },
  };
  await writeFile(resolve(artifacts, reportName), `${JSON.stringify(pruned, null, 2)}\n`);
}

for (const name of filesToDelete) await unlink(resolve(artifacts, name));

const originalLog = await readFile(resolve(artifacts, 'run-log.jsonl'), 'utf8').catch(() => '');
const compactLog = originalLog
  .split('\n')
  .filter(Boolean)
  .filter((line) => {
    try {
      const event = JSON.parse(line);
      return !event.runId || retainedRunIds.has(event.runId);
    } catch {
      return false;
    }
  });
await writeFile(resolve(artifacts, 'run-log.jsonl'), `${compactLog.join('\n')}\n`);
await writeFile(
  resolve(artifacts, `retention-${manifest.generatedAt.replace(/[-:.]/g, '')}.json`),
  `${JSON.stringify(manifest, null, 2)}\n`
);
