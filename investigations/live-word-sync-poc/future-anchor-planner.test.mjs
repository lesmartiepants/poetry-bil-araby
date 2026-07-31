import assert from 'node:assert/strict';
import test from 'node:test';
import { activeIndexAt, applyFutureAnchor, buildPlan } from './future-anchor-planner.mjs';

test('only changes future words and keeps every boundary monotonic', () => {
  const plan = buildPlan([0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3]);
  const outcome = applyFutureAnchor({
    plan,
    anchorIndex: 1,
    observedStart: 0.48,
    playbackSeconds: 0.7,
  });

  assert.equal(outcome.status, 'accepted');
  assert.deepEqual(outcome.plan.slice(0, 3), plan.slice(0, 3));
  for (let index = 1; index < outcome.plan.length; index += 1) {
    assert.ok(outcome.plan[index].start >= outcome.plan[index - 1].end);
    assert.ok(outcome.plan[index].end > outcome.plan[index].start);
  }
});

test('rejects an anchor that is active or too close to the future horizon', () => {
  const plan = buildPlan([0.3, 0.3, 0.3, 0.3, 0.3]);
  assert.equal(
    applyFutureAnchor({ plan, anchorIndex: 2, observedStart: 0.7, playbackSeconds: 0.75 }).status,
    'rejected-not-safely-past'
  );
  assert.equal(
    applyFutureAnchor({ plan, anchorIndex: 0, observedStart: 0.1, playbackSeconds: 0.89 }).status,
    'rejected-insufficient-future-horizon'
  );
});

test('caps plausible corrections and rejects implausible disagreement', () => {
  const plan = buildPlan([0.3, 0.3, 0.3, 0.3, 0.3, 0.3]);
  const capped = applyFutureAnchor({
    plan,
    anchorIndex: 0,
    observedStart: 0.25,
    playbackSeconds: 0.7,
  });
  assert.equal(capped.status, 'accepted');
  assert.equal(capped.correction, 0.12);
  assert.equal(
    applyFutureAnchor({
      plan,
      anchorIndex: 0,
      observedStart: 0.8,
      playbackSeconds: 0.7,
    }).status,
    'rejected-disagreement-too-large'
  );
});

test('uses the final word when playback is past the plan', () => {
  const plan = buildPlan([0.2, 0.2]);
  assert.equal(activeIndexAt(plan, 3), 1);
});
