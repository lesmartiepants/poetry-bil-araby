const DEFAULTS = {
  correctionCapSeconds: 0.12,
  correctionRejectSeconds: 0.4,
  futureHorizonSeconds: 0.15,
  horizonWords: 6,
  minimumWordDurationSeconds: 0.045,
  safePastWords: 1,
};

export function buildPlan(durations) {
  let cursor = 0;
  return durations.map((duration) => {
    const safeDuration = Math.max(DEFAULTS.minimumWordDurationSeconds, Number(duration) || 0);
    const timing = { start: cursor, end: cursor + safeDuration };
    cursor = timing.end;
    return timing;
  });
}

export function activeIndexAt(plan, elapsed) {
  if (!plan.length) return -1;
  const index = plan.findIndex((timing) => elapsed < timing.end);
  return index < 0 ? plan.length - 1 : index;
}

export function applyFutureAnchor({ plan, anchorIndex, observedStart, playbackSeconds, options = {} }) {
  const config = { ...DEFAULTS, ...options };
  if (!Number.isInteger(anchorIndex) || !Number.isFinite(observedStart)) {
    return { status: 'rejected-invalid-anchor', plan };
  }
  if (!plan[anchorIndex]) return { status: 'rejected-out-of-range', plan };

  const activeIndex = activeIndexAt(plan, playbackSeconds);
  const futureStartIndex = activeIndex + 1;
  if (anchorIndex > activeIndex - config.safePastWords) {
    return { status: 'rejected-not-safely-past', plan, activeIndex, futureStartIndex };
  }
  if (!plan[futureStartIndex]) {
    return { status: 'rejected-no-future-words', plan, activeIndex, futureStartIndex };
  }
  const futureHorizon = plan[futureStartIndex].start - playbackSeconds;
  if (futureHorizon < config.futureHorizonSeconds) {
    return {
      status: 'rejected-insufficient-future-horizon',
      plan,
      activeIndex,
      futureStartIndex,
      futureHorizon,
    };
  }

  const discrepancy = observedStart - plan[anchorIndex].start;
  if (Math.abs(discrepancy) > config.correctionRejectSeconds) {
    return {
      status: 'rejected-disagreement-too-large',
      plan,
      activeIndex,
      futureStartIndex,
      discrepancy,
      futureHorizon,
    };
  }
  const correction = Math.max(
    -config.correctionCapSeconds,
    Math.min(config.correctionCapSeconds, discrepancy)
  );
  const horizonEndIndex = Math.min(plan.length - 1, futureStartIndex + config.horizonWords - 1);
  const horizonCount = horizonEndIndex - futureStartIndex + 1;
  const nextPlan = plan.map((timing) => ({ ...timing }));
  let cursor = futureStartIndex ? nextPlan[futureStartIndex - 1].end : 0;
  for (let index = futureStartIndex; index < nextPlan.length; index += 1) {
    const baseDuration = Math.max(
      config.minimumWordDurationSeconds,
      plan[index].end - plan[index].start
    );
    const correctionSlice = index <= horizonEndIndex ? correction / horizonCount : 0;
    const duration = Math.max(config.minimumWordDurationSeconds, baseDuration + correctionSlice);
    nextPlan[index] = { start: cursor, end: cursor + duration };
    cursor = nextPlan[index].end;
  }
  return {
    status: 'accepted',
    plan: nextPlan,
    activeIndex,
    futureStartIndex,
    futureHorizon,
    discrepancy,
    correction,
    horizonEndIndex,
  };
}
